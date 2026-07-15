"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { tokens } from "@/config/design-tokens";
import RotatingHeadline from "./RotatingHeadline";
import { VideoExpandProvider, VideoSlot, VideoOverlayAndSpacer } from "./ScrollVideoExpand";
import styles from "./hero.module.css";

export default function Hero() {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  useGSAP(
    () => {
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(raf1);
    },
    { scope: pageRef }
  );

  useGSAP(
    () => {
      if (!heroRef.current || !pageRef.current) return;
      gsap.to(heroRef.current, {
        scale: 0.97,
        opacity: 0.94,
        ease: "none",
        scrollTrigger: {
          trigger: pageRef.current,
          start: "top top",
          end: "+=80%",
          scrub: true,
        },
      });
    },
    { scope: pageRef }
  );

  const rootClass = [styles.page, entered ? styles.in : "", menuOpen ? styles.menuOpen : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} ref={pageRef}>
      <VideoExpandProvider>
        <div className={styles.ph} ref={heroRef} data-screen-label="Hero">
          <video
            className={styles.vid}
            autoPlay
            muted
            loop
            playsInline
            src={tokens.media.heroVideoUrl}
          />
          <div className={styles.tint} style={{ opacity: tokens.media.tintStrength }} />
          <div className={styles.shade} />
          <div className={styles.grain} />

          <nav className={styles.nav}>
            <a className={styles.logo} href="#">
              {tokens.content.logo}
              <span className={styles.dot}>.</span>
            </a>
            <div className={styles.glass}>
              <div className={styles.links}>
                {tokens.content.nav.map((item) => (
                  <a key={item.label} className={styles.nlink} href={item.href}>
                    {item.label}
                  </a>
                ))}
              </div>
              <a className={styles.navcta} href={tokens.content.navCta.href}>
                {tokens.content.navCta.label}
              </a>
              <button
                className={styles.burger}
                aria-label="Menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span className={`${styles.bar} ${styles.b1}`} />
                <span className={`${styles.bar} ${styles.b2}`} />
              </button>
            </div>
          </nav>

          <div className={styles.menu}>
            {tokens.content.nav.map((item) => (
              <a key={item.label} className={styles.mlink} href={item.href}>
                {item.label}
              </a>
            ))}
            <a className={styles.mcta} href={tokens.content.navCta.href}>
              {tokens.content.navCta.label}
            </a>
          </div>

          <div className={styles.stage}>
            <RotatingHeadline />
          </div>

          <div className={styles.foot}>
            <div className={styles.right}>
              <p className={`${styles.copy} ${styles.rise} ${styles.d2}`}>
                ProtoHouse turns your idea into real, working software — a{" "}
                <span className={styles.hl}>market-ready MVP</span> you can put in front of
                actual users and paying customers. <span className={styles.hl}>No tech skills.</span>{" "}
                No team to hire. <span className={styles.hl}>100% source code ownership.</span>{" "}
                Starting from <span className={styles.hl}>$4,999.</span>
              </p>

              <div className={`${styles.vcard} ${styles.rise} ${styles.d3}`}>
                <VideoSlot />
                <div className={styles.vmeta}>
                  <span className={styles.vlabel}>{tokens.content.videoCard.label}</span>
                  <a className={styles.vcta} href="#">
                    {tokens.content.videoCard.ctaLabel}
                    <span className={styles.varr}>↗</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <VideoOverlayAndSpacer />
      </VideoExpandProvider>
    </div>
  );
}
