"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { tokens } from "@/config/design-tokens";
import {
  ASSEMBLY,
  CONNECTORS,
  LIMB_ORDER,
  MONOLITH,
  REST_POINT,
  SCENE_FRAME,
  SCENE_VB,
  SHADOW_D,
  STAND_POSE,
  STEP_POS,
  TOP_FACES,
  TOWER_TOP_CENTER,
  VIEW_H,
  VIEW_W,
  WALK,
  WALKER_POSES,
  ZOOM_ORIGIN,
  pointAt,
} from "./isoScene";
import styles from "./howitworks.module.css";

gsap.registerPlugin(useGSAP);

const hiw = tokens.howItWorks;

/** Resting (pre-activation) color of the big step numerals — a warm grey
 * on the section's canvas; activation ticks them to full ink. */
const NUM_REST = "#B9B3A6";

/** Path distance (scene px) per full stride of the walk cycle. */
const STRIDE_PX = 25;

/** Master-timeline positions of each phase (timeline duration is 1, so
 * these are also scroll-progress fractions of the pinned range). Snap
 * labels sit at each phase start; every walk lasts WALK_DUR, so each
 * step's activation beat lands at phase + WALK_DUR. */
const PHASE = { step1: 0.1, step2: 0.35, step3: 0.6, result: 0.85 };
const WALK_DUR = 0.16;

/**
 * Section 4 — "How It Works". A pinned, scroll-scrubbed isometric scene:
 * a small flat-black human silhouette walks the low arm of one
 * cross-shaped monolith (colored in the site's own accent), steps up onto
 * its junction, then climbs the tall tower and ends standing at its
 * summit — one limb of the monolith
 * "activates" per step of the 21-day process, with its step text
 * revealed beside a drawn-on, right-angled hairline connector. Modeled
 * on the flat-shaded "Business Growth" infographic reference. Scene
 * geometry lives in isoScene.ts (pure math, one projection).
 *
 * The scene is inline SVG, not Three.js/WebGL, on purpose: the reference
 * aesthetic is flat isometric illustration, so SVG gives crisp edges,
 * per-face flat color and a tiny payload. (A Three.js swap would replace
 * the SVG with an OrthographicCamera, flat-shaded BoxGeometry limbs and
 * a rigged figure driven by the same timeline fractions — deliberately
 * not implemented.)
 *
 * Progressive enhancement: the CSS default state is the fully-activated
 * poster (every face lit, connectors drawn, all text visible, walker
 * standing at its step-01 position with its cast shadow), so with JS
 * disabled — or prefers-reduced-motion, which skips all pinning and
 * scrubbing — the section still reads completely. GSAP applies the
 * "before" states only when it's actually going to animate them.
 */
