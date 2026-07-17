"use client";

import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { tokens } from "@/config/design-tokens";
import styles from "./storyreveal.module.css";

const { paragraph, highlights, bg } = tokens.storyReveal;

type Token = { text: string; isChip: boolean };
type TokenRef = { el: HTMLSpanElement; kind: "word" | "chip"; index: number };

/**
 * Splits the paragraph into whitespace-preserving word tokens, then
 * merges runs of consecutive words that match one of `highlights`
 * (case-insensitive, e.g. "21 days" or "$80,000") into single chip
 * tokens — each highlight phrase renders as one accent pill, not one
 * pill per word.
 */
function tokenize(text: string, phrases: readonly string[]): Token[] {
  const words = text.split(/(\s+)/).filter((w) => w.length > 0);
  const normalizedPhrases = phrases.map((p) => p.toLowerCase());

  const tokens: Token[] = [];
  let i = 0;
  while (i < words.length) {
    let matched = false;
    for (const phrase of normalizedPhrases) {
      const phraseWords = phrase.split(/\s+/);
      const candidate = words
        .slice(i, i + phraseWords.length * 2 - 1)
        .join("")
        .toLowerCase();
      if (candidate.replace(/\s+/g, " ").trim() === phrase) {
        const consumed = words.slice(i, i + phraseWords.length * 2 - 1).join("");
        tokens.push({ text: consumed, isChip: true });
        i += phraseWords.length * 2 - 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ text: words[i], isChip: false });
      i += 1;
    }
  }
  return tokens;
}

export default function StoryReveal() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Every visible token (plain word OR chip) gets a slot here, in reading
  // order (`index`), so the whole paragraph — chips included — reveals
  // as one continuous left-to-right sweep instead of chips popping in
  // ahead of or behind the word-by-word ramp.
  const tokenRefs = useRef<Array<TokenRef | null>>([]);

  const tokensList = useMemo(() => tokenize(paragraph, highlights), []);

  useGSAP(
    () => {
      const entries = tokenRefs.current.filter(Boolean) as TokenRef[];
      if (!entries.length) return;

      const words = entries.filter((e) => e.kind === "word");
      const chips = entries.filter((e) => e.kind === "chip");

      gsap.set(
        words.map((e) => e.el),
        { color: "#d8d5cc" }
      );
      gsap.set(
        chips.map((e) => e.el),
        { color: "#0a0a0a", backgroundColor: "rgba(255,91,68,0)" }
      );

      // One time-unit per token position, shared by both groups, so a
      // chip lands in the exact same continuous sweep as the words
      // around it rather than jumping ahead/behind. A single `stagger`
      // for the whole word group (rather than one manually-positioned
      // tween per word) is what GSAP batches efficiently — many
      // individually-timed tweens on one scrubbed timeline is what
      // caused the earlier backward-scroll stutter.
      const tl = gsap.timeline({
        scrollTrigger: {
          id: "story-reveal",
          trigger: wrapRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
          pin: stageRef.current,
          // pinType:"transform" is required here — removing it (tried
          // while chasing a separate mobile-resize issue) measurably
          // reintroduced the original backward-scroll freeze this was
          // added to fix in the first place (avg frame gap regressed
          // from a confirmed 29.5ms back to 41.4ms with 300ms+ spikes).
          // The .wrap height unit (svh, not vh — see below) is the
          // actual, correct fix for viewport-resize stability; pinType
          // stays as-is.
          pinType: "transform",
          anticipatePin: 0,
          invalidateOnRefresh: true,
        },
      });

      words.forEach((entry, i) => {
        const next = words[i + 1];
        const span = (next ? next.index : entries.length) - entry.index;
        tl.to(entry.el, { color: "#0a0a0a", ease: "none", duration: span }, entry.index);
      });

      chips.forEach((entry) => {
        tl.to(
          entry.el,
          { color: "#ffffff", backgroundColor: "rgba(255,91,68,1)", ease: "none", duration: 1 },
          entry.index
        );
      });
    },
    { scope: wrapRef, dependencies: [tokensList] }
  );

  let tokenIndex = 0;

  return (
    // svh, NOT vh — this wrapper's total scroll distance must stay
    // anchored to the stable/small viewport height, matching .stage's
    // own already-svh-based sizing (see storyreveal.module.css). A
    // vh-sized wrapper falls out of sync with an svh-sized stage the
    // instant a real phone's address bar collapses/expands mid-scroll,
    // producing a real, measured layout jump with scrollY unchanged —
    // this was the actual cause of the reported "shaky" mobile scroll.
    <div className={styles.wrap} ref={wrapRef} style={{ height: "260svh", ["--story-bg" as string]: bg }}>
      <div className={styles.stage} ref={stageRef}>
        <p className={styles.paragraph}>
          {tokensList.map((token, i) => {
            if (/^\s+$/.test(token.text) && !token.isChip) {
              return <span key={i}>{token.text}</span>;
            }
            const idx = tokenIndex++;
            const kind: "word" | "chip" = token.isChip ? "chip" : "word";
            return (
              <span
                key={i}
                className={token.isChip ? styles.chip : styles.word}
                ref={(el) => {
                  if (el) tokenRefs.current[idx] = { el, kind, index: idx };
                }}
              >
                {token.text}
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}
