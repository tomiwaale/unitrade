import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/ui/navbar";
import NewTicketForm from "./new-ticket-form";

export default async function NewSupportTicketPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/support/new");

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px 80px" }}>
        <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", margin: "0 0 6px" }}>
          Contact Support
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: 13, color: "var(--ut-ink-mute)" }}>
          Describe your issue and we&apos;ll get back to you as soon as possible.
        </p>
        <NewTicketForm />
      </main>
    </>
  );
}
