import type { Metadata } from "next";

export const siteConfig = {
  name: "Proto House",
  legalName: "ProtoHouse",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://protohouse.io",
  title: "Proto House — Market-Ready MVP in 21 Days",
  description:
    "ProtoHouse turns your idea into a real, working, production-grade MVP in 21 days. Senior builders using AI-accelerated workflows. No tech skills needed. 100% source code ownership. Starting from $4,999.",
  keywords: [
    "MVP development",
    "build an MVP fast",
    "startup MVP agency",
    "AI-accelerated development",
    "fix vibe coded app",
    "rescue vibe coding project",
    "no-code to production",
    "21 day MVP",
    "production-grade MVP",
    "hire MVP developers",
  ],
  ogImage: "/og-image.png",
  twitterHandle: "@protohouse",
};

export function buildMetadata(): Metadata {
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: siteConfig.title,
      template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    keywords: siteConfig.keywords,
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.legalName, url: siteConfig.url }],
    creator: siteConfig.legalName,
    publisher: siteConfig.legalName,
    referrer: "origin-when-cross-origin",
    formatDetection: { telephone: false },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: siteConfig.url,
      siteName: siteConfig.name,
      title: siteConfig.title,
      description: siteConfig.description,
      locale: "en_US",
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} — Market-Ready MVP in 21 Days`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
      title: siteConfig.title,
      description: siteConfig.description,
      images: [siteConfig.ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: "/favicon.ico",
    },
  };
}

/**
 * JSON-LD structured data for AEO (answer-engine optimization) — helps
 * LLM-driven answer engines (Google AI Overviews, ChatGPT browsing,
 * Perplexity, etc.) and traditional search correctly parse who we are,
 * what we offer, and at what price/timeline, without guessing.
 */
export function buildJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.legalName,
    url: siteConfig.url,
    description: siteConfig.description,
    slogan: "Market-ready product in 21 days.",
  };

  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${siteConfig.url}/#service`,
    serviceType: "MVP Software Development",
    provider: { "@id": `${siteConfig.url}/#organization` },
    areaServed: "Worldwide",
    description:
      "Senior builders use AI-accelerated workflows to ship a real, working, production-grade MVP in 21 days. Clients own 100% of the code and repository from day one.",
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "4999",
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: "4999",
        priceCurrency: "USD",
      },
      availability: "https://schema.org/InStock",
    },
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How long does it take to build an MVP with Proto House?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Proto House delivers a real, working, production-grade MVP in 21 days, from scoping call to handover of the full codebase.",
        },
      },
      {
        "@type": "Question",
        name: "How much does an MVP cost at Proto House?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "MVP builds start from $4,999, compared to $50,000–$100,000+ and 4-6 months for a traditional agency build.",
        },
      },
      {
        "@type": "Question",
        name: "Do I own the code after my MVP is built?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Clients receive 100% ownership of the source code and repository, with no lock-in or ongoing dependency on Proto House.",
        },
      },
      {
        "@type": "Question",
        name: "Can Proto House fix a broken vibe-coded app?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Proto House regularly rescues half-built apps created with AI vibe-coding tools that broke — fixing bugs, stabilizing the codebase, and shipping a production-ready product.",
        },
      },
    ],
  };

  return [organization, service, faq];
}
