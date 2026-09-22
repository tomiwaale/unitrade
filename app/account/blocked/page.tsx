import { createClient } from "@/lib/supabase/server";
import { listBlockedUsers } from "@/lib/safety";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { ShieldOff } from "lucide-react";
import UnblockButton from "./unblock-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blocked accounts · KolejSwap",
};

export default async function BlockedAccountsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/blocked");

  const blocked = await listBlockedUsers(supabase, user.id);

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main" style={{ maxWidth: 640, paddingTop: 40, paddingBottom: 80 }}>
        <div style={{ marginBottom: 28 }}>
          <span style={{
            fontFamily: "var(--ut-font-mono)", fontSize: 11, textTransform: "uppercase",
            letterSpacing: "0.12em", color: "var(--ut-ink-mute)", display: "block", marginBottom: 10,
          }}>
            Account settings
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--ut-ink)", margin: "0 0 10px", letterSpacing: "-0.03em" }}>
            Blocked accounts
          </h1>
          <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", margin: 0, lineHeight: 1.6 }}>
            Blocked students can&apos;t message you, and their conversations stay out of your inbox.
            They aren&apos;t told that you blocked them.
          </p>
        </div>

        {blocked.length === 0 ? (
          <div style={{
            padding: "48px 24px", textAlign: "center",
            background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
            borderRadius: "var(--ut-radius)",
          }}>
            <ShieldOff size={26} style={{ color: "var(--ut-ink-mute)", marginBottom: 12 }} />
            <p style={{ margin: "0 0 6px", fontSize: 14.5, fontWeight: 600, color: "var(--ut-ink)" }}>
              You haven&apos;t blocked anyone
            </p>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--ut-ink-mute)", lineHeight: 1.6 }}>
              You can block someone from the menu at the top of any conversation.
            </p>
          </div>
        ) : (
          <div style={{
            background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
            borderRadius: "var(--ut-radius)", overflow: "hidden",
          }}>
            {blocked.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                  borderTop: i === 0 ? "none" : "1px solid var(--ut-line)",
                }}
              >
                <div
                  className="ut-avatar"
                  style={{ width: 38, height: 38, fontSize: 13, background: "var(--ut-bg-sunken)", color: "var(--ut-ink-soft)" }}
                >
                  {entry.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ut-ink)" }}>
                    {entry.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>
                    Blocked {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <UnblockButton blockedId={entry.blockedId} name={entry.name} />
              </div>
            ))}
          </div>
        )}

        <p style={{ marginTop: 22, fontSize: 13, color: "var(--ut-ink-mute)", lineHeight: 1.6 }}>
          Blocking someone isn&apos;t the same as reporting them. If a student broke our{" "}
          <Link href="/terms#prohibited" style={{ color: "var(--ut-primary)" }}>community rules</Link>,
          report them so a moderator reviews it — we respond to every report within 24 hours.
        </p>
      </main>
    </div>
  );
}
