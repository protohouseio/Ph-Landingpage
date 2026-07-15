"use client";

import { useState } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function ScrollTriggerSync() {
  useLenis((lenis) => {
    ScrollTrigger.update();
    void lenis;
  });
  return null;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Site-wide smooth scroll. Lenis (as the global `root` instance) owns
 * scroll physics; every scroll frame is forwarded to ScrollTrigger.update()
 * so pinned/scrubbed animations (intro, hero, comparison table, etc.) read
 * the smoothed position instead of stale native scroll.
 */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer: this is a client component, so the client-only render
  // (no window on the server) is an acceptable one-time mismatch here —
  // Lenis is a progressive enhancement, not content.
  const [reduced] = useState(prefersReducedMotion);

  if (reduced) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        duration: 1.05,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        smoothWheel: true,
      }}
    >
      <ScrollTriggerSync />
      {children}
    </ReactLenis>
  );
}
