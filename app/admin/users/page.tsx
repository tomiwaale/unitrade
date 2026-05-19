import { createAdminClient } from "@/lib/supabase/admin";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

export default async function AdminUsersPage() {
  const admin = createAdminClient();

  const { data: users } = await admin
    .from("profiles")
    .select("id, full_name, university, created_at, recipient_code, is_admin")
    .order("created_at", { ascending: false });

  return (
    <div style={{ padding: "40px 48px" }}>
      <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", marginBottom: 6 }}>Users</h1>
      <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", marginBottom: 32 }}>
        {users?.length ?? 0} registered user{users?.length !== 1 ? "s" : ""}
      </p>

      <div style={{
        background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
        borderRadius: "var(--ut-radius)", overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ut-line)" }}>
                {["Name", "University", "Joined", "Bank Setup", "Role"].map((h) => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
                    color: "var(--ut-ink-mute)", letterSpacing: "0.06em",
                    textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((user: any) => (
                <tr key={user.id} style={{ borderBottom: "1px solid var(--ut-line)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ut-ink)" }}>{user.full_name}</p>
                    <p style={{ fontSize: 11, color: "var(--ut-ink-mute)", fontFamily: "var(--ut-font-mono)" }}>
                      {user.id.slice(0, 12)}…
                    </p>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--ut-ink-soft)", fontWeight: 500 }}>
                    {user.university}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--ut-ink-mute)", whiteSpace: "nowrap" }}>
                    {new Date(user.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {user.recipient_code ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--ut-primary-ink)" }}>
                        <CheckCircle2 size={13} /> Ready
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--ut-ink-mute)" }}>
                        <XCircle size={13} /> Not set
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {user.is_admin ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 700,
                        color: "var(--ut-primary-ink)", background: "var(--ut-primary-tint)",
                        padding: "3px 10px", borderRadius: 999,
                        textTransform: "uppercase", letterSpacing: "0.04em",
                      }}>
                        <ShieldCheck size={11} /> Admin
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--ut-ink-mute)" }}>User</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(users ?? []).length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "var(--ut-ink-mute)", fontSize: 14 }}>
            No users found.
          </div>
        )}
      </div>
    </div>
  );
}
