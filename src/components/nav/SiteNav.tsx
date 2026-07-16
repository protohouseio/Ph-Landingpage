"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { tokens } from "@/config/design-tokens";
import ArcLogo from "@/components/shared/ArcLogo";
import styles from "./sitenav.module.css";

export type SiteNavHandle = {
  /** Fades the nav in. Called by IntroStory at the exact moment the logo
   * overlay begins fading, so the nav appears right as the intro hands off
   * to the story screens — not before, not tied to any later scroll. */
  reveal: () => void;
  /** Scrubs the full-width-bar-to-pill collapse directly to a 0..1
   * position — called every scroll frame by IntroStory as real scroll
   * approaches/leaves story 1's ("the second story") reveal window, so
   * the pill glides open/closed in lockstep with the scrollbar rather
   * than snapping via a fixed-duration tween. */
  setProgress: (progress: number) => void;
};

type SiteNavProps = {
  /** Marks where the page turns from dark (intro) to light (Hero) — the
   * nav tracks this boundary to flip its `data-tone` attribute. */
  lightZoneRef: React.RefObject<HTMLElement | null>;
};

/** Splits a label into one <span> per character, each holding a "top" and
 * "bottom" copy for the letter-by-letter reveal-on-hover effect below. */
function SplitChars({ text, topClass, bottomClass }: { text: string; topClass: string; bottomClass: string }) {
  return (
    <>
      {text.split("").map((ch, i) => {
        const glyph = ch === " " ? " " : ch;
        return (
          <span className={styles.charCol} key={i}>
            <span className={topClass}>{glyph}</span>
            <span className={bottomClass} aria-hidden="true">
              {glyph}
            </span>
          </span>
        );
      })}
    </>
  );
}

/**
 * Global, persistent, fixed header. Starts as a full-width bar at the top
 * of the page (logo left, links centered, CTA right); once real scroll
 * crosses into story 1 ("the second story"), it collapses into a single
 * smaller, horizontally centered pill — reversible on scroll back above
 * that point.
 *
 * Color-adaptation: `mix-blend-mode: difference` does NOT work here —
 * browsers composite `position: fixed` elements onto their own layer, so
 * the blend can never see the real page paint beneath it (verified: the
 * exact same blended element renders correctly in normal flow but goes
 * fully invisible under `position: fixed`). Instead, a `ScrollTrigger`
 * watches `lightZoneRef`'s top edge and flips a `data-tone` attribute
 * (dark/light), which the CSS uses to pick explicit ink colors.
 */
