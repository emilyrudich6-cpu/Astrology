// ====== EDIT THIS FILE to change the brand, prices shown, tiers and question menu ======
// Prices are charged from Stripe by "lookup key" (set on each price in Stripe). If you change a
// price in Stripe, create the new price with the same lookup key ("Transfer lookup key"), then
// update the price text shown here.

export const BRAND = {
  name: "Vertex Point",
  tagline: "Some call it the Vertex Point. Some call it destiny.",
  emailFrom: "readings@vertexpoint.talk", // must be a domain you verify in Resend
  disclaimer: "For entertainment and self-reflection only. Not medical, legal, financial or psychological advice.",
};

export type Tier = "free" | "timeline" | "deep";
export type Interval = "month" | "year";

export const TIERS: Record<Tier, {
  label: string; price: string; blurb: string; perks: string[];
  monthlyTimeline: boolean; questionsPerMonth: number; savedPeople: number;
  compatPerMonth: number;         // synastry readings included each month (with saved people)
  fullChart: boolean;             // the Full Chart reading (natal, progressions, Human Design, 2-year timeline)
  stripeLookupKey?: string;       // Stripe price lookup key, monthly
  yearlyPrice?: string;           // shown on the site
  stripeYearlyLookupKey?: string; // Stripe price lookup key, yearly
  forSale?: boolean;              // offered to new members
}> = {
  free: {
    label: "Free", price: "$0", blurb: "Your full natal chart deep dive.",
    perks: ["Big three, chart ruler and angles", "Every planet: house, speed, declination", "Aspects, patterns, chart shape", "Nodes, Lilith, Part of Fortune and harmonics"],
    monthlyTimeline: false, questionsPerMonth: 0, savedPeople: 0, compatPerMonth: 0, fullChart: false,
  },
  timeline: {
    label: "Timeline", price: "$9 / month", blurb: "Your personal timeline, every month.",
    perks: ["Everything in Free", "Your Full Chart: progressions, fixed stars, Human Design and a 2-year timeline", "A monthly timeline with exact transit peak dates", "Themes and power windows for the month", "A manifestation ritual tied to your next key date"],
    monthlyTimeline: true, questionsPerMonth: 0, savedPeople: 0, compatPerMonth: 0, fullChart: true,
    stripeLookupKey: "timeline_monthly",
    yearlyPrice: "$90 / year (2 months free)", stripeYearlyLookupKey: "timeline_yearly",
    forSale: false, // existing Timeline members keep their plan; new members choose Vertex Point Monthly
  },
  deep: {
    // The subscription. Customers see "Vertex Point Monthly"; the internal key stays "deep" so existing members keep their plan.
    label: "Vertex Point Monthly", price: "$8.88 / month",
    blurb: "Get a monthly timeline update, five compatibility readings, and two personal astrology insights. They arrive in Your readings on surprise days.",
    perks: ["A monthly timeline update", "Five compatibility readings a month with your saved friends", "Two personal astrology insights a month", "Extra compatibility readings $3.99 each"],
    monthlyTimeline: true, questionsPerMonth: 2, savedPeople: 30, compatPerMonth: 5, fullChart: true,
    stripeLookupKey: "vp_monthly", // $8.88/month. The older $9.99 "deep_monthly" price still maps here through its "tier" metadata
    stripeYearlyLookupKey: "deep_yearly", // not sold now; kept so existing yearly members keep their plan
    forSale: true,
  },
};

/** One-time purchases for anyone signed in, subscribed or not. They arrive right away (about 2 minutes).
 *  Set enabled: false to hide one. */
