/**
 * Proto House — Design System (single source of truth)
 *
 * Every color, font, spacing and motion value on the site should come from
 * here. Change a value in this file and it propagates to:
 *   - Tailwind utilities (via the CSS variables generated in globals.css)
 *   - Any component that imports `tokens` directly for JS-driven values
 *     (GSAP timelines, inline styles, canvas/video overlays, etc.)
 *
 * Do not hardcode hex codes, font stacks, or easing curves in components —
 * import them from here instead.
 */

export const tokens = {
  color: {
    // Brand accent — the one color meant to be swapped per-tenant/campaign.
    accent: "#FF5B44",
    accentAlt: "#FF3D2E",
    accentSoft: "#FF8A5C",
    accentLime: "#E8FF44",

    bg: "#000000",
    bgPage: "#FAFAF8",
    bgInk: "#0A0A0A",

    text: "#FFFFFF",
    textSecondary: "#CFCFCF",
    textMuted: "#8A877D",
    textOnLight: "#0A0A0A",
    textOnLightSecondary: "#5A5852",
    textOnLightMuted: "#3A3833",

    divider: "#2A2A2A",
    dividerLight: "#E6E3DA",
    hoverGray: "#1A1A1A",

    glassBg: "rgba(255,255,255,0.07)",
    glassBorder: "rgba(255,255,255,0.14)",
  },

  font: {
    heading: "'Plus Jakarta Sans', sans-serif", // 700 (logo/tags 800)
    copy: "'Manrope', sans-serif", // 400–500 body, 600 buttons/nav
  },

  size: {
    maxWidth: 1600,
    contentWidth: 1500,
    padDesktop: 80,
    padTablet: 48,
    padMobile: 24,
    navH: 88,
    navHMobile: 72,
    rotating: "clamp(56px, min(8.3vw, 14.5vh), 170px)",
    rotatingMobile: "clamp(48px, 16vw, 64px)",
    permanent: "clamp(44px, min(6.5vw, 11.5vh), 140px)",
    permanentMobile: "clamp(38px, 13vw, 52px)",
    copy: "clamp(17px, 1.25vw, 24px)",
    copyMobile: "18px",
  },

  radius: {
    pill: 999,
    circle: "50%",
    card: 28,
    cardMobile: 20,
    glass: 16,
    button: 11,
  },

  ease: {
    out: "cubic-bezier(0.19, 1, 0.22, 1)", // ~ power4.out
    hover: "cubic-bezier(0.22, 1, 0.36, 1)", // no bounce
    exit: "cubic-bezier(0.55, 0, 0.55, 0.2)",
  },

  motion: {
    navFadeDuration: 0.9,
    navFadeDelay: 0.1,
    letterDuration: 0.9,
    letterStagger: 0.025,
    letterBaseDelay: 0.3,
    permanentDuration: 1.1,
    permanentDelayLine1: 1.0,
    permanentDelayLine2: 1.15,
    copyDelay: 1.45,
    trustBadgeDelay: 1.7,
    ctaDelay: 1.75,
    rotationSeconds: 4,
    exitDuration: 0.45,
    exitStagger: 0.008,
  },

  content: {
    logo: "PH",
    nav: [
      { label: "Case Studies", href: "#" },
      { label: "Pricing", href: "#" },
      { label: "How It Works", href: "#" },
      { label: "Contact", href: "#" },
    ],
    navCta: { label: "Start Your MVP", href: "#" },
    headlines: [
      { line1: [{ text: "Vibe", accent: false }, { text: "Coded", accent: false }], line2: [{ text: "Full", accent: false }, { text: "of", accent: false }, { text: "Bugs?", accent: true }] },
      { line1: [{ text: "Have", accent: false }, { text: "an", accent: false }, { text: "Idea,", accent: true }], line2: [{ text: "Can't", accent: false }, { text: "Build", accent: false }, { text: "It?", accent: false }] },
      { line1: [{ text: "Still", accent: false }, { text: "Waiting", accent: false }], line2: [{ text: "for", accent: false }, { text: "Developers?", accent: true }] },
      { line1: [{ text: "Need", accent: false }, { text: "an", accent: false }, { text: "MVP", accent: false }], line2: [{ text: "Fast?", accent: true }] },
    ],
    copy: {
      pre: "ProtoHouse turns your idea into real, working software — a ",
      highlights: ["market-ready MVP", "No tech skills.", "100% source code ownership.", "$4,999."],
    },
    videoCard: {
      label: "Start Your MVP",
      ctaLabel: "Book your free scoping call",
    },
  },

  hero: {
    headline: "Idea, Build, Launch",
    videoLabel: "Start Your MVP",
    videoCtaLabel: "Book your free scoping call",
  },

  intro: {
    // Total scroll length of the pinned intro, in viewport-heights.
    heightVh: 640,
    story: [
      { line1: "You have an awesome idea?", line2: "Don't know how to build it?" },
      { line1: "Already tried vibe coding it..", line2: "ended up with something broken?" },
      { line1: "No problem! We'll build it", line2: "market-ready together in 21 days." },
      { line1: "New Launch!!", line2: "Waiting Ahead.." },
    ],
    // Persistent bottom-center caption, visible under every story screen
    // throughout the whole intro (not its own screen).
    caption:
      "Taking the new founders with world changing ideas into the real market while treating their products our own products.",
  },

  // Light-background scroll-reveal section between the intro and Hero.
  // The intro zooms outward into this section's bg color (storyReveal.bg).
  // `paragraph` is rendered word-by-word (color ramps gray -> ink as each
  // word scrolls into focus); any word matching an entry in `highlights`
  // (case-insensitive substring match against the rendered word) gets an
  // accent-colored pill background + white text instead of the ramp.
  storyReveal: {
    bg: "#FAFAF8",
    paragraph:
      "We at ProtoHouse builds your idea into real, working software in 21 days, So you can put it in front of real users instead of spending $80,000 and six months finding out if anyone wants it. You own 100% of the code. Starting at $4,999.",
    highlights: ["21 days", "$80,000", "six months", "$4,999"],
  },

  media: {
    // Placeholder assets — swap via env/CMS once real footage is ready.
    heroVideoUrl:
      process.env.NEXT_PUBLIC_HERO_VIDEO_URL ??
      "https://videos.pexels.com/video-files/7122113/7122113-uhd_2560_1440_30fps.mp4",
    vslVideoUrl:
      process.env.NEXT_PUBLIC_VSL_VIDEO_URL ??
      "https://redstone.agency/video/video-banner.webm",
    tintStrength: 0.5,
    grain: true,
  },
} as const;

export type Tokens = typeof tokens;
