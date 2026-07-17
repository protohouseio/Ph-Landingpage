"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { tokens } from "@/config/design-tokens";
import ArcLogo from "@/components/shared/ArcLogo";
import CtaButton from "@/components/shared/CtaButton";
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
  /** Flips the nav's icon/text tone: light-background mode (dark ink)
   * when `active` is true, dark-background mode (white ink) when false.
   * Called by IntroStory as soon as the zoom-out's light background
   * becomes visually dominant — not gated on any later section actually
   * starting. */
  setLight: (active: boolean) => void;
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
 * fully invisible under `position: fixed`). Instead, IntroStory calls
 * `setLight()` (below) the moment its own zoom-out reveals the light
 * background, flipping a `data-tone` attribute the CSS uses to pick
 * explicit ink colors — not a ScrollTrigger watching a later section's
 * boundary, which would flip noticeably after the screen already turned
 * light.
 */
const SiteNav = forwardRef<SiteNavHandle, {}>(function SiteNav(_props, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuItemRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tone, setTone] = useState<"light" | "dark">("dark");
  // Real React state, NOT an imperative classList.add — the className
  // below is React-controlled (it also reflects menuOpen), so any
  // imperatively-added class gets silently wiped the next time this
  // component re-renders for an unrelated reason (e.g. opening the
  // menu). That's exactly what broke the mobile menu: revealing the
  // nav added `.revealed` via classList.add, but the very next
  // re-render (toggling menuOpen) reset className to the JSX template,
  // dropping `.revealed` — and with it, `pointer-events: auto`, which
  // .bar inherits. The nav bar kept rendering visually but silently
  // stopped accepting any clicks, including on the burger/close button.
  const [revealed, setRevealed] = useState(false);
  const collapseTlRef = useRef<gsap.core.Timeline | null>(null);
  const menuTlRef = useRef<gsap.core.Timeline | null>(null);
  const lastProgressRef = useRef(-1);

  useImperativeHandle(ref, () => ({
    reveal: () => {
      setRevealed(true);
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
    setLight: (active: boolean) => {
      setTone(active ? "light" : "dark");
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

      // Mobile menu: one paused GSAP timeline, played/reversed by the
      // menuOpen effect below — NOT the CSS opacity fade this used to
      // be. The panel clip-reveals downward from the top edge while
      // each link's label rises up through its own overflow-clipped
      // mask, staggered, so opening/closing reads as one coordinated
      // sweep instead of an instant show/hide.
      const menuItems = menuItemRefs.current.filter(Boolean) as HTMLSpanElement[];
      if (menuPanelRef.current && menuItems.length) {
        gsap.set(menuPanelRef.current, { clipPath: "inset(0 0 100% 0)" });
        gsap.set(menuItems, { yPercent: 130 });

        menuTlRef.current = gsap
          .timeline({ paused: true })
          .to(menuPanelRef.current, { clipPath: "inset(0 0 0% 0)", duration: 0.5, ease: "power3.inOut" })
          .to(menuItems, { yPercent: 0, duration: 0.65, ease: "power3.out", stagger: 0.06 }, "-=0.3");
      }
    },
    { scope: rootRef }
  );

  // Plays/reverses the menu timeline built above in lockstep with the
  // button toggle — kept as a plain effect (not folded into the
  // useGSAP above) because it needs to re-run on every menuOpen flip,
  // while the timeline itself is only built once on mount.
  useEffect(() => {
    const tl = menuTlRef.current;
    if (!tl) return;
    if (menuOpen) {
      tl.play();
    } else {
      tl.reverse();
    }
  }, [menuOpen]);

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
  menuItemRefs.current = [];

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${revealed ? styles.revealed : ""} ${menuOpen ? styles.menuOpen : ""}`}
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
          <CtaButton href={tokens.content.navCta.href} label={navLabel} tone={tone} size="compact" />

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

      <div className={styles.menu} ref={menuPanelRef}>
        {/* Large tilted half-logo watermark — a crop of ArcLogo's own
            paths to a 0 0 36 36 viewBox, which keeps only the left-edge
            cluster plus a sliver of the center diamond. Purely
            decorative background texture, not interactive. */}
        <div className={styles.menuWatermark} aria-hidden="true">
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "hidden" }}>
            <path d="M0 11.9514V17.3372C9.57779 17.3372 17.3372 9.57779 17.3372 0H11.9514C11.9514 6.58646 6.5934 11.9514 0 11.9514Z" fill="currentColor" />
            <path d="M0 18.6625V24.0483C6.58646 24.0483 11.9514 29.4063 11.9514 35.9997H17.3372C17.3372 26.4219 9.57779 18.6625 0 18.6625Z" fill="currentColor" />
            <path d="M36.0011 11.9514C29.4147 11.9514 24.0497 6.5934 24.0497 0H18.6639C18.6639 9.57779 26.4233 17.3372 36.0011 17.3372V11.9514Z" fill="currentColor" />
            <path d="M36.0003 18.6628C26.4225 18.6628 18.6631 26.4222 18.6631 36H24.0489C24.0489 29.4135 29.4069 24.0486 36.0003 24.0486V18.6628Z" fill="currentColor" />
          </svg>
        </div>

        <div className={styles.mlist}>
          {tokens.content.nav.map((item, i) => (
            <a
              key={item.label}
              className={`${styles.mlink} ${i % 2 === 1 ? styles.mlinkAlt : ""}`}
              href={item.href}
              onClick={() => setMenuOpen(false)}
            >
              <span className={styles.mlinkIndex}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.mlinkMask}>
                <span
                  className={styles.mlinkInner}
                  ref={(el) => {
                    menuItemRefs.current.push(el);
                  }}
                >
                  {item.label}
                </span>
              </span>
            </a>
          ))}
        </div>

        <a className={styles.mcta} href={tokens.content.navCta.href} onClick={() => setMenuOpen(false)}>
          <span className={styles.mlinkMask}>
            <span
              className={styles.mctaInner}
              ref={(el) => {
                menuItemRefs.current.push(el);
              }}
            >
              {tokens.content.navCta.label}
              <svg className={styles.mctaArrow} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </span>
        </a>
      </div>
    </div>
  );
});

export default SiteNav;
