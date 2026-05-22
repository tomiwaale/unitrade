"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions/profile";
import { NIGERIAN_UNIVERSITIES } from "@/lib/nigerian-universities";
import { toast } from "sonner";
import { Pencil, X, Check, Loader2 } from "lucide-react";

interface Props {
  fullName: string;
  phone: string;
  university: string;
}

export default function ProfileEdit({ fullName, phone, university }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ fullName, phone, university });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateProfile(form);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated");
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12.5, fontWeight: 500, color: "var(--ut-primary-ink)",
          background: "var(--ut-primary-tint)", border: "none",
          padding: "6px 12px", borderRadius: 8, cursor: "pointer",
        }}
      >
        <Pencil size={12} /> Edit profile
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      marginTop: 16, padding: "18px 20px", borderRadius: "var(--ut-radius)",
      background: "var(--ut-bg-sunken)", border: "1px solid var(--ut-line)",
      display: "grid", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>Edit profile</span>
        <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ut-ink-mute)", padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="ut-field-label">Full name</label>
        <input
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          className="ut-input"
          placeholder="Your full name"
          required
        />
      </div>

      <div>
        <label className="ut-field-label">Phone number</label>
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          className="ut-input"
          placeholder="08012345678"
          inputMode="tel"
          required
        />
      </div>

      <div>
        <label className="ut-field-label">University</label>
        <select
          name="university"
          value={form.university}
          onChange={handleChange}
          className="ut-input"
          required
        >
          <option value="">Select university</option>
          {NIGERIAN_UNIVERSITIES.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          type="submit"
          disabled={isPending}
          className="ut-cta ut-cta-primary"
          style={{ fontSize: 13, padding: "9px 16px" }}
        >
          {isPending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ut-cta ut-cta-ghost"
          style={{ fontSize: 13, padding: "9px 16px" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
