"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Calendar, Users, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Translations, useTranslations } from "@/app/translations";
import Navbar from "@/components/Navbar";
import { useEffect, useRef, useState } from "react";

interface LandingPageProps {
  onPageChange: (page: string) => void;
  t: Translations;
}

function LandingPage({ onPageChange, t }: LandingPageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsVisible(true);

    // Hero entrance animation (desktop only, once per session)
    if (typeof window !== "undefined") {
      const shouldAnimate =
        window.innerWidth >= 1024 && !sessionStorage.getItem("heroAnimated");
      if (shouldAnimate) {
        setHasAnimated(true);
        sessionStorage.setItem("heroAnimated", "true");
      } else {
        setHasAnimated(true); // Still set to true so content is visible
      }
    } else {
      setHasAnimated(true); // SSR fallback
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(!!prefersReduced);

    // Track mouse position for parallax (desktop only, respect reduced motion)
    let handleMouseMove: ((e: MouseEvent) => void) | null = null;
    if (
      typeof window !== "undefined" &&
      window.innerWidth >= 1024 &&
      !prefersReduced
    ) {
      handleMouseMove = (e: MouseEvent) => {
        setMousePosition({
          x: (e.clientX / window.innerWidth - 0.5) * 20,
          y: (e.clientY / window.innerHeight - 0.5) * 20,
        });
      };
      window.addEventListener("mousemove", handleMouseMove);
    }

    // Intersection Observer for scroll-based reveals
    const observerOptions = {
      threshold: 0.2,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("fade-in-visible", "revealed");
        }
      });
    }, observerOptions);

    // Observe scroll-reveal elements
    const scrollRevealElements = document.querySelectorAll(".scroll-reveal");
    scrollRevealElements.forEach((el) => observer.observe(el));

    if (aboutRef.current) {
      observer.observe(aboutRef.current);
    }

    return () => {
      if (handleMouseMove && typeof window !== "undefined") {
        window.removeEventListener("mousemove", handleMouseMove);
      }
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <Navbar />
      <div className="overflow-x-hidden">
        {/* Hero Section - Premium dark grey theme */}
        <div className={`hero-background ${isVisible ? "hero-load-in" : ""}`}>
          {/* Floating gradient orbs (replaces grid) */}
          <div className="hero-ambient" aria-hidden>
            <div className="hero-orb hero-orb-1" />
            <div className="hero-orb hero-orb-2" />
            <div className="hero-orb hero-orb-3" />
            <div className="hero-orb hero-orb-4" />
          </div>
          <div className="hero-top-fade" aria-hidden />
          <div className="hero-noise" aria-hidden />
          {/* Background silhouette image centered for balanced composition */}
          <div className="absolute inset-0 w-full opacity-[0.12] pointer-events-none z-[1]">
            <Image
              src="/images/padel-hero-bg.png"
              alt=""
              fill
              className="object-cover object-center"
              sizes="60vw"
            />
          </div>
          <div className="court-line-accent" aria-hidden />

          <section
            ref={heroRef}
            className="hero-section-inner relative flex items-start md:items-center justify-center lg:justify-start -mt-0 md:mt-0 pt-6 sm:pt-8 md:pt-0 pb-8 sm:pb-12 md:pb-0"
          >
            <div className="relative z-[2] text-center lg:text-left text-white max-w-4xl md:max-w-6xl lg:max-w-5xl xl:max-w-6xl mx-auto lg:mx-0 lg:ml-8 xl:ml-16 px-3 xs:px-4 sm:px-6 lg:px-8 w-full">
              <div className="hero-spotlight" aria-hidden />
              <div className="mb-5 xs:mb-6 sm:mb-8 md:mb-12 lg:mb-14 xl:mb-16">
                {/* Hero Title - Size per breakpoint: mobile→sm(640px)→md(768px)→lg(1024px)→xl(1280px). Use text-3xl up to text-9xl or text-[10rem]. */}
                {/* Desktop: Entrance animation on first load */}
                <h1
                  className={`hero-title hero-title-mobile-two-lines mt-25 mb-10 xs:mb-6 sm:mb-8 md:mb-10 lg:mb-12 xl:mb-14 font-bold text-[#F9D923] drop-shadow-[0_4px_12px_rgba(249,217,35,0.35)] md:drop-shadow-[0_6px_20px_rgba(249,217,35,0.4)] lg:drop-shadow-[0_8px_24px_rgba(249,217,35,0.4),0_0_40px_rgba(249,217,35,0.15)] leading-[1.1] sm:leading-tight lg:leading-[1.05] px-1 md:px-0 lg:tracking-[-0.02em] xl:tracking-[-0.03em] text-left ${hasAnimated ? "hero-entrance" : ""}`}
                >
                  {(() => {
                    const parts = t.heroTitle.trim().split(/\s+/);
                    /* Mobile: "Book Your" / "Padel Court"; desktop: one line */
                    const line1 =
                      parts.length >= 2
                        ? parts.slice(0, 2).join(" ")
                        : t.heroTitle;
                    const line2 =
                      parts.length > 2 ? parts.slice(2).join(" ") : "";
                    return (
                      <>
                        <span className="hero-title-line1">{line1}</span>
                        {line2 ? (
                          <span className="hero-title-line2"> {line2}</span>
                        ) : null}
                      </>
                    );
                  })()}
                </h1>
                {/* Hero Subtitle – size in custom.css .hero-subtitle */}
                <h2
                  className={`hero-subtitle mb-3 xs:mb-4 sm:mb-6 md:mb-8 lg:mb-9 xl:mb-10 font-semibold drop-shadow-[0_2px_8px_rgba(249,217,35,0.2)] md:drop-shadow-[0_4px_12px_rgba(249,217,35,0.25)] leading-[1.2] sm:leading-tight lg:leading-[1.3] xl:leading-[1.35] px-2 xs:px-3 md:px-0 text-white lg:text-white/95 ${hasAnimated ? "hero-entrance hero-entrance-delay-1" : ""}`}
                >
                  {t.heroSubtitle}
                </h2>
                {/* Hero Description – size in custom.css .hero-description */}
                <p
                  className={`hero-description mb-30 xs:mb-12 sm:mb-12 md:mb-16 lg:mb-20 xl:mb-24 text-gray-100 lg:text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)] max-w-2xl md:max-w-3xl lg:max-w-2xl xl:max-w-3xl mx-auto lg:mx-0 px-2 xs:px-3 md:px-0 text-left ${hasAnimated ? "hero-entrance hero-entrance-delay-2" : ""}`}
                >
                  {t.heroDescription}
                </p>
              </div>

              {/* CTA Buttons - Mobile-First Touch Targets */}
              {/* Mobile: Full width stacked, Tablet+: Row layout */}
              {/* Desktop: Enhanced spacing, alignment, and micro-interactions */}
              {/* Desktop: Entrance animation with staggered delays */}
              <div
                className={`flex flex-col sm:flex-row gap-2.5 xs:gap-3 sm:gap-4 md:gap-6 lg:gap-6 xl:gap-8 justify-center lg:justify-start items-stretch sm:items-center w-full sm:w-auto px-2 md:px-0 ${hasAnimated ? "hero-entrance hero-entrance-delay-3" : ""}`}
              >
                {/* Primary CTA - Stronger glow and elevation on desktop */}
                <Button
                  size="lg"
                  className="hero-cta-primary w-full sm:w-auto bg-[#F9D923] hover:bg-[#FBE156] active:bg-[#E6C420] text-[#121212] font-semibold px-5 xs:px-6 sm:px-8 md:px-10 lg:px-12 xl:px-14 py-3 xs:py-3.5 sm:py-4 md:py-5 lg:py-6 xl:py-7 text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl rounded-lg md:rounded-xl shadow-[0_12px_30px_rgba(249,217,35,0.35)] md:shadow-[0_16px_40px_rgba(249,217,35,0.4)] min-h-[44px] md:min-h-[56px] lg:min-h-[64px] xl:min-h-[72px] touch-manipulation"
                  onClick={() => onPageChange("booking")}
                >
                  <Calendar className="mr-2 h-4 w-4 xs:h-4 xs:w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8 flex-shrink-0" />
                  <span className="whitespace-nowrap">{t.bookCourt}</span>
                </Button>
                {/* Secondary CTAs - Softer shadows, maintain hierarchy */}
                <Button
                  size="lg"
                  className="hero-cta-secondary w-full sm:w-auto bg-white/95 hover:bg-white active:bg-white/90 text-[#121212] hover:text-[#121212] px-5 xs:px-6 sm:px-8 md:px-10 lg:px-12 xl:px-14 py-3 xs:py-3.5 sm:py-4 md:py-5 lg:py-6 xl:py-7 text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl rounded-lg md:rounded-xl shadow-lg border-2 border-[#F9D923]/30 hover:border-[#F9D923]/60 hover:shadow-[0_4px_0_0_rgba(255,255,255,0.5),0_12px_28px_8px_rgba(212,168,23,0.35),0_20px_40px_12px_rgba(212,168,23,0.2)] min-h-[44px] md:min-h-[56px] lg:min-h-[64px] xl:min-h-[72px] touch-manipulation focus-visible:ring-[#D4A817]"
                  onClick={() => onPageChange("coaching")}
                >
                  <Users className="mr-2 h-4 w-4 xs:h-4 xs:w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8 flex-shrink-0" />
                  <span className="whitespace-nowrap">{t.bookCoach}</span>
                </Button>
                <Button
                  size="lg"
                  className="hero-cta-secondary w-full sm:w-auto bg-white/95 hover:bg-white active:bg-white/90 text-[#121212] hover:text-[#121212] px-5 xs:px-6 sm:px-8 md:px-10 lg:px-12 xl:px-14 py-3 xs:py-3.5 sm:py-4 md:py-5 lg:py-6 xl:py-7 text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl rounded-lg md:rounded-xl shadow-lg border-2 border-[#F9D923]/30 hover:border-[#F9D923]/60 hover:shadow-[0_4px_0_0_rgba(255,255,255,0.5),0_12px_28px_8px_rgba(212,168,23,0.35),0_20px_40px_12px_rgba(212,168,23,0.2)] min-h-[44px] md:min-h-[56px] lg:min-h-[64px] xl:min-h-[72px] touch-manipulation focus-visible:ring-[#D4A817]"
                  onClick={() => onPageChange("tournaments")}
                >
                  <Trophy className="mr-2 h-4 w-4 xs:h-4 xs:w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8 flex-shrink-0" />
                  <span className="whitespace-nowrap">{t.joinTournament}</span>
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* About Us Section - Mobile Optimized */}
        {/* Scroll-based reveal animation */}
        <section
          ref={aboutRef}
          className="py-8 xs:py-10 sm:py-16 md:py-24 lg:py-32 bg-gradient-to-b from-[#252015] to-[#1C1810] scroll-reveal"
        >
          <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 xs:mb-8 sm:mb-12 md:mb-20 lg:mb-24">
              <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 xs:mb-4 sm:mb-6 md:mb-8 text-white font-bold leading-tight px-2 md:px-0">
                {t.aboutUs}
              </h2>
              <p className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl text-white/75 max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto px-2 xs:px-3 md:px-0 leading-relaxed">
                {t.aboutDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 xs:gap-6 sm:gap-8 md:gap-10 lg:gap-12">
              <Card className="text-center p-5 xs:p-6 sm:p-8 md:p-10 lg:p-12 bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] md:hover:shadow-[0_16px_40px_rgba(212,168,23,0.25)] scroll-reveal">
                <CardContent className="pt-3 xs:pt-4 sm:pt-6 md:pt-8">
                  <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[rgba(212,168,23,0.15)] rounded-full flex items-center justify-center mx-auto mb-3 xs:mb-4 sm:mb-6 md:mb-8 transition-transform duration-300 hover:scale-110 md:hover:scale-125">
                    <Calendar className="h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-[#D4A817]" />
                  </div>
                  <h3 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl mb-2 xs:mb-3 sm:mb-4 md:mb-6 text-white font-semibold leading-tight">
                    {t.easyBooking}
                  </h3>
                  <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-white/75 leading-relaxed">
                    {t.easyBookingDesc}
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center p-5 xs:p-6 sm:p-8 md:p-10 lg:p-12 bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] md:hover:shadow-[0_16px_40px_rgba(212,168,23,0.25)] scroll-reveal">
                <CardContent className="pt-3 xs:pt-4 sm:pt-6 md:pt-8">
                  <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[rgba(212,168,23,0.15)] rounded-full flex items-center justify-center mx-auto mb-3 xs:mb-4 sm:mb-6 md:mb-8 transition-transform duration-300 hover:scale-110 md:hover:scale-125">
                    <Users className="h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-[#D4A817]" />
                  </div>
                  <h3 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl mb-2 xs:mb-3 sm:mb-4 md:mb-6 text-white font-semibold leading-tight">
                    {t.expertCoaching}
                  </h3>
                  <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-white/75 leading-relaxed">
                    {t.expertCoachingDesc}
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center p-5 xs:p-6 sm:p-8 md:p-10 lg:p-12 bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] md:hover:shadow-[0_16px_40px_rgba(212,168,23,0.25)] scroll-reveal">
                <CardContent className="pt-3 xs:pt-4 sm:pt-6 md:pt-8">
                  <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[rgba(212,168,23,0.15)] rounded-full flex items-center justify-center mx-auto mb-3 xs:mb-4 sm:mb-6 md:mb-8 transition-transform duration-300 hover:scale-110 md:hover:scale-125">
                    <Trophy className="h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-[#D4A817]" />
                  </div>
                  <h3 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl mb-2 xs:mb-3 sm:mb-4 md:mb-6 text-white font-semibold leading-tight">
                    {t.tournamentTitle}
                  </h3>
                  <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-white/75 leading-relaxed">
                    {t.tournamentDesc}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer - Mobile Optimized */}
        <footer className="bg-[#0A0A0A] text-white py-6 xs:py-8 sm:py-12 border-t border-[rgba(255,255,255,0.08)]">
          <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 xs:gap-6 sm:gap-8">
              <div>
                <h3 className="text-lg xs:text-xl sm:text-2xl mb-2 xs:mb-3 sm:mb-4 text-[#D4A817] font-bold">
                  {t.heroTitle}
                </h3>
                <p className="text-xs xs:text-sm sm:text-base text-white/75 mb-4 leading-relaxed">
                  {t.aboutDescription}
                </p>
              </div>

              <div>
                <h4 className="text-sm xs:text-base sm:text-lg mb-2 xs:mb-3 sm:mb-4 text-white font-semibold">
                  {t.contactInfo}
                </h4>
                <div className="space-y-2 xs:space-y-2.5 sm:space-y-3">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-2 xs:mr-2.5 sm:mr-3 text-[#D4A817] mt-0.5 flex-shrink-0" />
                    <span className="text-xs xs:text-sm sm:text-base text-white/75 leading-relaxed">
                      123 Sports Complex, Port Said, Egypt
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-2 xs:mr-2.5 sm:mr-3 text-[#D4A817] flex-shrink-0" />
                    <span className="text-xs xs:text-sm sm:text-base text-white/75">
                      +20 66 123 4567
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-2 xs:mr-2.5 sm:mr-3 text-[#D4A817] flex-shrink-0" />
                    <span className="text-xs xs:text-sm sm:text-base text-white/75 break-all">
                      info@starpoint.com
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm xs:text-base sm:text-lg mb-2 xs:mb-3 sm:mb-4 text-white font-semibold">
                  {t.connectWithUs}
                </h4>
                <div className="space-y-2 xs:space-y-2.5 sm:space-y-3">
                  <a
                    href="https://wa.me/201234567890"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-[#D4A817] hover:text-[#E6C420] active:text-[#C99B15] transition-colors duration-150 text-xs xs:text-sm sm:text-base min-h-[44px] touch-manipulation"
                  >
                    <Phone className="h-4 w-4 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-2 xs:mr-2.5 sm:mr-3 flex-shrink-0" />
                    {t.whatsApp}
                  </a>
                  <p className="text-white/55 text-[10px] xs:text-xs sm:text-sm">
                    {t.followUs}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[rgba(255,255,255,0.08)] mt-5 xs:mt-6 sm:mt-8 pt-5 xs:pt-6 sm:pt-8 text-center">
              <p className="text-white/55 text-[10px] xs:text-xs sm:text-sm">
                {t.rightsReserved}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default function Page() {
  const t = useTranslations("en");
  const router = useRouter();
  const handlePageChange = (page: string) => {
    if (page === "booking") router.push("/booking");
    else if (page === "coaching") router.push("/coaching");
    else if (page === "tournaments") router.push("/tournaments");
    else if (page === "admin") router.push("/admin");
  };
  return <LandingPage onPageChange={handlePageChange} t={t} />;
}
