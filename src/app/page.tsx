"use client";

import { useRef } from "react";
import IntroStory from "@/components/intro/IntroStory";
import StoryReveal from "@/components/story/StoryReveal";
import Hero from "@/components/hero/Hero";
import SiteNav, { SiteNavHandle } from "@/components/nav/SiteNav";

export default function Home() {
  const navRef = useRef<SiteNavHandle>(null);

  return (
    <>
      <SiteNav ref={navRef} />
      <main>
        <IntroStory
          onLogoFadeStart={() => navRef.current?.reveal()}
          onSecondStory={(progress) => navRef.current?.setProgress(progress)}
          onLightBackground={(active) => navRef.current?.setLight(active)}
        />
        <StoryReveal />
        <Hero />
      </main>
    </>
  );
}
