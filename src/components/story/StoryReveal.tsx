"use client";

import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { tokens } from "@/config/design-tokens";
import CtaButton from "@/components/shared/CtaButton";
import styles from "./storyreveal.module.css";

const { eyebrow, paragraph, highlights, bg } = tokens.storyReveal;
const { testimonials } = tokens;

type Token = { text: string; isChip: boolean };
type TokenRef = { el: HTMLSpanElement; kind: "word" | "chip"; index: number };

/**
 * Splits the paragraph into whitespace-preserving word tokens, then
 * merges runs of consecutive words that match one of `highlights`
 * (case-insensitive, e.g. "six figures" or "$4,999") into single chip
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
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  const tokensList = useMemo(() => tokenize(paragraph, highlights), []);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Mobile drops the per-word/chip cascade entirely — a whole-block
      // fade-in-on-scroll instead — since word-by-word color ramping
      // across text that's also wrapping to several lines on a narrow
      // screen reads as noisy rather than a controlled, readable reveal.
      const isMobile = window.matchMedia("(max-width: 640px)").matches;

      const entries = tokenRefs.current.filter(Boolean) as TokenRef[];
      if (!entries.length) return;
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];

      if (reduced) {
        gsap.set(
          entries.map((e) => e.el),
          { clearProps: "all" }
        );
        gsap.set(cards, { clearProps: "all" });
        return;
      }

      if (isMobile) {
        // The word/chip spans default to a light, barely-visible gray in
        // CSS (see .word in storyreveal.module.css) — on desktop that's
        // the *starting* color of the reveal ramp, always overwritten by
        // the GSAP tween below. Mobile skips that tween entirely, so it
        // must set the resting (fully revealed) colors itself or the
        // paragraph stays illegible gray-on-cream forever.
        const words = entries.filter((e) => e.kind === "word");
        const chips = entries.filter((e) => e.kind === "chip");
        gsap.set(
          words.map((e) => e.el),
          { color: "#0a0a0a" }
        );
        gsap.set(
          chips.map((e) => e.el),
          { color: "#ffffff", backgroundColor: "rgba(255,91,68,1)" }
        );
        gsap.set(stageRef.current, { autoAlpha: 0, y: 24 });
        gsap.to(stageRef.current, {
          autoAlpha: 1,
          y: 0,
          ease: "power2.out",
          scrollTrigger: {
            trigger: wrapRef.current,
            start: "top 75%",
            end: "top 35%",
            scrub: 0.4,
          },
        });

        // Cards sit right below the heading block in normal document flow
        // on mobile (see .stage's height:auto override in
        // storyreveal.module.css) — nothing else sits between them. No
        // pin here — mobile pinning is what caused the earlier "shaky
        // scroll" pain (see the svh notes below). Each card gets a short
        // fade-up as it approaches, matching the stage's own reveal just
        // above — NOT the desktop's long scroll-linked travel (rising
        // from 0.6 of the viewport height below its slot): that distance
        // was tuned for a pinned pass-through and, in normal mobile flow
        // where cards sit only ~20px apart, it read as a large dead gap
        // between one card settling and the next even starting to move.
        if (cards.length) {
          gsap.set(cards, { autoAlpha: 0, y: 28 });
          cards.forEach((el) => {
            gsap.to(el, {
              autoAlpha: 1,
              y: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                end: "top 65%",
                scrub: 0.4,
              },
            });
          });
        }
        return;
      }

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

      // Cards are a pass-through second act, not interleaved with the
      // words: each enters fully below the pinned stage's bottom edge
      // (= the screen's bottom edge while pinned, clipped until then by
      // .stage's overflow:hidden), travels continuously upward over the
      // paragraph WITHOUT stopping at its layout slot, and keeps going
      // until it's fully off the top of the screen. ease:"none" keeps
      // the speed constant so the stream reads as scroll-linked
      // parallax, and a short stagger (a fraction of one card's travel,
      // not the whole of it) means each card follows the previous one
      // with a small delay rather than waiting for it to finish. After
      // the last card exits, a dead "hold" segment (appended below the
      // cards) keeps the stage pinned while the next section covers it.
      if (cards.length) {
        const wordsEnd = entries.length;
        const cardsStart = wordsEnd * 1.02;
        const cardTravel = wordsEnd * 0.5;
        // On-screen daylight between one card's bottom edge and the next
        // card's top edge as they stream past. The stagger below is
        // derived from this, NOT a bare fraction of cardTravel — a
        // ratio-based stagger overlapped the cards whenever the ratio's
        // pixel equivalent came out smaller than a card's height.
        const cardGapPx = 56;

        // This card's layout top relative to the stage. Measured via
        // rects so the pin's own transform (pinType:"transform" shifts
        // stage and card equally) cancels out; the card's current y
        // tween value is subtracted so re-evaluation on refresh stays
        // correct.
        const relTop = (el: HTMLElement) => {
          const stage = stageRef.current;
          if (!stage) return 0;
          const stageTop = stage.getBoundingClientRect().top;
          const currentY = Number(gsap.getProperty(el, "y")) || 0;
          return el.getBoundingClientRect().top - currentY - stageTop;
        };
        // Just below the stage's bottom edge / fully above its top edge.
        const enterY = (el: HTMLElement) =>
          (stageRef.current?.offsetHeight ?? window.innerHeight) - relTop(el) + 40;
        const exitY = (el: HTMLElement) => -(relTop(el) + el.offsetHeight + 40);

        let pos = cardsStart;
        cards.forEach((el) => {
          tl.fromTo(
            el,
            { y: () => enterY(el) },
            { y: () => exitY(el), ease: "none", duration: cardTravel },
            pos
          );
          // Next card enters once this one has climbed its own height
          // plus the gap: convert those pixels into timeline time via
          // this card's total travel distance (enter + exit spans).
          const stageH = stageRef.current?.offsetHeight ?? window.innerHeight;
          const totalDistance = stageH + el.offsetHeight + 80;
          pos += cardTravel * ((el.offsetHeight + cardGapPx) / totalDistance);
        });
      }

      // Cover-transition hold: after the last card exits, the stage
      // stays pinned and motionless for exactly 100svh of scroll while
      // the next section (VslSection, pulled up by margin-top:-100svh)
      // slides in from the bottom of the screen OVER this frozen one —
      // the pin releases precisely when the incoming section has fully
      // covered the viewport, so the swap underneath is invisible. The
      // pinned scroll span is wrapHeight - 100svh (pin runs "top top" →
      // "bottom bottom"), i.e. 420svh of the 520svh .wrap; the active
      // tweens above occupy the first 320svh of it, so the hold must be
      // 100/320 of the timeline's active duration.
      tl.to({}, { duration: tl.duration() * (100 / 320) });
    },
    { scope: wrapRef, dependencies: [tokensList] }
  );

  let tokenIndex = 0;

  return (
    // Height lives in storyreveal.module.css (.wrap: 520svh desktop /
    // auto mobile) — see the comment there for why it's svh-based and
    // how the 520 breaks down between words, cards, and the cover hold.
    <div className={styles.wrap} ref={wrapRef} style={{ ["--story-bg" as string]: bg }}>
      <div className={styles.stage} ref={stageRef}>
        <div className={styles.layout}>
          <div className={styles.content}>
            <span className={styles.eyebrow}>{eyebrow}</span>
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
            <CtaButton href={tokens.content.navCta.href} label={tokens.content.navCta.label} tone="light" />
          </div>

          <div className={styles.testimonialCol}>
            {testimonials.map((t, i) => (
              <div
                key={t.name + i}
                className={`${styles.card} ${i === 1 ? styles.cardShift : ""} ${i === 1 ? styles.cardGrey : styles.cardAccent}`}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
              >
                {/* Squarish closing-quote glyphs (”” — solid block head,
                    straight-edged tail slanting down-left), per the
                    reference design: no rounded bowls. */}
                <svg className={styles.quoteMark} viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M0 0H42V44L0 80Z" fill="currentColor" />
                  <path d="M58 0H100V44L58 80Z" fill="currentColor" />
                </svg>
                <p className={styles.quote}>{t.quote}</p>
                <div className={styles.authorRow}>
                  <span className={styles.authorName}>{t.name}</span>
                  <span className={styles.authorRole}>{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