const SiteNav = forwardRef<SiteNavHandle, SiteNavProps>(function SiteNav({ lightZoneRef }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tone, setTone] = useState<"light" | "dark">("dark");
  const collapseTlRef = useRef<gsap.core.Timeline | null>(null);
  const lastProgressRef = useRef(-1);

  useImperativeHandle(ref, () => ({
    reveal: () => {
      rootRef.current?.classList.add(styles.revealed);
      gsap.to(rootRef.current, {
        autoAlpha: 1,
        duration: tokens.motion.navFadeDuration,
        ease: "power2.out",
      });
    },
    setProgress: (progress: number) => {
      // Called on EVERY scroll update across the whole intro range, but
      // the value only actually changes inside the collapse ramp window
      // (clamped to 0 or 1 elsewhere). Re-seeking the collapse timeline
      // re-applies its backdrop-filter tween — an expensive style — so
      // no-op calls are skipped outright.
      if (Math.abs(progress - lastProgressRef.current) < 0.001) return;
      lastProgressRef.current = progress;
      rootRef.current?.classList.toggle(styles.collapsed, progress > 0.5);
      collapseTlRef.current?.progress(progress);
    },
  }));

  useGSAP(
    () => {
      const bar = barRef.current;
      const logoMark = bar?.querySelector<HTMLElement>(`.${styles.logoMark}`);
      if (!bar) return;

      // Single GSAP timeline drives every visual change of the collapse —
      // size, spacing, and the glassmorphic surface fading in — so it
      // reads as one continuous, smoothly reversible motion instead of a
      // CSS class snapping in alongside a separate JS tween.
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut", duration: 0.6 } });
      tl.to(bar, { width: 720, gap: 14, paddingLeft: 18, paddingRight: 6 }, 0);
      tl.to(
        bar,
        {
          backgroundColor: "rgba(255,255,255,0.1)",
          borderColor: "rgba(255,255,255,0.22)",
          backdropFilter: "blur(20px) saturate(180%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 30px rgba(0,0,0,0.2)",
        },
        0
      );
      if (logoMark) {
        tl.to(logoMark, { width: 40 }, 0);
      }
      collapseTlRef.current = tl;

      // Deferred (not gated on lightZoneRef.current up front — ref
      // mutations are silent to React and won't reliably re-run this
      // effect, so the DOM node is re-read fresh inside the timeout
      // instead). The delay also lets the intro's own pin-spacer
      // (hundreds of vh) finish settling first, same as Hero.tsx's own
      // headline trigger — creating a ScrollTrigger before that layout
      // has resolved bakes in a stale `start` position.
      let st: ScrollTrigger | undefined;
      const createTimer = setTimeout(() => {
        if (!lightZoneRef.current) return;
        st = ScrollTrigger.create({
          trigger: lightZoneRef.current,
          start: "top top",
          onEnter: () => setTone("light"),
          onLeaveBack: () => setTone("dark"),
        });
      }, 500);

      return () => {
        clearTimeout(createTimer);
        st?.kill();
      };
    },
    { scope: rootRef }
  );

  // Letter-by-letter hover reveal: each character's current copy rises
  // out of view while its duplicate rises in from below, staggered
  // across the word for a smooth cascading feel rather than the whole
  // label moving as one block.
  const onLabelHover = (root: HTMLElement, entering: boolean, topSel: string, bottomSel: string) => {
    const tops = root.querySelectorAll(topSel);
    const bottoms = root.querySelectorAll(bottomSel);
    gsap.to([...tops, ...bottoms], {
      yPercent: entering ? -100 : 0,
      duration: 0.5,
      ease: "power3.out",
      stagger: 0.018,
      overwrite: true,
    });
  };

  const navLabel = tokens.content.navCta.label;

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${menuOpen ? styles.menuOpen : ""}`}
      style={{ opacity: 0, visibility: "hidden" }}
      data-tone={tone}
    >
      <div className={styles.bar} ref={barRef}>
        <a className={styles.logo} href="#" aria-label="Proto House home">
          <ArcLogo className={styles.logoMark} />
        </a>

        <div className={styles.links}>
          {tokens.content.nav.map((item) => (
            <a
              key={item.label}
              className={styles.nlink}
              href={item.href}
              onMouseEnter={(e) => onLabelHover(e.currentTarget, true, `.${styles.nlinkTop}`, `.${styles.nlinkBottom}`)}
              onMouseLeave={(e) => onLabelHover(e.currentTarget, false, `.${styles.nlinkTop}`, `.${styles.nlinkBottom}`)}
            >
              <SplitChars text={item.label} topClass={styles.nlinkTop} bottomClass={styles.nlinkBottom} />
            </a>
          ))}
        </div>

        <div className={styles.navSide}>
          <a
            className={styles.navcta}
            href={tokens.content.navCta.href}
            onMouseEnter={(e) => onLabelHover(e.currentTarget, true, `.${styles.ctaTop}`, `.${styles.ctaBottom}`)}
            onMouseLeave={(e) => onLabelHover(e.currentTarget, false, `.${styles.ctaTop}`, `.${styles.ctaBottom}`)}
          >
            <span className={styles.navctaFill} aria-hidden="true" />
            <span className={styles.navctaLabel}>
              <SplitChars text={navLabel} topClass={styles.ctaTop} bottomClass={styles.ctaBottom} />
            </span>
            <span className={styles.navctaDot}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </a>

          <button
            className={styles.burger}
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={`${styles.bar2} ${styles.b1}`} />
            <span className={`${styles.bar2} ${styles.b2}`} />
          </button>
        </div>
      </div>

      <div className={styles.menu}>
        {tokens.content.nav.map((item) => (
          <a key={item.label} className={styles.mlink} href={item.href}>
            {item.label}
          </a>
        ))}
        <a className={styles.mcta} href={tokens.content.navCta.href}>
          {tokens.content.navCta.label}
        </a>
      </div>
    </div>
  );
});

export default SiteNav;
