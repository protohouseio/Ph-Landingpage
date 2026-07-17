"use client";

import { useLayoutEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { tokens } from "@/config/design-tokens";
import ArcLogo from "@/components/shared/ArcLogo";
import styles from "./intro.module.css";

export type IntroStoryProps = {
  /** Called at the exact moment the logo overlay begins fading out — the
   * global SiteNav reveals itself right at this point, before story 1 even
   * shows, per the site-wide-fixed-header requirement. */
  onLogoFadeStart?: () => void;
  /** Continuously reports how far scroll has progressed through a short
   * window approaching story 1 ("the second story"), as 0..1 — SiteNav
   * scrubs its full-width-bar-to-pill collapse directly off this value
   * every frame, so the motion tracks scroll position itself (glides
   * open/closed in lockstep with the scrollbar) rather than firing a
   * fixed-duration tween at a single threshold. */
  onSecondStory?: (progress: number) => void;
  /** Fires as soon as the zoom-out finale's light background layer
   * becomes visually dominant — well before StoryReveal's own pinned
   * range begins. SiteNav flips its icon/text tone right on this signal
   * instead of waiting for StoryReveal to actually start, which reads
   * as noticeably late relative to when the screen actually turns light. */
  onLightBackground?: (active: boolean) => void;
};

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
  innerRef: React.Ref<SVGSVGElement>;
  glowRef: React.Ref<SVGSVGElement>;
  bloomRef: React.Ref<SVGSVGElement>;
}) => {
  // Half-circle. `flip` (top arc): diameter along the bottom edge (y=500),
  // bowing up to the pole at y=0 — so its flat edge sits at the wrapper's
  // bottom, flush with the shared center line. Bottom arc: diameter along
  // the top edge (y=0), bowing down to y=500 — flat edge at the wrapper's
  // top, same center line, endpoints coincide with the top arc's exactly.
  const d = flip ? "M0,500 A500,500 0 0 1 1000,500" : "M0,0 A500,500 0 0 0 1000,0";

  // The glow layers are separate stacked <svg> elements with CSS
  // `filter: blur()` on the element, NOT feGaussianBlur inside one SVG:
  // SVG filters are re-rasterized on the CPU every time the filtered
  // path's opacity tween updates (continuously, across the whole story
  // phase — measured as 100-400ms frame spikes). With CSS blur on an
  // element whose *content* never changes, the browser caches the
  // blurred texture once and the opacity tweens (now targeting the svg
  // elements themselves) become compositor-only updates.
  const grad = (layerId: string) => (
    <defs>
      <linearGradient id={layerId} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" style={{ stopColor: gradFrom, stopOpacity: 0 }} />
        <stop offset="0.15" style={{ stopColor: gradFrom }} />
        <stop offset="0.5" style={{ stopColor: gradTo }} />
        <stop offset="0.85" style={{ stopColor: gradFrom }} />
        <stop offset="1" style={{ stopColor: gradFrom, stopOpacity: 0 }} />
      </linearGradient>
    </defs>
  );

  const layers: Array<{ ref?: React.Ref<SVGSVGElement>; svgClass: string; pathClass: string; key: string }> = [
    { ref: bloomRef, svgClass: styles.arcBloom, pathClass: styles.arcStrokeBloom, key: "bloom" },
    { ref: glowRef, svgClass: styles.arcGlow, pathClass: styles.arcStrokeGlow, key: "glow" },
    { ref: innerRef, svgClass: styles.arcGlowInner, pathClass: styles.arcStrokeInner, key: "inner" },
    { svgClass: styles.arcCoreLayer, pathClass: styles.arcStrokeCore, key: "core" },
  ];

  return (
    <div className={styles.arcStack}>
      {layers.map((layer) => (
        <svg
          key={layer.key}
          ref={layer.ref}
          className={`${styles.arcLayer} ${layer.svgClass}`}
          viewBox="0 0 1000 500"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {grad(`${id}-${layer.key}`)}
          <path className={layer.pathClass} d={d} stroke={`url(#${id}-${layer.key})`} vectorEffect="non-scaling-stroke" />
        </svg>
      ))}
    </div>
  );
};

