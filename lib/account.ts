import { createAdminClient } from "@/lib/supabase/admin";
import { sendUserEmail, emailAccountDeleted } from "@/lib/email";

export type DeleteAccountResult = { success: true } | { error: string };

// Storage buckets that key files by "<user id>/..." (see the corresponding
// migrations: 005_storage_product_images.sql, 015_launch_hardening.sql,
// 026_dispute_details.sql, 027_chat_images.sql, 028_profile_avatars.sql).
// DB rows referencing these files cascade away with the profile (schema.sql
// FKs), but the underlying storage objects don't — clean them up separately.
const USER_KEYED_BUCKETS = [
  "avatars",
  "product-images",
  "chat-images",
  "school-ids",
  "dispute-evidence",
] as const;

// Orders where money is either sitting in escrow or under active dispute.
// Deleting the account mid-flight would sever buyer_id/seller_id (schema.sql
// sets buyer_id null, cascades products -> orders.product_id null) while a
// payout or refund is still undecided, so we block until it's resolved.
const UNSETTLED_ORDER_STATUSES = ["pending", "paid", "disputed"];

// Shared by app/actions/account.ts deleteAccount() (cookie-scoped web) and
// POST /api/mobile/account/delete (Bearer-scoped mobile) so both platforms
// enforce the same escrow safety check before an account can go away.
export async function getAccountDeletionBlockers(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const blockers: string[] = [];

  const { count: buyingCount } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", userId)
    .in("status", UNSETTLED_ORDER_STATUSES);

  if (buyingCount) {
    blockers.push(
      buyingCount === 1
        ? "You have an order in progress as a buyer. Wait for it to complete, or cancel/resolve it first."
        : `You have ${buyingCount} orders in progress as a buyer. Wait for them to complete, or cancel/resolve them first.`
    );
  }

  const { data: myProducts } = await admin.from("products").select("id").eq("seller_id", userId);
  const productIds = (myProducts ?? []).map((p) => p.id);

  if (productIds.length > 0) {
    const { count: sellingCount } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("product_id", productIds)
      .in("status", UNSETTLED_ORDER_STATUSES);

    if (sellingCount) {
      blockers.push(
        sellingCount === 1
          ? "You have an order in progress as a seller. Wait for it to complete, or resolve the dispute first."
          : `You have ${sellingCount} orders in progress as a seller. Wait for them to complete, or resolve the disputes first.`
      );
    }
  }

  return blockers;
}

async function purgeUserStorage(userId: string) {
  const admin = createAdminClient();

  await Promise.all(
    USER_KEYED_BUCKETS.map(async (bucket) => {
      try {
        const { data: files } = await admin.storage.from(bucket).list(userId);
        if (!files || files.length === 0) return;

        // Every upload path across web and mobile is flat — "<uid>/<file>",
        // no per-user sub-folders — so list()'s top-level names are the
        // actual files to remove.
        const paths = files.map((f) => `${userId}/${f.name}`);
        await admin.storage.from(bucket).remove(paths);
      } catch (err) {
        // Best-effort cleanup — never block account deletion on a storage error.
        console.error(`[account] Failed to purge ${bucket} for ${userId}:`, err);
      }
    })
  );
}

// Deletes the Supabase auth user, which cascades to the profile and
// everything keyed off it (products, orders' buyer/seller links, chat,
// swap offers, reviews, notifications, wishlists, device tokens, support
// tickets — see the ON DELETE rules in supabase/schema.sql and the
// migrations) — except the order/transaction rows themselves, which are
// kept (with buyer_id/product_id nulled) for financial record-keeping.
export async function deleteUserAccount(userId: string): Promise<DeleteAccountResult> {
  const blockers = await getAccountDeletionBlockers(userId);
  if (blockers.length > 0) {
    return { error: blockers[0] };
  }

  const admin = createAdminClient();

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser.user?.email;
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", userId).single();

  await purgeUserStorage(userId);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[account] Failed to delete user:", error);
    return { error: "Failed to delete your account. Please try again or contact support." };
  }

  if (email) {
    void (async () => {
      try {
        const { subject, html } = emailAccountDeleted({ name: profile?.full_name ?? "there" });
        await sendUserEmail(email, subject, html);
      } catch (err) {
        console.error("[email] Failed to send account-deletion confirmation:", err);
      }
    })();
  }

  return { success: true };
}
