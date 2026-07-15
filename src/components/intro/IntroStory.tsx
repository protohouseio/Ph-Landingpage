"use client";

import { useLayoutEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { tokens } from "@/config/design-tokens";
import ArcLogo from "./ArcLogo";
import styles from "./intro.module.css";

gsap.registerPlugin(useGSAP);

const STORIES = tokens.intro.story;
const CAPTION = tokens.intro.caption;

/* 12 radial hairlines, evenly rotated, from outer edge toward center. */
const LINES = Array.from({ length: 12 }, (_, i) => {
  const a = ((i * 30 + 15) * Math.PI) / 180;
  return {
    x1: +(50 + 75 * Math.cos(a)).toFixed(2),
    y1: +(50 + 75 * Math.sin(a)).toFixed(2),
  };
});

/**
 * Same 12 angles as LINES, but endpoints pushed out to ~140 units so they
 * reach past any viewport's corners/edges regardless of aspect ratio (used
 * with preserveAspectRatio="none" on a non-square viewBox — see
 * FullBleedLines below) rather than stopping short at a fixed radius.
 */
const EDGE_LINES = Array.from({ length: 12 }, (_, i) => {
  const a = ((i * 30 + 15) * Math.PI) / 180;
  return {
    x1: +(50 + 140 * Math.cos(a)).toFixed(2),
    y1: +(50 + 140 * Math.sin(a)).toFixed(2),
  };
});

function RadialField({
  lineClassName,
  lineRefs,
}: {
  lineClassName: string;
  lineRefs?: (el: SVGLineElement | null, i: number) => void;
}) {
  return (
    <svg
      className={styles.linesSvg}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {LINES.map((l, i) => (
        <line
          key={i}
          ref={lineRefs ? (el) => lineRefs(el, i) : undefined}
          className={lineClassName}
          x1={l.x1}
          y1={l.y1}
          x2={50}
          y2={50}
          pathLength={200}
        />
      ))}
      <circle className={styles.bgCircle} cx={50} cy={50} r={16} />
      <circle className={styles.bgCircle} cx={50} cy={50} r={26} />
      <circle className={styles.bgCircle} cx={50} cy={50} r={38} />
    </svg>
  );
}

/**
 * Logo-phase-only radial field: lines run edge-to-edge (top/left/right/
 * bottom) at the viewport's actual aspect ratio, not clipped to a fixed
 * radius or faded out before reaching the border. `preserveAspectRatio`
 * defaults to "xMidYMid meet" is wrong here too — we want the viewBox to
 * stretch to fill non-uniformly, so "none" it is; combined with EDGE_LINES'
 * generous 140-unit radius this reaches every corner at any window shape.
 *
 * The grow-in reveal animates the x2/y2 endpoint (GSAP tweening the raw SVG
 * attributes, not stroke-dasharray/dashoffset) from the edge point in to
 * the center — dasharray-based reveals render as broken/patchy dashes here
 * because this SVG is stretched non-uniformly (preserveAspectRatio="none")
 * combined with vector-effect="non-scaling-stroke", which distorts how
 * browsers compute the normalized pathLength dash pattern on diagonal
 * lines. Animating the endpoint coordinates directly sidesteps that
 * entirely and always renders as one solid, unbroken line.
 */
function FullBleedLines({
  svgRef,
  lineRefs,
}: {
  svgRef: React.Ref<SVGSVGElement>;
  lineRefs: (el: SVGLineElement | null, i: number) => void;
}) {
  return (
    <svg
      ref={svgRef}
      className={styles.edgeLinesSvg}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {EDGE_LINES.map((l, i) => (
        <line
          key={i}
          ref={(el) => lineRefs(el, i)}
          className={styles.growLine}
          x1={l.x1}
          y1={l.y1}
          x2={l.x1}
          y2={l.y1}
        />
      ))}
    </svg>
  );
}

/**
 * True semicircle with a layered glow: a wide soft bloom, a mid glow, an
 * inner glow, and a crisp core stroke — the same additive look as a lens
 * flare / eclipse ring. viewBox is 1000x500 (radius 500), so the curve
 * reads as a genuine half-circle rather than a shallow bend. Both wrappers
 * share the same flat (diameter) edge at their container's vertical
 * center, so the top and bottom arcs' endpoints coincide exactly — no
 * gap or seam where they meet.
 */
const AccentArc = ({
  id,
  gradFrom,
  gradTo,
  flip,
  innerRef,
  glowRef,
  bloomRef,
}: {
  id: string;
  gradFrom: string;
  gradTo: string;
  flip?: boolean;
  innerRef: React.Ref<SVGPathElement>;
  glowRef: React.Ref<SVGPathElement>;
  bloomRef: React.Ref<SVGPathElement>;
}) => {
  // Half-circle. `flip` (top arc): diameter along the bottom edge (y=500),
  // bowing up to the pole at y=0 — so its flat edge sits at the wrapper's
  // bottom, flush with the shared center line. Bottom arc: diameter along
  // the top edge (y=0), bowing down to y=500 — flat edge at the wrapper's
  // top, same center line, endpoints coincide with the top arc's exactly.
  const d = flip ? "M0,500 A500,500 0 0 1 1000,500" : "M0,0 A500,500 0 0 0 1000,0";
  return (
    <svg className={styles.arcSvg} viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: gradFrom, stopOpacity: 0 }} />
          <stop offset="0.15" style={{ stopColor: gradFrom }} />
          <stop offset="0.5" style={{ stopColor: gradTo }} />
          <stop offset="0.85" style={{ stopColor: gradFrom }} />
          <stop offset="1" style={{ stopColor: gradFrom, stopOpacity: 0 }} />
        </linearGradient>
        <filter id={`${id}-blurA`} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`${id}-blurB`} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id={`${id}-blurC`} x="-20%" y="-80%" width="140%" height="260%">
          <feGaussianBlur stdDeviation="34" />
        </filter>
      </defs>
      <path ref={bloomRef} className={styles.arcBloom} d={d} stroke={`url(#${id})`} filter={`url(#${id}-blurC)`} vectorEffect="non-scaling-stroke" />
      <path ref={glowRef} className={styles.arcGlow} d={d} stroke={`url(#${id})`} filter={`url(#${id}-blurB)`} vectorEffect="non-scaling-stroke" />
      <path ref={innerRef} className={styles.arcGlowInner} d={d} stroke={`url(#${id})`} filter={`url(#${id}-blurA)`} vectorEffect="non-scaling-stroke" />
      <path className={styles.arcCore} d={d} stroke={`url(#${id})`} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export default function IntroStory() {
  const rootRef = useRef<HTMLDivElement>(null);
  const logoPhaseRef = useRef<HTMLDivElement>(null);
  const logoBoxRef = useRef<HTMLDivElement>(null);
  const growLinesRef = useRef<SVGSVGElement>(null);
  const growLineEls = useRef<Array<SVGLineElement | null>>([]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const halfTopRef = useRef<HTMLDivElement>(null);
  const halfBottomRef = useRef<HTMLDivElement>(null);
  // Story text is rendered twice (once inside each half, clipped to that
  // half) so it travels naturally with its half during the split — index
  // [i][0] = top-half copy, [i][1] = bottom-half copy.
  const storyRefs = useRef<Array<Array<HTMLDivElement | null>>>(
    STORIES.map(() => [null, null])
  );
  const arcTopWrapRef = useRef<HTMLDivElement>(null);
  const arcBottomWrapRef = useRef<HTMLDivElement>(null);
  const cometTopRefs = useRef<Array<SVGLineElement | null>>([]);
  const cometBottomRefs = useRef<Array<SVGLineElement | null>>([]);
  const arcInnerRefs = useRef<Array<SVGPathElement | null>>([]);
  const arcGlowRefs = useRef<Array<SVGPathElement | null>>([]);
  const arcBloomRefs = useRef<Array<SVGPathElement | null>>([]);
  // storyWordRefs[i][half] = flat array of every word <span> across both
  // lines of that story's copy in that half (order of appearance in DOM).
  const storyWordRefs = useRef<Array<Array<HTMLSpanElement[]>>>(
    STORIES.map(() => [[], []])
  );

  // On reload/back-forward navigation, browsers restore the previous
  // scroll position by default. If that position lands inside the intro's
  // pinned range, snap back to the very top so the logo+story sequence
  // always starts clean — a mid-animation reload should never strand the
  // user in a half-finished intro state.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const wrapEnd = wrapRef.current?.offsetHeight ?? 0;
    if (window.scrollY > 0 && window.scrollY < wrapEnd) {
      window.scrollTo(0, 0);
    }
  }, []);

  // Lock scroll during the load-in logo animation, then release it.
  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const releaseScroll = () => {
        document.documentElement.style.overflow = "";
      };

      // ---------------- Phase 2 setup (needed before phase 1 can hand off) ----------------
      const cometsTop = cometTopRefs.current.filter(Boolean) as SVGLineElement[];
      const cometsBottom = cometBottomRefs.current.filter(Boolean) as SVGLineElement[];
      // Only story 0 gets the word-by-word treatment; its own words start
      // below their line's mask. Stories 1-3 fade/rise as a whole block.
      const firstStoryWords = storyWordRefs.current[0]?.flat() ?? [];

      gsap.set([...cometsTop, ...cometsBottom], { strokeDashoffset: 0 });

      const vh = () => window.innerHeight;

      // Arc wrappers are centered via xPercent/yPercent (GSAP-managed) so
      // the y tweens below can animate freely without fighting a
      // CSS-authored transform. Rest state: fully off-screen above/below.
      gsap.set(arcTopWrapRef.current, { xPercent: -50, yPercent: -100, y: () => -0.85 * vh() });
      gsap.set(arcBottomWrapRef.current, { xPercent: -50, yPercent: 0, y: () => 0.85 * vh() });

      // Fixed total duration so every position label below (0..1) maps to
      // an exact fraction of the scrubbed scroll range, regardless of how
      // many tweens get added or how long each one is.
      const TIMELINE_DURATION = 1;

      const master = gsap.timeline({
        defaults: { duration: TIMELINE_DURATION },
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
          pin: stageRef.current,
          anticipatePin: 1,
        },
      });
      // Pin the timeline's total length so scrub math is exact even though
      // the individual tweens below are added with fractional durations.
      master.to({}, { duration: TIMELINE_DURATION }, 0);

      // Comet pulses travel the radial lines throughout the whole story phase.
      master.to([...cometsTop, ...cometsBottom], { strokeDashoffset: -400, ease: "none" }, 0);

      // Arcs travel in from top/bottom (to y:0 = touching at center) and
      // gain glow as they approach — they live inside halfTop/halfBottom
      // so the split carries them along.
      master.to(arcTopWrapRef.current, { y: 0, ease: "power2.out", duration: 0.72 }, 0.06);
      master.to(arcBottomWrapRef.current, { y: 0, ease: "power2.out", duration: 0.72 }, 0.06);
      master.to(arcInnerRefs.current, { opacity: 0.9, ease: "none", duration: 0.82 }, 0.1);
      master.to(arcGlowRefs.current, { opacity: 0.7, ease: "none", duration: 0.82 }, 0.1);
      master.to(arcBloomRefs.current, { opacity: 0.55, ease: "none", duration: 0.82 }, 0.1);

      // Story lines. Every story — including 1 — is entered AND exited by
      // this single scrubbed timeline, so scroll-back always works the same
      // way for all four. Story 1's *visual* entrance is triggered once
      // automatically right after the logo fades (see the autoplay effect
      // below), but that's done by moving this same ScrollTrigger's
      // progress forward, not by a second, independent animation — so
      // there is exactly one source of truth for these elements at all
      // times, and no double-reveal / stuck-on-scroll-back conflict.
      const storyWindows: Array<{ in: number; out: number | null }> = [
        { in: 0.02, out: 0.28 },
        { in: 0.38, out: 0.52 },
        { in: 0.6, out: 0.72 },
        { in: 0.8, out: null },
      ];
      storyWindows.forEach((w, i) => {
        const containers = storyRefs.current[i]?.filter(Boolean) as HTMLDivElement[] | undefined;
        if (!containers || !containers.length) return;

        if (i === 0) {
          const words = firstStoryWords;
          gsap.set(words, { yPercent: 130 });
          master.set(containers, { autoAlpha: 1 }, w.in);
          master.to(words, { yPercent: 0, ease: "power3.out", duration: 0.11, stagger: 0.008 }, w.in);
          if (w.out !== null) {
            master.to(words, { yPercent: -130, ease: "power2.in", duration: 0.08, stagger: 0.006 }, w.out);
            master.set(containers, { autoAlpha: 0 }, w.out + 0.08);
          }
        } else {
          master.fromTo(
            containers,
            { autoAlpha: 0, y: 26 },
            { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.1 },
            w.in
          );
          if (w.out !== null) {
            master.to(containers, { autoAlpha: 0, y: -26, ease: "power2.in", duration: 0.08 }, w.out);
          }
        }
      });

      // Final split: top half (line 1 + top arc) rises, bottom half (line 2
      // + bottom arc) falls, revealing the hero beneath.
      master.to(halfTopRef.current, { y: () => -0.5 * vh(), ease: "power2.inOut", duration: 0.15 }, 0.9);
      master.to(halfBottomRef.current, { y: () => 0.5 * vh(), ease: "power2.inOut", duration: 0.15 }, 0.9);

      // ---------------- Phase 1: logo load-in (autoplay) ----------------
      // Plays once on load. Story 1's entrance is "played" by animating
      // this same ScrollTrigger's progress from 0 to just past story 1's
      // `in` point — the master timeline above is the only thing that ever
      // touches story 1's DOM nodes, so there is nothing for a real scroll
      // to conflict with afterward, and scrolling back up simply reverses
      // the same scrubbed progress, which naturally re-shows story 1.
      const st = master.scrollTrigger as ScrollTrigger;
      // Lands well inside story 1's [0.02, 0.28] hold window (see
      // storyWindows above) with generous margin on both sides, so scrub
      // lag/inertia from Lenis/ScrollTrigger can never overshoot into the
      // exit trigger before the user has had a chance to read it.
      const storyOneRevealProgress = 0.1;

      if (reduced) {
        gsap.set(logoPhaseRef.current, { autoAlpha: 0, display: "none" });
        st.scroll(st.start + (st.end - st.start) * storyOneRevealProgress);
        ScrollTrigger.refresh();
        releaseScroll();
      } else {
        const growLines = growLineEls.current.filter(Boolean) as SVGLineElement[];
        const progressDriver = { p: 0 };

        gsap
          .timeline({ delay: 0.15 })
          .to(logoBoxRef.current, { opacity: 1, scale: 1, duration: 1.1, ease: "power2.out" })
          .to(growLines, { attr: { x2: 50, y2: 50 }, duration: 1.2, stagger: 0.03, ease: "power2.out" }, "<")
          .to({}, { duration: 0.25 })
          .to(logoPhaseRef.current, { autoAlpha: 0, duration: 0.6, ease: "power2.inOut" })
          .set(logoPhaseRef.current, { display: "none" })
          .to(progressDriver, {
            p: storyOneRevealProgress,
            duration: 0.6,
            ease: "power3.out",
            onUpdate: () => {
              st.scroll(st.start + (st.end - st.start) * progressDriver.p);
            },
          })
          .call(releaseScroll);
      }
    },
    { scope: rootRef }
  );

  const setStoryRef = (i: number, half: 0 | 1) => (el: HTMLDivElement | null) => {
    storyRefs.current[i][half] = el;
  };

  const pushWordRef = (i: number, half: 0 | 1) => (el: HTMLSpanElement | null) => {
    if (!el) return;
    storyWordRefs.current[i][half].push(el);
  };

  const renderWords = (text: string, i: number, half: 0 | 1) => {
    const words = text.split(" ");
    return words.map((word, wi) => (
      <span key={wi} className={styles.storyWord} ref={pushWordRef(i, half)}>
        {word}
        {wi < words.length - 1 ? " " : ""}
      </span>
    ));
  };

  return (
    <div ref={rootRef}>
      {/* ---- Phase 1: logo load-in overlay ---- */}
      <div className={styles.logoPhase} ref={logoPhaseRef}>
        <div className={styles.bgLayer}>
          <FullBleedLines
            svgRef={growLinesRef}
            lineRefs={(el, i) => {
              growLineEls.current[i] = el;
            }}
          />
          <div className={styles.vignette} />
          <div className={styles.logoBox} ref={logoBoxRef}>
            <ArcLogo />
          </div>
        </div>
      </div>

      {/* ---- Phase 2: pinned, scroll-driven story ---- */}
      <div className={styles.wrap} ref={wrapRef} style={{ height: `${tokens.intro.heightVh}vh` }}>
        <div className={styles.stage} ref={stageRef}>
          {/* Top half: carries the background field, top arc, and
              story-line-1 text (word-revealed). Rises away on split. */}
          <div className={`${styles.half} ${styles.halfTop}`} ref={halfTopRef}>
            <div className={styles.bgLayer}>
              <RadialField lineClassName={styles.baseLine} />
              <RadialField
                lineClassName={styles.comet}
                lineRefs={(el, i) => {
                  cometTopRefs.current[i] = el;
                }}
              />
              <div className={styles.vignette} />
            </div>
            <div className={styles.arcTop} ref={arcTopWrapRef}>
              <AccentArc
                id="arcGradTop"
                gradFrom="var(--color-accent-alt)"
                gradTo="var(--color-accent-soft)"
                flip
                innerRef={(el) => {
                  arcInnerRefs.current[0] = el;
                }}
                glowRef={(el) => {
                  arcGlowRefs.current[0] = el;
                }}
                bloomRef={(el) => {
                  arcBloomRefs.current[0] = el;
                }}
              />
            </div>
            {STORIES.map((s, i) => (
              <div key={i} className={styles.story} ref={setStoryRef(i, 0)}>
                <span>{i === 0 ? renderWords(s.line1, i, 0) : s.line1}</span>
                <span className={i === STORIES.length - 1 ? styles.l2accent : styles.l2}>
                  {i === 0 ? renderWords(s.line2, i, 0) : s.line2}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom half: mirrors the top — falls away on split. */}
          <div className={`${styles.half} ${styles.halfBottom}`} ref={halfBottomRef}>
            <div className={styles.bgLayer}>
              <RadialField lineClassName={styles.baseLine} />
              <RadialField
                lineClassName={styles.comet}
                lineRefs={(el, i) => {
                  cometBottomRefs.current[i] = el;
                }}
              />
              <div className={styles.vignette} />
            </div>
            <div className={styles.arcBottom} ref={arcBottomWrapRef}>
              <AccentArc
                id="arcGradBot"
                gradFrom="var(--color-accent)"
                gradTo="var(--color-accent-soft)"
                innerRef={(el) => {
                  arcInnerRefs.current[1] = el;
                }}
                glowRef={(el) => {
                  arcGlowRefs.current[1] = el;
                }}
                bloomRef={(el) => {
                  arcBloomRefs.current[1] = el;
                }}
              />
            </div>
            {STORIES.map((s, i) => (
              <div key={i} className={styles.story} ref={setStoryRef(i, 1)}>
                <span>{i === 0 ? renderWords(s.line1, i, 1) : s.line1}</span>
                <span className={i === STORIES.length - 1 ? styles.l2accent : styles.l2}>
                  {i === 0 ? renderWords(s.line2, i, 1) : s.line2}
                </span>
              </div>
            ))}
            <p className={styles.caption}>{CAPTION}</p>
            <div className={styles.scrollCue} aria-hidden="true">
              <span className={styles.scrollCueLabel}>Scroll</span>
              <div className={styles.scrollCueTrack}>
                <span className={styles.scrollCueDot} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