export default function HowItWorks() {
  const wrapRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);

  const limbRefs = useRef<Array<SVGGElement | null>>([]); // step order: arm, slab, tower
  const washRefs = useRef<Array<SVGGElement | null>>([]);
  const connectorRefs = useRef<Array<SVGPathElement | null>>([]);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);

  const monolithRef = useRef<SVGGElement>(null);
  const walkerRef = useRef<SVGGElement>(null);
  const poseRefs = useRef<Array<SVGGElement | null>>([]);
  const shadowRef = useRef<SVGPathElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const flashRef = useRef<SVGPolygonElement>(null);

  const poseIdx = useRef(STAND_POSE);

  useGSAP(
    () => {
      // Renders the walker for a given path-progress fraction. Purely a
      // function of scroll position, so scrubbing backward replays the
      // gait in reverse exactly. While moving, the four walk-cycle keys
      // (contact/down/passing/up) cycle with travel distance — stride
      // frequency matches speed, and the poses themselves carry the rise
      // and fall (no synthetic bob). At either end of a walk tween the
      // figure rests on the standing pose. The cast shadow's anchor
      // follows the same fraction, its width breathing ±4% mid-stride.
      const renderGait = (f: number, tweenProgress: number) => {
        const atRest = tweenProgress <= 0.001 || tweenProgress >= 0.999;
        const dist = f * WALK.totalLen;
        const phase = dist / STRIDE_PX;
        const lift = Math.abs(Math.sin(phase * Math.PI));
        const idx = atRest ? STAND_POSE : Math.floor((phase % 1) * 4) % 4;
        if (idx !== poseIdx.current) {
          poseIdx.current = idx;
          poseRefs.current.forEach((el, j) => {
            if (el) gsap.set(el, { opacity: j === idx ? 1 : 0 });
          });
        }
        const p = pointAt(f);
        gsap.set(shadowRef.current, {
          x: p.x,
          y: p.y,
          scale: atRest ? 1 : 1 - lift * 0.04,
          // ~ the feet anchor (the path's local 0,0 sits at the bbox's
          // top-right corner, within a few px).
          transformOrigin: "100% 0%",
        });
      };

      const buildDesktop = () => {
        const wrap = wrapRef.current;
        const walker = walkerRef.current;
        const path = pathRef.current;
        const head = headRef.current;
        const limbs = limbRefs.current.filter(Boolean) as SVGGElement[];
        const washes = washRefs.current.filter(Boolean) as SVGGElement[];
        const steps = stepRefs.current.filter(Boolean) as HTMLElement[];
        if (!wrap || !walker || !path || !head || limbs.length < 3 || steps.length < 3) return;

        const parts = steps.map((el) => ({
          root: el,
          num: el.querySelector<HTMLElement>(`.${styles.num}`)!,
          rule: el.querySelector<HTMLElement>(`.${styles.numRule}`)!,
          meta: Array.from(el.querySelectorAll<HTMLElement>(`.${styles.days}, .${styles.title}`)),
          body: el.querySelector<HTMLElement>(`.${styles.body}`)!,
        }));

        // ---- initial ("before") states — CSS defaults are the finished
        // poster, so these only exist where a tween will resolve them ----
        // The whole monolith is hidden at rest: approaching the section,
        // only the heading is on screen; the artwork fades in afterward
        // (see the intro phase below), then assembles from the
        // junction — both arms tucked inward, the tower scaled down to
        // its base (it emerges from behind the slab as it grows).
        // Pre-activation limbs sit under a canvas-colored wash — muted
        // but fully OPAQUE, so the solid never shows through itself.
        gsap.set(monolithRef.current, { autoAlpha: 0 });
        gsap.set(limbs, { transformOrigin: "50% 100%" });
        gsap.set(limbRefs.current[0], { x: ASSEMBLY.arm.x, y: ASSEMBLY.arm.y });
        gsap.set(limbRefs.current[1], { x: ASSEMBLY.slab.x, y: ASSEMBLY.slab.y });
        gsap.set(limbRefs.current[2], { scaleY: ASSEMBLY.towerScaleY });
        gsap.set(washes, { opacity: 0.35 });
        // Connectors carry pathLength=1, so dashoffset 1 = fully undrawn.
        gsap.set(connectorRefs.current, { strokeDashoffset: 1 });
        gsap.set(head.children, { autoAlpha: 0, y: 30 });
        parts.forEach((p) => {
          gsap.set(p.num, { yPercent: 110, color: NUM_REST });
          gsap.set(p.rule, { scaleX: 0, transformOrigin: "0 50%" });
          gsap.set(p.meta, { autoAlpha: 0, y: 14 });
          gsap.set(p.body, { autoAlpha: 0, y: 24 });
        });
        gsap.set([walker, shadowRef.current], { autoAlpha: 0 });

        const mp = (from: number, to: number) => ({
          path,
          align: path,
          alignOrigin: [0.5, 1] as [number, number],
          autoRotate: false,
          start: from,
          end: to,
        });

        // The walker is drawn at its step-01 rest position (the no-JS
        // state) — seat it at the path start before anything is visible.
        gsap.to(walker, { motionPath: mp(0, 0.0001), duration: 0.001, paused: true }).progress(1);
        renderGait(0, 0);

        // One master timeline; total duration pinned to exactly 1 (like
        // IntroStory) so every position below is also a scroll fraction.
        const tl = gsap.timeline({
          scrollTrigger: {
            id: "how-it-works",
            trigger: wrap,
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
            // Same pin recipe as StoryReveal — pin the inner stage, not
            // the trigger, with transform pinning (measured smoother
            // against Lenis in this codebase; see StoryReveal.tsx).
            pin: stageRef.current,
            pinType: "transform",
            anticipatePin: 1,
            // Always settle on a phase label — never between steps.
            snap: {
              snapTo: "labels",
              duration: { min: 0.2, max: 0.6 },
              ease: "power1.inOut",
            },
            invalidateOnRefresh: true,
          },
        });
        tl.to({}, { duration: 1 }, 0);

        const addWalk = (from: number, to: number, pos: number) => {
          const tween = gsap.to(walker, {
            motionPath: mp(from, to),
            duration: WALK_DUR,
            ease: "none",
            immediateRender: false,
          });
          tween.eventCallback("onUpdate", () =>
            renderGait(from + (to - from) * tween.progress(), tween.progress())
          );
          tl.add(tween, pos);
        };

        // The walker has arrived at step i: that limb of the monolith
        // brightens (its wash lifts) with a small press under the
        // moment's weight, the hairline draws, the text reveals.
        const activate = (i: number, pos: number) => {
          const p = parts[i];
          tl.to(washRefs.current[i], { opacity: 0, duration: 0.02, ease: "none" }, pos);
          tl.to(
            limbRefs.current[i],
            {
              keyframes: [
                { scaleY: 0.985, duration: 0.014, ease: "power1.in" },
                { scaleY: 1.008, duration: 0.016, ease: "power1.inOut" },
                { scaleY: 1, duration: 0.015, ease: "power1.out" },
              ],
            },
            pos
          );
          tl.to(connectorRefs.current[i], { strokeDashoffset: 0, duration: 0.05, ease: "none" }, pos + 0.006);
          tl.to(p.num, { yPercent: 0, duration: 0.045, ease: "power3.out" }, pos + 0.008);
          tl.to(p.num, { color: hiw.ink, duration: 0.03, ease: "none" }, pos + 0.014);
          tl.to(p.rule, { scaleX: 1, duration: 0.035, ease: "power2.out" }, pos + 0.022);
          tl.to(p.meta, { autoAlpha: 1, y: 0, duration: 0.04, stagger: 0.008, ease: "power2.out" }, pos + 0.02);
          tl.to(p.body, { autoAlpha: 1, y: 0, duration: 0.05, ease: "power2.out" }, pos + 0.028);
        };

        // A completed step stays visible — the trail already walked —
        // just receded, never removed.
        const recede = (i: number, pos: number) =>
          tl.to(parts[i].root, { opacity: 0.35, y: -10, duration: 0.04, ease: "power1.inOut" }, pos);

        // ---- Phase 0: intro — heading first, then the artwork reveals,
        // then it assembles as one object, then the walker appears ----
        // Deliberately sequenced (not simultaneous): approaching the
        // section shows only the heading; the monolith fades in only
        // once that's mostly on screen, unfolds into the cross, and the
        // walker/shadow appear last, right before step 1's own walk.
        tl.addLabel("intro", 0);
        tl.to(head.children, { autoAlpha: 1, y: 0, duration: 0.06, stagger: 0.012, ease: "power2.out" }, 0.005);
        tl.to(monolithRef.current, { autoAlpha: 1, duration: 0.045, ease: "none" }, 0.03);
        tl.to(limbRefs.current[1], { x: 0, y: 0, duration: 0.065, ease: "power3.out" }, 0.045);
        tl.to(limbRefs.current[2], { scaleY: 1, duration: 0.07, ease: "power3.out" }, 0.05);
        tl.to(limbRefs.current[0], { x: 0, y: 0, duration: 0.065, ease: "power3.out" }, 0.06);
        // Finishes at 0.095 — safely before step 1's own walk tween
        // starts at PHASE.step1 (0.1), so the walker is fully visible
        // and at rest before it ever starts moving.
        tl.to([walker, shadowRef.current], { autoAlpha: 1, duration: 0.02 }, 0.075);

        // ---- Phase 1–3: one walk + activation per step ----
        tl.addLabel("step1", PHASE.step1);
        addWalk(0, WALK.arrivals[0], PHASE.step1);
        activate(0, PHASE.step1 + WALK_DUR);

        tl.addLabel("step2", PHASE.step2);
        recede(0, PHASE.step2);
        addWalk(WALK.arrivals[0], WALK.arrivals[1], PHASE.step2);
        activate(1, PHASE.step2 + WALK_DUR);

        tl.addLabel("step3", PHASE.step3);
        recede(1, PHASE.step3);
        addWalk(WALK.arrivals[1], 1, PHASE.step3);
        activate(2, PHASE.step3 + WALK_DUR);
        // Launch beat at the tower's top (the walker doesn't climb it —
        // the tower is the payoff object): one brief lighter flash across
        // its top face and an expanding ring at its summit edge.
        tl.to(
          flashRef.current,
          {
            keyframes: [
              { opacity: 0.35, duration: 0.015 },
              { opacity: 0, duration: 0.02 },
            ],
          },
          PHASE.step3 + WALK_DUR + 0.004
        );
        tl.fromTo(
          ringRef.current,
          { scale: 0.25, opacity: 0.9, transformOrigin: "50% 50%" },
          { scale: 1.9, opacity: 0, duration: 0.05, ease: "power1.out", immediateRender: false },
          PHASE.step3 + WALK_DUR + 0.008
        );

        // ---- Phase 4: closing camera settle ----
        // A last, quiet push toward the tower's summit — where the
        // walker has just arrived — as the finishing beat; steps 01-03
        // all remain visible (01/02 receded, 03 lit) as the finished
        // trail up the monolith.
        tl.addLabel("result", PHASE.result);
        tl.to(
          sceneRef.current,
          { scale: 1.07, xPercent: -1.2, yPercent: -1.4, transformOrigin: ZOOM_ORIGIN, duration: 0.13, ease: "power1.inOut" },
          PHASE.result
        );
        tl.addLabel("end", 1);
      };

      const buildMobile = () => {
        // No pin below 768px: the scene sits on top fully activated
        // (walker + shadow at their step-01 rest position — their drawn
        // state), each step is a normal block in flow, and everything
        // reveals with simple batched fade-ups.
        const steps = stepRefs.current.filter(Boolean) as HTMLElement[];
        const targets = steps;
        if (targets.length) {
          gsap.set(targets, { autoAlpha: 0, y: 28 });
          ScrollTrigger.batch(targets, {
            start: "top 85%",
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: 0.7,
                ease: "power2.out",
                stagger: 0.12,
                overwrite: true,
              }),
          });
        }
        if (sceneRef.current) {
          gsap.fromTo(
            sceneRef.current,
            { autoAlpha: 0, y: 36 },
            {
              autoAlpha: 1,
              y: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: sceneRef.current,
                start: "top 88%",
                end: "top 55%",
                scrub: 0.5,
              },
            }
          );
        }
      };

      // gsap.matchMedia (registered inside useGSAP's context, so every
      // branch's styles and ScrollTriggers revert automatically when a
      // condition flips or the component unmounts).
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          desktop: "(min-width: 768px)",
          mobile: "(max-width: 767px)",
        },
        (mmCtx) => {
          const c = mmCtx.conditions as { reduce: boolean; desktop: boolean; mobile: boolean };
          // Reduced motion: no pin, no scrub, nothing hidden — the CSS
          // default IS the fully-activated scene with all text visible.
          if (c.reduce) return;
          if (c.desktop) buildDesktop();
          else buildMobile();
        }
      );
    },
    { scope: wrapRef }
  );

  const cssVars = {
    "--hiw-bg": hiw.bg,
    "--hiw-accent-top": hiw.accentTop,
    "--hiw-accent-side": hiw.accentSide,
    "--hiw-accent-deep": hiw.accentDeep,
    "--hiw-ink": hiw.ink,
    "--hiw-ink-soft": hiw.inkSoft,
  } as React.CSSProperties;

  const frameVars = {
    "--frame-left": SCENE_FRAME.left,
    "--frame-top": SCENE_FRAME.top,
    "--frame-width": SCENE_FRAME.width,
    "--frame-height": SCENE_FRAME.height,
  } as React.CSSProperties;

  // Painter's order for the solid: tower (back) → slab → arm (front).
  // limbRefs/washRefs are indexed in STEP order (arm 0, slab 1, tower 2)
  // to line up with steps 01/02/03.
  const limbDraw = [
    { geom: MONOLITH.tower, refIdx: 2 },
    { geom: MONOLITH.slab, refIdx: 1 },
    { geom: MONOLITH.arm, refIdx: 0 },
  ];

  return (
    <section id="how-it-works" className={styles.wrap} ref={wrapRef} style={cssVars}>
      <div className={styles.stage} ref={stageRef}>
        {/* The 1280x800 "poster": scene SVG + connector overlay + HTML
            text columns all share this aspect-locked box, so the %-based
            positions from isoScene.ts always line up with the artwork. */}
        <div className={styles.scene} ref={sceneRef}>
          <header className={styles.head} ref={headRef}>
            <h2 className={styles.heading}>{hiw.heading}</h2>
          </header>

          {/* Hairline connectors live in the full poster space (they run
              from the monolith out to the text columns). Desktop only. */}
          <svg
            className={styles.connectorSvg}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            {CONNECTORS.map((d, i) => (
              <path
                key={i}
                ref={(el) => {
                  connectorRefs.current[i] = el;
                }}
                className={styles.connector}
                d={d}
                pathLength={1}
              />
            ))}
          </svg>

          {/* The monolith + walker, cropped tight so the mobile layout
              can show them full-width without the poster's text margins. */}
          <svg
            className={styles.sceneSvg}
            style={frameVars}
            viewBox={SCENE_VB}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Isometric illustration: a small figure walks the low arm of a cross-shaped monolith, steps up to its junction, then climbs its tall tower and stands at the summit — scope, build, launch across 21 days."
          >
            <defs>
              {/* The cast shadow only ever falls on the monolith's top
                  surfaces — clipped to their union so it breaks at edges
                  instead of spilling onto vertical faces or canvas. */}
              <clipPath id="hiw-top-clip">
                {TOP_FACES.map((pts, i) => (
                  <polygon key={i} points={pts} />
                ))}
              </clipPath>
            </defs>

            <g ref={monolithRef}>
              {limbDraw.map(({ geom, refIdx }) => (
                <g
                  key={LIMB_ORDER[refIdx]}
                  ref={(el) => {
                    limbRefs.current[refIdx] = el;
                  }}
                  className={styles.limbGroup}
                >
                  <polygon className={styles.faceLeft} points={geom.left} />
                  <polygon className={styles.faceRight} points={geom.right} />
                  <polygon className={styles.faceTop} points={geom.top} />
                  {/* Canvas-colored wash = the muted pre-activation state.
                      Inside the limb group so the press moves it too;
                      opacity 0 by default (activated poster). */}
                  <g
                    ref={(el) => {
                      washRefs.current[refIdx] = el;
                    }}
                    className={styles.wash}
                  >
                    <polygon points={geom.left} />
                    <polygon points={geom.right} />
                    <polygon points={geom.top} />
                  </g>
                </g>
              ))}
            </g>

            {/* Launch-beat overlays (invisible until the summit moment). */}
            <polygon ref={flashRef} className={styles.flash} points={MONOLITH.tower.top} />
            <circle ref={ringRef} className={styles.ring} cx={TOWER_TOP_CENTER.x} cy={TOWER_TOP_CENTER.y} r={34} />

            {/* Invisible motion path along the monolith's walk line. */}
            <path ref={pathRef} className={styles.walkPath} d={WALK.d} />

            {/* Hard dagger cast shadow, translated along the walk line in
                lockstep with the walker. The clip group is static (scene
                coords) so the clip polygons never move with the shadow. */}
            <g clipPath="url(#hiw-top-clip)">
              <path
                ref={shadowRef}
                className={styles.castShadow}
                d={SHADOW_D}
                transform={`translate(${REST_POINT.x} ${REST_POINT.y})`}
              />
            </g>

            {/* Walker, drawn resting at its step-01 stop (the no-JS
                state); MotionPathPlugin re-seats it on the path when
                animating. Outer <g> = static placement, inner = GSAP's.
                Five pose layers; only one is visible at a time. */}
            <g transform={`translate(${REST_POINT.x} ${REST_POINT.y})`}>
              <g ref={walkerRef} className={styles.walker}>
                {WALKER_POSES.map((pose, i) => (
                  <g
                    key={i}
                    ref={(el) => {
                      poseRefs.current[i] = el;
                    }}
                    className={i === STAND_POSE ? undefined : styles.poseHidden}
                  >
                    <circle className={styles.walkerFill} cx={pose.head.cx} cy={pose.head.cy} r={3.2} />
                    <path className={styles.torsoFill} d={pose.torso} />
                    {pose.limbs.map((d, j) => (
                      <path key={j} className={`${styles.limbStroke} ${j >= 2 ? styles.leg : ""}`} d={d} />
                    ))}
                  </g>
                ))}
              </g>
            </g>
          </svg>

          {/* Step copy is real HTML (selectable, SEO-visible) positioned
              in poster % — never SVG <text>. */}
          <div className={styles.steps}>
            {hiw.steps.map((s, i) => (
              <article
                key={s.number}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className={styles.step}
                style={
                  {
                    "--step-left": STEP_POS[i].left,
                    "--step-top": STEP_POS[i].top,
                    "--step-w": STEP_POS[i].width,
                  } as React.CSSProperties
                }
              >
                <div className={styles.lockup}>
                  <div className={styles.numCol}>
                    <span className={styles.numMask}>
                      <span className={styles.num}>{s.number}</span>
                    </span>
                    <span className={styles.numRule} aria-hidden="true" />
                  </div>
                  <div className={styles.titleCol}>
                    <span className={styles.days}>{s.days}</span>
                    <h3 className={styles.title}>{s.title}</h3>
                  </div>
                </div>
                <p className={styles.body}>{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
