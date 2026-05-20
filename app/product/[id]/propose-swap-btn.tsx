"use client";

import { useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { proposeSwap } from "@/app/actions/swap";
import { ArrowLeftRight, X, Loader2, Check, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  productId: string;
  sellerId: string;
  productTitle: string;
}

interface MyListing {
  id: string;
  title: string;
  price: number;
  images: string[];
}

const CAT_EMOJI: Record<string, string> = {
  textbooks: "📚", electronics: "💻", furniture: "🛋️",
  clothing: "👗", fashion: "👗", hostel: "🏠", services: "⚡", other: "📦",
};

export default function ProposeSwapBtn({ productId, productTitle }: Props) {
  const [open, setOpen]               = useState(false);
  const [myListings, setMyListings]   = useState<MyListing[]>([]);
  const [loading, setLoading]         = useState(false);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [note, setNote]               = useState("");
  const [cashTopup, setCashTopup]     = useState("");
  const [isPending, startTransition]  = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return; }
      const { data: listings } = await supabase
        .from("products")
        .select("id, title, price, images, category")
        .eq("seller_id", data.user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      setMyListings((listings ?? []).filter((l: any) => l.id !== productId));
      setLoading(false);
    });
  }, [open, productId]);

  function handleOpen() {
    setOpen(true);
    setSelectedId(null);
    setNote("");
    setCashTopup("");
  }

  function handleSubmit() {
    if (!selectedId) return;
    const topup = cashTopup ? parseFloat(cashTopup) : 0;
    startTransition(async () => {
      const result = await proposeSwap(productId, selectedId, note, topup > 0 ? topup : undefined);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Swap offer sent!");
        setOpen(false);
        router.push("/swaps");
      }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="ut-cta"
        style={{
          justifyContent: "center", width: "100%",
          padding: "14px 16px", fontSize: 14, borderRadius: 12,
          background: "var(--ut-ink)", color: "white",
        }}
      >
        <ArrowLeftRight size={15} /> Propose a swap
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            width: "100%", maxWidth: 520,
            background: "var(--ut-bg-card)",
            borderRadius: "20px 20px 0 0",
            padding: "24px 20px 40px",
            maxHeight: "85vh",
            display: "flex", flexDirection: "column", gap: 18,
            overflowY: "auto",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: "var(--ut-ink)" }}>
                  Offer a swap
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ut-ink-mute)" }}>
                  for &quot;{productTitle}&quot;
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--ut-ink-mute)" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Pick a listing */}
            <div>
              <p style={{
                margin: "0 0 10px",
                fontSize: 11, fontFamily: "var(--ut-font-mono)",
                textTransform: "uppercase", letterSpacing: "0.1em",
                color: "var(--ut-ink-mute)",
              }}>
                Which of your listings are you offering?
              </p>

              {loading ? (
                <div style={{ padding: "28px", textAlign: "center" }}>
                  <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--ut-ink-mute)" }} />
                </div>
              ) : myListings.length === 0 ? (
                <div style={{
                  padding: "24px 20px", textAlign: "center",
                  background: "var(--ut-bg-sunken)", borderRadius: 12,
                }}>
                  <PackageOpen size={26} style={{ color: "var(--ut-ink-mute)", marginBottom: 8 }} />
                  <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 500, color: "var(--ut-ink-soft)" }}>
                    No active listings to offer
                  </p>
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--ut-ink-mute)" }}>
                    List an item first, then come back to propose a swap.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {myListings.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 12px", borderRadius: 10, width: "100%",
                        border: `1.5px solid ${selectedId === item.id ? "var(--ut-primary)" : "var(--ut-line)"}`,
                        background: selectedId === item.id ? "var(--ut-primary-tint)" : "var(--ut-bg-card)",
                        cursor: "pointer", textAlign: "left",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                        overflow: "hidden", background: "var(--ut-bg-sunken)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {item.images?.[0]
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={item.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 20 }}>{CAT_EMOJI[item.category] ?? "📦"}</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontSize: 13.5, fontWeight: 500, color: "var(--ut-ink)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {item.title}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ut-ink-mute)" }}>
                          ₦{Number(item.price).toLocaleString()}
                        </p>
                      </div>
                      {selectedId === item.id && (
                        <Check size={16} style={{ color: "var(--ut-primary-ink)", flexShrink: 0 }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cash top-up */}
            <div>
              <p style={{
                margin: "0 0 8px",
                fontSize: 11, fontFamily: "var(--ut-font-mono)",
                textTransform: "uppercase", letterSpacing: "0.1em",
                color: "var(--ut-ink-mute)",
              }}>
                Add cash on top (optional)
              </p>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  fontSize: 13.5, color: "var(--ut-ink-mute)", pointerEvents: "none",
                }}>
                  ₦
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={cashTopup}
                  onChange={(e) => setCashTopup(e.target.value)}
                  placeholder="0"
                  style={{
                    width: "100%", padding: "10px 12px 10px 26px", borderRadius: 10,
                    border: "1.5px solid var(--ut-line)",
                    background: "var(--ut-bg-sunken)",
                    fontSize: 13.5, color: "var(--ut-ink)",
                    outline: "none", boxSizing: "border-box",
                    fontFamily: "var(--ut-font-mono)",
                  }}
                />
              </div>
              <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "var(--ut-ink-mute)" }}>
                Paid in cash at the time of handoff.
              </p>
            </div>

            {/* Note */}
            <div>
              <p style={{
                margin: "0 0 8px",
                fontSize: 11, fontFamily: "var(--ut-font-mono)",
                textTransform: "uppercase", letterSpacing: "0.1em",
                color: "var(--ut-ink-mute)",
              }}>
                Add a note (optional)
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Condition details, why it's a fair trade…"
                rows={2}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10,
                  border: "1.5px solid var(--ut-line)",
                  background: "var(--ut-bg-sunken)",
                  fontSize: 13.5, color: "var(--ut-ink)",
                  resize: "none", outline: "none",
                  fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!selectedId || isPending}
              className="ut-cta ut-cta-primary"
              style={{
                justifyContent: "center", padding: "14px", fontSize: 14, borderRadius: 12,
                opacity: !selectedId || isPending ? 0.5 : 1,
                cursor: !selectedId || isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Sending offer…</>
                : <><ArrowLeftRight size={15} /> Send swap offer</>
              }
            </button>
          </div>
        </div>
      )}
    </>
  );
}
