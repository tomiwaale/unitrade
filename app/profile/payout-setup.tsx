"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { payoutSchema, type PayoutInput } from "@/lib/validations/auth";
import { savePayout } from "@/app/actions/payout";
import { SUPPORTED_BANKS } from "@/lib/banks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTransition, useState } from "react";
import { Landmark, CreditCard, ArrowRight, CheckCircle2 } from "lucide-react";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p style={{ margin: "4px 0 0", fontSize: 12, color: "#c53030" }}>{message}</p>;
}

interface Props {
  existingBank?: string | null;
  existingAccountName?: string | null;
}

export default function PayoutSetupCard({ existingBank, existingAccountName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [resolvedName, setResolvedName] = useState<string | null>(existingAccountName ?? null);

  const form = useForm<PayoutInput>({
    resolver: zodResolver(payoutSchema),
    defaultValues: { bankCode: "", accountNumber: "" },
  });

  function onSubmit(data: PayoutInput) {
    startTransition(async () => {
      const result = await savePayout(data);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setResolvedName(result.accountName ?? null);
        setDone(true);
        toast.success("Payout account saved!");
      }
    });
  }

  // Already set up
  if (existingBank && !done) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 20px", borderRadius: "var(--ut-radius)",
        background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
      }}>
        <CheckCircle2 size={18} style={{ color: "var(--ut-primary-ink)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ut-ink)" }}>
            {existingBank}
          </p>
          {resolvedName && (
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ut-ink-mute)" }}>
              {resolvedName}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDone(false)}
          style={{
            fontSize: 12, color: "var(--ut-primary-ink)", background: "none",
            border: "none", cursor: "pointer", padding: "4px 8px",
            borderRadius: 6, fontWeight: 500,
          }}
        >
          Change
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 20px", borderRadius: "var(--ut-radius)",
        background: "var(--ut-primary-tint)", border: "1px solid color-mix(in srgb, var(--ut-primary) 25%, transparent)",
      }}>
        <CheckCircle2 size={18} style={{ color: "var(--ut-primary-ink)" }} />
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ut-primary-ink)" }}>
            Payout account saved
          </p>
          {resolvedName && (
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ut-primary-ink)", opacity: 0.8 }}>
              {resolvedName}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: "20px", borderRadius: "var(--ut-radius)",
      background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
    }}>
      <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 600, color: "var(--ut-ink)" }}>
        Set up your payout account
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "var(--ut-ink-mute)" }}>
        Required before you can publish listings and receive payments.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            <input
              autoComplete="off"
              placeholder="0123456789"
              maxLength={10}
              inputMode="numeric"
              {...form.register("accountNumber")}
              className="ut-input"
              style={{ paddingLeft: 38, fontFamily: "var(--ut-font-mono)" }}
            />
          </div>
          <FieldError message={form.formState.errors.accountNumber?.message} />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <button
            type="submit"
            className="ut-cta ut-cta-primary"
            disabled={isPending}
            style={{ fontSize: 13, padding: "10px 18px" }}
          >
            {isPending ? "Verifying…" : <><ArrowRight size={14} /> Save payout account</>}
          </button>
        </div>
      </form>
    </div>
  );
}
