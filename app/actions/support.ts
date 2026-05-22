"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { sendAdminEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const CATEGORIES = ["order_issue", "payment", "account", "other"] as const;
export type SupportCategory = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<SupportCategory, string> = {
  order_issue: "Order issue",
  payment: "Payment",
  account: "Account",
  other: "Other",
};

export async function openSupportTicket(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/support/new");

  if (!rateLimit(`support-open:${user.id}`, 5, 60_000 * 60)) {
    return { error: "Too many tickets opened. Please wait before submitting another." };
  }

  const subject = (formData.get("subject") as string)?.trim();
  const category = formData.get("category") as string;
  const message = (formData.get("message") as string)?.trim();

  if (!subject || subject.length < 5) return { error: "Subject must be at least 5 characters." };
  if (subject.length > 120) return { error: "Subject must be under 120 characters." };
  if (!CATEGORIES.includes(category as SupportCategory)) return { error: "Invalid category." };
  if (!message || message.length < 10) return { error: "Message must be at least 10 characters." };
  if (message.length > 3000) return { error: "Message must be under 3000 characters." };

  const { data: ticket, error: ticketErr } = await supabase
    .from("support_tickets")
    .insert({ user_id: user.id, subject, category, status: "open" })
    .select("id")
    .single();

  if (ticketErr || !ticket) return { error: "Failed to open ticket. Please try again." };

  await supabase.from("support_messages").insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    content: message,
    is_admin: false,
  });

  // Notify admin by email
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  void sendAdminEmail(
    `[Support] New ticket: ${subject}`,
    `<p><b>${profile?.full_name ?? "A user"}</b> opened a support ticket.</p>
     <p><b>Category:</b> ${CATEGORY_LABELS[category as SupportCategory]}</p>
     <p><b>Subject:</b> ${subject}</p>
     <p><b>Message:</b> ${message}</p>
     <p><a href="${process.env.APP_URL ?? "https://kolejswap.com"}/admin/support/${ticket.id}">View ticket →</a></p>`,
  );

  redirect(`/support/${ticket.id}`);
}

export async function sendSupportMessage(ticketId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Message cannot be empty." };
  if (trimmed.length > 3000) return { error: "Message must be under 3000 characters." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!rateLimit(`support-msg:${user.id}`, 30, 60_000)) {
    return { error: "Sending too fast. Slow down a little." };
  }

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, user_id, status, subject")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { error: "Ticket not found." };
  if (ticket.status === "closed") return { error: "This ticket is closed." };
  if (ticket.user_id !== user.id) return { error: "Access denied." };

  const { error } = await supabase.from("support_messages").insert({
    ticket_id: ticketId,
    sender_id: user.id,
    content: trimmed,
    is_admin: false,
  });

  if (error) return { error: "Failed to send message." };
  return { success: true };
}

export async function adminSendSupportMessage(ticketId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Message cannot be empty." };
  if (trimmed.length > 3000) return { error: "Message must be under 3000 characters." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  // Verify caller is an admin
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "Access denied." };

  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, user_id, status, subject")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { error: "Ticket not found." };
  if (ticket.status === "closed") return { error: "This ticket is closed." };

  const { error } = await admin.from("support_messages").insert({
    ticket_id: ticketId,
    sender_id: user.id,
    content: trimmed,
    is_admin: true,
  });

  if (error) return { error: "Failed to send message." };

  // Update ticket to in_progress if it was open
  if (ticket.status === "open") {
    await admin
      .from("support_tickets")
      .update({ status: "in_progress" })
      .eq("id", ticketId);
  }

  // Notify the user
  void notify(
    ticket.user_id,
    "support_reply",
    "Support replied",
    ticket.subject,
    ticketId,
  );

  revalidatePath(`/admin/support/${ticketId}`);
  return { success: true };
}

export async function adminCloseTicket(ticketId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "Access denied." };

  const { error } = await admin
    .from("support_tickets")
    .update({ status: "closed" })
    .eq("id", ticketId);

  if (error) return { error: "Failed to close ticket." };

  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
  return { success: true };
}

export async function adminReopenTicket(ticketId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "Access denied." };

  const { error } = await admin
    .from("support_tickets")
    .update({ status: "open" })
    .eq("id", ticketId);

  if (error) return { error: "Failed to reopen ticket." };

  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
  return { success: true };
}
