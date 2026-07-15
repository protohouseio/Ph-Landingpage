"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { tokens } from "@/config/design-tokens";
import styles from "./hero.module.css";

const HEADLINES = tokens.content.headlines;

function buildLine(
  container: HTMLSpanElement,
  words: readonly { text: string; accent: boolean }[]
) {
  container.textContent = "";
  const letterEls: HTMLSpanElement[] = [];

  words.forEach((word, wi) => {
    const w = document.createElement("span");
    w.className = word.accent ? `${styles.w} ${styles.ac}` : styles.w;
    for (const c of word.text) {
      const s = document.createElement("span");
      s.className = styles.ch;
      s.textContent = c;
      w.appendChild(s);
      letterEls.push(s);
    }
    container.appendChild(w);
    if (wi < words.length - 1) {
      container.appendChild(document.createTextNode(" "));
    }
  });

  return letterEls;
}

export default function RotatingHeadline() {
  const r1 = useRef<HTMLSpanElement>(null);
  const r2 = useRef<HTMLSpanElement>(null);
  const idxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const fill = (i: number, animate: boolean) => {
      const l1 = r1.current;
      const l2 = r2.current;
      if (!l1 || !l2) return;
      const headline = HEADLINES[i];
      const letters = [
        ...buildLine(l1, headline.line1),
        ...buildLine(l2, headline.line2),
      ];
      if (animate) {
        gsap.fromTo(
          letters,
          { yPercent: 115, opacity: 0.6 },
          {
            yPercent: 0,
            opacity: 1,
            duration: tokens.motion.letterDuration,
            delay: tokens.motion.letterBaseDelay,
            stagger: tokens.motion.letterStagger,
            ease: "power4.out",
          }
        );
      }
    };

    const exit = (onDone: () => void) => {
      const l1 = r1.current;
      const l2 = r2.current;
      if (!l1 || !l2) {
        onDone();
        return;
      }
      const letters = [
        ...l1.querySelectorAll<HTMLSpanElement>(`.${styles.ch}`),
        ...l2.querySelectorAll<HTMLSpanElement>(`.${styles.ch}`),
      ];
      gsap.to(letters, {
        yPercent: -115,
        opacity: 0.4,
        duration: tokens.motion.exitDuration,
        stagger: tokens.motion.exitStagger,
        ease: tokens.ease.exit,
        onComplete: onDone,
      });
    };

    const cycle = () => {
      const next = (idxRef.current + 1) % HEADLINES.length;
      if (reducedMotionRef.current) {
        idxRef.current = next;
        fill(next, false);
      } else {
        exit(() => {
          idxRef.current = next;
          fill(next, true);
        });
      }
      timerRef.current = setTimeout(cycle, tokens.motion.rotationSeconds * 1000);
    };

    fill(0, !reducedMotionRef.current);
    timerRef.current = setTimeout(cycle, tokens.motion.rotationSeconds * 1000);

    return () => {
      clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <h1 className={styles.rot} aria-live="polite">
      <span className={styles.rline} ref={r1} />
      <span className={styles.rline} ref={r2} />
    </h1>
  );
}
