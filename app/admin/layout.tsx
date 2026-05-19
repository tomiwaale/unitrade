import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/sidebar";

export const metadata = { title: "CampSwap Admin" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--ut-bg)" }}>
      <AdminSidebar adminName={profile.full_name} />
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
