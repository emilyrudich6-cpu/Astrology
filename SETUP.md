# Astrology Deep Dives: how to launch it

You don't need to code. You'll make a few accounts, copy keys from each into one settings screen, and the site goes live. Plan on an afternoon.

## What the site does

- **Free plan:** a member signs in with their email, enters their birth details and gets a full natal chart deep dive (steps 1–7 and 10 of your method, plus a teaser of their next 3 key dates). It's written in about two minutes.
- **Timeline plan:** a monthly timeline lands on a random day each month, covering the next 30 days with exact transit peak dates, themes, windows, lunations, eclipses, stations and a ritual.
- **Deep Dive plan:** everything above, plus 3 questions a month picked from a menu (category, then a specific question). Each answer arrives on a surprise day 2–9 days later, between 10am and 8pm in the member's time zone. Members can also save up to 2 people and get compatibility readings (synastry, house overlays both ways, how their timelines interact over the next year).
- **One-time purchases** for anyone, subscribed or not, delivered in about two minutes:
  - **Compatibility report** (the main product): $19 founding price for the first 50 buyers, then $29. Each report includes a free month of the personal timeline. When the month ends the member gets an email inviting them to subscribe; no card is charged automatically.
  - **Single question**: $9.
  - **Year-ahead timeline**: $19.
  Turn each one on or off and set its price in `lib/config.ts`.
- **Plans:** Timeline $9/month or $90/year, Deep Dive $29/month or $290/year (yearly = 2 months free).
- Members get an email and, if they turn them on, phone notifications when a reading arrives.
- You get a private **Admin** page that shows every member and reading. From it you can retry a failed reading, or send any reading immediately for testing.

All astronomy is calculated in code: planets, houses, nodes, Lilith, transits and eclipses. It was checked against Swiss Ephemeris: positions within 40 arcseconds across 300 random charts from 1900 to 2030, and exact transit times within 12 arcseconds across a full year. Claude only writes the words, from that data.

## Accounts you need

| Service | What it does | Cost |
|---|---|---|
| A domain (Namecheap, Cloudflare or Vercel) | your web address | about $10–20 a year |
| GitHub | stores the code | free |
| Vercel **Pro** | runs the website | $20 a month. The free Hobby plan doesn't allow commercial sites, and it can only run the delivery scheduler once a day. This site runs it every 15 minutes. |
| Supabase | member logins and database | free to start |
| Anthropic (console.anthropic.com) | writes the readings | pay per reading. Each reading sends about 4,000–11,000 tokens of chart data and gets back about 3,000–6,000 tokens. Check current prices on the Anthropic pricing page. |
| Stripe | subscriptions and payments | standard card fees per charge |
| Resend | sends the "your reading arrived" emails | free to start |

## Step 1: Supabase (logins and database)

1. Create a project at supabase.com. Save the database password somewhere safe.
2. Go to **SQL Editor > New query**, paste everything in `supabase/schema.sql` and click **Run**. Then do the same with `supabase/002_one_time_purchases.sql` and `supabase/003_founding_and_bonus.sql`. (All three are already done on your project.)
3. Go to **Authentication > Email Templates > Magic Link** and make sure the email includes the code. Add a line like `Your sign-in code: {{ .Token }}`. Members can type the code or tap the link.
4. Go to **Authentication > URL Configuration**. Set **Site URL** to `https://yourdomain.com` and add `https://yourdomain.com/auth/callback` under Redirect URLs.
5. Go to **Authentication > SMTP Settings** and turn on custom SMTP using Resend's details (see step 4). Supabase's built-in email only sends a few emails an hour.
6. Go to **Project Settings > API** and copy three values: the Project URL, the `anon` public key and the `service_role` key. Keep the service_role key secret.

## Step 2: Stripe (payments)

Start in **Test mode** (toggle at the top).

1. Go to **Product catalog > Add product** and make:
   - "Timeline": recurring $9 per month **and** recurring $90 per year
   - "Deep Dive": recurring $29 per month **and** recurring $290 per year
   - "Compatibility report": one-time $29 **and** a second one-time price of $19 (the founding price)
   - "Single question": one-time $9
   - "Year-ahead timeline": one-time $19

   Copy each **Price ID** (it starts with `price_`). They go in the `STRIPE_PRICE_...` settings in Vercel.
