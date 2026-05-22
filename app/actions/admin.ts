"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleSubaccount, refundTransaction } from "@/lib/paystack";
import {
  sendUserEmail,
  emailKycApproved,
  emailKycRejected,
  emailDisputeResolvedSeller,
  emailDisputeResolvedBuyer,
} from "@/lib/email";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Not authorized");
}

export async function adminReleaseToSeller(orderId: string) {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(`
      id, amount, status,
      products(title, seller_id, profiles(subaccount_code))
    `)
    .eq("id", orderId)
    .single();

  if (!order) return { error: "Order not found" };
  if (order.status !== "disputed") return { error: "Order is not in disputed state" };

  const product = (order as any).products;
  const subaccountCode = product?.profiles?.subaccount_code;

  if (!subaccountCode) return { error: "Seller has no payout account configured" };

  try {
    await settleSubaccount(subaccountCode);
  } catch (err: any) {
    return { error: `Settlement failed: ${err.message}` };
  }

  const now = new Date().toISOString();
  await admin
    .from("orders")
    .update({ status: "confirmed", confirmed_at: now, released_at: now })
    .eq("id", orderId);

  // Email seller that dispute was resolved in their favour
  void (async () => {
    try {
      const { data: sellerAuth } = await admin.auth.admin.getUserById(product.seller_id);
      if (sellerAuth.user?.email) {
        const { subject, html } = emailDisputeResolvedSeller({
          sellerName: sellerAuth.user.user_metadata?.full_name ?? "there",
          productTitle: product.title ?? "your item",
          amount: (order as any).amount,
        });
        await sendUserEmail(sellerAuth.user.email, subject, html);
      }
    } catch (err) {
      console.error("[email] Failed to send dispute-resolved email to seller:", err);
    }
  })();

  revalidatePath("/admin/disputes");
  revalidatePath("/admin/orders");
  return { success: true };
}

export async function adminMarkRefunded(orderId: string) {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, amount, buyer_id, paystack_reference, products(title)")
    .eq("id", orderId)
    .single();

  if (!order) return { error: "Order not found" };
  if (order.status !== "disputed") return { error: "Order is not in disputed state" };

  if ((order as any).paystack_reference) {
    try {
      await refundTransaction((order as any).paystack_reference);
    } catch (err: any) {
      return { error: `Refund failed: ${err.message}` };
    }
  }

  await admin.from("orders").update({ status: "refunded" }).eq("id", orderId);

  // Email buyer that they're getting a refund
  void (async () => {
    try {
      const { data: buyerAuth } = await admin.auth.admin.getUserById((order as any).buyer_id);
      if (buyerAuth.user?.email) {
        const { subject, html } = emailDisputeResolvedBuyer({
          buyerName: buyerAuth.user.user_metadata?.full_name ?? "there",
          productTitle: (order as any).products?.title ?? "your item",
          amount: (order as any).amount,
        });
        await sendUserEmail(buyerAuth.user.email, subject, html);
      }
    } catch (err) {
      console.error("[email] Failed to send refund email to buyer:", err);
    }
  })();

  revalidatePath("/admin/disputes");
  revalidatePath("/admin/orders");
  return { success: true };
}

export async function adminApproveSchoolId(userId: string): Promise<void> {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ school_id_status: "approved" })
    .eq("id", userId);

  if (error) {
    console.error("[admin] approve school id error:", error);
    return;
  }

  void (async () => {
    try {
      const { data: userAuth } = await admin.auth.admin.getUserById(userId);
      if (userAuth.user?.email) {
        const { subject, html } = emailKycApproved({
          name: userAuth.user.user_metadata?.full_name ?? "there",
          sellUrl: `${process.env.APP_URL}/sell`,
        });
        await sendUserEmail(userAuth.user.email, subject, html);
      }
    } catch (err) {
      console.error("[email] Failed to send KYC approval email:", err);
    }
  })();

  revalidatePath("/admin/users");
  revalidatePath("/admin/kyc");
}

export async function adminRejectSchoolId(userId: string): Promise<void> {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ school_id_status: "rejected" })
    .eq("id", userId);

  if (error) {
    console.error("[admin] reject school id error:", error);
    return;
  }

  void (async () => {
    try {
      const { data: userAuth } = await admin.auth.admin.getUserById(userId);
      if (userAuth.user?.email) {
        const { subject, html } = emailKycRejected({
          name: userAuth.user.user_metadata?.full_name ?? "there",
          kycUrl: `${process.env.APP_URL}/kyc`,
        });
        await sendUserEmail(userAuth.user.email, subject, html);
      }
    } catch (err) {
      console.error("[email] Failed to send KYC rejection email:", err);
    }
  })();

  revalidatePath("/admin/users");
  revalidatePath("/admin/kyc");
}

