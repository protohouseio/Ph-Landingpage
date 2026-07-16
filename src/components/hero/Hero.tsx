"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "@/lib/gsap";
import { tokens } from "@/config/design-tokens";
import { VideoExpandProvider, VideoSlot, VideoOverlayAndSpacer } from "./ScrollVideoExpand";
import styles from "./hero.module.css";

const Hero = forwardRef<HTMLDivElement>(function Hero(_props, ref) {
  const pageRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const vcardRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const [headlineIn, setHeadlineIn] = useState(false);
  const [vcardIn, setVcardIn] = useState(false);

  useImperativeHandle(ref, () => pageRef.current as HTMLDivElement);

  useGSAP(
    () => {
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(raf1);
    },
    { scope: pageRef }
  );

  // Headline reveals once the user has scrolled ~70% of a viewport-height
  // into the Hero; the video card follows shortly after. Deliberately NOT
  // a percentage of pageRef's own height — .page also contains the video's
  // 170vh scroll-expand spacer (VideoOverlayAndSpacer renders inside
  // VideoExpandProvider, a descendant of .page), so "70% of trigger
  // height" would resolve to a point deep in the video-expand phase, past
  // where the headline is even still on screen. A fixed 70%-of-viewport
  // pixel offset keeps this tied to how far the user has scrolled, not to
  // the section's total (spacer-inflated) height.
  useGSAP(
    () => {
      if (!pageRef.current) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        setHeadlineIn(true);
        setVcardIn(true);
        return;
      }

      // Created after a tick so the intro's own pin-spacer (which resizes
      // the document by hundreds of vh) has settled first — creating this
      // trigger while that layout is still mid-flight bakes in a stale
      // `start` position that a later ScrollTrigger.refresh() should fix,
      // but doesn't always catch in time, since our intro's own pinning
      // happens asynchronously across a couple of its own effects.
      let st: ScrollTrigger | undefined;
      const createTimer = setTimeout(() => {
        st = ScrollTrigger.create({
          trigger: pageRef.current,
          start: () => `top top+=${window.innerHeight * 0.7}`,
          once: true,
          onEnter: () => {
            setHeadlineIn(true);
            setTimeout(() => setVcardIn(true), 150);
          },
        });
      }, 500);
      return () => {
        clearTimeout(createTimer);
        st?.kill();
      };
    },
    { scope: pageRef }
  );

  const rootClass = [styles.page, entered ? styles.in : ""].filter(Boolean).join(" ");

  return (
    <div className={rootClass} ref={pageRef}>
      <VideoExpandProvider>
        <div className={styles.stage}>
          <h1
            ref={headlineRef}
            className={`${styles.headline} ${headlineIn ? styles.headlineIn : ""}`}
          >
            Idea, Build, <span className={styles.ac}>Launch</span>
          </h1>

          <div ref={vcardRef} className={`${styles.vcard} ${vcardIn ? styles.vcardIn : ""}`}>
            <VideoSlot />
            <div className={styles.vmeta}>
              <span className={styles.vlabel}>{tokens.hero.videoLabel}</span>
              <a className={styles.vcta} href="#">
                {tokens.hero.videoCtaLabel}
                <span className={styles.varr}>↗</span>
              </a>
            </div>
          </div>
        </div>

        <VideoOverlayAndSpacer />
      </VideoExpandProvider>
    </div>
  );
});

export default Hero;
