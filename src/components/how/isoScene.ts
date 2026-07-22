/**
 * Pure, DOM-free geometry for the "How It Works" isometric scene.
 *
 * Everything is derived from one isometric projection:
 *   screen.x = OX + (gx - gy) * TW
 *   screen.y = OY + (gx + gy) * TH - gz     (2:1 iso, z lifts straight up)
 *
 * The artwork is ONE cross-shaped monolith (per the reference image), not
 * separate blocks: a long low LEFT ARM toward the front-left, a wider
 * taller slab that is the JUNCTION + RIGHT ARM toward the front-right,
 * and a tall TOWER rising from the back. All three limbs share vertices
 * on the same grid, and painter's order (tower → slab → arm, back to
 * front) resolves every occlusion exactly as a single solid would —
 * verified against the view-ray rule for this projection, so no seams
 * and no incorrectly hidden faces.
 *
 * Coordinate spaces:
 *  - The COMPOSITION space is a 1280x800 "poster" — the connector SVG and
 *    the HTML text columns (positioned in % of that poster) live here.
 *  - The SCENE SVG (monolith + walker + shadow) uses a tight crop of the
 *    same space (SCENE_VB / SCENE_FRAME) so the mobile fallback can show
 *    the artwork full-width without the poster's empty text margins.
 */

export const VIEW_W = 1280;
export const VIEW_H = 800;

// Deliberately smaller than the poster could fit: the monolith's own
// on-screen footprint is kept well clear of the poster's edges so real
// empty canvas separates it from every text column — a smaller solid in
// the SAME 1280x800 poster automatically buys that margin, rather than
// pushing the text columns toward the poster's own edges (which runs out
// of room fast on the narrower right-hand columns).
const TW = 60; // px per grid unit along the iso x-projection
const TH = 30; // px per grid unit along the iso y-projection (2:1 iso)
const OX = 640; // projection origin inside the 1280x800 poster
const OY = 260;

/** Limb heights (poster px above ground) — ≈ 1 : 1.6 : 3.2 units. */
const H_ARM = 88;
const H_SLAB = 140;
const H_TOWER = 280;

type Pt = { x: number; y: number };

const iso = (gx: number, gy: number, gz: number): Pt => ({
  x: OX + (gx - gy) * TW,
  y: OY + (gx + gy) * TH - gz,
});

