"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { payoutSchema, type PayoutInput } from "@/lib/validations/auth";
import { savePayout, getBanks } from "@/app/actions/payout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTransition, useState, useEffect } from "react";
import { Landmark, CreditCard, ArrowRight, CheckCircle2 } from "lucide-react";

interface Bank { name: string; code: string; }

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p style={{ margin: "4px 0 0", fontSize: 12, color: "#c53030" }}>{message}</p>;
}

interface Props {
  existingBank?: string | null;
  existingAccountName?: string | null;
  existingAccountNumber?: string | null;
}

function maskAccount(num: string) {
  return num.length >= 4 ? "•".repeat(num.length - 4) + num.slice(-4) : num;
}

export default function PayoutSetupCard({ existingBank, existingAccountName, existingAccountNumber }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(!existingBank);
  const [savedBank, setSavedBank] = useState<string | null>(existingBank ?? null);
  const [savedName, setSavedName] = useState<string | null>(existingAccountName ?? null);
  const [justSaved, setJustSaved] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    setBanksLoading(true);
    getBanks().then((data) => {
      setBanks(data);
      setBanksLoading(false);
    });
  }, [isEditing]);

  const form = useForm<PayoutInput>({
    resolver: zodResolver(payoutSchema),
    defaultValues: { bankCode: "", bankName: "", accountNumber: "" },
  });

  function onSubmit(data: PayoutInput) {
    startTransition(async () => {
      const result = await savePayout(data);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setSavedName(result.accountName ?? null);
        setSavedBank(result.bankName ?? null);
        setIsEditing(false);
        setJustSaved(true);
        toast.success("Payout account saved!");
      }
    });
  }

  // Show saved confirmation immediately after saving
  if (justSaved && !isEditing) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 20px", borderRadius: "var(--ut-radius)",
        background: "var(--ut-primary-tint)", border: "1px solid color-mix(in srgb, var(--ut-primary) 25%, transparent)",
      }}>
        <CheckCircle2 size={18} style={{ color: "var(--ut-primary-ink)" }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ut-primary-ink)" }}>
            Payout account saved
          </p>
          {savedName && (
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ut-primary-ink)", opacity: 0.8 }}>
              {savedName}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setIsEditing(true); setJustSaved(false); }}
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

  // Already set up — show existing account details
  if (!isEditing && savedBank) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 20px", borderRadius: "var(--ut-radius)",
        background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
      }}>
        <CheckCircle2 size={18} style={{ color: "var(--ut-primary-ink)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ut-ink)" }}>
            {savedBank}
          </p>
          {savedName && (
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ut-ink-mute)" }}>
              {savedName}
              {existingAccountNumber && (
                <span style={{ marginLeft: 8, fontFamily: "monospace" }}>
                  {maskAccount(existingAccountNumber)}
                </span>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
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

  // Edit / first-time setup form
  return (
    <div style={{
      padding: "20px", borderRadius: "var(--ut-radius)",
      background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
    }}>
      <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 600, color: "var(--ut-ink)" }}>
        {savedBank ? "Update payout account" : "Set up your payout account"}
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "var(--ut-ink-mute)" }}>
        {savedBank
          ? "Enter your new bank details below."
          : "Required before you can publish listings and receive payments."}
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="ut-field-label">Settlement Bank</label>
          <Select onValueChange={(val: string | null) => {
              if (!val) {
                form.setValue("bankCode", "");
                form.setValue("bankName", "");
                return;
              }
              const bank = banks.find((b) => b.code === val);
              form.setValue("bankCode", val);
              form.setValue("bankName", bank?.name ?? "");
            }}>
            <SelectTrigger
              className="ut-input"
              style={{ height: "auto", padding: "11px 14px", borderRadius: 10, borderColor: "var(--ut-line)", background: "var(--ut-bg-card)" }}
            >
              <Landmark size={14} style={{ color: "var(--ut-ink-mute)", marginRight: 8 }} />
              <SelectValue placeholder={banksLoading ? "Loading banks…" : "Select a bank"} />
            </SelectTrigger>
            <SelectContent>
              {banks.map((bank) => (
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

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
          <button
            type="submit"
            className="ut-cta ut-cta-primary"
            disabled={isPending}
            style={{ fontSize: 13, padding: "10px 18px" }}
          >
            {isPending ? "Verifying…" : <><ArrowRight size={14} /> Save payout account</>}
          </button>
          {savedBank && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
              style={{
                fontSize: 13, padding: "10px 16px", borderRadius: "var(--ut-radius)",
                background: "none", border: "1px solid var(--ut-line)",
                color: "var(--ut-ink-mute)", cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
