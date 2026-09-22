// Minimal markdown → email-safe HTML for marketing campaigns.
//
// Email clients ignore <style> blocks and most modern CSS, so every element is
// rendered with inline styles and table-free block layout. Input is escaped
// first, which means an admin cannot paste raw HTML into the composer and break
// rendering (or inject anything) — the supported syntax below is the whole API.
//
//   # / ## / ###      headings
//   **bold**  *italic*  `code`
//   [text](url)        inline link
//   a line that is ONLY a link  →  green CTA button
//   ![alt](url)        image
//   - item / 1. item   lists
//   > quote            callout box
//   ---                divider
//
// Merge tags — {{name}}, {{first_name}}, {{university}}, {{email}} — are
// substituted per recipient by renderMergeTags() before this runs.

const ACCENT = "#16a34a";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Anything that isn't a plain web/mail link is dropped rather than rendered,
// so `javascript:` and friends can never reach a recipient's client.
function safeUrl(raw: string) {
  const url = raw.trim();
  if (/^(https?:\/\/|mailto:|\/)/i.test(url)) return escapeHtml(url);
  return "";
}

function inline(text: string) {
  let out = escapeHtml(text);

  // ![alt](src)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, src) => {
    const url = safeUrl(src);
    if (!url) return "";
    return `<img src="${url}" alt="${alt}" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:16px 0"/>`;
  });

  // [text](href)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
    const url = safeUrl(href);
    if (!url) return label;
    return `<a href="${url}" style="color:${ACCENT};text-decoration:underline">${label}</a>`;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/`([^`]+)`/g, `<code style="background:#f3f4f6;padding:2px 5px;border-radius:4px;font-size:13px">$1</code>`);

  return out;
}

function button(label: string, href: string) {
  const url = safeUrl(href);
  if (!url) return "";
  return `<div style="margin:24px 0"><a href="${url}" style="display:inline-block;background:${ACCENT};color:#ffffff;padding:13px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${escapeHtml(label)}</a></div>`;
}

export function markdownToEmailHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  let listType: "ul" | "ol" | null = null;
  let paragraph: string[] = [];
  let quote: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(
      `<p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px">${inline(paragraph.join("\n")).replace(/\n/g, "<br/>")}</p>`
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!listType) return;
    out.push(`</${listType}>`);
    listType = null;
  };

  const flushQuote = () => {
    if (!quote.length) return;
    out.push(
      `<div style="border-left:3px solid ${ACCENT};background:#f0fdf4;padding:12px 16px;margin:0 0 16px;border-radius:0 8px 8px 0"><p style="margin:0;font-size:15px;line-height:1.6;color:#374151">${inline(quote.join(" "))}</p></div>`
    );
    quote = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    // A link alone on its line is a call-to-action button, not a paragraph.
    const soloLink = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(trimmed);
    if (soloLink) {
      flushAll();
      out.push(button(soloLink[1], soloLink[2]));
      continue;
    }

    const soloImage = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(trimmed);
    if (soloImage) {
      flushAll();
      out.push(inline(trimmed));
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushAll();
      out.push(`<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0"/>`);
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const size = level === 1 ? 24 : level === 2 ? 19 : 16;
      const top = out.length === 0 ? 0 : 24;
      out.push(
        `<h${level} style="font-size:${size}px;font-weight:700;color:#111827;margin:${top}px 0 12px;line-height:1.3">${inline(heading[2])}</h${level}>`
      );
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      flushList();
      quote.push(trimmed.replace(/^>\s?/, ""));
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      flushParagraph();
      flushQuote();
      const wanted: "ul" | "ol" = bullet ? "ul" : "ol";
      if (listType !== wanted) {
        flushList();
        listType = wanted;
        out.push(`<${wanted} style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;padding-left:22px">`);
      }
      out.push(`<li style="margin-bottom:6px">${inline((bullet ?? numbered)![1])}</li>`);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(trimmed);
  }

  flushAll();
  return out.join("\n");
}

export type MergeFields = {
  name?: string | null;
  email?: string | null;
  university?: string | null;
};

// Substitutes {{tags}} in raw markdown (before rendering) and in subject lines.
export function renderMergeTags(text: string, fields: MergeFields): string {
  const name = (fields.name ?? "").trim();
  const values: Record<string, string> = {
    name: name || "there",
    first_name: name.split(/\s+/)[0] || "there",
    email: fields.email ?? "",
    university: (fields.university ?? "").trim() || "your campus",
  };

  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = values[key.toLowerCase()];
    return value === undefined ? match : value;
  });
}

export const MERGE_TAGS = [
  { tag: "{{name}}", label: "Full name" },
  { tag: "{{first_name}}", label: "First name" },
  { tag: "{{university}}", label: "University" },
  { tag: "{{email}}", label: "Email address" },
] as const;
