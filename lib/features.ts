// Feature switches, set in Vercel > Settings > Environment Variables. Anything but "on" means off.
import { FREE_JOURNAL_CAP } from "./seeing-numbers";

export const FEATURES = {
  /** Phase 2: Compare with my timeline, unlimited journal entries and the monthly recap for Deep Dive members */
  journalCompare: process.env.FEATURE_JOURNAL_COMPARE === "on",
  /** Phase 3: Invite a friend to unlock a free synastry reading */
  referrals: process.env.FEATURE_REFERRALS === "on",
};

/** Deep Dive is the plan that includes the timeline comparison */
export const hasDeepDive = (tier: string | null | undefined) => tier === "deep";

/** How many journal entries this member can keep (null = unlimited) */
export const journalCap = (tier: string | null | undefined): number | null =>
  FEATURES.journalCompare && hasDeepDive(tier) ? null : FREE_JOURNAL_CAP;
