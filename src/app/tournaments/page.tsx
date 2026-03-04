"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Trophy,
  Users,
  MapPin,
  Clock,
  Star,
  ArrowRight,
  Award,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { Translations, useTranslations } from "@/app/translations";
import Navbar from "@/components/Navbar";

interface TournamentsPageProps {
  t: Translations;
  onPageChange: (page: string) => void;
}

export function TournamentsPage({ t, onPageChange }: TournamentsPageProps) {
  const tournaments: any[] = [];
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Array<{ left: string; top: string; delay: number; duration: number }>>([]);

  useEffect(() => {
    // Generate particles only on client side to avoid hydration mismatch
    setParticles(
      Array.from({ length: 30 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: Math.random() * 5,
        duration: 5 + Math.random() * 5,
      }))
    );
    
    // Track mouse position for parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 30,
        y: (e.clientY / window.innerHeight - 0.5) * 30,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleRegister = (tournamentName: string) => {
    alert(
      `Registering for ${tournamentName}. You'll be redirected to the registration form.`
    );
  };

  // Tournament Card Component
  const TournamentCard = ({
    tournament,
    index,
  }: {
    tournament: any;
    index: number;
  }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.6, 
          delay: index * 0.1,
          type: "spring",
          stiffness: 100
        }}
        whileHover={{ 
          y: -8, 
          scale: 1.02,
          transition: { duration: 0.2 }
        }}
      >
        <Card className="relative overflow-hidden hover:shadow-2xl hover:shadow-[#D4A817]/20 transition-all duration-300 bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] group">
          {/* Animated gradient overlay on hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-[#D4A817]/0 to-[#F9D923]/0 group-hover:from-[#D4A817]/5 group-hover:to-[#F9D923]/5 transition-all duration-500 pointer-events-none"
            initial={false}
          />
          {tournament.featured && (
            <div className="absolute top-4 right-4 z-10">
              <Badge className="bg-[#D4A817] text-[#121212] font-semibold">
                <Star className="h-3 w-3 mr-1" />
                {t.featured}
              </Badge>
            </div>
          )}

          <CardHeader>
            <CardTitle className="text-xl pr-20 text-white">
              {tournament.name}
            </CardTitle>
            {tournament.description && (
              <p className="text-sm text-white/75 italic">
                {tournament.description}
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={
                  tournament.status === "Registration Open"
                    ? "default"
                    : "secondary"
                }
                className={
                  tournament.status === "Registration Open"
                    ? "bg-[#D4A817] text-[#121212]"
                    : ""
                }
              >
                {tournament.status}
              </Badge>
              <Badge variant="outline" className="border-[rgba(212,168,23,0.3)] text-white">
                {tournament.category}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center text-sm text-white/75">
                <Calendar className="h-4 w-4 mr-2 text-[#D4A817]" />
                {new Date(tournament.startDate).toLocaleDateString()} -{" "}
                {new Date(tournament.endDate).toLocaleDateString()}
              </div>

              <div className="flex items-center text-sm text-white/75">
                <Users className="h-4 w-4 mr-2 text-[#D4A817]" />
                {tournament.participants}/{tournament.maxParticipants}{" "}
                {t.participants}
              </div>

              <div className="flex items-center text-sm text-white/75">
                <Trophy className="h-4 w-4 mr-2 text-[#D4A817]" />
                {t.prizePool}: {tournament.prize}
              </div>

              <div className="flex items-center text-sm text-white/75">
                <MapPin className="h-4 w-4 mr-2 text-[#D4A817]" />
                {t.level}: {tournament.level}
              </div>

              {tournament.highlights && (
                <div className="pt-2">
                  <h5 className="text-sm font-medium text-white mb-2">
                    Special Features:
                  </h5>
                  <div className="grid grid-cols-2 gap-1">
                    {tournament.highlights.map(
                      (highlight: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center text-xs text-white/75"
                        >
                          <Award className="h-3 w-3 mr-1 text-[#D4A817]" />
                          {highlight}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className="text-xl text-[#D4A817]">
                      {tournament.registrationFee}
                    </span>
                    <span className="text-sm text-white/75"> {t.entryFee}</span>
                  </div>
                  <div className="text-sm text-white/75">
                    {Math.round(
                      (tournament.participants / tournament.maxParticipants) *
                        100
                    )}
                    % {t.full}
                  </div>
                </div>

                <div className="w-full bg-muted rounded-full h-2 mb-4">
                  <div
                    className="h-2 rounded-full transition-all duration-300 bg-[#D4A817]"
                    style={{
                      width: `${
                        (tournament.participants / tournament.maxParticipants) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>

                <Button
                  className={`w-full ${
                    tournament.status === "Tournament Full"
                      ? "bg-[#F9D923] hover:bg-[#FBE156] text-[#121212] font-semibold"
                      : tournament.status === "Registration Open"
                      ? "bg-[#F9D923] hover:bg-[#FBE156] text-[#121212] font-semibold"
                      : "bg-white/10 text-white/50 cursor-not-allowed"
                  }`}
                  onClick={() => {
                    if (tournament.status === "Tournament Full") {
                      window.location.href = `/tournament-management?tournament=${tournament.id}`;
                    } else if (tournament.status === "Registration Open") {
                      handleRegister(tournament.name);
                    }
                  }}
                  disabled={tournament.status === "Coming Soon"}
                >
                  {tournament.status === "Tournament Full"
                    ? "Manage Tournament"
                    : tournament.status === "Registration Open"
                    ? t.registerNow
                    : t.comingSoon}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="bg-gradient-to-b from-[#252015] to-[#1C1810] min-h-screen py-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs - gold to match homepage */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4A817]/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#F9D923]/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.35, 0.15],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          style={{
            transform: `translate(${-mousePosition.x * 0.3}px, ${-mousePosition.y * 0.3}px)`,
          }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-[#D4A817]/10 rounded-full blur-2xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          style={{
            transform: `translate(${mousePosition.x * 0.4}px, ${mousePosition.y * 0.4}px)`,
          }}
        />

        {/* Floating Particles */}
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#D4A817]/30 rounded-full"
            style={{
              left: particle.left,
              top: particle.top,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.sin(i) * 20, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}

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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-[#F9D923] drop-shadow-[0_0_20px_rgba(249,217,35,0.4)]"
          >
            {t.upcomingTournaments}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg text-white/75 max-w-2xl mx-auto"
          >
            Join the most exciting padel tournaments and compete with the best players
          </motion.p>
        </motion.div>

        {/* Tournaments List */}
        <div className="mb-12">
          {tournaments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="text-center py-16"
            >
              {/* Trophy Icon with Coaching Page Effects */}
              <div className="mb-8 transition-all duration-1000">
                <div className="relative inline-block">
                  {/* Outer glow ring */}
                  <div className="absolute inset-0 bg-[#D4A817]/30 rounded-full blur-xl animate-ping" />
                  {/* Middle ring */}
                  <div className="absolute inset-0 bg-[#D4A817]/20 rounded-full blur-lg animate-pulse" />
                  {/* Main icon container - gold to match homepage */}
                  <div className="relative bg-gradient-to-br from-[#D4A817] via-[#F9D923] to-[#D4A817] p-6 md:p-8 rounded-2xl shadow-[0_0_40px_rgba(249,217,35,0.4)] group hover:shadow-[0_0_60px_rgba(249,217,35,0.5)] transition-all duration-700 ease-in-out hover:scale-105">
                    {/* Trophy icon */}
                    <Trophy className="h-16 w-16 md:h-20 md:w-20 text-white group-hover:scale-110 transition-transform duration-700 ease-in-out drop-shadow-lg" />
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out" />
                  </div>
                </div>
              </div>
              
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-2xl md:text-3xl font-semibold text-white mb-2"
              >
                No Tournaments Available
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-white/75 text-lg"
              >
                Check back soon for upcoming tournaments
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-8 flex justify-center gap-2"
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-[#D4A817] rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {tournaments.map((tournament, index) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tournament Rules */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] transition-all duration-300">
            <CardHeader>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2"
              >
                <Award className="h-5 w-5 text-[#D4A817]" />
                <CardTitle className="text-white">{t.tournamentRules}</CardTitle>
              </motion.div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <h4 className="text-lg mb-3 text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#D4A817]" />
                    {t.generalRules}
                  </h4>
                  <ul className="space-y-3 text-sm text-white/75">
                    {[
                      "All matches follow FIP official rules",
                      "Players must arrive 15 minutes before match time",
                      "All skill levels welcome in appropriate categories",
                    ].map((rule, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                        className="flex items-start gap-2"
                      >
                        <span className="text-[#D4A817] mt-1">•</span>
                        <span>{rule}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <h4 className="text-lg mb-3 text-white flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#D4A817]" />
                    {t.whatsIncluded}
                  </h4>
                  <ul className="space-y-3 text-sm text-white/75">
                    {[
                      "Professional tournament organization",
                      "Live score tracking and bracket updates",
                      "Awards ceremony for winners",
                      "Tournament photos and videos",
                    ].map((item, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: 10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                        className="flex items-start gap-2"
                      >
                        <span className="text-[#D4A817] mt-1">•</span>
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default function page() {
  const t = useTranslations("en");
  return (
    <>
      <Navbar />
      <TournamentsPage t={t} onPageChange={() => {}} />
    </>
  );
}
