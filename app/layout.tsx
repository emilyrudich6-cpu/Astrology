import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/config";
import { currentUser, isAdmin } from "@/lib/supabase";
import BrandLine from "@/components/BrandLine";

export const metadata: Metadata = {
  title: { default: "Vertex Point · Birth Charts & Synastry", template: "%s" },
  description: "Explore a comprehensive astrological chart based on the sky at the time and place you were born.",
  openGraph: { title: "Vertex Point · Birth Charts & Synastry", description: "Explore a comprehensive astrological chart based on the sky at the time and place you were born.", siteName: BRAND.name, type: "website" },
  twitter: { card: "summary_large_image", title: "Vertex Point · Birth Charts & Synastry" },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "black-translucent" },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://vertexpoint.talk"),
};
export const viewport: Viewport = { themeColor: "#160818" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/cormorant-garamond-latin-500-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <header className="wrap top">
          <Link href="/" className="brand">{BRAND.name}</Link>
          <BrandLine text={BRAND.tagline} />
          <nav className="nav" aria-label="Main">
            <Link href="/#plans" className="plans">Plans</Link>
            {user ? (
              <>
                {isAdmin(user.email) && <Link href="/admin">Admin</Link>}
                <Link href="/dashboard">My readings</Link>
              </>
            ) : (
              <Link href="/login">Sign in</Link>
            )}
          </nav>
        </header>
        <main>{children}</main>
        <footer className="foot">
          <div className="wrap">
            <p>{BRAND.disclaimer}</p>
            <p>Birthplace data from GeoNames (CC BY 4.0).{user && <> <form action="/auth/signout" method="post" style={{ display: "inline" }}><button className="btn ghost small">Sign out</button></form></>}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