export type OneTimeKey = "question" | "synastry" | "yearahead" | "extra" | "deepdive" | "audio";
export const ONE_TIME: Record<OneTimeKey, {
  enabled: boolean; label: string; price: string; blurb: string; stripeLookupKey: string;
  cta?: string;          // button text
  membersOnly?: boolean; // only Vertex Point Monthly members can buy it
  founding?: { price: string; limit: number; stripeLookupKey: string }; // early-buyer price for the first `limit` sales
  bonusTimelineDays?: number; // free timeline included with the purchase
}> = {
  synastry: {
    enabled: true, label: "Compatibility (Synastry)", price: "$11.11", cta: "Compare our charts",
    blurb: "Your chart next to theirs, both included. Where you two click, where you'll clash, and how to move through it, plus how your timelines line up over the next year. Your first one includes a free month of your personal timeline.",
    stripeLookupKey: "compat_regular",
    bonusTimelineDays: 30,
  },
  question: { enabled: false, label: "Single question", price: "$9", blurb: "Pick one question from the menu and get your answer in minutes.", stripeLookupKey: "one_question" },
  extra: { enabled: true, membersOnly: true, label: "Extra synastry reading", price: "$3.99", blurb: "One more synastry reading this month, beyond the 5 in your plan.", stripeLookupKey: "compat_extra" },
  yearahead: { enabled: true, label: "Year-Ahead Timeline", price: "$7.77", cta: "See my year ahead", blurb: "Your next 12 months: every major transit peak date, grouped into themes and windows.", stripeLookupKey: "yearahead_v2" },
  deepdive: { enabled: true, label: "Natal Chart Deep Dive", price: "$5.55", cta: "Get my deep dive", blurb: "Your whole birth chart in writing: your Big Three and chart ruler, every planet, the aspects, your chart's shape and hidden talents, and a closing ritual.", stripeLookupKey: "natal_deepdive" },
  // Published only when FEATURE_AUDIO_PREORDER is on, AUDIO_DELIVERY_NOTE says when and how it's delivered, and the Stripe price exists
  audio: { enabled: process.env.FEATURE_AUDIO_PREORDER === "on" && !!process.env.AUDIO_DELIVERY_NOTE, label: "Your Chart, in Audio", price: "$25", cta: "Pre-order my audio reading", blurb: "A personal audio reading that walks you through your birth chart and what it can tell you about yourself.", stripeLookupKey: "audio_preorder" },
};

/** When and how a pre-ordered audio reading is delivered, shown to the buyer before and after paying */
export const AUDIO_DELIVERY_NOTE = process.env.AUDIO_DELIVERY_NOTE ?? "";

/** "$11.11" -> 1111, "$8.88 / month" -> 888: what Stripe should be charging for a price shown on the site */
export const cents = (shown: string) => Math.round(parseFloat(shown.replace(/[^0-9.]/g, "")) * 100);

/** Surprise delivery: answers arrive between these many days after asking */
export const DELIVERY_DAYS = { min: 2, max: 9 };
/** ...at a random local time between these hours */
export const DELIVERY_HOURS = { from: 10, to: 20 };

/** The question menu: category -> follow-up questions. Keys match the engine's focus areas. */
export const QUESTION_MENU: { key: string; label: string; emoji: string; questions: string[] }[] = [
  { key: "love", label: "Love & dating", emoji: "♀", questions: [
    "When is my next big romantic window?",
    "What's the energy around my current relationship?",
    "What do I need to know about moving on from someone?",
    "What am I really looking for in a partner?",
  ] },
  { key: "career", label: "Career & purpose", emoji: "♄", questions: [
    "When is the best timing to go after a promotion or new role?",
    "Is now the time to start my own thing?",
    "What kind of work am I built for?",
    "How do I handle the tension at work right now?",
  ] },
  { key: "money", label: "Money & worth", emoji: "♃", questions: [
    "When are my strongest money windows this year?",
    "What's my relationship with money and self-worth?",
    "What's the energy around a big purchase I'm considering?",
  ] },
  { key: "home", label: "Home & family", emoji: "☽", questions: [
    "Is a move in my near future?",
    "What's the energy with my family right now?",
    "How do I make home feel like mine?",
  ] },
  { key: "friends", label: "Friends & social life", emoji: "☿", questions: [
    "Who's really in my corner right now?",
    "When is a good time to put myself out there?",
    "What's shifting in my friendships?",
  ] },
  { key: "growth", label: "Spirit & growth", emoji: "♆", questions: [
    "What is my soul's direction right now?",
    "What am I being asked to release?",
    "What's my next big lesson?",
  ] },
  { key: "self", label: "Self & glow-up", emoji: "☉", questions: [
    "When is my next reinvention window?",
    "How am I coming across to others right now?",
    "Where should I put my energy this month?",
  ] },
];

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
