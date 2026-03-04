"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

const INTRO_SEEN_KEY = "starpoint-intro-seen";
const LOGO_HOLD_MS = 3500;
const LOGO_ANIM_DURATION_MS = 2600;
const FADE_OUT_DURATION_MS = 800;
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

export function IntroVideoOverlay() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"hidden" | "logo" | "animating" | "fading" | "done">("hidden");
  const [logoStyle, setLogoStyle] = useState<React.CSSProperties>({});
  const [reducedMotion, setReducedMotion] = useState(false);

  const finishIntro = useCallback(() => {
    sessionStorage.setItem(INTRO_SEEN_KEY, "true");
    setPhase("done");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname !== "/") {
      setPhase("done");
      return;
    }
    if (sessionStorage.getItem(INTRO_SEEN_KEY) === "true") {
      setPhase("done");
      return;
    }
    setPhase("logo");
  }, [pathname]);

  useEffect(() => {
    if (phase !== "logo") return;
    const duration = reducedMotion ? 400 : LOGO_HOLD_MS;
    const t = setTimeout(() => {
      const target = document.querySelector("[data-intro-target=\"navbar-logo\"]");
      if (target) {
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const animMs = reducedMotion ? 300 : LOGO_ANIM_DURATION_MS;
        setLogoStyle({
          left: `${centerX}px`,
          top: `${centerY}px`,
          width: rect.width,
          height: rect.height,
          transform: "translate(-50%, -50%)",
          transition: `all ${animMs}ms ${EASE_OUT_EXPO}`,
        });
      }
      setPhase("animating");
    }, duration);
    return () => clearTimeout(t);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase !== "animating") return;
    const duration = reducedMotion ? 300 : LOGO_ANIM_DURATION_MS;
    const t = setTimeout(() => setPhase("fading"), duration);
    return () => clearTimeout(t);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase !== "fading") return;
    const duration = reducedMotion ? 200 : FADE_OUT_DURATION_MS;
    const t = setTimeout(() => finishIntro(), duration);
    return () => clearTimeout(t);
  }, [phase, reducedMotion, finishIntro]);

  if (phase === "hidden" || phase === "done") return null;

  const overlayOpacity = phase === "logo" ? 1 : 0;
  const pointerEvents = phase === "logo" ? "auto" : "none";
  const overlayFadeMs = phase === "animating" ? (reducedMotion ? 200 : 700) : FADE_OUT_DURATION_MS;

  return (
    <>
      <div
        className="intro-overlay intro-overlay-modern"
        style={{
          opacity: overlayOpacity,
          pointerEvents: pointerEvents as React.CSSProperties["pointerEvents"],
          transition: `opacity ${overlayFadeMs}ms ${EASE_OUT_EXPO}`,
        }}
        aria-hidden
      />
      <div
        className={`intro-logo-wrapper intro-logo-large intro-logo-entrance${phase === "animating" || phase === "fading" ? " intro-logo-at-navbar" : ""}`}
        style={{
          ...(phase === "animating" || phase === "fading" ? logoStyle : {}),
          opacity: phase === "fading" ? 0 : 1,
          transition: phase === "fading"
            ? `opacity ${reducedMotion ? 200 : FADE_OUT_DURATION_MS}ms ease-out`
            : (logoStyle.transition ?? undefined),
        }}
      >
        <Image
          src="/images/starpoint-logo-light.png"
          alt="StarPoint"
          width={280}
          height={94}
          className="intro-logo-img"
          priority
        />
      </div>
      {phase === "logo" && (
        <button
          type="button"
          onClick={finishIntro}
          className="intro-skip-btn"
          aria-label="Skip intro and enter site"
        >
          Enter site
        </button>
      )}
    </>
  );
}
