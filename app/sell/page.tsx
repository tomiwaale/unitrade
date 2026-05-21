import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/ui/navbar";
import SellForm from "./sell-form";
import Link from "next/link";
import { GraduationCap, Landmark, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id_status, nin_verified, recipient_code, university, full_name")
    .eq("id", user.id)
    .single();

  const idVerified = profile?.school_id_status === "approved" || profile?.nin_verified === true;
  const bankReady  = !!profile?.recipient_code;

  const defaultLocation = profile?.university ?? "";
  const sellerName      = profile?.full_name ?? "";

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main">
        {!idVerified ? (
          <IdGate pending={profile?.school_id_status === "pending"} />
        ) : !bankReady ? (
          <BankGate />
        ) : (
          <SellForm defaultLocation={defaultLocation} sellerName={sellerName} />
        )}
      </main>
    </div>
  );
}

function IdGate({ pending }: { pending: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="ut-auth-card ut-fade-up" style={{ maxWidth: 440 }}>
        <div className="ut-auth-card-head">
          <div style={{
            width: 44, height: 44, borderRadius: 12, marginBottom: 16,
            background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
            display: "grid", placeItems: "center",
          }}>
            <GraduationCap size={22} />
          </div>
          <h1>{pending ? "ID under review" : "Verify to sell"}</h1>
          <p>
            {pending
              ? "Your school ID is being reviewed. You'll be able to list items once approved — usually within a few hours."
              : "Upload your school ID card to start listing items. Admin approval usually takes a few hours."}
          </p>
        </div>
        {!pending && (
          <div className="ut-auth-card-body">
            <Link href="/kyc" className="ut-cta ut-cta-primary" style={{ justifyContent: "center", padding: "13px 20px", borderRadius: 12 }}>
              Upload school ID <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function BankGate() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="ut-auth-card ut-fade-up" style={{ maxWidth: 440 }}>
        <div className="ut-auth-card-head">
          <div style={{
            width: 44, height: 44, borderRadius: 12, marginBottom: 16,
            background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
            display: "grid", placeItems: "center",
          }}>
            <Landmark size={22} />
          </div>
          <h1>Add a payout account</h1>
          <p>Set up your bank account in your profile before you can publish listings and receive payments.</p>
        </div>
        <div className="ut-auth-card-body">
          <Link href="/profile" className="ut-cta ut-cta-primary" style={{ justifyContent: "center", padding: "13px 20px", borderRadius: 12 }}>
            Set up payout <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