export default function IntroStory({ onLogoFadeStart, onSecondStory, onLightBackground }: IntroStoryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const logoPhaseRef = useRef<HTMLDivElement>(null);
  const logoBoxRef = useRef<HTMLDivElement>(null);
  const growLinesRef = useRef<SVGSVGElement>(null);
  const growLineEls = useRef<Array<SVGLineElement | null>>([]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Inner wrapper that actually gets scaled for the zoom-out finale.
  // Deliberately NOT the same element as stageRef: stageRef is the
  // ScrollTrigger `pin` target, and pin already drives that element's
  // own transform to hold it fixed in the viewport. Scaling stageRef
  // directly fights that — ScrollTrigger measures the pinned element's
  // bounding box on every scroll/refresh, and a simultaneously-changing
  // scale transform on the same element makes each measurement come back
  // different, triggering another internal refresh in a feedback loop
  // (reproduced: scrolling hard into the zoom froze the page and capped
  // scroll position). Scaling this separate inner layer instead leaves
  // stageRef's own transform untouched, so pin's math stays stable.
  const zoomLayerRef = useRef<HTMLDivElement>(null);
  const halfTopRef = useRef<HTMLDivElement>(null);
  const halfBottomRef = useRef<HTMLDivElement>(null);
  // Solid color layer beneath .stage — fades in to storyReveal.bg during
  // the zoom-out finale, so as .stage scales up and fades away it reveals
  // this light color rather than dropping to page-black underneath.
  const zoomBgRef = useRef<HTMLDivElement>(null);
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
  const arcInnerRefs = useRef<Array<SVGSVGElement | null>>([]);
  const arcGlowRefs = useRef<Array<SVGSVGElement | null>>([]);
  const arcBloomRefs = useRef<Array<SVGSVGElement | null>>([]);
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

      // Zoom-out finale timing — declared up here (not just where the
      // zoom tweens themselves are added, further down) because the
      // tone-tracking ScrollTrigger below also needs it, and duplicating
      // these as separate magic numbers in two places would let them
      // silently drift out of sync.
      const zoomStart = 0.84;
      const zoomDuration = 0.16;

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

      // Fires as real scroll approaches story 1's reveal window (see
      // storyWindows below — index 1's `in` is 0.38) so SiteNav can
      // collapse into its centered pill, not on any arbitrary scroll and
      // not as an instant on/off snap. Remapped into a wide ramp window
      // (spans a real, perceptible chunk of scroll — not a couple of
      // frames) so SiteNav can scrub the collapse continuously off real
      // scroll position: it visibly glides shut as the window is
      // crossed and glides back open in reverse, tracking the scrollbar
      // itself rather than firing a fixed-duration tween at one point.
      // A separate ScrollTrigger on the same pinned trigger element,
      // rather than piggybacking on the master timeline, so it can't
      // perturb the master's own scrub/pin math.
      const collapseRampStart = 0.28;
      const collapseRampEnd = 0.42;
      // Light-background threshold: fires right as the zoom-out's zoomBg
      // layer starts becoming visually noticeable (that fade-in itself
      // begins at zoomStart + zoomDuration*0.2, see the zoom tweens
      // below) — not gated on StoryReveal's own pinned range starting,
      // which is much later (progress 1.0) and reads as a noticeably
      // delayed color-flip relative to when the screen actually turns
      // light.
      const lightBgThreshold = zoomStart + zoomDuration * 0.25;
      let wasLight = false;
      ScrollTrigger.create({
        trigger: wrapRef.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const raw = (self.progress - collapseRampStart) / (collapseRampEnd - collapseRampStart);
          onSecondStory?.(gsap.utils.clamp(0, 1, raw));

          const isLight = self.progress >= lightBgThreshold;
          if (isLight !== wasLight) {
            wasLight = isLight;
            onLightBackground?.(isLight);
          }
        },
      });

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

      // Final transition: the whole stage zooms outward (scales up hugely
      // while fading), reading as flying forward through the screen,
      // rather than the screen splitting into two halves. The solid
      // zoomBg layer crossfades in underneath at the same time so what's
      // revealed as .stage fades away is the story-reveal section's light
      // background color, not page-black. Ends exactly at progress 1 —
      // the pinned timeline's own max — so the pin releases the instant
      // the zoom finishes. The next section lives in normal document flow
      // right after the intro's pin spacer, so as soon as the pin lets
      // go, ordinary scroll continuity carries straight into it with no
      // dead frame: nothing to reveal mid-pin, because there's no gap
      // between "zoom finished" and "normal scrolling resumes."
      // (zoomStart/zoomDuration declared earlier alongside TIMELINE_DURATION)
      // Scale is capped at 4 (not higher) and the alpha fade is
      // front-loaded to finish HALFWAY through the zoom, deliberately:
      // this layer contains 6 feGaussianBlur SVG filters + 48 lines, and
      // the browser re-rasterizes all of it at the current scale every
      // frame. At 9x scale with alpha still > 0 that rasterization cost
      // froze the page outright when scrolling backward across this
      // boundary (reverse re-enters at max scale). With alpha reaching 0
      // (visibility:hidden via autoAlpha) by the zoom's midpoint, the
      // expensive high-scale half is never painted in either direction.
      master.to(
        zoomLayerRef.current,
        { scale: 4, ease: "power1.in", duration: zoomDuration, transformOrigin: "50% 50%" },
        zoomStart
      );
      master.to(zoomLayerRef.current, { autoAlpha: 0, ease: "power1.in", duration: zoomDuration * 0.5 }, zoomStart);
      // Light bg must be fully in before the stage finishes fading, or a
      // black frame flashes between them — starts at 0.2*zoomDuration
      // (well before zoomLayer's own fade-out completes at 0.5*zoomDuration,
      // for overlap) and now runs almost all the way to the pin's release
      // point (progress 1), rather than finishing at ~0.91 and leaving
      // ~9% of the timeline (~56vh) of scroll where the screen already
      // looks white but nothing else happens before StoryReveal's own
      // content starts. That gap read as a stall between "screen turns
      // white" and "text reveal begins."
      master.to(zoomBgRef.current, { autoAlpha: 1, ease: "power1.out", duration: zoomDuration * 0.75 }, zoomStart + zoomDuration * 0.2);

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
        onLogoFadeStart?.();
      } else {
        const growLines = growLineEls.current.filter(Boolean) as SVGLineElement[];
        const progressDriver = { p: 0 };

        gsap
          .timeline({ delay: 0.15 })
          .to(logoBoxRef.current, { opacity: 1, scale: 1, duration: 1.1, ease: "power2.out" })
          .to(growLines, { attr: { x2: 50, y2: 50 }, duration: 1.2, stagger: 0.03, ease: "power2.out" }, "<")
          .to({}, { duration: 0.25 })
          .to(logoPhaseRef.current, { autoAlpha: 0, duration: 0.6, ease: "power2.inOut", onStart: () => onLogoFadeStart?.() })
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
      {/* svh (stable/small viewport height), NOT vh: vh tracks the LIVE
          viewport, which shrinks/grows as a real phone's address bar
          collapses/expands *during* an active scroll gesture. Since
          .stage (below) is already sized in svh, a vh-sized .wrap falls
          out of sync with it the instant that happens — the wrapper's
          total scroll distance shifts while the pinned content's own
          size stays put, producing a real, measured ~384px layout jump
          with scrollY completely unchanged. This is what read as the
          intro/story feeling "shaky" while scrolling on mobile. */}
      <div className={styles.wrap} ref={wrapRef} style={{ height: `${tokens.intro.heightVh}svh` }}>
        <div
          className={styles.zoomBg}
          ref={zoomBgRef}
          style={{ background: tokens.storyReveal.bg }}
          aria-hidden="true"
        />
        <div className={styles.stage} ref={stageRef}>
          <div className={styles.zoomLayer} ref={zoomLayerRef}>
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
                <div
                  key={i}
                  className={`${styles.story} ${i !== 0 ? styles.storyWrap : ""}`}
                  ref={setStoryRef(i, 0)}
                >
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
                <div
                  key={i}
                  className={`${styles.story} ${i !== 0 ? styles.storyWrap : ""}`}
                  ref={setStoryRef(i, 1)}
                >
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
    </div>
  );
}
