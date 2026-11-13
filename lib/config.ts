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
  stripeLookupKey?: string;       // Stripe price lookup key, monthly
  yearlyPrice?: string;           // shown on the site
  stripeYearlyLookupKey?: string; // Stripe price lookup key, yearly
}> = {
  free: {
    label: "Free", price: "$0", blurb: "Your full natal chart deep dive.",
    perks: ["Big three, chart ruler and angles", "Every planet: house, speed, declination", "Aspects, patterns, chart shape", "Nodes, Lilith, Part of Fortune and harmonics"],
    monthlyTimeline: false, questionsPerMonth: 0, savedPeople: 0, compatPerMonth: 0,
  },
  timeline: {
    label: "Timeline", price: "$9 / month", blurb: "Your personal timeline, every month.",
    perks: ["Everything in Free", "A monthly timeline with exact transit peak dates", "Themes and power windows for the month", "A manifestation ritual tied to your next key date"],
    monthlyTimeline: true, questionsPerMonth: 0, savedPeople: 0, compatPerMonth: 0,
    stripeLookupKey: "timeline_monthly",
    yearlyPrice: "$90 / year (2 months free)", stripeYearlyLookupKey: "timeline_yearly",
  },
  deep: {
    label: "Deep Dive", price: "$19 / month", blurb: "Monthly updates of your timeline, 2 personalized insights a month, and synastry with anyone you add.",
    perks: ["Everything in Timeline", "Monthly updates of your timeline", "2 deeper, personalized insights a month", "5 synastry readings a month with anyone you add to Your People", "Extra synastry readings $3.99 each"],
    monthlyTimeline: true, questionsPerMonth: 2, savedPeople: 30, compatPerMonth: 5,
    stripeLookupKey: "deep_monthly",
    yearlyPrice: "$190 / year (2 months free)", stripeYearlyLookupKey: "deep_yearly",
  },
};

/** One-time purchases for anyone signed in, subscribed or not. They arrive right away (about 2 minutes).
 *  Set enabled: false to hide one. */
export type OneTimeKey = "question" | "synastry" | "yearahead" | "extra";
export const ONE_TIME: Record<OneTimeKey, {
  enabled: boolean; label: string; price: string; blurb: string; stripeLookupKey: string;
  membersOnly?: boolean; // only Deep Dive members can buy it
  founding?: { price: string; limit: number; stripeLookupKey: string }; // early-buyer price for the first `limit` sales
  bonusTimelineDays?: number; // free timeline included with the purchase
}> = {
  synastry: {
    enabled: true, label: "Synastry Reading", price: "$19",
    blurb: "Your chart next to theirs, both included. Where you two click, where you'll clash, and how to move through it, plus how your timelines line up over the next year. Includes a free month of your personal timeline.",
    stripeLookupKey: "compat_regular",
    bonusTimelineDays: 30,
  },
  question: { enabled: false, label: "Single question", price: "$9", blurb: "Pick one question from the menu and get your answer in minutes.", stripeLookupKey: "one_question" },
  extra: { enabled: true, membersOnly: true, label: "Extra synastry reading", price: "$3.99", blurb: "One more synastry reading this month, beyond the 5 in your plan.", stripeLookupKey: "compat_extra" },
  yearahead: { enabled: true, label: "Year-ahead timeline", price: "$19", blurb: "Your next 12 months: every major transit peak date, grouped into themes and windows.", stripeLookupKey: "yearahead" },
};

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
