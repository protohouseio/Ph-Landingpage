"use client";

import { createContext, useContext, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "@/lib/gsap";
import { tokens } from "@/config/design-tokens";
import styles from "./hero.module.css";

/**
 * The scroll-driven video expand is split across two DOM positions:
 *  - VideoSlot: a small placeholder inside the vcard that marks where the
 *    fixed overlay box should visually sit at scroll position 0.
 *  - VideoOverlayAndSpacer: the `position: fixed` video box (which floats
 *    above everything regardless of DOM position) plus the 170vh spacer
 *    that creates scroll room, both rendered as siblings of the hero panel
 *    — never inside `.vcard`, since that's a static-flow flex column and
 *    170vh in there would blow out the hero's own height.
 *
 * Both pieces share one rAF scroll-sync loop via context so there's a
 * single source of truth for the box's geometry math.
 */

type Ctx = {
  slotRef: React.RefObject<HTMLDivElement | null>;
  boxRef: React.RefObject<HTMLDivElement | null>;
  spaceRef: React.RefObject<HTMLDivElement | null>;
};

const VideoExpandContext = createContext<Ctx | null>(null);

export function VideoExpandProvider({ children }: { children: React.ReactNode }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const spaceRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const sync = () => {
      const box = boxRef.current;
      const slot = slotRef.current;
      const space = spaceRef.current;
      if (!box || !slot || !space) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Document-absolute position — offsetTop would be relative to the
      // positioned hero wrapper, not the page.
      const spTop = space.getBoundingClientRect().top + window.scrollY;
      const spH = space.offsetHeight;
      const start = spTop - vh;
      const end = spTop + spH - vh;
      const p = Math.max(0, Math.min(1, (window.scrollY - start) / (end - start)));
      const lerp = (a: number, b: number) => a + (b - a) * p;

      if (p >= 1) {
        box.style.position = "absolute";
        box.style.left = "0px";
        box.style.width = vw + "px";
        box.style.top = spTop + spH - vh + "px";
        box.style.height = vh + "px";
        box.style.borderRadius = "0px";
      } else {
        const r = slot.getBoundingClientRect();
        box.style.position = "fixed";
        box.style.left = lerp(r.left, 0) + "px";
        box.style.top = lerp(r.top, 0) + "px";
        box.style.width = lerp(r.width, vw) + "px";
        box.style.height = lerp(r.height, vh) + "px";
        box.style.borderRadius = lerp(12, 0) + "px";
      }
    };

    sync();
    const st = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 0,
      end: "max",
      onUpdate: sync,
      onRefresh: sync,
    });

    return () => st.kill();
  }, []);

  return (
    <VideoExpandContext.Provider value={{ slotRef, boxRef, spaceRef }}>
      {children}
    </VideoExpandContext.Provider>
  );
}

function useVideoExpandCtx() {
  const ctx = useContext(VideoExpandContext);
  if (!ctx) throw new Error("Must be used within VideoExpandProvider");
  return ctx;
}

export function VideoSlot() {
  const { slotRef } = useVideoExpandCtx();
  return <div className={styles.vslslot} ref={slotRef} />;
}

export function VideoOverlayAndSpacer() {
  const { boxRef, spaceRef } = useVideoExpandCtx();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    if (v.paused) v.play().catch(() => {});
    setMuted(v.muted);
  };

  return (
    <>
      <div
        className={styles.vslbox}
        ref={boxRef}
        onClick={toggleMute}
        role="button"
        aria-label="Play video, click to unmute"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggleMute();
        }}
      >
        <video
          className={styles.vsl}
          autoPlay
          muted
          loop
          playsInline
          ref={videoRef}
          src={tokens.media.vslVideoUrl}
        />
        <span className={styles.mutebtn}>{muted ? "Unmute" : "Mute"}</span>
      </div>
      <div className={styles.vspace} ref={spaceRef} />
    </>
  );
}
