"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transferToSeller, refundTransaction } from "@/lib/paystack";

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
      products(seller_id, profiles(recipient_code))
    `)
    .eq("id", orderId)
    .single();

  if (!order) return { error: "Order not found" };
  if (order.status !== "disputed") return { error: "Order is not in disputed state" };

  const product = (order as any).products;
  const recipientCode = product?.profiles?.recipient_code;

  if (!recipientCode) return { error: "Seller has no payout account configured" };

  const payoutKobo = Math.round((order as any).amount * 0.9 * 100);
  const transferRef = `ADMIN-REL-${orderId.slice(0, 8)}-${Date.now()}`;

  try {
    await transferToSeller(recipientCode, payoutKobo, transferRef);
  } catch (err: any) {
    return { error: `Transfer failed: ${err.message}` };
  }

  const now = new Date().toISOString();
  await admin
    .from("orders")
    .update({ status: "confirmed", confirmed_at: now, released_at: now })
    .eq("id", orderId);

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
    .select("id, status, paystack_reference")
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

  revalidatePath("/admin/users");
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

  revalidatePath("/admin/users");
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
