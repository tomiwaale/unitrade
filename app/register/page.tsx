"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { register } from "@/app/actions/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { toast } from "sonner";
import { useTransition } from "react";
import { ArrowRight, User, Mail, Lock, Building, CreditCard, Landmark, ShieldCheck } from "lucide-react";
import { NIGERIAN_UNIVERSITIES } from "@/lib/nigerian-universities";

const SUPPORTED_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank (FCMB)", code: "214" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Jaiz Bank", code: "301" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Bank", code: "090267" },
  { name: "Moniepoint MFB", code: "50515" },
  { name: "Opay Digital Services", code: "999992" },
  { name: "PalmPay", code: "999991" },
  { name: "Polaris Bank", code: "076" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank", code: "032" },
  { name: "United Bank for Africa (UBA)", code: "033" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p style={{ margin: "4px 0 0", fontSize: 12, color: "#c53030" }}>{message}</p>;
}

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 16px" }}>
      <div style={{ flex: 1, height: 1, background: "var(--ut-line)" }} />
      <span style={{ fontFamily: "var(--ut-font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ut-ink-mute)" }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--ut-line)" }} />
    </div>
  );
}

export default function RegisterPage() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", university: "", bankCode: "", accountNumber: "", nin: "" },
  });

  function onSubmit(data: RegisterInput) {
    startTransition(async () => {
      const result = await register(data);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Account created successfully!");
      }
    });
  }

  return (
    <div className="ut-auth-page" style={{ padding: "32px 24px", alignItems: "flex-start" }}>
      <div style={{ width: "100%", maxWidth: 580, margin: "0 auto" }} className="ut-fade-up">
        <Link href="/" className="ut-logo" style={{ justifyContent: "center", marginBottom: 28, display: "flex" }}>
          <span className="ut-logo-mark">u</span>
          <span>CampSwap</span>
        </Link>

        <div className="ut-auth-card" style={{ maxWidth: "100%" }}>
          <div className="ut-auth-card-head">
            <h1>Join the marketplace</h1>
            <p>Create your verified student account to start trading</p>
          </div>

          <div className="ut-auth-card-body">
            <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "grid", gap: 14 }}>

              <SectionDivider>Account Info</SectionDivider>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="ut-field-label">Full Name</label>
                  <div style={{ position: "relative" }}>
                    <User size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ut-ink-mute)", pointerEvents: "none" }} />
                    <input autoComplete="name" placeholder="Jane Doe" {...form.register("fullName")} className="ut-input" style={{ paddingLeft: 38 }} />
                  </div>
                  <FieldError message={form.formState.errors.fullName?.message} />
                </div>

                <div>
                  <label className="ut-field-label">University</label>
                  <div style={{ position: "relative" }}>
                    <Building size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ut-ink-mute)", pointerEvents: "none" }} />
                    <input
                      list="ng-universities"
                      autoComplete="off"
                      placeholder="Search your university…"
                      {...form.register("university")}
                      className="ut-input"
                      style={{ paddingLeft: 38 }}
                    />
                    <datalist id="ng-universities">
                      {NIGERIAN_UNIVERSITIES.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <FieldError message={form.formState.errors.university?.message} />
                </div>

                <div>
                  <label className="ut-field-label">University Email</label>
                  <div style={{ position: "relative" }}>
                    <Mail size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ut-ink-mute)", pointerEvents: "none" }} />
                    <input type="email" autoComplete="email" placeholder="student@edu.com" {...form.register("email")} className="ut-input" style={{ paddingLeft: 38 }} />
                  </div>
                  <FieldError message={form.formState.errors.email?.message} />
                </div>

                <div>
                  <label className="ut-field-label">Password</label>
                  <div style={{ position: "relative" }}>
                    <Lock size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ut-ink-mute)", pointerEvents: "none" }} />
                    <input type="password" autoComplete="new-password" {...form.register("password")} className="ut-input" style={{ paddingLeft: 38 }} />
                  </div>
                  <FieldError message={form.formState.errors.password?.message} />
                </div>
              </div>

              <SectionDivider>Payout Details</SectionDivider>

              <p style={{ margin: "-4px 0 4px", fontSize: 12.5, color: "var(--ut-ink-mute)" }}>
                Required to receive payments when you sell an item.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="ut-field-label">Settlement Bank</label>
                  <Select onValueChange={(val: string | null) => form.setValue("bankCode", val ?? "")}>
                    <SelectTrigger
                      className="ut-input"
                      style={{ height: "auto", padding: "11px 14px", borderRadius: 10, borderColor: "var(--ut-line)", background: "var(--ut-bg-card)" }}
                    >
                      <Landmark size={14} style={{ color: "var(--ut-ink-mute)", marginRight: 8 }} />
                      <SelectValue placeholder="Select a bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_BANKS.map((bank) => (
                        <SelectItem key={bank.code} value={bank.code}>{bank.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={form.formState.errors.bankCode?.message} />
                </div>

                <div>
                  <label className="ut-field-label">Account Number</label>
                  <div style={{ position: "relative" }}>
                    <CreditCard size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ut-ink-mute)", pointerEvents: "none" }} />
                    <input autoComplete="off" placeholder="0123456789" maxLength={10} {...form.register("accountNumber")} className="ut-input" style={{ paddingLeft: 38, fontFamily: "var(--ut-font-mono)" }} />
                  </div>
                  <FieldError message={form.formState.errors.accountNumber?.message} />
                </div>
              </div>

              <SectionDivider>Identity Verification (KYC)</SectionDivider>

              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 14px", borderRadius: 10,
                background: "var(--ut-primary-tint)",
                border: "1px solid color-mix(in srgb, var(--ut-primary) 20%, transparent)",
                fontSize: 12.5, color: "var(--ut-primary-ink)", lineHeight: 1.5,
              }}>
                <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Your NIN is verified against the NIMC database. Only the last 4 digits are stored.
                  You can complete this later from your profile.
                </span>
              </div>

              <div>
                <label className="ut-field-label">National ID Number (NIN)</label>
                <div style={{ position: "relative" }}>
                  <ShieldCheck size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ut-ink-mute)", pointerEvents: "none" }} />
                  <input
                    placeholder="12345678901"
                    maxLength={11}
                    inputMode="numeric"
                    autoComplete="off"
                    {...form.register("nin")}
                    className="ut-input"
                    style={{ paddingLeft: 38, fontFamily: "var(--ut-font-mono)", letterSpacing: "0.1em" }}
                  />
                </div>
                <FieldError message={form.formState.errors.nin?.message} />
              </div>

              <button
                type="submit"
                className="ut-cta ut-cta-primary"
                disabled={isPending}
                style={{ justifyContent: "center", padding: "13px 20px", marginTop: 8, borderRadius: 12 }}
              >
                {isPending ? "Creating account…" : "Join platform"}
                {!isPending && <ArrowRight size={15} />}
              </button>
            </form>

            <p style={{ marginTop: 16, textAlign: "center", fontSize: 12.5, color: "var(--ut-ink-mute)", lineHeight: 1.6 }}>
              By joining, you agree to our{" "}
              <Link href="/terms" style={{ color: "var(--ut-primary)", textDecoration: "none" }}>Terms of Use</Link>
              {" "}and{" "}
              <Link href="/privacy" style={{ color: "var(--ut-primary)", textDecoration: "none" }}>Privacy Policy</Link>.
            </p>

            <p style={{ marginTop: 12, textAlign: "center", fontSize: 13.5, color: "var(--ut-ink-mute)" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "var(--ut-primary)", fontWeight: 500, textDecoration: "none" }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
