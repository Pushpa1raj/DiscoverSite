import type { Metadata } from "next";
import type { JSX, ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiscoverSite Intelligence Dashboard",
  description: "Repo-aware SEO + GEO optimization control center",
  metadataBase: new URL("https://example.com"),
  openGraph: {
    title: "DiscoverSite Intelligence Dashboard",
    description: "Repo-aware SEO + GEO optimization control center",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "DiscoverSite Intelligence Dashboard",
    description: "Repo-aware SEO + GEO optimization control center"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
