import type { Metadata, Viewport } from "next";
import { plusJakartaSans, manrope } from "@/lib/fonts";
import { buildMetadata, buildJsonLd } from "@/lib/seo";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import "./globals.css";

export const metadata: Metadata = buildMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = buildJsonLd();

  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        {jsonLd.map((entry) => (
          <script
            key={entry["@type"]}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
          />
        ))}
      </head>
      <body className="min-h-full">
        <SmoothScrollProvider>
          {children}
          <div className="glass-dock" aria-hidden="true" />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
