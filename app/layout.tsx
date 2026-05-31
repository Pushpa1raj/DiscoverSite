import type { Metadata } from "next";
import type { JSX, ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DiscoverSite — AI-Powered SEO & GEO Analysis",
  description:
    "Analyze your website and automatically generate SEO & GEO fixes directly for your repository.",
  metadataBase: new URL("https://example.com"),
  openGraph: {
    title: "DiscoverSite — AI-Powered SEO & GEO Analysis",
    description:
      "Analyze your website and automatically generate SEO & GEO fixes directly for your repository.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DiscoverSite — AI-Powered SEO & GEO Analysis",
    description:
      "Analyze your website and automatically generate SEO & GEO fixes directly for your repository.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
