"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { notify } from "@/lib/notifications";

type Result = { success: true } | { error: string };

function revalidateModeration() {
  revalidatePath("/admin/reports");
  revalidatePath("/admin/moderation");
}

// Moving a report to 'reviewing' is what stops two moderators working the
// same case, and it is the timestamp the 24-hour response promise in the
// terms is measured against.
export async function adminClaimReport(reportId: string): Promise<Result> {
  const moderator = await requireAdmin();
  if (!moderator) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("content_reports")
    .update({ status: "reviewing" })
    .eq("id", reportId)
    .eq("status", "open");

  if (error) {
    console.error("[moderation] claim error:", error);
    return { error: "Could not claim this report." };
  }

  revalidateModeration();
  return { success: true };
}

export async function adminResolveReport(
  reportId: string,
  outcome: "actioned" | "dismissed",
  resolution: string,
): Promise<Result> {
  const moderator = await requireAdmin();
  if (!moderator) return { error: "Unauthorized" };

  const admin = createAdminClient();

  const { data: report } = await admin
    .from("content_reports")
    .select("id, reporter_id, status")
    .eq("id", reportId)
    .single();

  if (!report) return { error: "Report not found" };
  if (report.status === "actioned" || report.status === "dismissed") {
    return { error: "This report is already resolved." };
  }

  const { error } = await admin
    .from("content_reports")
    .update({
      status: outcome,
      resolution: resolution.trim().slice(0, 2000) || null,
      resolved_by: moderator.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    console.error("[moderation] resolve error:", error);
    return { error: "Could not resolve this report." };
  }

  // Closing the loop with the reporter is the half of "timely responses to
  // concerns" that a queue alone does not cover.
  if (report.reporter_id) {
    void notify(
      report.reporter_id,
      "moderation",
      outcome === "actioned" ? "We acted on your report" : "We reviewed your report",
      outcome === "actioned"
        ? "Thanks for flagging it — we've taken action on the content you reported."
        : "We looked into what you reported and didn't find a breach of our rules this time.",
      reportId,
    );
  }

  revalidateModeration();
  return { success: true };
}

// Takes the message down and preserves the original for the audit trail in
// one statement — see admin_hide_message() in 031_user_safety.sql.
export async function adminHideMessage(messageId: string, reason: string): Promise<Result> {
  const moderator = await requireAdmin();
  if (!moderator) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_hide_message", {
    p_message_id: messageId,
    p_reason: reason.trim().slice(0, 500) || "Breached community rules",
    p_moderator_id: moderator.id,
  });

  if (error) {
    console.error("[moderation] hide message error:", error);
    return { error: "Could not remove this message." };
  }

  revalidateModeration();
  revalidatePath("/messages", "layout");
  return { success: true };
}

// Listings come down to 'draft' rather than being deleted: the seller can see
// and fix an over-zealous takedown, and an order that already references the
// product keeps resolving.
export async function adminRemoveProduct(productId: string, reason: string): Promise<Result> {
  const moderator = await requireAdmin();
  if (!moderator) return { error: "Unauthorized" };

  const admin = createAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("id, seller_id, title, description, images, status")
    .eq("id", productId)
    .single();

  if (!product) return { error: "Listing not found" };
  if (product.status === "draft") return { error: "This listing is already down." };

  await admin.from("moderation_removals").insert({
    target_type: "product",
    target_id: product.id,
    author_id: product.seller_id,
    original_content: `${product.title}\n\n${product.description ?? ""}`.slice(0, 5000),
    original_image_url: (product.images as string[] | null)?.[0] ?? null,
    reason: reason.trim().slice(0, 500) || "Breached community rules",
    removed_by: moderator.id,
  });

  const { error } = await admin
    .from("products")
    .update({ status: "draft" })
    .eq("id", productId);

  if (error) {
    console.error("[moderation] remove product error:", error);
    return { error: "Could not take this listing down." };
  }

  void notify(
    product.seller_id,
    "moderation",
    "Your listing was taken down",
    `"${product.title}" breached our community rules and is no longer visible. Reason: ${reason}`,
    product.id,
  );

  revalidateModeration();
  revalidatePath("/catalog");
  return { success: true };
}

