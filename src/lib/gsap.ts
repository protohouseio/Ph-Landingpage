"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  // Mobile browsers fire `resize` when the address bar collapses/expands
  // mid-scroll; by default ScrollTrigger responds with a full refresh,
  // recalculating every pin's start/end and visibly yanking the scroll
  // position ("swipe down, page pulls back up"). Ignore those
  // resize-only-in-height events on touch devices — a real orientation
  // change still triggers a proper refresh.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger, MotionPathPlugin };
