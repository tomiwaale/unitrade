"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { findStarterTemplate } from "@/lib/email-campaign-templates";
import { sendUserEmail } from "@/lib/email";
import {
  DEFAULT_SEGMENT,
  drainCampaign,
  parseSegment,
  renderCampaignEmail,
  resolveAudience,
  startCampaign,
  type Segment,
} from "@/lib/marketing";

// A send from the admin UI drains for this long, then hands the rest to
// /api/cron/send-campaigns so the request always returns.
const INLINE_SEND_BUDGET_MS = 20_000;

type CampaignFields = {
  name: string;
  subject: string;
  preheader: string;
  body_md: string;
  segment: Segment;
};

export async function createCampaign() {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const client = createAdminClient();
  const { data, error } = await client
    .from("email_campaigns")
    .insert({
      name: "Untitled campaign",
      subject: "",
      body_md: "",
      segment: DEFAULT_SEGMENT,
      created_by: admin.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[marketing] create campaign failed:", error);
    return { error: "Could not create campaign" };
  }

  revalidatePath("/admin/marketing");
  redirect(`/admin/marketing/${data.id}`);
}

export async function saveCampaign(id: string, fields: CampaignFields) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const client = createAdminClient();
  const { data: current } = await client
    .from("email_campaigns")
    .select("status")
    .eq("id", id)
    .single();

  // Content is frozen once a send starts — recipients already have the old copy.
  if (current && !["draft", "scheduled"].includes(current.status)) {
    return { error: "This campaign has already been sent and can no longer be edited" };
  }

  const { error } = await client
    .from("email_campaigns")
    .update({
      name: fields.name.trim() || "Untitled campaign",
      subject: fields.subject,
      preheader: fields.preheader,
      body_md: fields.body_md,
      segment: parseSegment(fields.segment),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[marketing] save campaign failed:", error);
    return { error: "Could not save campaign" };
  }

  revalidatePath("/admin/marketing");
  revalidatePath(`/admin/marketing/${id}`);
  return { success: true };
}

export async function deleteCampaign(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const client = createAdminClient();
  const { data: campaign } = await client
    .from("email_campaigns")
    .select("status")
    .eq("id", id)
    .single();

  if (campaign?.status === "sending") {
    return { error: "Can't delete a campaign that's currently sending" };
  }

  await client.from("email_campaigns").delete().eq("id", id);
  revalidatePath("/admin/marketing");
  return { success: true };
}

export async function duplicateCampaign(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const client = createAdminClient();
  const { data: source } = await client
    .from("email_campaigns")
    .select("name, subject, preheader, body_md, segment")
    .eq("id", id)
    .single();

  if (!source) return { error: "Campaign not found" };

  const { data, error } = await client
    .from("email_campaigns")
    .insert({
      name: `${source.name} (copy)`,
      subject: source.subject,
      preheader: source.preheader,
      body_md: source.body_md,
      segment: source.segment,
      created_by: admin.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Could not duplicate campaign" };

  revalidatePath("/admin/marketing");
  redirect(`/admin/marketing/${data.id}`);
}

// Powers the live "this reaches N people" readout in the segment builder.
export async function countAudience(segment: Segment) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  try {
    const recipients = await resolveAudience(parseSegment(segment));
    return { count: recipients.length };
  } catch (err: any) {
    return { error: err.message ?? "Could not resolve the audience" };
  }
}

export async function sendTestEmail(
  fields: Pick<CampaignFields, "subject" | "preheader" | "body_md">,
  to: string
) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: "Enter a valid email address" };
  if (!fields.subject.trim()) return { error: "Add a subject line first" };

  const client = createAdminClient();
  const { data: profile } = await client
    .from("profiles")
    .select("full_name, university")
    .eq("id", admin.id)
    .single();

  // Merge tags resolve against the admin's own profile so the test shows what a
  // real recipient would see rather than raw {{tags}}.
  const email = renderCampaignEmail(fields, {
    email: to,
    full_name: profile?.full_name ?? null,
    university: profile?.university ?? null,
  });

  await sendUserEmail(email.to, `[TEST] ${email.subject}`, email.html);
  return { success: true };
}

export async function sendCampaignNow(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const started = await startCampaign(id);
  if ("error" in started) return started;

  const result = await drainCampaign(id, INLINE_SEND_BUDGET_MS);

  revalidatePath("/admin/marketing");
  revalidatePath(`/admin/marketing/${id}`);

  return {
    success: true,
    total: started.total,
    sent: result.sent,
    failed: result.failed,
    done: result.done,
  };
}