export async function adminSetSuspension(
  userId: string,
  suspended: boolean,
  reason: string,
): Promise<Result> {
  const moderator = await requireAdmin();
  if (!moderator) return { error: "Unauthorized" };

  if (userId === moderator.id) return { error: "You cannot suspend yourself." };

  const admin = createAdminClient();

  // A suspension pulls the seller's listings off the marketplace, so money
  // already in escrow needs a decision first. Surfacing it here rather than
  // refusing keeps the call with the moderator.
  if (suspended) {
    const { data: openOrders } = await admin
      .from("orders")
      .select("id, products!inner(seller_id)")
      .in("status", ["paid", "confirmed", "disputed"])
      .eq("products.seller_id", userId);

    if (openOrders && openOrders.length > 0) {
      console.warn(
        `[moderation] suspending ${userId} with ${openOrders.length} order(s) still in escrow`,
      );
    }
  }

  const { error } = await admin.rpc("admin_set_suspension", {
    p_user_id: userId,
    p_suspended: suspended,
    p_reason: suspended ? (reason.trim().slice(0, 500) || "Breached community rules") : null,
  });

  if (error) {
    console.error("[moderation] suspension error:", error);
    return { error: "Could not update this account." };
  }

  void notify(
    userId,
    "moderation",
    suspended ? "Your account has been suspended" : "Your account has been reinstated",
    suspended
      ? `Reason: ${reason}. Contact support if you believe this is a mistake.`
      : "You can list, buy, and message again.",
  );

  revalidateModeration();
  revalidatePath("/admin/users");
  revalidatePath("/catalog");
  return { success: true };
}

// ── Filter term management ───────────────────────────────────────────────────

export async function adminSaveModerationTerm(input: {
  id?: string;
  pattern: string;
  category: string;
  action: "block" | "flag";
  matchNormalized: boolean;
  note?: string;
}): Promise<Result> {
  const moderator = await requireAdmin();
  if (!moderator) return { error: "Unauthorized" };

  const pattern = input.pattern.trim();
  if (!pattern) return { error: "A pattern is required." };

  const admin = createAdminClient();

  // A bad regex would make the BEFORE INSERT trigger throw on *every* message,
  // taking chat down for everyone. Check it against the database's own engine
  // before it can reach the filter.
  const { error: patternError } = await admin.rpc("validate_moderation_pattern", {
    p_pattern: pattern,
  });

  if (patternError) {
    return { error: "That pattern isn't a valid regular expression." };
  }

  const row = {
    pattern,
    category: input.category,
    action: input.action,
    match_normalized: input.matchNormalized,
    note: input.note?.trim().slice(0, 300) || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = input.id
    ? await admin.from("moderation_terms").update(row).eq("id", input.id)
    : await admin.from("moderation_terms").insert(row);

  if (error?.code === "23505") return { error: "That pattern is already on the list." };
  if (error) {
    console.error("[moderation] save term error:", error);
    return { error: "Could not save this term." };
  }

  revalidateModeration();
  return { success: true };
}

export async function adminToggleModerationTerm(id: string, isActive: boolean): Promise<Result> {
  const moderator = await requireAdmin();
  if (!moderator) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("moderation_terms")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[moderation] toggle term error:", error);
    return { error: "Could not update this term." };
  }

  revalidateModeration();
  return { success: true };
}

export async function adminDeleteModerationTerm(id: string): Promise<Result> {
  const moderator = await requireAdmin();
  if (!moderator) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin.from("moderation_terms").delete().eq("id", id);

  if (error) {
    console.error("[moderation] delete term error:", error);
    return { error: "Could not delete this term." };
  }

  revalidateModeration();
  return { success: true };
}

export type FilterTestResult =
  | { outcome: "clean" }
  | { outcome: "block" | "flag"; pattern: string; category: string };

// Lets a moderator see what the live filter does with a phrase before they
// commit a pattern to it.
export async function adminTestFilter(text: string): Promise<FilterTestResult | { error: string }> {
  const moderator = await requireAdmin();
  if (!moderator) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("test_moderation", { p_text: text });

  if (error) {
    console.error("[moderation] test filter error:", error);
    return { error: "Could not run the filter." };
  }

  const hit = (data as any[])?.[0];
  if (!hit) return { outcome: "clean" };

  return {
    outcome: hit.matched_action as "block" | "flag",
    pattern: hit.matched_pattern,
    category: hit.matched_category,
  };
}
