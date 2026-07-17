"use client";

import { forwardRef, useRef } from "react";
import { gsap } from "@/lib/gsap";
import styles from "./ctabutton.module.css";

export type CtaButtonProps = {
  href: string;
  label: string;
  /** "dark" = sits on a dark page bg, so the pill itself is light.
   *  "light" = sits on a light page bg, so the pill inverts to black. */
  tone?: "dark" | "light";
  /** "large" (default) = standalone marketing CTA (StoryReveal, ...).
   *  "compact" = fits the nav's fixed header height. */
  size?: "large" | "compact";
  className?: string;
};

/** Splits a label into one <span> per character, each holding a "top" and
 * "bottom" copy for the letter-by-letter reveal-on-hover cascade below. */
function SplitChars({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((ch, i) => {
        const glyph = ch === " " ? " " : ch;
        return (
          <span className={styles.charCol} key={i}>
            <span className={styles.top}>{glyph}</span>
            <span className={styles.bottom} aria-hidden="true">
              {glyph}
            </span>
          </span>
        );
      })}
    </>
  );
}

/**
 * The one pill-shaped CTA button used everywhere on the site (nav,
 * StoryReveal, ...). Owns the full hover treatment — lift, accent
 * fill-sweep, letter-by-letter cascade, dot rotate — in one place (see
 * ctabutton.module.css) so every instance behaves identically; consumers
 * only vary tone and size.
 */
const CtaButton = forwardRef<HTMLAnchorElement, CtaButtonProps>(function CtaButton(
  { href, label, tone = "light", size = "large", className },
  ref
) {
  const rootRef = useRef<HTMLAnchorElement | null>(null);

  const setRefs = (el: HTMLAnchorElement | null) => {
    rootRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLAnchorElement | null>).current = el;
  };

  const onLabelHover = (entering: boolean) => {
    const root = rootRef.current;
    if (!root) return;
    const tops = root.querySelectorAll(`.${styles.top}`);
    const bottoms = root.querySelectorAll(`.${styles.bottom}`);
    gsap.to([...tops, ...bottoms], {
      yPercent: entering ? -100 : 0,
      duration: 0.5,
      ease: "power3.out",
      stagger: 0.018,
      overwrite: true,
    });
  };

  const classes = [
    styles.cta,
    tone === "light" ? styles.light : styles.dark,
    size === "compact" ? styles.compact : "",
    "cta-button",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <a
      ref={setRefs}
      href={href}
      className={classes}
      onMouseEnter={() => onLabelHover(true)}
      onMouseLeave={() => onLabelHover(false)}
    >
      <span className={styles.fill} aria-hidden="true" />
      <span className={styles.label}>
        <SplitChars text={label} />
      </span>
      <span className={`${styles.dot} cta-button-dot`}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </a>
  );
});

export default CtaButton;
