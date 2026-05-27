import { createAdminClient } from "@/lib/supabase/admin";
import {
  CheckCircle2, XCircle, ShieldCheck, Clock,
  GraduationCap, Phone, Mail, Landmark, User,
} from "lucide-react";
import { adminApproveSchoolId, adminRejectSchoolId } from "@/app/actions/admin";
import UsersControls from "./users-controls";
import { IdImage } from "@/components/admin/id-image";
import { createSchoolIdSignedUrl } from "@/lib/school-id";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; uni?: string }>;
}) {
  const { q = "", uni = "" } = await searchParams;
  const admin = createAdminClient();

  const [{ data: profiles }, { data: authData }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, university, phone, created_at, recipient_code, is_admin, account_name, bank_name, school_id_url, school_id_status")
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailByUserId = Object.fromEntries(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  const signedProfiles = await Promise.all(
    (profiles ?? []).map(async (p: any) => ({
      ...p,
      school_id_url: await createSchoolIdSignedUrl(p.school_id_url),
    })),
  );

  const users = signedProfiles.map((p: any) => ({
    ...p,
    email: emailByUserId[p.id] ?? "",
  }));

  const universities = Array.from(
    new Set(users.map((u) => u.university).filter(Boolean))
  ).sort() as string[];

  const qLower = q.trim().toLowerCase();
  const filtered = users.filter((u) => {
    const matchQ = !qLower ||
      u.email.toLowerCase().includes(qLower) ||
      (u.phone ?? "").toLowerCase().includes(qLower);
    const matchUni = !uni || u.university === uni;
    return matchQ && matchUni;
  });

  const pending = users.filter((u) => u.school_id_status === "pending").length;

  return (
    <div className="ut-admin-page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", margin: "0 0 4px" }}>Users</h1>
        <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", margin: 0 }}>
          {users.length} registered user{users.length !== 1 ? "s" : ""}
          {pending > 0 && (
            <span style={{
              marginLeft: 12, display: "inline-flex", alignItems: "center", gap: 5,
              padding: "2px 10px", borderRadius: 999,
              background: "color-mix(in srgb, #ca8a04 12%, transparent)",
              border: "1px solid color-mix(in srgb, #ca8a04 30%, transparent)",
              fontSize: 12, fontWeight: 600, color: "#92400e",
            }}>
              <Clock size={11} /> {pending} pending ID review{pending !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      <UsersControls
        universities={universities}
        currentQ={q}
        currentUni={uni}
        totalCount={users.length}
        filteredCount={filtered.length}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.length === 0 && (
          <div style={{
            padding: 48, textAlign: "center", color: "var(--ut-ink-mute)", fontSize: 14,
            background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)", borderRadius: "var(--ut-radius)",
          }}>
            {users.length === 0 ? "No users yet." : "No users match your search."}
          </div>
        )}

        {filtered.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}

function UserCard({ user }: { user: any }) {
  const initials = (user.full_name ?? "U")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w: string) => w[0].toUpperCase()).join("");

  const idStatus: string = user.school_id_status ?? "none";

  return (
    <div style={{
      background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
      borderRadius: "var(--ut-radius-lg, 16px)", overflow: "hidden",
    }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "16px 20px",
        borderBottom: "1px solid var(--ut-line)",
        background: idStatus === "pending" ? "color-mix(in srgb, #ca8a04 5%, var(--ut-bg-card))" : "var(--ut-bg-card)",
      }}>
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
          display: "grid", placeItems: "center",
          fontWeight: 700, fontSize: 15, fontFamily: "var(--ut-font-mono)",
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ut-ink)" }}>{user.full_name}</span>
            {user.is_admin && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                color: "var(--ut-primary-ink)", background: "var(--ut-primary-tint)",
                padding: "2px 8px", borderRadius: 999,
              }}>
                <ShieldCheck size={10} /> Admin
              </span>
            )}
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ut-ink-mute)", fontFamily: "var(--ut-font-mono)" }}>
            {user.id.slice(0, 16)}…
          </p>
        </div>

        <span style={{ fontSize: 12, color: "var(--ut-ink-mute)", whiteSpace: "nowrap", flexShrink: 0 }}>
          Joined{" "}
          {new Date(user.created_at).toLocaleDateString("en-NG", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span>
      </div>

      {/* Detail grid */}
      <div className="ut-admin-user-details" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 0,
      }}>
        <DetailCell icon={<Mail size={13} />} label="Email" value={user.email || "—"} mono />
        <DetailCell icon={<Phone size={13} />} label="Phone" value={user.phone || "—"} mono />
        <DetailCell icon={<User size={13} />} label="University" value={user.university || "—"} />
        <DetailCell
          icon={<Landmark size={13} />}
          label="Payout Bank"
          value={user.bank_name
            ? `${user.bank_name} — ${user.account_name ?? ""}`
            : "Not set"}
          sub={user.recipient_code ? "Paystack recipient set" : "No recipient"}
          subOk={!!user.recipient_code}
        />

        {/* School ID cell — full width on small grids */}
        <div style={{
          padding: "14px 20px", borderTop: "1px solid var(--ut-line)",
          display: "flex", alignItems: "flex-start", gap: 12,
          gridColumn: "1 / -1",
          borderLeft: idStatus === "pending"
            ? "3px solid #ca8a04"
            : idStatus === "approved"
            ? "3px solid var(--ut-primary)"
            : idStatus === "rejected"
            ? "3px solid #e11d48"
            : "3px solid transparent",
        }}>
          <GraduationCap size={13} style={{ color: "var(--ut-ink-mute)", marginTop: 1, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--ut-ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              School ID
            </p>
            <SchoolIdContent user={user} idStatus={idStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCell({
  icon, label, value, mono, sub, subOk,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  sub?: string;
  subOk?: boolean;
}) {
  return (
    <div style={{
      padding: "14px 20px",
      borderTop: "1px solid var(--ut-line)",
      borderRight: "1px solid var(--ut-line)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ color: "var(--ut-ink-mute)" }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ut-ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      </div>
      <p style={{
        margin: 0, fontSize: 13, fontWeight: 500, color: "var(--ut-ink)",
        fontFamily: mono ? "var(--ut-font-mono)" : undefined,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ margin: "2px 0 0", fontSize: 11, color: subOk ? "var(--ut-primary-ink)" : "var(--ut-ink-mute)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function SchoolIdContent({ user, idStatus }: { user: any; idStatus: string }) {
  if (idStatus === "approved") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {user.school_id_url && (
          <IdImage url={user.school_id_url} width={56} height={40} borderRadius={6} />
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "var(--ut-primary-ink)" }}>
          <CheckCircle2 size={15} /> Approved
        </span>
      </div>
    );
  }

  if (idStatus === "rejected") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "#b91c1c" }}>
        <XCircle size={15} /> Rejected
      </span>
    );
  }

  if (idStatus === "pending" && user.school_id_url) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <IdImage url={user.school_id_url} width={72} height={52} borderRadius={8} />

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#92400e" }}>
            <Clock size={13} /> Pending review
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <form action={adminApproveSchoolId.bind(null, user.id)}>
              <button type="submit" style={{
                padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
                border: "1px solid color-mix(in srgb, var(--ut-primary) 30%, transparent)",
              }}>
                Approve
              </button>
            </form>
            <form action={adminRejectSchoolId.bind(null, user.id)}>
              <button type="submit" style={{
                padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: "color-mix(in srgb, #e11d48 10%, transparent)", color: "#b91c1c",
                border: "1px solid color-mix(in srgb, #e11d48 25%, transparent)",
              }}>
                Reject
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <span style={{ fontSize: 13, color: "var(--ut-ink-mute)" }}>Not submitted yet</span>
  );
}
