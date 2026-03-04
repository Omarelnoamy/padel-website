"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Hourglass, Clock, Users, BookOpen, Star, Sparkles, Zap, Award } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

export default function CoachingComingSoonPage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Array<{ left: string; top: string; delay: number; duration: number }>>([]);

  useEffect(() => {
    setIsVisible(true);
    
    // Generate particles only on client side to avoid hydration mismatch
    setParticles(
      Array.from({ length: 20 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: Math.random() * 5,
        duration: 5 + Math.random() * 5,
      }))
    );
    
    // Track mouse position for parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient Orbs - gold accent to match homepage */}
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4A817]/20 rounded-full blur-3xl animate-pulse"
            style={{
              transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
            }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#F9D923]/15 rounded-full blur-3xl animate-pulse"
            style={{
              animationDelay: "1s",
              transform: `translate(${-mousePosition.x * 0.3}px, ${-mousePosition.y * 0.3}px)`,
            }}
          />
          <div
            className="absolute top-1/2 right-1/3 w-64 h-64 bg-[#D4A817]/10 rounded-full blur-2xl animate-pulse"
            style={{
              animationDelay: "2s",
              transform: `translate(${mousePosition.x * 0.4}px, ${mousePosition.y * 0.4}px)`,
            }}
          />

          {/* Grid Pattern */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(rgba(212, 168, 23, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(212, 168, 23, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Icon with Animation 
                Alternative icons you can use (just replace GraduationCap):
                - Target: Perfect for goals and precision training
                - Users: Great for mentorship and coaching
                - BookOpen: Represents learning and education
                - Brain: Mental training and strategy
                - Rocket: Growth and launching your skills
            */}
            <div
              className={`mb-8 transition-all duration-1000 ${
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
              }`}
            >
              <div className="relative inline-block">
                {/* Outer glow ring */}
                <div className="absolute inset-0 bg-[#D4A817]/30 rounded-full blur-xl animate-ping" />
                {/* Middle ring */}
                <div className="absolute inset-0 bg-[#D4A817]/20 rounded-full blur-lg animate-pulse" />
                {/* Main icon container - gold to match homepage */}
                <div className="relative bg-gradient-to-br from-[#D4A817] via-[#F9D923] to-[#D4A817] p-6 md:p-8 rounded-2xl shadow-[0_0_40px_rgba(249,217,35,0.4)] group hover:shadow-[0_0_60px_rgba(249,217,35,0.5)] transition-all duration-700 ease-in-out hover:scale-105">
                  {/* Hourglass icon - perfect for "coming soon" */}
                  <Hourglass className="h-16 w-16 md:h-20 md:w-20 text-white group-hover:scale-110 transition-transform duration-700 ease-in-out drop-shadow-lg" />
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out" />
                </div>
              </div>
            </div>

            {/* Main Heading */}
            <h1
              className={`text-4xl md:text-6xl lg:text-7xl font-bold mb-6 transition-all duration-1000 delay-200 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              <span className="text-[#F9D923] drop-shadow-[0_0_20px_rgba(249,217,35,0.4)]">
                Coming Soon
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className={`text-lg md:text-xl lg:text-2xl text-white/75 mb-4 transition-all duration-1000 delay-300 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              Professional Coaching
            </p>
            <p
              className={`text-base md:text-lg text-white/60 mb-12 transition-all duration-1000 delay-400 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              Get ready for world-class padel coaching from certified professionals
            </p>

            {/* Features Grid */}
            <div
              className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 transition-all duration-1000 delay-500 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] transition-all duration-300 hover:scale-105">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 bg-[rgba(212,168,23,0.15)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="h-7 w-7 text-[#D4A817]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Certified Coaches
                  </h3>
                  <p className="text-sm text-white/70">
                    Learn from FIP certified professionals with proven track records
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] transition-all duration-300 hover:scale-105">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 bg-[rgba(212,168,23,0.15)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="h-7 w-7 text-[#D4A817]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Personalized Training
                  </h3>
                  <p className="text-sm text-white/70">
                    Customized programs tailored to your skill level and goals
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] transition-all duration-300 hover:scale-105">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 bg-[rgba(212,168,23,0.15)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-7 w-7 text-[#D4A817]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Flexible Schedule
                  </h3>
                  <p className="text-sm text-white/70">
                    Book sessions that fit your busy lifestyle
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* CTA Buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-700 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              <Button
                onClick={() => router.push("/booking")}
                className="bg-[#F9D923] hover:bg-[#FBE156] text-[#121212] font-semibold px-8 py-6 text-lg shadow-[0_10px_30px_rgba(249,217,35,0.35)] hover:shadow-[0_10px_40px_rgba(249,217,35,0.45)] transition-all duration-300"
              >
                <Zap className="h-5 w-5 mr-2" />
                Book a Court Now
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="border-[rgba(212,168,23,0.5)] text-white hover:bg-[rgba(212,168,23,0.1)] px-8 py-6 text-lg"
              >
                Back to Home
              </Button>
            </div>

            {/* Notification Signup (Optional) */}
            <div
              className={`mt-12 transition-all duration-1000 delay-800 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-[#D4A817]" />
                    <p className="text-white/90 font-medium">
                      Be the first to know when coaching launches!
                    </p>
                  </div>
                  <p className="text-sm text-white/60">
                    We&apos;re working hard to bring you the best coaching experience.
                    Stay tuned for updates!
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Floating Particles Animation - Generated client-side to avoid hydration error */}
        {particles.length > 0 && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((particle, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-[#D4A817] rounded-full opacity-30 animate-float"
                style={{
                  left: particle.left,
                  top: particle.top,
                  animationDelay: `${particle.delay}s`,
                  animationDuration: `${particle.duration}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

    </>
  );
}
