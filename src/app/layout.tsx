import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

/**
 * Font configuration
 *
 * Loads Geist Sans + Geist Mono via `next/font/google`
 * and exposes them as CSS variables for global styling.
 */
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/**
 * Default Metadata for SEO + browser context
 *
 * Applies to all pages unless overridden by nested layouts or pages.
 */
export const metadata: Metadata = {
  title: 'Food Finder',
  description: 'Find the best food options near you',
};

/**
 * RootLayout
 *
 * Base HTML and layout wrapper for the entire App Router tree.
 * Injects global font variables and ensures children are wrapped
 * inside the correct HTML + <body> container.
 *
 * Rendered for every route under `/app`.
 *
 * @example
 * <RootLayout>
 *   <Home />
 * </RootLayout>
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
