"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Send, Clock, Users, Loader2, FileText, TestTube2, RefreshCw, Search, X, CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { NIGERIAN_UNIVERSITIES } from "@/lib/nigerian-universities";
import { markdownToEmailHtml, renderMergeTags, MERGE_TAGS } from "@/lib/email-markdown";
import {
  ACTIVITY_LABELS, VERIFICATION_LABELS, parseEmailList,
  type ActivityFilter, type Segment, type VerificationFilter,
} from "@/lib/marketing";
import {
  countAudience, resumeCampaign, saveCampaign, saveTemplate,
  scheduleCampaign, sendCampaignNow, sendTestEmail, unscheduleCampaign,
} from "../actions";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  preheader: string;
  body_md: string;
  segment: Segment;
  status: string;
  scheduled_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  started_at: string | null;
  completed_at: string | null;
};

const STARTER_BODY = `# Big news for {{first_name}}

Something new just landed on KolejSwap. Here's what's changed and why it matters for students at {{university}}.

- **Faster payouts** — money hits your bank the day a buyer confirms
- **Swap offers** — trade items instead of paying cash
- **Verified badges** — buy with confidence

[Browse listings](https://kolejswap.com/catalog)

> Questions? Just reply to this email — a real person reads every one.`;

export default function CampaignEditor({
  campaign, failures,
}: {
  campaign: Campaign;
  failures: { email: string; error: string | null }[];
}) {
  const router = useRouter();
  const editable = campaign.status === "draft" || campaign.status === "scheduled";

  const [name, setName] = useState(campaign.name);
  const [subject, setSubject] = useState(campaign.subject);
  const [preheader, setPreheader] = useState(campaign.preheader ?? "");
  const [body, setBody] = useState(campaign.body_md);
  const [segment, setSegment] = useState<Segment>(campaign.segment);
  const [dirty, setDirty] = useState(false);

  const [isSaving, startSaving] = useTransition();
  const [isSending, startSending] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const fields = { name, subject, preheader, body_md: body, segment };

  function markDirty<T>(setter: (value: T) => void) {
    return (value: T) => { setter(value); setDirty(true); };
  }

  function handleSave(silent = false) {
    startSaving(async () => {
      const result = await saveCampaign(campaign.id, fields);
      if (result?.error) toast.error(result.error);
      else {
        setDirty(false);
        if (!silent) toast.success("Campaign saved");
        router.refresh();
      }
    });
  }

  // Sending uses whatever is stored, so an unsaved edit would silently ship the
  // previous copy — save first, always.
  function saveThen(action: () => Promise<void>) {
    startSending(async () => {
      const saved = await saveCampaign(campaign.id, fields);
      if (saved?.error) { toast.error(saved.error); return; }
      setDirty(false);
      await action();
      router.refresh();
    });
  }

  function handleSendNow() {
    const confirmed = confirm(
      "Send this campaign now? Emails go out immediately and can't be recalled."
    );
    if (!confirmed) return;

    saveThen(async () => {
      const result = await sendCampaignNow(campaign.id);
      if ("error" in result && result.error) { toast.error(result.error); return; }
      if ("done" in result && result.done) {
        toast.success(`Campaign sent to ${result.sent} recipient${result.sent === 1 ? "" : "s"}`);
      } else {
        toast.success(
          `Sending… ${(result as any).sent} of ${(result as any).total} delivered. The rest continues in the background.`
        );
      }
    });
  }

  function insertMergeTag(tag: string) {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const next = body.slice(0, start) + tag + body.slice(textarea.selectionEnd);
    setBody(next);
    setDirty(true);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  const previewHtml = useMemo(() => {
    const sample = { name: "Ada Obi", email: "ada@example.com", university: "University of Lagos (UNILAG)" };
    return markdownToEmailHtml(renderMergeTags(body || "_Nothing to preview yet._", sample));
  }, [body]);

  const previewSubject = renderMergeTags(subject || "(no subject)", {
    name: "Ada Obi", email: "ada@example.com", university: "University of Lagos (UNILAG)",
  });

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Header
        campaign={campaign}
        name={name}
        editable={editable}
        dirty={dirty}
        isSaving={isSaving}
        isSending={isSending}
        onNameChange={markDirty(setName)}
        onSave={() => handleSave()}
        onSendNow={handleSendNow}
        onSchedule={(when) =>
          saveThen(async () => {
            const result = await scheduleCampaign(campaign.id, when);
            if (result?.error) toast.error(result.error);
            else toast.success("Campaign scheduled");
          })
        }
        onUnschedule={() =>
          startSending(async () => {
            await unscheduleCampaign(campaign.id);
            toast.success("Schedule cancelled");
            router.refresh();
          })
        }
        onResume={() =>
          startSending(async () => {
            const result = await resumeCampaign(campaign.id);
            if ("error" in result && result.error) toast.error(result.error);
            else toast.success(`Sent ${(result as any).sent} more`);
            router.refresh();
          })
        }
        onSaveTemplate={() => {
          const templateName = prompt("Template name", name);
          if (!templateName) return;
          startSaving(async () => {
            const result = await saveTemplate({
              name: templateName, subject, preheader, body_md: body,
            });
            if (result?.error) toast.error(result.error);
            else toast.success("Saved to templates");
          });
        }}
      />

      {campaign.status !== "draft" && <SendStats campaign={campaign} failures={failures} />}

      <div className="ut-marketing-grid">
        {/* ── Compose ── */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Panel title="Content">
            <Field label="Subject line">
              <input
                className="ut-input"
                value={subject}
                disabled={!editable}
                placeholder="Your escrow payouts just got faster"
                onChange={(e) => markDirty(setSubject)(e.target.value)}
              />
            </Field>

            <Field
              label="Preview text"
              hint="The grey line inboxes show next to the subject."
            >
              <input
                className="ut-input"
                value={preheader}
                disabled={!editable}
                placeholder="Plus two new ways to sell on campus"
                onChange={(e) => markDirty(setPreheader)(e.target.value)}
              />
            </Field>

            <Field label="Body" hint="Markdown. A link alone on its own line becomes a green button.">
              <textarea
                ref={bodyRef}
                className="ut-textarea"
                value={body}
                disabled={!editable}
                rows={16}
                placeholder={STARTER_BODY}
                onChange={(e) => markDirty(setBody)(e.target.value)}
                style={{ fontFamily: "var(--ut-font-mono)", fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
              />
            </Field>

            {editable && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--ut-ink-mute)" }}>Insert:</span>
                {MERGE_TAGS.map(({ tag, label }) => (
                  <button
                    key={tag}
                    type="button"
                    title={label}
                    onClick={() => insertMergeTag(tag)}
                    style={{
                      border: "1px solid var(--ut-line)", background: "var(--ut-bg)",
                      color: "var(--ut-ink-soft)", padding: "4px 9px", borderRadius: 7,
                      fontSize: 11.5, fontFamily: "var(--ut-font-mono)", cursor: "pointer",
                    }}
                  >
                    {tag}
                  </button>
                ))}
                {!body && (
                  <button
                    type="button"
                    onClick={() => { setBody(STARTER_BODY); setDirty(true); }}
                    style={{
                      border: 0, background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
                      padding: "4px 10px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Start from example
                  </button>
                )}
              </div>
            )}
          </Panel>

          <SegmentBuilder segment={segment} editable={editable} onChange={markDirty(setSegment)} />

          {editable && <TestSend subject={subject} preheader={preheader} body={body} />}
        </div>

        {/* ── Preview ── */}
        <div style={{ position: "sticky", top: 20, alignSelf: "start" }}>
          <Panel title="Preview" subtitle="Rendered with sample merge data">
            <div style={{
              border: "1px solid var(--ut-line)", borderRadius: 10, overflow: "hidden", background: "#fff",
            }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>KolejSwap</p>
                <p style={{ margin: "2px 0 0", fontSize: 13.5, fontWeight: 700, color: "#111827" }}>
                  {previewSubject}
                </p>
                {preheader && (
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>{preheader}</p>
                )}
              </div>
              <div style={{ maxHeight: "60vh", overflowY: "auto", padding: "20px 18px" }}>
                <p style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700, color: "#16a34a" }}>
                  KolejSwap
                </p>
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "26px 0" }} />
                <p style={{ fontSize: 11.5, color: "#9ca3af", margin: 0 }}>
                  KolejSwap — the student marketplace. Questions? Reply to this email.
                </p>
                <p style={{ fontSize: 11.5, color: "#9ca3af", margin: "6px 0 0" }}>
                  You&apos;re receiving this because you have a KolejSwap account.{" "}
                  <span style={{ textDecoration: "underline" }}>Unsubscribe from marketing emails</span>.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ── Header / actions ─────────────────────────────────────────────────────────

function Header({
  campaign, name, editable, dirty, isSaving, isSending,
  onNameChange, onSave, onSendNow, onSchedule, onUnschedule, onResume, onSaveTemplate,
}: {
  campaign: Campaign;
  name: string;
  editable: boolean;
  dirty: boolean;
  isSaving: boolean;
  isSending: boolean;
  onNameChange: (value: string) => void;
  onSave: () => void;
  onSendNow: () => void;
  onSchedule: (when: string) => void;
  onUnschedule: () => void;
  onResume: () => void;
  onSaveTemplate: () => void;
}) {
  const [scheduling, setScheduling] = useState(false);
  const [when, setWhen] = useState("");

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <input
        value={name}
        disabled={!editable}
        onChange={(e) => onNameChange(e.target.value)}
        aria-label="Campaign name"
        style={{
          border: 0, background: "transparent", padding: 0,
          fontSize: 22, fontWeight: 800, color: "var(--ut-ink)", width: "100%", outline: "none",
        }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {editable && (
          <>
            <ActionButton onClick={onSave} disabled={isSaving} icon={isSaving ? Loader2 : Save} spinning={isSaving}>
              {dirty ? "Save changes" : "Saved"}
            </ActionButton>

            <ActionButton primary onClick={onSendNow} disabled={isSending} icon={isSending ? Loader2 : Send} spinning={isSending}>
              Send now
            </ActionButton>

            {campaign.status === "scheduled" ? (
              <ActionButton onClick={onUnschedule} disabled={isSending} icon={X}>
                Cancel schedule
              </ActionButton>
            ) : (
              <ActionButton onClick={() => setScheduling((v) => !v)} icon={Clock}>
                Schedule
              </ActionButton>
            )}

            <ActionButton onClick={onSaveTemplate} disabled={isSaving} icon={FileText}>
              Save as template
            </ActionButton>
          </>
        )}

        {campaign.status === "sending" && (
          <ActionButton primary onClick={onResume} disabled={isSending} icon={isSending ? Loader2 : RefreshCw} spinning={isSending}>
            Send next batch
          </ActionButton>
        )}
      </div>

      {campaign.status === "scheduled" && campaign.scheduled_at && (
        <Callout>
          <CalendarClock size={14} />
          Scheduled to send {new Date(campaign.scheduled_at).toLocaleString()} — the cron job picks it up
          within a few minutes of that time.
        </Callout>
      )}

      {scheduling && editable && campaign.status !== "scheduled" && (
        <div style={{
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: 10, padding: 12,
        }}>
          <input
            type="datetime-local"
            className="ut-input"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            style={{ maxWidth: 240 }}
          />
          <ActionButton
            primary
            disabled={!when || isSending}
            onClick={() => { onSchedule(when); setScheduling(false); }}
            icon={Clock}
          >
            Confirm schedule
          </ActionButton>
        </div>
      )}

      {!editable && campaign.status === "sent" && (
        <Callout>
          This campaign has been sent, so its content is locked. Duplicate it from the campaigns list
          to send a revised version.
        </Callout>
      )}
    </div>
  );
}

function ActionButton({
  children, onClick, disabled, primary, icon: Icon, spinning,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  icon: typeof Save;
  spinning?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "9px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600,
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1,
        border: primary ? 0 : "1px solid var(--ut-line)",
        background: primary ? "var(--ut-primary)" : "var(--ut-bg-card)",
        color: primary ? "#fff" : "var(--ut-ink-soft)",
      }}
    >
      <Icon size={14} style={spinning ? { animation: "spin 1s linear infinite" } : undefined} />
      {children}
    </button>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
      borderRadius: 10, padding: "10px 14px", fontSize: 12.5, lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

// ── Delivery stats ───────────────────────────────────────────────────────────

function SendStats({
  campaign, failures,
}: {
  campaign: Campaign;
  failures: { email: string; error: string | null }[];
}) {
  const pending = Math.max(0, campaign.total_recipients - campaign.sent_count - campaign.failed_count);

  return (
    <Panel title="Delivery">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        <Stat label="Audience" value={campaign.total_recipients} />
        <Stat label="Delivered" value={campaign.sent_count} />
        <Stat label="Pending" value={pending} />
        <Stat label="Failed" value={campaign.failed_count} danger={campaign.failed_count > 0} />
      </div>

      {failures.length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--ut-ink-soft)", fontWeight: 600 }}>
            {failures.length} failed address{failures.length === 1 ? "" : "es"}
          </summary>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {failures.map((failure) => (
              <div key={failure.email} style={{ fontSize: 12, color: "var(--ut-ink-mute)" }}>
                <span style={{ color: "var(--ut-ink-soft)", fontWeight: 600 }}>{failure.email}</span>
                {failure.error ? ` — ${failure.error}` : ""}
              </div>
            ))}
          </div>
        </details>
      )}
    </Panel>
  );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>{label}</p>
      <p style={{
        margin: "2px 0 0", fontSize: 20, fontWeight: 800,
        color: danger ? "#dc2626" : "var(--ut-ink)",
      }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ── Segment builder ──────────────────────────────────────────────────────────

function SegmentBuilder({
  segment, editable, onChange,
}: {
  segment: Segment;
  editable: boolean;
  onChange: (segment: Segment) => void;
}) {
  const [counted, setCounted] = useState<{ key: string; count: number } | null>(null);
  const [isCounting, startCounting] = useTransition();
  const [search, setSearch] = useState("");
  const [manualText, setManualText] = useState(segment.emails.join("\n"));

  // The count is only meaningful for the filters it was computed from, so it's
  // derived rather than stored — editing a filter blanks it with no effect.
  const segmentKey = JSON.stringify(segment);
  const count = counted?.key === segmentKey ? counted.count : null;

  const filteredUniversities = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return NIGERIAN_UNIVERSITIES.slice(0, 40);
    return NIGERIAN_UNIVERSITIES.filter((u) => u.toLowerCase().includes(query)).slice(0, 40);
  }, [search]);

  function toggleUniversity(university: string) {
    const has = segment.universities.includes(university);
    onChange({
      ...segment,
      universities: has
        ? segment.universities.filter((u) => u !== university)
        : [...segment.universities, university],
    });
  }

  function refreshCount() {
    startCounting(async () => {
      const result = await countAudience(segment);
      if ("error" in result && result.error) toast.error(result.error);
      else setCounted({ key: segmentKey, count: (result as any).count });
    });
  }

  return (
    <Panel title="Audience" subtitle="Opted-out users are always excluded automatically.">
      <div style={{ display: "flex", gap: 4, background: "var(--ut-bg-sunken)", padding: 4, borderRadius: 9, marginBottom: 14 }}>
        {([
          ["audience", "User segment"],
          ["manual", "Manual list"],
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            disabled={!editable}
            onClick={() => onChange({ ...segment, mode })}
            style={{
              flex: 1, border: 0, cursor: editable ? "pointer" : "default", padding: "7px 12px", borderRadius: 7,
              fontSize: 12.5, fontWeight: segment.mode === mode ? 700 : 500,
              background: segment.mode === mode ? "var(--ut-bg-card)" : "transparent",
              color: segment.mode === mode ? "var(--ut-ink)" : "var(--ut-ink-mute)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {segment.mode === "manual" ? (
        <Field label="Email addresses" hint="One per line, or separated by commas.">
          <textarea
            className="ut-textarea"
            rows={6}
            disabled={!editable}
            value={manualText}
            placeholder={"ada@example.com\nchidi@example.com"}
            onChange={(e) => {
              setManualText(e.target.value);
              onChange({ ...segment, emails: parseEmailList(e.target.value) });
            }}
            style={{ fontFamily: "var(--ut-font-mono)", fontSize: 12.5, resize: "vertical" }}
          />
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ut-ink-mute)" }}>
            {segment.emails.length} valid address{segment.emails.length === 1 ? "" : "es"} detected
          </p>
        </Field>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <Field label="Verification">
              <select
                className="ut-select"
                disabled={!editable}
                value={segment.verification}
                onChange={(e) => onChange({ ...segment, verification: e.target.value as VerificationFilter })}
              >
                {Object.entries(VERIFICATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>

            <Field label="Activity">
              <select
                className="ut-select"
                disabled={!editable}
                value={segment.activity}
                onChange={(e) => onChange({ ...segment, activity: e.target.value as ActivityFilter })}
              >
                {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Universities"
            hint={segment.universities.length === 0 ? "None selected — sends to every university." : undefined}
          >
            {segment.universities.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {segment.universities.map((university) => (
                  <button
                    key={university}
                    disabled={!editable}
                    onClick={() => toggleUniversity(university)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
                      border: 0, padding: "5px 9px", borderRadius: 7,
                      fontSize: 11.5, fontWeight: 600, cursor: editable ? "pointer" : "default",
                    }}
                  >
                    {university} <X size={11} />
                  </button>
                ))}
              </div>
            )}

            {editable && (
              <>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search
                    size={14}
                    style={{
                      position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                      color: "var(--ut-ink-mute)", pointerEvents: "none",
                    }}
                  />
                  <input
                    className="ut-input"
                    placeholder="Search universities"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: 34 }}
                  />
                </div>
                <div style={{
                  maxHeight: 180, overflowY: "auto", border: "1px solid var(--ut-line)",
                  borderRadius: 9, padding: 6,
                }}>
                  {filteredUniversities.map((university) => {
                    const checked = segment.universities.includes(university);
                    return (
                      <label
                        key={university}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                          borderRadius: 7, cursor: "pointer", fontSize: 12.5,
                          color: checked ? "var(--ut-ink)" : "var(--ut-ink-soft)",
                          background: checked ? "var(--ut-primary-tint)" : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUniversity(university)}
                        />
                        {university}
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </Field>
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, marginTop: 14, flexWrap: "wrap",
      }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ut-ink-soft)", display: "flex", alignItems: "center", gap: 7 }}>
          <Users size={14} style={{ color: "var(--ut-ink-mute)" }} />
          {count === null
            ? "Audience size not calculated yet"
            : `${count.toLocaleString()} recipient${count === 1 ? "" : "s"} will receive this`}
        </p>
        <button
          onClick={refreshCount}
          disabled={isCounting}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            border: "1px solid var(--ut-line)", background: "var(--ut-bg-card)",
            color: "var(--ut-ink-soft)", padding: "7px 12px", borderRadius: 8,
            fontSize: 12.5, fontWeight: 600, cursor: "pointer",
          }}
        >
          {isCounting
            ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
            : <RefreshCw size={13} />}
          Calculate
        </button>
      </div>
    </Panel>
  );
}

// ── Test send ────────────────────────────────────────────────────────────────

function TestSend({ subject, preheader, body }: { subject: string; preheader: string; body: string }) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      const result = await sendTestEmail({ subject, preheader, body_md: body }, email);
      if (result?.error) toast.error(result.error);
      else toast.success(`Test sent to ${email}`);
    });
  }

  return (
    <Panel title="Send a test" subtitle="Delivers one copy with your own name merged in.">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="ut-input"
          type="email"
          placeholder="you@kolejswap.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button
          onClick={handleSend}
          disabled={isPending || !email}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            border: "1px solid var(--ut-line)", background: "var(--ut-bg-card)",
            color: "var(--ut-ink-soft)", padding: "9px 14px", borderRadius: 9,
            fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: isPending || !email ? 0.6 : 1,
          }}
        >
          {isPending
            ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            : <TestTube2 size={14} />}
          Send test
        </button>
      </div>
    </Panel>
  );
}

// ── Layout primitives ────────────────────────────────────────────────────────

function Panel({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section style={{
      background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
      borderRadius: 12, padding: 16,
    }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ut-ink)" }}>{title}</h2>
      {subtitle && (
        <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--ut-ink-mute)" }}>{subtitle}</p>
      )}
      <div style={{ marginTop: 14, display: "grid", gap: 14 }}>{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 12.5, fontWeight: 600,
        color: "var(--ut-ink-soft)", marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--ut-ink-mute)" }}>{hint}</p>
      )}
    </div>
  );
}
