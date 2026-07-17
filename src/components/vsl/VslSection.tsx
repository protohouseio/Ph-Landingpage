"use client";

import { useRef, useState, type Ref } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { tokens } from "@/config/design-tokens";
import styles from "./vslsection.module.css";

const { vsl, media } = tokens;

// How many times each strip's phrase list repeats inside its track.
// Enough that even on ultrawide screens the xPercent drift below never
// pulls the track's trailing edge into view.
const COPIES = 6;

// Total xPercent the tracks drift across the section's whole time on
// screen. Top strip runs 0 → -DRIFT (leftward), bottom strip runs
// -DRIFT → 0 (rightward) — same magnitude, opposite directions.
const DRIFT = 12;

// "ambient": autoplaying muted loop (the resting state) — center play
// button always visible; clicking it restarts from 0:00 WITH sound.
// "playing": sound on — button hidden, reappearing as a pause control
// only while hovering the video. "paused": paused with sound armed —
// button visible again as a resume control.
type PlayMode = "ambient" | "playing" | "paused";

export default function VslSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const topTrackRef = useRef<HTMLDivElement>(null);
  const bottomTrackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<PlayMode>("ambient");

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      // Scroll-scrubbed marquees, opposite directions, active the whole
      // time the section is anywhere on screen. Scrubbed (not looped) so
      // the strips move with — and reverse with — the user's scroll.
      const drift = (el: HTMLDivElement | null, from: number, to: number) => {
        if (!el) return;
        gsap.fromTo(
          el,
          { xPercent: from },
          {
            xPercent: to,
            ease: "none",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.4,
              invalidateOnRefresh: true,
            },
          }
        );
      };
      drift(topTrackRef.current, 0, -DRIFT);
      drift(bottomTrackRef.current, -DRIFT, 0);
    },
    { scope: sectionRef }
  );

  const handlePlayerClick = () => {
    const v = videoRef.current;
    if (!v) return;
    if (mode === "ambient") {
      // Restart from the top with sound — the whole point of the button.
      v.currentTime = 0;
      v.muted = false;
      void v.play();
      setMode("playing");
    } else if (mode === "playing") {
      v.pause();
      setMode("paused");
    } else {
      void v.play();
      setMode("playing");
    }
  };

  // `alternate` = stripBottom's white/accent phrase alternation; the
  // accent strip renders everything ink-black instead.
  const renderTrack = (phrases: readonly string[], alternate: boolean, ref: Ref<HTMLDivElement>) => (
    <div className={styles.track} ref={ref}>
      {Array.from({ length: COPIES }).map((_, c) => (
        <span key={c} className={styles.copy} aria-hidden={c > 0}>
          {phrases.map((text, i) => (
            <span key={i} className={styles.item}>
              <span className={alternate ? (i % 2 ? styles.textAccent : styles.textWhite) : styles.textInk}>
                {text}
              </span>
              <span className={styles.sep} aria-hidden="true">
                ✦
              </span>
            </span>
          ))}
        </span>
      ))}
    </div>
  );

  const btnClass = [styles.playBtn, mode === "playing" ? styles.playBtnIdle : ""].filter(Boolean).join(" ");

  return (
    <section className={styles.section} ref={sectionRef} style={{ ["--vsl-bg" as string]: vsl.bg }}>
      <div className={styles.strips}>
        <div className={`${styles.strip} ${styles.stripAccent}`}>{renderTrack(vsl.stripTop, false, topTrackRef)}</div>
        <div className={`${styles.strip} ${styles.stripInk}`}>{renderTrack(vsl.stripBottom, true, bottomTrackRef)}</div>
      </div>

      <div className={styles.videoWrap}>
        {/* The whole frame is the click target, so tapping the video
            itself also plays/pauses — needed on touch screens, where the
            hover-only pause control never shows. */}
        <div className={styles.videoFrame} onClick={handlePlayerClick}>
          <video
            className={styles.video}
            src={media.vslVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          <button
            type="button"
            className={btnClass}
            aria-label={
              mode === "playing" ? "Pause video" : mode === "paused" ? "Resume video" : "Play video with sound"
            }
          >
            {mode === "playing" ? (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="5" y="4" width="5" height="16" rx="1" />
                <rect x="14" y="4" width="5" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 4.5C7 3.7 7.87 3.2 8.55 3.62L20.1 10.62C20.75 11.01 20.75 11.99 20.1 12.38L8.55 19.38C7.87 19.8 7 19.3 7 18.5V4.5Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