export async function adminConfirmPaymentByEmail(email: string) {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const admin = createAdminClient();

  // Resolve email → user id
  const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return { error: "Failed to list users" };

  const matched = usersPage.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
  );
  if (!matched) return { error: "No user found with that email" };

  // Fetch all pending orders for this user
  const { data: pendingOrders } = await admin
    .from("orders")
    .select("id, product_id, buyer_id, amount, paystack_reference, status")
    .eq("buyer_id", matched.id)
    .eq("status", "pending");

  if (!pendingOrders || pendingOrders.length === 0) {
    return { error: "No pending orders found for this user" };
  }

  const { verifyTransaction } = await import("@/lib/paystack");
  const { notify } = await import("@/lib/notifications");
  const {
    sendUserEmail,
    emailOrderConfirmedBuyer,
    emailOrderNotificationSeller,
  } = await import("@/lib/email");

  let confirmed = 0;
  const skipped: string[] = [];

  for (const order of pendingOrders) {
    try {
      const payment = await verifyTransaction(order.paystack_reference);
      if (payment.status !== "success") {
        skipped.push(order.paystack_reference);
        continue;
      }

      const expectedKobo = Math.round(order.amount * 100);
      if (payment.amount !== expectedKobo) {
        skipped.push(order.paystack_reference);
        continue;
      }

      const autoReleaseAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: updated } = await admin
        .from("orders")
        .update({ status: "paid", auto_release_at: autoReleaseAt })
        .eq("id", order.id)
        .eq("status", "pending")
        .select("id, product_id, buyer_id, amount")
        .single();

      if (!updated) continue;

      await admin
        .from("products")
        .update({ status: "sold" })
        .eq("id", order.product_id);

      confirmed++;

      // Notifications + emails (non-blocking)
      void (async () => {
        try {
          const { data: product } = await admin
            .from("products")
            .select("title, seller_id")
            .eq("id", order.product_id)
            .single();
          if (!product) return;

          void notify(order.buyer_id, "order", "Payment confirmed",
            `Your payment for "${product.title}" is secured in escrow.`, order.id);
          void notify(product.seller_id, "order", "New order received!",
            `Someone bought "${product.title}". Payment is held in escrow until delivery is confirmed.`, order.id);

          const ordersUrl = `${process.env.APP_URL}/orders`;
          const [{ data: buyerAuth }, { data: sellerAuth }] = await Promise.all([
            admin.auth.admin.getUserById(order.buyer_id),
            admin.auth.admin.getUserById(product.seller_id),
          ]);

          if (buyerAuth.user?.email) {
            const { subject, html } = emailOrderConfirmedBuyer({
              buyerName: buyerAuth.user.user_metadata?.full_name ?? "there",
              productTitle: product.title,
              amount: order.amount,
              orderId: order.id,
              ordersUrl,
            });
            await sendUserEmail(buyerAuth.user.email, subject, html);
          }

          if (sellerAuth.user?.email) {
            const { subject, html } = emailOrderNotificationSeller({
              sellerName: sellerAuth.user.user_metadata?.full_name ?? "there",
              productTitle: product.title,
              amount: order.amount,
              orderId: order.id,
              ordersUrl,
            });
            await sendUserEmail(sellerAuth.user.email, subject, html);
          }
        } catch (err) {
          console.error("[admin-confirm] email/notify error:", err);
        }
      })();
    } catch (err: any) {
      console.error("[admin-confirm] verify error for", order.paystack_reference, err.message);
      skipped.push(order.paystack_reference);
    }
  }

  revalidatePath("/admin/orders");

  return {
    success: true,
    confirmed,
    skipped: skipped.length,
    message: skipped.length > 0
      ? `${confirmed} order(s) confirmed. ${skipped.length} could not be verified with Paystack (payment may not have been captured).`
      : `${confirmed} order(s) confirmed and marked as paid.`,
  };
}

export async function adminDeactivateProduct(productId: string) {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const admin = createAdminClient();
  await admin.from("products").update({ status: "draft" }).eq("id", productId);

  revalidatePath("/admin/products");
  return { success: true };
}
