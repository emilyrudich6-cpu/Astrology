// ====== EDIT THIS FILE to change the brand, prices shown, tiers and question menu ======

export const BRAND = {
  name: "Astrology Deep Dives",
  tagline: "Your chart, your timing, delivered when the stars say so.",
  emailFrom: "readings@yourdomain.com", // must be a domain you verify in Resend
  disclaimer: "For entertainment and self-reflection only. Not medical, legal, financial or psychological advice.",
};

export type Tier = "free" | "timeline" | "deep";

export const TIERS: Record<Tier, {
  label: string; price: string; blurb: string; perks: string[];
  monthlyTimeline: boolean; questionsPerMonth: number; savedPeople: number;
  stripePriceEnv?: string;
}> = {
  free: {
    label: "Free", price: "$0", blurb: "Your full natal chart deep dive.",
    perks: ["Big three, chart ruler and angles", "Every planet: house, speed, declination", "Aspects, patterns, chart shape", "Nodes, Lilith, Part of Fortune and harmonics"],
    monthlyTimeline: false, questionsPerMonth: 0, savedPeople: 0,
  },
  timeline: {
    label: "Timeline", price: "$12 / month", blurb: "Your personal timeline, every month.",
    perks: ["Everything in Free", "A monthly timeline with exact transit peak dates", "Themes and power windows for the month", "A manifestation ritual tied to your next key date"],
    monthlyTimeline: true, questionsPerMonth: 0, savedPeople: 0,
    stripePriceEnv: "STRIPE_PRICE_TIMELINE",
  },
  deep: {
    label: "Deep Dive", price: "$29 / month", blurb: "Timeline plus your questions answered.",
    perks: ["Everything in Timeline", "3 questions a month, answered on a surprise day", "Compatibility readings for up to 2 people", "How your timelines interact over the next year"],
    monthlyTimeline: true, questionsPerMonth: 3, savedPeople: 2,
    stripePriceEnv: "STRIPE_PRICE_DEEP",
  },
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
