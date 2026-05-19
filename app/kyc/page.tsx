"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { kycSchema, type KYCInput } from "@/lib/validations/auth";
import { submitNINVerification } from "@/app/actions/kyc";
import { Navbar } from "@/components/ui/navbar";
import { toast } from "sonner";
import { useTransition, useState } from "react";
import { ShieldCheck, ArrowRight, CheckCircle } from "lucide-react";

export default function KYCPage() {
  const [isPending, startTransition] = useTransition();
  const [verified, setVerified] = useState(false);

  const form = useForm<KYCInput>({
    resolver: zodResolver(kycSchema),
    defaultValues: { nin: "" },
  });

  function onSubmit(data: KYCInput) {
    startTransition(async () => {
      const result = await submitNINVerification(data);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setVerified(true);
        toast.success("NIN verified successfully! You can now list items.");
      }
    });
  }

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div className="ut-auth-card ut-fade-up" style={{ maxWidth: 440 }}>
            <div className="ut-auth-card-head">
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: 16,
                background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
                display: "grid", placeItems: "center",
              }}>
                <ShieldCheck size={22} />
              </div>
              <h1>Identity verification</h1>
              <p>Verify your NIN to unlock selling on CampSwap.</p>
            </div>

            <div className="ut-auth-card-body">
              {verified ? (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <CheckCircle size={48} style={{ color: "var(--ut-primary)", marginBottom: 14 }} />
                  <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600 }}>NIN Verified!</p>
                  <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--ut-ink-mute)" }}>
                    Your identity is confirmed. You can now list items for sale.
                  </p>
                  <a href="/sell" className="ut-cta ut-cta-primary" style={{ justifyContent: "center", padding: "13px 20px", borderRadius: 12 }}>
                    Start selling <ArrowRight size={15} />
                  </a>
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "grid", gap: 16 }}>
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "12px 14px", borderRadius: 10,
                    background: "var(--ut-primary-tint)",
                    border: "1px solid color-mix(in srgb, var(--ut-primary) 20%, transparent)",
                    fontSize: 12.5, color: "var(--ut-primary-ink)", lineHeight: 1.5,
                  }}>
                    <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      Your NIN is checked against NIMC via Prembly. Only the last 4 digits are stored — the full number is never saved.
                    </span>
                  </div>

                  <div>
                    <label className="ut-field-label">National ID Number (NIN)</label>
                    <div style={{ position: "relative" }}>
                      <ShieldCheck size={14} style={{
                        position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                        color: "var(--ut-ink-mute)", pointerEvents: "none",
                      }} />
                      <input
                        placeholder="12345678901"
                        maxLength={11}
                        inputMode="numeric"
                        {...form.register("nin")}
                        className="ut-input"
                        style={{ paddingLeft: 38, fontFamily: "var(--ut-font-mono)", letterSpacing: "0.1em" }}
                      />
                    </div>
                    {form.formState.errors.nin && (
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#c53030" }}>
                        {form.formState.errors.nin.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="ut-cta ut-cta-primary"
                    disabled={isPending}
                    style={{ justifyContent: "center", padding: "13px 20px", borderRadius: 12 }}
                  >
                    {isPending ? "Verifying…" : "Verify NIN"}
                    {!isPending && <ArrowRight size={15} />}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