export async function scheduleCampaign(id: string, scheduledAt: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) return { error: "Pick a valid date and time" };
  if (when.getTime() < Date.now()) return { error: "Pick a time in the future" };

  const client = createAdminClient();
  const { data: campaign } = await client
    .from("email_campaigns")
    .select("subject, body_md, status")
    .eq("id", id)
    .single();

  if (!campaign) return { error: "Campaign not found" };
  if (!["draft", "scheduled"].includes(campaign.status)) {
    return { error: "This campaign has already been sent" };
  }
  if (!campaign.subject.trim()) return { error: "Add a subject line before scheduling" };
  if (!campaign.body_md.trim()) return { error: "Add some content before scheduling" };

  const { error } = await client
    .from("email_campaigns")
    .update({ status: "scheduled", scheduled_at: when.toISOString() })
    .eq("id", id);

  if (error) return { error: "Could not schedule campaign" };

  revalidatePath("/admin/marketing");
  revalidatePath(`/admin/marketing/${id}`);
  return { success: true };
}

export async function unscheduleCampaign(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const client = createAdminClient();
  await client
    .from("email_campaigns")
    .update({ status: "draft", scheduled_at: null })
    .eq("id", id)
    .eq("status", "scheduled");

  revalidatePath("/admin/marketing");
  revalidatePath(`/admin/marketing/${id}`);
  return { success: true };
}

// Picks a stalled campaign back up — the cron route does this automatically,
// this is the manual nudge for when you don't want to wait for the next tick.
export async function resumeCampaign(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const result = await drainCampaign(id, INLINE_SEND_BUDGET_MS);

  revalidatePath("/admin/marketing");
  revalidatePath(`/admin/marketing/${id}`);
  return { success: true, ...result };
}

// ── Templates ────────────────────────────────────────────────────────────────

export async function saveTemplate(input: {
  id?: string;
  name: string;
  subject: string;
  preheader: string;
  body_md: string;
}) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };
  if (!input.name.trim()) return { error: "Give the template a name" };

  const client = createAdminClient();
  const payload = {
    name: input.name.trim(),
    subject: input.subject,
    preheader: input.preheader,
    body_md: input.body_md,
    updated_at: new Date().toISOString(),
  };

  const { error } = input.id
    ? await client.from("email_templates").update(payload).eq("id", input.id)
    : await client.from("email_templates").insert({ ...payload, created_by: admin.id });

  if (error) {
    console.error("[marketing] save template failed:", error);
    return { error: "Could not save template" };
  }

  revalidatePath("/admin/marketing");
  return { success: true };
}

export async function deleteTemplate(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const client = createAdminClient();
  await client.from("email_templates").delete().eq("id", id);
  revalidatePath("/admin/marketing");
  return { success: true };
}

// Creates a draft campaign pre-filled from a template.
export async function campaignFromTemplate(templateId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const client = createAdminClient();
  const { data: template } = await client
    .from("email_templates")
    .select("name, subject, preheader, body_md")
    .eq("id", templateId)
    .single();

  if (!template) return { error: "Template not found" };

  const { data, error } = await client
    .from("email_campaigns")
    .insert({
      name: template.name,
      subject: template.subject,
      preheader: template.preheader,
      body_md: template.body_md,
      segment: DEFAULT_SEGMENT,
      created_by: admin.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Could not create campaign" };

  revalidatePath("/admin/marketing");
  redirect(`/admin/marketing/${data.id}`);
}

// Creates a draft campaign from one of the built-in starters in
// lib/email-campaign-templates.ts. Unlike campaignFromTemplate these aren't DB
// rows, so there's nothing to look up — and the starter also carries the
// audience it was written for, which pre-fills the segment builder.
export async function campaignFromStarter(slug: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const starter = findStarterTemplate(slug);
  if (!starter) return { error: "Template not found" };

  const client = createAdminClient();
  const { data, error } = await client
    .from("email_campaigns")
    .insert({
      name: starter.name,
      subject: starter.subject,
      preheader: starter.preheader,
      body_md: starter.body_md,
      segment: parseSegment(starter.segment),
      created_by: admin.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[marketing] campaign from starter failed:", error);
    return { error: "Could not create campaign" };
  }

  revalidatePath("/admin/marketing");
  redirect(`/admin/marketing/${data.id}`);
}

// Copies a starter into the saved-templates table so it can be edited and
// reused as a house template, rather than re-forked from the built-in copy.
export async function saveStarterAsTemplate(slug: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const starter = findStarterTemplate(slug);
  if (!starter) return { error: "Template not found" };

  return saveTemplate({
    name: starter.name,
    subject: starter.subject,
    preheader: starter.preheader,
    body_md: starter.body_md,
  });
}
