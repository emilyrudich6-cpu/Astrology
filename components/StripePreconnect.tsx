import { preconnect } from "react-dom";

/** Opens the connection to Stripe while the visitor is still on our page, so checkout appears sooner */
export default function StripePreconnect() {
  preconnect("https://checkout.stripe.com");
  preconnect("https://js.stripe.com");
  preconnect("https://b.stripecdn.com");
  return null;
}
