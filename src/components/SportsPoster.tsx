"use client";

import { motion } from "framer-motion";
import { ImageWithFallback } from "@/app/figma/ImageWithFallback";

interface SportsPosterProps {
  playerName: string;
  playerPhoto?: string;
  points: number;
  category: string;
  position: "left" | "right";
  delay: number;
}

export function SportsPoster({
  playerName,
  playerPhoto,
  points,
  category,
  position,
  delay,
}: SportsPosterProps) {
  const getSkillLevelGradient = (category: string) => {
    switch (category) {
      case "Elite Pro":
        return "from-purple-600 via-purple-500 to-purple-400";
      case "Pro":
        return "from-blue-600 via-blue-500 to-blue-400";
      case "Advanced":
        return "from-green-600 via-green-500 to-green-400";
      case "Intermediate":
        return "from-orange-600 via-orange-500 to-orange-400";
      case "Beginner":
        return "from-yellow-600 via-yellow-500 to-yellow-400";
      default:
        return "from-gray-600 via-gray-500 to-gray-400";
    }
  };

  const skillGradient = getSkillLevelGradient(category);

  return (
    <motion.div
      initial={{ opacity: 0, x: position === "left" ? -100 : 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 1, delay, ease: "easeOut" }}
      className={`relative w-64 h-80 sm:w-80 sm:h-96 bg-gradient-to-br ${skillGradient} rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition-all duration-500`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="absolute top-4 right-4 w-32 h-32 bg-white/5 rounded-full blur-xl" />
        <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/5 rounded-full blur-xl" />
      </div>

      {/* Player Photo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            duration: 1.2,
            delay: delay + 0.3,
            type: "spring",
            bounce: 0.4,
          }}
          className="relative w-48 h-48 sm:w-64 sm:h-64"
        >
          <ImageWithFallback
            src={
              playerPhoto ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                playerName
              )}&background=22c55e&color=fff&size=200`
            }
            alt={playerName}
            className="w-full h-full object-cover object-top rounded-full border-4 border-white/30 shadow-xl"
          />

          {/* Glow Effect */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute inset-0 bg-gradient-to-r ${skillGradient} rounded-full blur-xl -z-10`}
          />
        </motion.div>
      </div>

      {/* Player Info */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: delay + 0.8 }}
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6"
      >
        <div className="text-center">
          <motion.h3
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: delay + 1 }}
            className="text-xl sm:text-2xl font-bold text-white mb-2"
          >
            {playerName}
          </motion.h3>

          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: delay + 1.2 }}
            className="flex items-center justify-center space-x-4 mb-2"
          >
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-400">
                {points}
              </div>
              <div className="text-xs sm:text-sm text-gray-300">POINTS</div>
            </div>

            <div className="w-px h-8 bg-white/30" />

            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-white">
                {category}
              </div>
              <div className="text-xs sm:text-sm text-gray-300">LEVEL</div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Corner Accent */}
      <motion.div
        initial={{ scale: 0, rotate: 45 }}
        animate={{ scale: 1, rotate: 45 }}
        transition={{ duration: 0.6, delay: delay + 1.4 }}
        className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
      >
        <div className="w-4 h-4 bg-white/60 rounded-full" />
      </motion.div>
    </motion.div>
  );
}
