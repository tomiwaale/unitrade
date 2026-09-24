// Ready-made marketing campaigns.
//
// The template table (`email_templates`) only ever holds what an admin saved
// themselves, so a fresh deployment opens /admin/marketing with nothing to
// start from. These starters fill that gap: each one is a complete campaign —
// subject, preheader, body and the audience it's meant for — that an admin can
// turn into an editable draft in one click.
//
// Bodies are written in the markdown dialect of lib/email-markdown.ts, which is
// what the composer edits and what markdownToEmailHtml renders into the branded
// HTML shell from lib/email.ts. So a starter is the same kind of content an
// admin would type by hand — not a separate HTML path to keep in sync.
//
// Square-bracket placeholders like [feature name] are deliberate: they aren't
// link syntax, so they render literally and read as blanks to fill in.

import type { Segment } from "@/lib/marketing";

// Campaign links have to be absolute — a relative href is dead in an inbox.
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  process.env.APP_URL?.replace(/\/$/, "") ??
  "https://kolejswap.com";

export type StarterCategory =
  | "Onboarding"
  | "Activation"
  | "Re-engagement"
  | "Announcement"
  | "Seasonal"
  | "Trust"
  | "Growth";

export type StarterTemplate = {
  slug: string;
  name: string;
  category: StarterCategory;
  /** One line on when to reach for this one — shown in the admin picker. */
  description: string;
  subject: string;
  preheader: string;
  body_md: string;
  /** Pre-fills the campaign's segment builder with the audience it's written for. */
  segment: Segment;
};

const EVERYONE: Segment = {
  mode: "audience",
  universities: [],
  verification: "any",
  activity: "any",
  emails: [],
};

