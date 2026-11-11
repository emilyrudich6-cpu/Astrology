import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/config";
import { currentUser, isAdmin } from "@/lib/supabase";

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.tagline,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#1b1440" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400..600&family=Manrope:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header className="wrap top">
          <Link href="/" className="brand">{BRAND.name}</Link>
          <nav className="nav">
            {user ? (
              <>
                {isAdmin(user.email) && <Link href="/admin">Admin</Link>}
                <Link href="/dashboard">My readings</Link>
                <form action="/auth/signout" method="post"><button className="btn ghost small">Sign out</button></form>
              </>
            ) : (
              <>
                <Link href="/#plans">Plans</Link>
                <Link href="/login">Sign in</Link>
              </>
            )}
          </nav>
        </header>
        <main>{children}</main>
        <footer className="foot">
          <div className="wrap">
            <p>{BRAND.disclaimer}</p>
            <p>Birthplace data from GeoNames (CC BY 4.0).</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
