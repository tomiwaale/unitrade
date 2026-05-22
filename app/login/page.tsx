"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { login } from "@/app/actions/auth";
import Link from "next/link";
import { toast } from "sonner";
import { useTransition } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(data: LoginInput) {
    startTransition(async () => {
      const result = await login(data);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="ut-auth-page">
      <div style={{ width: "100%", maxWidth: 460 }} className="ut-fade-up">
        {/* Logo */}
        <Link href="/" className="ut-logo" style={{ justifyContent: "center", marginBottom: 28, display: "flex" }}>
          <span className="ut-logo-mark">u</span>
          <span>KolejSwap</span>
        </Link>

        <div className="ut-auth-card">
          <div className="ut-auth-card-head">
            <h1>Welcome back</h1>
            <p>Sign in to your account to continue trading</p>
          </div>

          <div className="ut-auth-card-body">
            <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "grid", gap: 16 }}>
              {/* Email */}
              <div>
                <label className="ut-field-label">University Email</label>
                <div style={{ position: "relative" }}>
                  <Mail size={15} style={{
                    position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                    color: "var(--ut-ink-mute)", pointerEvents: "none",
                  }} />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="student@university.edu"
                    {...form.register("email")}
                    className="ut-input"
                    style={{ paddingLeft: 40 }}
                  />
                </div>
                {form.formState.errors.email && (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#c53030" }}>{form.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <label className="ut-field-label">Password</label>
                  <Link
                    href="/forgot-password"
                    style={{ fontSize: 12, color: "var(--ut-ink-soft)", textDecoration: "none" }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: "relative" }}>
                  <Lock size={15} style={{
                    position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                    color: "var(--ut-ink-mute)", pointerEvents: "none",
                  }} />
                  <input
                    type="password"
                    autoComplete="current-password"
                    {...form.register("password")}
                    className="ut-input"
                    style={{ paddingLeft: 40 }}
                  />
                </div>
                {form.formState.errors.password && (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#c53030" }}>{form.formState.errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="ut-cta ut-cta-primary"
                disabled={isPending}
                style={{ justifyContent: "center", padding: "13px 20px", marginTop: 4, borderRadius: 12 }}
              >
                {isPending ? "Signing in…" : "Sign in"}
                {!isPending && <ArrowRight size={15} />}
              </button>
            </form>

            <p style={{ marginTop: 20, textAlign: "center", fontSize: 13.5, color: "var(--ut-ink-mute)" }}>
              Don&apos;t have an account?{" "}
              <Link href="/register" style={{ color: "var(--ut-primary)", fontWeight: 500, textDecoration: "none" }}>
                Join free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
