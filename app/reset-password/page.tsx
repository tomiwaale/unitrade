"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);

    if (password.length < 6) {
      setFieldError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setFieldError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated — you're now signed in");
        router.push("/catalog");
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
          <div className="ut-auth-card-head">
            <h1>Set new password</h1>
            <p>Choose a strong password for your account.</p>
          </div>

          <div className="ut-auth-card-body">
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
              {/* New password */}
              <div>
                <label className="ut-field-label">New password</label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={15}
                    style={{
                      position: "absolute", left: 14, top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--ut-ink-mute)", pointerEvents: "none",
                    }}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="ut-input"
                    style={{ paddingLeft: 40, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: "absolute", right: 12, top: "50%",
                      transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--ut-ink-mute)", padding: 2,
                    }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="ut-field-label">Confirm password</label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={15}
                    style={{
                      position: "absolute", left: 14, top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--ut-ink-mute)", pointerEvents: "none",
                    }}
                  />
                  <input
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="ut-input"
                    style={{ paddingLeft: 40, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    style={{
                      position: "absolute", right: 12, top: "50%",
                      transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--ut-ink-mute)", padding: 2,
                    }}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {fieldError && (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#c53030" }}>{fieldError}</p>
                )}
              </div>

              <button
                type="submit"
                className="ut-cta ut-cta-primary"
                disabled={isPending}
                style={{ justifyContent: "center", padding: "13px 20px", marginTop: 4, borderRadius: 12 }}
              >
                {isPending ? "Updating…" : "Update password"}
                {!isPending && <ArrowRight size={15} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
