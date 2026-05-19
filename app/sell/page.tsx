import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/ui/navbar";
import SellForm from "./sell-form";
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nin_verified, university, full_name")
    .eq("id", user.id)
    .single();

  const ninVerified = profile?.nin_verified ?? false;
  const defaultLocation = profile?.university ?? "";
  const sellerName = profile?.full_name ?? "";

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main">
        {ninVerified ? (
          <SellForm defaultLocation={defaultLocation} sellerName={sellerName} />
        ) : (
          <NINGate />
        )}
      </main>
    </div>
  );
}

function NINGate() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div
        className="ut-auth-card ut-fade-up"
        style={{ maxWidth: 440 }}
      >
        <div className="ut-auth-card-head">
          <div style={{
            width: 44, height: 44, borderRadius: 12, marginBottom: 16,
            background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
            display: "grid", placeItems: "center",
          }}>
            <ShieldCheck size={22} />
          </div>
          <h1>Verify to sell</h1>
          <p>NIN verification is required before you can list items. This is a one-time step.</p>
        </div>
        <div className="ut-auth-card-body">
          <Link href="/kyc" className="ut-cta ut-cta-primary" style={{ justifyContent: "center", padding: "13px 20px", borderRadius: 12 }}>
            Complete KYC <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
