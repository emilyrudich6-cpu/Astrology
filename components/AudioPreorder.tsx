// "Your Chart, in Audio" pre-order card, shown at the bottom of the Deep Dive.
// It is published only when all three are true: FEATURE_AUDIO_PREORDER is on, AUDIO_DELIVERY_NOTE says when and
// how the recording arrives, and Stripe has a $25 one-time price under the "audio_preorder" lookup key.
import { ONE_TIME, AUDIO_DELIVERY_NOTE } from "@/lib/config";
import { priceMatches } from "@/lib/stripe";
import { BuyButton } from "@/components/BillingButtons";

export default async function AudioPreorder() {
  const a = ONE_TIME.audio;
  if (!a.enabled || !process.env.STRIPE_SECRET_KEY) return null;
  const ok = await priceMatches(a.stripeLookupKey, a.price, null).catch(() => false);
  if (!ok) return null;
  return (
    <aside className="panel audio-card no-print">
      <h2>{a.label}</h2>
      <p>{a.blurb}</p>
      <p className="hint">{AUDIO_DELIVERY_NOTE}</p>
      <p className="plan-price">{a.price} one time</p>
      <BuyButton product="audio" label={a.cta!} />
    </aside>
  );
}