function audience(overrides: Partial<Segment>): Segment {
  return { ...EVERYONE, ...overrides };
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    slug: "welcome-new-users",
    name: "Welcome & first steps",
    category: "Onboarding",
    description:
      "Introduce KolejSwap to people who signed up but haven't looked around yet.",
    subject: "Welcome to KolejSwap, {{first_name}} 👋",
    preheader: "Buy, sell and swap with verified students on your campus.",
    body_md: `# Welcome, {{first_name}} 👋

You're in. KolejSwap is where students at {{university}} buy, sell and swap textbooks, gadgets, hostel gear and everything in between — without the "I sent the money and they stopped replying" story.

Three things make it work:

- **Escrow on every order.** Your money is held safely and only released when you confirm you got the item.
- **Verified students only.** Every seller's school ID and NIN is checked before they can list.
- **Your campus first.** You're seeing people you can actually meet, not strangers three states away.

[Browse what's on sale](${SITE}/catalog)

---

## Sitting on something you don't use?

That textbook you're done with, the mini fridge, the ring light you used twice — somebody on your campus is searching for it right now.

[Start selling](${SITE}/sell)`,
    segment: audience({ activity: "dormant" }),
  },

  {
    slug: "get-verified",
    name: "Get verified to start selling",
    category: "Activation",
    description:
      "Nudge unverified accounts through KYC so they can list items and get paid.",
    subject: "{{first_name}}, you're two minutes from selling",
    preheader: "Verify your school ID and NIN to unlock listings and payouts.",
    body_md: `# You're two minutes away, {{first_name}}

Your KolejSwap account is ready — but you'll need to be verified before you can list anything. It's a one-time check, and it takes about two minutes.

**What you'll need**

1. A clear photo of the front of your school ID card, showing your name and matric number
2. Your NIN

> Verification is the whole reason buyers trust listings here. Every seller you'd buy from went through exactly the same check.

[Get verified](${SITE}/kyc)

---

Once you're approved, the verified badge shows on your profile, and money from your sales goes straight to your bank account after each delivery is confirmed.`,
    segment: audience({ verification: "unverified" }),
  },

  {
    slug: "first-listing",
    name: "List your first item",
    category: "Activation",
    description:
      "Push verified users who have never listed anything to post their first item.",
    subject: "What are you not using right now?",
    preheader: "You're verified — listing takes under a minute.",
    body_md: `# What's sitting unused in your room, {{first_name}}?

You're verified, so you can list in under a minute. Most students have ₦20,000 to ₦50,000 worth of things they've stopped using entirely.

**Sells fastest at {{university}}:**

- Past textbooks, handouts and past questions
- Phones, laptops, chargers and power banks
- Rechargeable fans, kettles, mini fridges
- Sneakers, bags and clothes you've outgrown
- Hostel furniture, especially near the end of a session

[List your first item](${SITE}/sell)

---

A photo, a price and a few words is all it takes. We handle the payment, hold it in escrow, and pay you out once the buyer confirms delivery.`,
    segment: audience({ verification: "verified", activity: "dormant" }),
  },

  {
    slug: "winback-dormant",
    name: "Win back quiet users",
    category: "Re-engagement",
    description:
      "Bring back accounts that signed up but never bought or listed anything.",
    subject: "It's been a while, {{first_name}}",
    preheader: "New listings from students on your campus are going up daily.",
    body_md: `# It's been a while, {{first_name}}

Plenty has changed on KolejSwap since you last stopped by, and students at {{university}} are posting new listings every day.

- Fresh listings across textbooks, gadgets and hostel essentials
- Escrow protection on every single order, no exceptions
- Chat with a seller and agree on a meetup before you commit to anything

[See what's new](${SITE}/catalog)

---

And if you've got things you no longer use, this is the easiest time to clear them out — one photo and a price is enough.

[Sell something](${SITE}/sell)`,
    segment: audience({ activity: "dormant" }),
  },

  {
    slug: "campus-launch",
    name: "Campus launch announcement",
    category: "Announcement",
    description:
      "Announce KolejSwap launching at one school. Replace [University name] and pick that school in the segment.",
    subject: "KolejSwap is live at [University name] 🎉",
    preheader: "Buy and sell with verified students on your own campus.",
    body_md: `# We're live at [University name] 🎉

KolejSwap has officially landed on your campus. That means you can now buy, sell and swap with students who are a walk away — not a courier and a prayer away.

**What you can do from today**

- Browse listings from verified students at [University name]
- Sell what you're not using and get paid straight to your bank account
- Pay through escrow, so your money is only released once you have the item in hand

[Browse campus listings](${SITE}/catalog)

---

> Early listings get seen the most. If you post something this week, you're in front of everyone joining right now.

[Post a listing](${SITE}/sell)`,
    segment: EVERYONE,
  },

  {
    slug: "feature-announcement",
    name: "New feature announcement",
    category: "Announcement",
    description:
      "Fill-in-the-blanks shell for shipping news. Replace the bracketed parts.",
    subject: "New on KolejSwap: [feature name]",
    preheader: "[One line on what it does — this is the inbox preview text.]",
    body_md: `# Introducing [feature name]

[One or two sentences on what it does and who asked for it.]

## Why it's worth your time

- **[Benefit one]** — [the detail that makes it real]
- **[Benefit two]** — [the detail that makes it real]
- **[Benefit three]** — [the detail that makes it real]

[Try it now](${SITE}/catalog)

---

[Anything else worth knowing — limits, rollout timing, what's coming next.]

Got feedback? Just reply to this email — it reaches the team directly.`,
    segment: EVERYONE,
  },

  {
    slug: "semester-sell-off",
    name: "End-of-semester sell-off",
    category: "Seasonal",
    description:
      "Send as exams wrap and students pack up. Targets sellers and dormant accounts.",
    subject: "Going home? Don't pack it — sell it",
    preheader: "Clear out your room before you travel and cash out.",
    body_md: `# Don't pack it. Sell it.

Semester's winding down, {{first_name}}. Before you squeeze everything into a bag and haul it home, remember that most of it is worth real money to somebody staying behind — or resuming next session.

**Clears out fastest right now**

- Textbooks and handouts for courses you've finished
- Fans, kettles, buckets, mattresses and hostel furniture
- Gadgets you've upgraded from
- Anything you only bought for one course

[Clear out your room](${SITE}/sell)

---

> List it before you travel. Escrow holds the buyer's money, so you can arrange handover on your own schedule without chasing anyone for payment.`,
    segment: audience({ activity: "sellers" }),
  },

  {
    slug: "back-to-school",
    name: "Resumption deals",
    category: "Seasonal",
    description:
      "Send at the start of a new session, when students are kitting out their rooms.",
    subject: "Your resumption kit, without resumption prices",
    preheader: "Everything for your room, from students on your campus.",
    body_md: `# Kit out your room for less

New session, {{first_name}}. Before you pay full price in town, check what students at {{university}} are already selling — most of it barely used, all of it a walk away.

**What people are listing right now**

- Textbooks and handouts for this semester's courses
- Rechargeable fans, kettles, extension boxes and lamps
- Mattresses, shelves, chairs and storage
- Laptops, phones and accessories

[Shop resumption deals](${SITE}/catalog)

---

## Moving out of a room you've kitted already?

Sell what you're leaving behind to whoever's moving in.

[List your items](${SITE}/sell)`,
    segment: EVERYONE,
  },

  {
    slug: "how-escrow-works",
    name: "How escrow protects you",
    category: "Trust",
    description:
      "Trust-builder for people who browse but hesitate to pay. Good after a scam scare.",
    subject: "Your money doesn't move until you say so",
    preheader: "How escrow works on every KolejSwap order.",
    body_md: `# Your money doesn't move until you say so

The reason most campus deals go wrong is simple: somebody has to send money first, and hope. KolejSwap removes the hoping.

**What actually happens when you pay**

1. You pay for an item. The money goes to KolejSwap, **not** to the seller.
2. The seller is told to hand over the item — they can see the money is secured.
3. You get the item and check it's what was described.
4. You tap **I've received this**, and only then is the seller paid.

> If the item never shows up, or it's not what was described, you raise a dispute within 7 days and the money stays frozen while our team reviews it.

[Browse with confidence](${SITE}/catalog)

---

On top of that, every seller has had their school ID and NIN verified before they could list anything. You're dealing with a real student on a real campus.`,
    segment: EVERYONE,
  },

  {
    slug: "invite-coursemates",
    name: "Invite your coursemates",
    category: "Growth",
    description:
      "Ask happy, active users to pull their coursemates onto the platform.",
    subject: "Your coursemates are still paying full price",
    preheader: "Share KolejSwap with the people in your department.",
    body_md: `# Your coursemates are still paying full price

You already know how this works, {{first_name}} — but the person sitting next to you in class is probably still buying textbooks brand new and selling their old gadgets in a WhatsApp group with no protection at all.

**Why it's worth telling them**

- More students at {{university}} means more listings for you to buy from
- The things you're selling reach more people in your department
- Every order they make is escrow-protected, same as yours

[Share KolejSwap](${SITE})

---

Send them the link, or just tell them to search for whatever they're about to overpay for. It'll probably be on there.`,
    segment: audience({ activity: "buyers" }),
  },
];

export function findStarterTemplate(slug: string): StarterTemplate | undefined {
  return STARTER_TEMPLATES.find((t) => t.slug === slug);
}

/**
 * The serialisable subset the admin picker renders. Bodies stay on the server —
 * the client only ever sends back a slug.
 */
export type StarterTemplateMeta = Pick<
  StarterTemplate,
  "slug" | "name" | "category" | "description" | "subject"
>;

export function starterTemplateMeta(): StarterTemplateMeta[] {
  return STARTER_TEMPLATES.map(({ slug, name, category, description, subject }) => ({
    slug,
    name,
    category,
    description,
    subject,
  }));
}
