"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { register } from "@/app/actions/auth";
import Link from "next/link";
import { toast } from "sonner";
import { useTransition } from "react";
import { ArrowRight, User, Mail, Lock, Building, Phone } from "lucide-react";
import { NIGERIAN_UNIVERSITIES } from "@/lib/nigerian-universities";

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
    defaultValues: { fullName: "", email: "", phone: "", password: "", university: "" },
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
          <span>KolejSwap</span>
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
                    <input type="email" autoComplete="email" placeholder="you@youruni.edu.ng" {...form.register("email")} className="ut-input" style={{ paddingLeft: 38 }} />
                  </div>
                  <FieldError message={form.formState.errors.email?.message} />
                </div>

                <div>
                  <label className="ut-field-label">Phone Number</label>
                  <div style={{ position: "relative" }}>
                    <Phone size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ut-ink-mute)", pointerEvents: "none" }} />
                    <input
                      type="tel"
                      autoComplete="tel"
                      placeholder="08012345678"
                      inputMode="numeric"
                      maxLength={14}
                      {...form.register("phone")}
                      className="ut-input"
                      style={{ paddingLeft: 38, fontFamily: "var(--ut-font-mono)" }}
                    />
                  </div>
                  <FieldError message={form.formState.errors.phone?.message} />
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
