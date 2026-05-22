"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await requestPasswordReset(email);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setSent(true);
      }
    });
  }

  return (
    <div className="ut-auth-page">
      <div style={{ width: "100%", maxWidth: 460 }} className="ut-fade-up">
        <Link href="/" className="ut-logo" style={{ justifyContent: "center", marginBottom: 28, display: "flex" }}>
          <span className="ut-logo-mark">u</span>
          <span>KolejSwap</span>
        </Link>

        <div className="ut-auth-card">
          {sent ? (
            <>
              <div className="ut-auth-card-head">
                <CheckCircle size={32} style={{ color: "var(--ut-primary)", marginBottom: 12 }} />
                <h1>Check your inbox</h1>
                <p>
                  We sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.
                </p>
              </div>
              <div className="ut-auth-card-body">
                <p style={{ fontSize: 13.5, color: "var(--ut-ink-soft)", marginBottom: 20 }}>
                  Didn&apos;t receive it? Check your spam folder, or{" "}
                  <button
                    onClick={() => setSent(false)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--ut-primary)",
                      fontWeight: 500,
                      cursor: "pointer",
                      fontSize: "inherit",
                    }}
                  >
                    try again
                  </button>
                  .
                </p>
                <Link
                  href="/login"
                  className="ut-cta ut-cta-ghost"
                  style={{ justifyContent: "center", padding: "11px 20px", borderRadius: 12 }}
                >
                  <ArrowLeft size={15} />
                  Back to sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="ut-auth-card-head">
                <h1>Forgot password?</h1>
                <p>Enter your email and we&apos;ll send you a reset link.</p>
              </div>

              <div className="ut-auth-card-body">
                <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
                  <div>
                    <label className="ut-field-label">University Email</label>
                    <div style={{ position: "relative" }}>
                      <Mail
                        size={15}
                        style={{
                          position: "absolute",
                          left: 14,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--ut-ink-mute)",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="student@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="ut-input"
                        style={{ paddingLeft: 40 }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="ut-cta ut-cta-primary"
                    disabled={isPending}
                    style={{ justifyContent: "center", padding: "13px 20px", marginTop: 4, borderRadius: 12 }}
                  >
                    {isPending ? "Sending…" : "Send reset link"}
                    {!isPending && <ArrowRight size={15} />}
                  </button>
                </form>

                <p style={{ marginTop: 20, textAlign: "center", fontSize: 13.5, color: "var(--ut-ink-mute)" }}>
                  <Link
                    href="/login"
                    style={{ color: "var(--ut-ink-soft)", fontWeight: 500, textDecoration: "none" }}
                  >
                    ← Back to sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
