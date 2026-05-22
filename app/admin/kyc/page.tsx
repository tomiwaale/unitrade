import { createAdminClient } from "@/lib/supabase/admin";
import { Clock, CheckCircle2, XCircle, GraduationCap } from "lucide-react";
import { adminApproveSchoolId, adminRejectSchoolId } from "@/app/actions/admin";

export default async function AdminKycPage() {
  const admin = createAdminClient();

  const [{ data: pending }, { data: recent }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, university, school_id_url, school_id_status, created_at")
      .eq("school_id_status", "pending")
      .order("created_at", { ascending: true }),
    admin
      .from("profiles")
      .select("id, full_name, university, school_id_url, school_id_status, created_at")
      .in("school_id_status", ["approved", "rejected"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="ut-admin-page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", margin: "0 0 4px" }}>KYC Queue</h1>
        <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", margin: 0 }}>
          {pending?.length ?? 0} pending school ID{pending?.length !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      {/* Pending reviews */}
      {pending && pending.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
          {pending.map((user: any) => (
            <KycCard key={user.id} user={user} />
          ))}
        </div>
      ) : (
        <div style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: "var(--ut-radius)", padding: "40px 24px",
          textAlign: "center", color: "var(--ut-ink-mute)", fontSize: 14,
          marginBottom: 40,
        }}>
          <CheckCircle2 size={28} style={{ marginBottom: 10, color: "var(--ut-primary)" }} />
          <p style={{ margin: 0, fontWeight: 600, color: "var(--ut-ink)" }}>Queue is clear</p>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>No school IDs awaiting review.</p>
        </div>
      )}

      {/* Recently processed */}
      {recent && recent.length > 0 && (
        <>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: "var(--ut-ink)", marginBottom: 12 }}>
            Recently processed
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map((user: any) => (
              <div key={user.id} style={{
                background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
                borderRadius: "var(--ut-radius)", padding: "12px 18px",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <GraduationCap size={15} style={{ color: "var(--ut-ink-mute)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ut-ink)" }}>{user.full_name}</span>
                  <span style={{ fontSize: 12, color: "var(--ut-ink-mute)", marginLeft: 8 }}>{user.university}</span>
                </div>
                {user.school_id_status === "approved" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--ut-primary-ink)" }}>
                    <CheckCircle2 size={14} /> Approved
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>
                    <XCircle size={14} /> Rejected
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function KycCard({ user }: { user: any }) {
  return (
    <div style={{
      background: "var(--ut-bg-card)", border: "1.5px solid #ca8a04",
      borderRadius: "var(--ut-radius)", overflow: "hidden",
    }}>
      <div style={{
        padding: "11px 18px", background: "color-mix(in srgb, #ca8a04 8%, transparent)",
        borderBottom: "1px solid color-mix(in srgb, #ca8a04 30%, transparent)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ut-ink)" }}>{user.full_name}</span>
          {user.university && (
            <span style={{ fontSize: 12, color: "#92400e", marginLeft: 10 }}>{user.university}</span>
          )}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#92400e" }}>
          <Clock size={13} />
          Submitted {new Date(user.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
        {/* ID image */}
        <a
          href={user.school_id_url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block", flexShrink: 0,
            width: 160, height: 110, borderRadius: 10, overflow: "hidden",
            border: "1px solid var(--ut-line)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.school_id_url}
            alt="School ID"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </a>

        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--ut-ink-mute)" }}>
            Click the image to view full size before deciding.
          </p>
          <p style={{ margin: "0 0 14px", fontFamily: "var(--ut-font-mono)", fontSize: 11, color: "var(--ut-ink-mute)" }}>
            ID: {user.id.slice(0, 20)}…
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <form action={adminApproveSchoolId.bind(null, user.id)}>
              <button type="submit" style={{
                padding: "8px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
                background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
                border: "1px solid color-mix(in srgb, var(--ut-primary) 30%, transparent)",
              }}>
                Approve
              </button>
            </form>
            <form action={adminRejectSchoolId.bind(null, user.id)}>
              <button type="submit" style={{
                padding: "8px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
                background: "color-mix(in srgb, #e11d48 10%, transparent)", color: "#b91c1c",
                border: "1px solid color-mix(in srgb, #e11d48 25%, transparent)",
              }}>
                Reject
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
