import { createClient } from "@/lib/supabase/server";
import { getAccountDeletionBlockers } from "@/lib/account";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import DeleteAccountForm from "./delete-account-form";

export const metadata = {
  title: "Delete Account · KolejSwap",
};

export default async function DeleteAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/delete");

  const blockers = await getAccountDeletionBlockers(user.id);

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main" style={{ maxWidth: 640, paddingTop: 40, paddingBottom: 80 }}>
        <div style={{ marginBottom: 32 }}>
          <span style={{
            fontFamily: "var(--ut-font-mono)", fontSize: 11, textTransform: "uppercase",
            letterSpacing: "0.12em", color: "var(--ut-ink-mute)", display: "block", marginBottom: 10,
          }}>
            Account settings
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--ut-ink)", margin: "0 0 10px", letterSpacing: "-0.03em" }}>
            Delete your account
          </h1>
          <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", margin: 0 }}>
            Signed in as {user.email}
          </p>
        </div>

        <div style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: "var(--ut-radius)", padding: "20px 24px", marginBottom: 24,
        }}>
          <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "var(--ut-ink)" }}>
            What happens when you delete your account
          </p>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: "var(--ut-ink-soft)", lineHeight: 1.75 }}>
            <li>Your profile, active listings, and saved items are removed immediately</li>
            <li>Your chat conversations and messages are deleted</li>
            <li>Notifications and device push tokens tied to your account are deleted</li>
            <li>Reviews you left are kept but no longer show your name; reviews you received are removed</li>
            <li>Your school ID, NIN verification, and bank/payout details are permanently erased</li>
            <li>Past order records are kept for up to 7 years to comply with Nigerian financial regulations, with your name and contact details removed from them</li>
          </ul>
          <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--ut-ink-mute)" }}>
            This cannot be undone. Read the full details in our{" "}
            <Link href="/privacy#data-retention" style={{ color: "var(--ut-primary)" }}>Privacy Policy</Link>.
          </p>
        </div>

        {blockers.length > 0 ? (
          <div style={{
            background: "#FDEAEA", border: "1px solid #F3C6C6",
            borderRadius: "var(--ut-radius)", padding: "18px 20px",
          }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <AlertTriangle size={18} style={{ color: "#9B1C1C", flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#9B1C1C" }}>
                You can&apos;t delete your account yet
              </p>
            </div>
            <ul style={{ margin: "0 0 12px", paddingLeft: 20, fontSize: 13.5, color: "#9B1C1C", lineHeight: 1.7 }}>
              {blockers.map((reason, i) => <li key={i}>{reason}</li>)}
            </ul>
            <Link href="/orders" style={{ fontSize: 13.5, fontWeight: 600, color: "#9B1C1C" }}>
              Go to your orders →
            </Link>
          </div>
        ) : (
          <div style={{
            background: "var(--ut-bg-card)", border: "1px solid #F3C6C6",
            borderRadius: "var(--ut-radius)", padding: "20px 24px",
          }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <ShieldAlert size={18} style={{ color: "#9B1C1C", flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ut-ink)" }}>
                Type DELETE below to confirm
              </p>
            </div>
            <DeleteAccountForm />
          </div>
        )}
      </main>
    </div>
  );
}
