"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/app/actions/review";
import { toast } from "sonner";
import { Star, Loader2, CheckCircle2 } from "lucide-react";

export default function LeaveReview({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { toast.error("Please select a star rating"); return; }
    startTransition(async () => {
      const result = await submitReview(orderId, rating, comment);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setDone(true);
        toast.success("Review submitted!");
      }
    });
  }

  if (done) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 18px", borderRadius: "var(--ut-radius)",
        background: "var(--ut-primary-tint)", border: "1px solid color-mix(in srgb, var(--ut-primary) 20%, transparent)",
        marginTop: 16,
      }}>
        <CheckCircle2 size={16} style={{ color: "var(--ut-primary-ink)" }} />
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: "var(--ut-primary-ink)" }}>
          Review submitted — thank you!
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
      borderRadius: "var(--ut-radius)", padding: "16px 18px", marginTop: 16,
    }}>
      <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 13.5, color: "var(--ut-ink)" }}>
        Leave a review for the seller
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        {/* Star rating */}
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
            >
              <Star
                size={28}
                style={{
                  color: star <= (hover || rating) ? "var(--ut-accent, #f59e0b)" : "var(--ut-line)",
                  fill: star <= (hover || rating) ? "var(--ut-accent, #f59e0b)" : "none",
                  transition: "color 0.1s, fill 0.1s",
                }}
              />
            </button>
          ))}
        </div>

        <div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience (optional)"
            maxLength={500}
            rows={3}
            className="ut-input"
            style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13.5 }}
          />
          <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--ut-ink-mute)", textAlign: "right" }}>
            {comment.length}/500
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending || !rating}
          className="ut-cta ut-cta-primary"
          style={{ fontSize: 13, padding: "10px 18px", justifyContent: "center" }}
        >
          {isPending
            ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Submitting…</>
            : "Submit review"
          }
        </button>
      </form>
    </div>
  );
}
