"use client";

import { useTransition, useState } from "react";
import { updateProduct } from "@/app/actions/product";
import { toast } from "sonner";
import { ArrowRight, MapPin, LocateFixed } from "lucide-react";
import ImageUploader from "@/components/image-uploader";
import { useLocation } from "@/lib/hooks/use-location";

const CATEGORIES = [
  { label: "Textbooks", value: "textbooks" },
  { label: "Electronics", value: "electronics" },
  { label: "Furniture", value: "furniture" },
  { label: "Clothing", value: "clothing" },
  { label: "Other", value: "other" },
];

const CONDITIONS = [
  { label: "New", value: "new" },
  { label: "Like New", value: "like-new" },
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
  { label: "Poor", value: "poor" },
];

const OPEN_TO_OPTIONS = [
  { label: "Cash only", value: "cash-only" },
  { label: "Cash or swap", value: "cash-or-swap" },
  { label: "Swap only", value: "swap-only" },
] as const;

type OpenTo = "cash-only" | "cash-or-swap" | "swap-only";

interface Props {
  productId: string;
  defaults: {
    title: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
    condition: string;
    openTo: string;
    location: string;
  };
}

export default function EditListingForm({ productId, defaults }: Props) {
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState(defaults.category);
  const [condition, setCondition] = useState(defaults.condition);
  const [openTo, setOpenTo] = useState<OpenTo>((defaults.openTo as OpenTo) || "cash-only");
  const gpsLoc = useLocation();

  async function action(formData: FormData) {
    startTransition(async () => {
      const result = await updateProduct(productId, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Listing updated");
      }
    });
  }

  return (
    <form action={action} style={{ display: "grid", gap: 16 }}>
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="condition" value={condition} />
      <input type="hidden" name="open_to" value={openTo} />

      <div>
        <label className="ut-field-label">Title</label>
        <input
          name="title"
          defaultValue={defaults.title}
          placeholder="e.g. Intro to Psychology Textbook"
          required
          className="ut-input"
        />
      </div>

      <div>
        <label className="ut-field-label">Description</label>
        <textarea
          name="description"
          defaultValue={defaults.description}
          placeholder="Describe the condition, edition, included accessories, etc."
          required
          className="ut-textarea"
          rows={4}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="ut-field-label">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="ut-select"
          >
            <option value="" disabled>Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="ut-field-label">Condition</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="ut-select"
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="ut-field-label">Price (NGN)</label>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaults.price}
            required
            className="ut-input"
            style={{ fontFamily: "var(--ut-font-mono)" }}
          />
        </div>

        <div>
          <label className="ut-field-label">Open To</label>
          <div style={{ display: "flex", gap: 4 }}>
            {OPEN_TO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="ut-radio"
                data-active={openTo === opt.value ? "true" : "false"}
                onClick={() => setOpenTo(opt.value)}
                style={{ flex: 1, padding: "10px 4px", fontSize: 11.5, minWidth: 0 }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <label className="ut-field-label" style={{ margin: 0 }}>University / Location</label>
          {gpsLoc && (
            <button
              type="button"
              onClick={(e) => {
                const input = (e.currentTarget.closest("div")?.parentElement?.querySelector("input[name='location']")) as HTMLInputElement | null;
                if (input) input.value = `${defaults.location.split(",")[0]}, ${gpsLoc.suburb}`;
              }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11.5, fontWeight: 500, padding: "3px 8px",
                borderRadius: 6, border: "1px solid var(--ut-line)",
                background: "var(--ut-bg-sunken)", color: "var(--ut-primary-ink)",
                cursor: "pointer",
              }}
            >
              <LocateFixed size={11} /> Use my location
            </button>
          )}
        </div>
        <input
          name="location"
          defaultValue={defaults.location}
          placeholder="e.g. University of Lagos"
          required
          className="ut-input"
        />
        {gpsLoc && (
          <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--ut-ink-mute)", display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin size={10} style={{ color: "var(--ut-primary)" }} />
            Detected: {gpsLoc.label}
          </p>
        )}
      </div>

      <div>
        <label className="ut-field-label">
          Photos <span style={{ fontWeight: 400, color: "var(--ut-ink-mute)" }}>(optional)</span>
        </label>
        <ImageUploader defaultValues={defaults.imageUrl ? [defaults.imageUrl] : []} />
      </div>

      <div style={{ borderTop: "1px solid var(--ut-line)", paddingTop: 16 }}>
        <button
          type="submit"
          className="ut-cta ut-cta-primary"
          disabled={isPending}
          style={{ width: "100%", justifyContent: "center", padding: "14px 20px", fontSize: 14, borderRadius: 12 }}
        >
          {isPending ? "Saving…" : <>Save changes <ArrowRight size={15} /></>}
        </button>
      </div>
    </form>
  );
}