const points = (pts: Pt[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

export type LimbGeom = {
  /** Polygon `points` strings for the three visible faces. */
  top: string;
  left: string;
  right: string;
  corners: Pt[];
};

/** One box limb: footprint [x0,x1]x[y0,y1], top at z. Visible faces under
 * the shared upper-left light: top (accentTop), the gy-max plane facing the
 * viewer's lower-left (accentSide, lit), the gx-max plane facing lower-right
 * (accentDeep, deep shadow). */
const limb = (x0: number, x1: number, y0: number, y1: number, z: number): LimbGeom => ({
  top: points([iso(x0, y0, z), iso(x1, y0, z), iso(x1, y1, z), iso(x0, y1, z)]),
  left: points([iso(x0, y1, z), iso(x1, y1, z), iso(x1, y1, 0), iso(x0, y1, 0)]),
  right: points([iso(x1, y0, z), iso(x1, y1, z), iso(x1, y1, 0), iso(x1, y0, 0)]),
  corners: [
    iso(x0, y0, z),
    iso(x1, y0, z),
    iso(x1, y1, z),
    iso(x0, y1, z),
    iso(x0, y1, 0),
    iso(x1, y1, 0),
    iso(x1, y0, 0),
  ],
});

/**
 * Paint order is the array order: tower (back), slab (middle), arm
 * (front). Full faces are drawn for each; the limb in front legitimately
 * overpaints exactly the parts of the one behind that a solid cross
 * would hide (the tower's faces below the junction level, the slab's
 * front face below the arm's top).
 *
 *  - tower: footprint gx [3,5] x gy [1,3]  → rises at the back
 *  - slab:  footprint gx [3,8.2] x gy [3,5] → junction + right arm (one
 *    top surface at H_SLAB, so it is authored as one box, no seam)
 *  - arm:   footprint gx [3,5] x gy [5,8.4] → the low left arm the
 *    walker enters on
 */
export const MONOLITH = {
  tower: limb(3, 5, 1, 3, H_TOWER),
  slab: limb(3, 8.2, 3, 5, H_SLAB),
  arm: limb(3, 5, 5, 8.4, H_ARM),
};

/** Step index → activated limb, in step order (01, 02, 03). */
export const LIMB_ORDER = ["arm", "slab", "tower"] as const;

/** Intro assembly: where each limb starts relative to its rest position —
 * both arms tucked toward the central junction (the tower instead grows
 * up via scaleY from its base). Tucks are deliberately partial: progress
 * 0 is a snap resting point, so the compressed form must still read as
 * a plausible solid, not a jumble — it visibly unfolds into the cross
 * over the first ~10% of the pin. */
export const ASSEMBLY = {
  arm: { x: 1.0 * TW, y: -1.0 * TH }, // from the junction, outward front-left
  slab: { x: -0.8 * TW, y: -0.8 * TH }, // from the junction, outward front-right
  towerScaleY: 0.6,
};

/* ---- walker path ----------------------------------------------------- */

/**
 * The journey has TWO level changes, ending with the walker actually
 * standing on top of the tower — not merely in front of it: far tip of
 * the left arm → along the arm → up the first riser onto the junction
 * level → across the slab → up the second riser onto the tower → stop
 * near the tower's top center. The walk line sits at gx = 4 (the arm's
 * centerline); both riser climbs are clean verticals (only gz changes).
 *
 * Each leg gets a deliberately generous share of its surface's usable
 * length so every arrival reads as a clear, unambiguous walk on its own
 * — a short final leg (an earlier build stopped the walker mid-slab,
 * well short of the tower) reads as "didn't go anywhere" once anything
 * else on screen draws attention away from the tiny figure.
 */
const WAYPTS: Pt[] = [
  iso(4, 8.15, H_ARM), // start: near the arm's far tip
  iso(4, 6.5, H_ARM), // ARRIVAL 1 — mid-arm (step 01)
  iso(4, 5, H_ARM), // base of riser 1
  iso(4, 5, H_SLAB), // top of riser 1
  iso(4, 4.2, H_SLAB), // ARRIVAL 2 — partway across the junction (step 02)
  iso(4, 3, H_SLAB), // base of riser 2 — the tower's front edge
  iso(4, 3, H_TOWER), // top of riser 2 — climbed onto the tower
  iso(4, 2, H_TOWER), // ARRIVAL 3 — standing on the tower's summit
];

const cum: number[] = [0];
for (let i = 1; i < WAYPTS.length; i++) {
  cum.push(
    cum[i - 1] + Math.hypot(WAYPTS[i].x - WAYPTS[i - 1].x, WAYPTS[i].y - WAYPTS[i - 1].y)
  );
}
const TOTAL_LEN = cum[cum.length - 1];

export const WALK = {
  d: `M ${WAYPTS.map((p) => `${p.x} ${p.y}`).join(" L ")}`,
  totalLen: TOTAL_LEN,
  /** Path-progress fraction at each step's stop point. */
  arrivals: [cum[1] / TOTAL_LEN, cum[4] / TOTAL_LEN, 1] as const,
  /** Path-distance ranges (px) of the two riser climbs — the gait gets
   * a stronger stride emphasis inside them. */
  climbs: [
    [cum[2], cum[3]],
    [cum[5], cum[6]],
  ] as const,
};

/** Interpolated point on the walk polyline at progress f (0..1) — used
 * to drag the cast shadow's anchor along with the walker. */
export const pointAt = (f: number): Pt => {
  const d = Math.max(0, Math.min(1, f)) * TOTAL_LEN;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  return {
    x: WAYPTS[i - 1].x + (WAYPTS[i].x - WAYPTS[i - 1].x) * t,
    y: WAYPTS[i - 1].y + (WAYPTS[i].y - WAYPTS[i - 1].y) * t,
  };
};

/** Where the walker (and shadow) rest in the static fallbacks
 * (no-JS, reduced motion, mobile): the step-01 position. */
export const REST_POINT = WAYPTS[1];

/* ---- cast shadow ------------------------------------------------------ */

/**
 * Hard, dagger-like cast shadow (per the reference): a long tapered
 * triangle anchored at the feet (local 0,0), streaming opposite the
 * walker's travel — along +gy, i.e. down-left on screen — consistent
 * with the scene's upper-right-along-the-arm light. Length ≈ 3.5x the
 * 52px figure. It gets clipped to the union of the monolith's top faces
 * (TOP_FACES) so it never spills over an edge onto a vertical face or
 * the background; at the riser it "breaks" at the edge naturally.
 */
const SHADOW_LEN = 180;
const dir = { x: -TW, y: TH }; // +gy on screen
const dl = Math.hypot(dir.x, dir.y);
const ux = (dir.x / dl) * SHADOW_LEN;
const uy = (dir.y / dl) * SHADOW_LEN;

export const SHADOW_D = `M -3.58 -7.15 L 3.58 7.15 L ${+ux.toFixed(1)} ${+uy.toFixed(1)} Z`;

/** Union of the top faces, for the shadow's <clipPath>. */
export const TOP_FACES = [MONOLITH.tower.top, MONOLITH.slab.top, MONOLITH.arm.top];

/* ---- step 03 launch beat / camera ------------------------------------- */

/** Where the walker ends up (ARRIVAL 3) — the launch pulse plays right
 * at its feet, on the tower's own top face. */
export const TOWER_TOP_CENTER = WAYPTS[WAYPTS.length - 1];

/** Poster-space transform-origin for the phase-4 camera drift: settle on
 * the walker having reached the tower's summit. */
export const ZOOM_ORIGIN = `${((TOWER_TOP_CENTER.x / VIEW_W) * 100).toFixed(1)}% ${((TOWER_TOP_CENTER.y / VIEW_H) * 100).toFixed(1)}%`;

/* ---- connectors + text columns ---------------------------------------- */

/**
 * Step text column placement (px, in the 1280x800 poster) — the numeric
 * source of truth both the CSS positions AND the connector bends below
 * are derived from, so a line can never drift out of sync with the
 * column it's meant to reach. The monolith's own footprint (see TW/TH/OX/
 * OY above) is kept well inside the poster specifically so these columns
 * can sit a real, generous distance from it — roughly a quarter of the
 * poster's width clear on each side — rather than crowding its edges.
 * Mirrors the reference: 01 left (beside the arm tip), 02 right (beside
 * the right arm), 03 top-right (beside the tower's top).
 *
 * 03 sits high, close to the heading; 02 is pushed well below where 03's
 * own content (numeral through body copy) actually ends — 03 stays on
 * screen the whole time 02 is visible (receded, but never hidden — see
 * the "recede" comment in HowItWorks.tsx), so the two must never share
 * vertical space even once both are on screen at once. This gap was
 * tuned against real measured rendering, not estimated from font
 * metrics — see the measure script referenced in project notes if these
 * ever need re-tuning after a copy or type-scale change.
 */
const STEP_LEFT_PX = [16, 1030, 970] as const;
const STEP_TOP_PX = [432, 480, 32] as const;
const STEP_WIDTH_PX = [210, 220, 250] as const;

const pctOf = (px: number, of: number) => `${+((px / of) * 100).toFixed(3)}%`;

export const STEP_POS = [0, 1, 2].map((i) => ({
  left: pctOf(STEP_LEFT_PX[i], VIEW_W),
  top: pctOf(STEP_TOP_PX[i], VIEW_H),
  width: pctOf(STEP_WIDTH_PX[i], VIEW_W),
}));

/**
 * Hairline connectors in poster space — each an L-shaped hairline (like
 * the reference: a run off the block, a vertical rise/drop, then a
 * longer horizontal run into the text column), not a single straight
 * line. Both horizontal segments are computed from the SAME start/end
 * pair (`routeConnector` below) so they always travel in one consistent
 * direction block → text; a fixed stub length picked independently of
 * that distance can end up longer than the whole gap and force the
 * final segment to double back on itself. The generous block↔column
 * margin (see STEP_LEFT_PX above) means these read as real, deliberate
 * hairlines rather than short ticks — and because each block corner
 * sits at a different height than its own column's band, some bends
 * rise and some drop, matching the reference's varied up/down bends
 * rather than every connector bending the same way:
 *  - 01: the arm's far-tip top corner, out left, bending UP to the left
 *    column's band.
 *  - 02: the slab's east top corner, out right, bending DOWN to the
 *    lower-right column's band.
 *  - 03: the tower's east top corner, out right, bending UP to the
 *    top-right column's band.
 * Deliberately stops GAP px shy of the column's near edge, so real open
 * canvas still separates the line from the copy rather than touching it.
 */
const c1 = iso(3, 8.4, H_ARM);
const c2 = iso(8.2, 3, H_SLAB);
const c3 = iso(5, 1, H_TOWER);

const GAP = 30;

/** `M start H mid V bendY H end` — the horizontal travel from `from.x`
 * to `endX` is split at `bendFrac` (fraction of the way there) into two
 * monotonic segments either side of the vertical rise/drop, so the path
 * always reads as one continuous block → text sweep, never a reversal. */
const routeConnector = (from: Pt, endX: number, bendY: number, bendFrac = 0.4) => {
  const midX = from.x + (endX - from.x) * bendFrac;
  return `M ${from.x} ${from.y} H ${midX} V ${bendY} H ${endX}`;
};

export const CONNECTORS = [
  routeConnector(c1, STEP_LEFT_PX[0] + STEP_WIDTH_PX[0] + GAP, STEP_TOP_PX[0] + 30),
  routeConnector(c2, STEP_LEFT_PX[1] - GAP, STEP_TOP_PX[1] + 30),
  routeConnector(c3, STEP_LEFT_PX[2] - GAP, STEP_TOP_PX[2] + 30),
];

/* ---- tight crop frame for the scene SVG ------------------------------- */

const framePts: Pt[] = [
  ...MONOLITH.tower.corners,
  ...MONOLITH.slab.corners,
  ...MONOLITH.arm.corners,
  ...WAYPTS,
];
const minX = Math.min(...framePts.map((p) => p.x)) - 18;
const maxX = Math.max(...framePts.map((p) => p.x)) + 12;
// Headroom above the highest path point for the walker's ~52px body.
const minY =
  Math.min(
    Math.min(...framePts.map((p) => p.y)),
    Math.min(...WAYPTS.map((p) => p.y)) - 64
  ) - 8;
const maxY = Math.max(...framePts.map((p) => p.y)) + 18;

export const SCENE_VB = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

const pct = (v: number) => `${+(v * 100).toFixed(3)}%`;

/** Where the cropped scene SVG sits inside the poster, as % offsets —
 * applied as CSS custom props so desktop absolutely positions it and the
 * mobile layout can ignore it entirely (static, full width). */
export const SCENE_FRAME = {
  left: pct(minX / VIEW_W),
  top: pct(minY / VIEW_H),
  width: pct((maxX - minX) / VIEW_W),
  height: pct((maxY - minY) / VIEW_H),
};

/* ---- walker silhouette ------------------------------------------------ */

/**
 * Realistic flat-black human silhouette, ~52px tall (≈ 7.5 heads, feet at
 * local 0,0) — small against the tower (~15% of its height) on purpose;
 * the smallness is the drama. Each pose is built from a head disc, a
 * tapered torso stroke and two-segment round-capped limb strokes; all in
 * one flat ink, so the overlapping shapes fuse into a single believable
 * silhouette at this scale (the same way the reference's tiny figure
 * reads).
 *
 * Five poses: the four standard walk-cycle keys (contact, down, passing,
 * up) cycled by travel distance while moving, plus a standing rest pose
 * shown whenever the walker is stopped at a step.
 */
export type WalkerPose = {
  head: { cx: number; cy: number };
  /** Filled, tapered torso polygon — wide at the shoulders, narrow at the
   * hips, with a visible neck gap under the head so the figure reads as
   * a person (a stroked line here fused with the head into a "pin"). */
  torso: string;
  limbs: string[]; // two arms then two legs, as polyline path data
};

export const WALKER_POSES: WalkerPose[] = [
  // contact — full stride, heel strike front, toe-off back
  {
    head: { cx: 2.6, cy: -46.8 },
    torso: "M -2.1 -42.3 L 5.3 -42.3 L 2.5 -27.5 L -2.5 -27.5 Z",
    limbs: [
      "M 1.6 -40.5 L 6.5 -33 L 9.5 -27.5",
      "M 1.6 -40.5 L -4.5 -33.5 L -8.5 -27",
      "M 0 -28 L 6 -15.5 L 10.5 -2 L 14.5 -1.2",
      "M 0 -28 L -5.5 -15.5 L -10.5 -3.5 L -13 -0.8",
    ],
  },
  // down — weight compresses onto the front leg (body 1px lower)
  {
    head: { cx: 2.4, cy: -45.8 },
    torso: "M -2.2 -41.3 L 5.2 -41.3 L 2.5 -26.5 L -2.5 -26.5 Z",
    limbs: [
      "M 1.5 -39.5 L 5 -32.5 L 6.5 -26.5",
      "M 1.5 -39.5 L -3 -32.5 L -5.5 -26",
      "M 0 -27 L 4.5 -14 L 6.5 -1.5 L 10.5 -0.8",
      "M 0 -27 L -4 -14 L -7.5 -4.5 L -9.5 -2",
    ],
  },
  // passing — legs cross, swing knee lifted
  {
    head: { cx: 2.1, cy: -46.8 },
    torso: "M -2.5 -42.3 L 4.9 -42.3 L 2.5 -27.5 L -2.5 -27.5 Z",
    limbs: [
      "M 1.2 -40.5 L 2.8 -33 L 4 -27",
      "M 1.2 -40.5 L -1.5 -33 L -3 -26.5",
      "M 0 -28 L 0.8 -14.5 L 1.2 -1.5 L 5 -0.8",
      "M 0 -28 L 4.5 -16.5 L 2.2 -7 L 5.2 -5.6",
    ],
  },
  // up — push-off, body 1px higher, next stride opening
  {
    head: { cx: 2.8, cy: -47.8 },
    torso: "M -1.9 -43.3 L 5.5 -43.3 L 2.5 -28.5 L -2.5 -28.5 Z",
    limbs: [
      "M 1.8 -41.5 L 4 -33.5 L 5 -27",
      "M 1.8 -41.5 L -3 -34 L -5.8 -28",
      "M 0 -29 L -3.5 -16 L -6.5 -4 L -9 -1.4",
      "M 0 -29 L 5 -17.5 L 4.4 -8.5 L 7.6 -7",
    ],
  },
  // standing — the rest pose at each step and in static fallbacks
  {
    head: { cx: 1.3, cy: -47 },
    torso: "M -3.1 -42.3 L 4.3 -42.3 L 2.5 -27.5 L -2.5 -27.5 Z",
    limbs: [
      "M 0.9 -40.5 L 1.9 -33.5 L 1.5 -27",
      "M 0.9 -40.5 L -1.3 -33.5 L -1.7 -27",
      "M 0 -28 L 0.6 -14.5 L 0.6 -1.5 L 4.4 -0.8",
      "M 0 -28 L -0.8 -14.5 L -1.2 -1.5 L 2.4 -0.8",
    ],
  },
];

/** Index of the standing pose in WALKER_POSES. */
export const STAND_POSE = WALKER_POSES.length - 1;