2. Go to **Settings > Billing > Customer portal**. Turn on cancellations and let customers switch between your two products.
3. Go to **Developers > Webhooks > Add endpoint**. Use the URL `https://yourdomain.com/api/stripe/webhook` and these events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy the **Signing secret** (`whsec_...`).
4. Go to **Developers > API keys** and copy the **Secret key**.

If you change prices, update the prices shown on the site in `lib/config.ts` too.

## Step 3: Anthropic (the reading writer)

1. At console.anthropic.com, add billing credits and create an **API key**.
2. Set a **monthly spend limit** so a surprise can't run up your bill.

## Step 4: Resend (email)

1. Add your domain at resend.com and add the DNS records it shows you at your domain company.
2. Create an API key.
3. In `lib/config.ts`, change `emailFrom` to an address on your domain, such as `readings@yourdomain.com`.

## Step 5: Phone notifications

Once, in Terminal inside the project folder, run `npx web-push generate-vapid-keys`. It prints a public key and a private key.

## Step 6: Vercel (go live)

1. Put the code on GitHub (or let Claude push it for you to an empty private repo).
2. At vercel.com, upgrade to Pro, click **Add New > Project** and import the repo.
3. Before deploying, open **Environment Variables** and add everything listed in `.env.example`:
   - `NEXT_PUBLIC_SITE_URL`: `https://yourdomain.com`
   - The three Supabase values
   - `ANTHROPIC_API_KEY`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_TIMELINE`, `STRIPE_PRICE_DEEP`
   - `RESEND_API_KEY`
   - The public VAPID key twice (as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PUBLIC_KEY`), `VAPID_PRIVATE_KEY` and `VAPID_CONTACT_EMAIL`
   - `CRON_SECRET`: any long random string
   - `ADMIN_EMAILS`: your email, which unlocks /admin
4. Deploy, then add your domain under **Settings > Domains**.

The delivery scheduler runs on its own every 15 minutes (it's set in `vercel.json`).

## Step 7: Test it yourself

1. Sign in with your admin email and enter your birth details. Your free chart arrives in about two minutes.
2. Choose Deep Dive and pay with Stripe's test card `4242 4242 4242 4242` (any future date, any CVC).
3. Ask a question, then open **Admin** and click **Send now** on it, so you don't have to wait for the surprise day.
4. Turn on alerts on your phone. On iPhone, first open the site in Safari, tap Share, choose Add to Home Screen, then open it from the home screen.
5. Read a few readings closely. To change the voice or the method, edit `lib/readings.ts`.

## Track what matters (your board's advice)

- **Free-to-paid:** what share of free-chart members buy anything (Admin page member counts, Stripe payments).
- **Compatibility-to-subscriber:** how many compatibility buyers subscribe after their free month.
- **Retention:** how many subscribers are still paying in month 2 and month 3 (Stripe > Billing > Subscriptions).
- Change one price at a time. The founding offer is your first test: watch whether buying slows down when the price moves to $29.

## Before you open to the public

- Switch Stripe to **Live mode**: make the live products, a live webhook and live keys, then put the live values in Vercel.
- Add **Terms** and **Privacy** pages. You collect birth data and take payments, and Stripe expects both pages. Ask Claude to draft them, and have a lawyer look them over.
- Readings are written automatically and don't claim to be hand-written. Check Anthropic's usage policies for whether you need to tell members that AI is involved in a consumer product.

## Where to change things

- **Name, prices shown, perks, question menu, surprise-delivery window:** `lib/config.ts`
- **Your method, voice and boundaries for the writer:** `lib/readings.ts`
- **Colors and fonts:** `app/globals.css`
- **The astronomy engine:** `lib/engine/`. To re-run the accuracy checks: `npx tsx engine-tests/sample.ts`.

## Later ideas

- Audio versions of readings in a clone of your voice (ElevenLabs) for the top tier.
- Your podcast on the homepage as a free preview.
- A PDF download of each reading.
