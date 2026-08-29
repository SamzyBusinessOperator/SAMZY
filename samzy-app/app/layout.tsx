import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";

import CookieBanner from "./components/CookieBanner";
import { LanguageProvider } from "../lib/LanguageContext";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://samzyai.com"),

  title: {
    default: "SAMZY — Intelligent Business Workspace",
    template: "%s | SAMZY",
  },

  description:
    "SAMZY is an AI-powered business workspace for managing products, inventory, suppliers, documents, pricing and operations in one connected platform.",

  applicationName: "SAMZY",

  keywords: [
    "SAMZY",
    "business software",
    "inventory management",
    "AI business software",
    "product management",
    "supplier management",
    "business automation",
    "OCR invoice software",
  ],

  authors: [
    {
      name: "SAMZY",
    },
  ],

  creator: "SAMZY",
  publisher: "SAMZY",

  openGraph: {
    type: "website",
    url: "https://samzyai.com",
    siteName: "SAMZY",
    title: "SAMZY — Intelligent Business Workspace",
    description:
      "Manage products, inventory, suppliers, documents and business intelligence in one AI-powered workspace.",
  },

  twitter: {
    card: "summary_large_image",
    title: "SAMZY — Intelligent Business Workspace",
    description:
      "Manage products, inventory, suppliers, documents and business intelligence in one AI-powered workspace.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <LanguageProvider>
          {children}
          <CookieBanner />
        </LanguageProvider>

        {process.env.NODE_ENV === "production" && (
          <Script
            id="register-service-worker"
            strategy="afterInteractive"
          >
            {`
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker
                    .register('/sw.js')
                    .catch(function (error) {
                      console.error(
                        'Service worker registration failed:',
                        error
                      );
                    });
                });
              }
            `}
          </Script>
        )}
      </body>
    </html>
  );
}