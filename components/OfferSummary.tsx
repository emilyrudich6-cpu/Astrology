import type { Offer } from "@/lib/offers";

/** Keeps the reading's name and price in view while someone signs up or fills in details */
export default function OfferSummary({ offer, step }: { offer: Offer; step?: string }) {
  return (
    <div className="offer-summary" aria-label="What you're getting">
      <div>
        <p className="offer-name">{offer.label}</p>
        {step && <p className="hint">{step}</p>}
      </div>
      <p className="offer-price">{offer.priceLine}</p>
    </div>
  );
}
