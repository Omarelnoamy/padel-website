"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Trophy,
  Medal,
  Award,
  Crown,
  Star,
  Filter,
  TrendingUp,
  Users,
  Target,
  Zap,
  Flame,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Swords,
  Shield,
  Globe,
  MapPin,
  Calendar,
  Clock,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Translations, useTranslations } from "@/app/translations";
import Navbar from "@/components/Navbar";

interface PointSystemProps {
  t: Translations;
}

interface Player {
  id: number;
  name: string;
  points: number;
  rank: number;
  initials: string;
  location: string;
  lastActive: string;
  category?: "C" | "D" | "LOW D" | "Beginners" | "Juniors";
  wins?: number;
  losses?: number;
  winRate?: number;
  streak?: number;
}

// Helper function to get initials from name
const getInitials = (name: string): string => {
  const words = name.trim().split(" ");
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return words[0].substring(0, 2).toUpperCase();
};

// Helper function to get rank badge color (warm/yellow shades only, no blue)
const getRankBadgeColor = (rank: number) => {
  if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600";
  if (rank === 2) return "bg-gradient-to-r from-amber-200 to-amber-400";
  if (rank === 3) return "bg-gradient-to-r from-orange-400 to-amber-500";
  if (rank <= 10) return "bg-gradient-to-r from-amber-500 to-amber-600";
  if (rank <= 25) return "bg-gradient-to-r from-amber-500 to-amber-600";
  return "bg-gradient-to-r from-amber-700 to-amber-900";
};

// Helper function to get rank icon
const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="w-4 h-4" />;
  if (rank === 2) return <Medal className="w-4 h-4" />;
  if (rank === 3) return <Award className="w-4 h-4" />;
  return <Trophy className="w-4 h-4" />;
};

// Helper function to get category color for Port Said players (warm tones only, no blue)
const getCategoryColor = (category: string) => {
  switch (category) {
    case "C":
      return "from-amber-900 to-black";
    case "D":
      return "from-yellow-400 to-yellow-600";
    case "LOW D":
      return "from-amber-600 to-amber-800";
    case "Beginners":
      return "from-amber-200 to-amber-400";
    case "Juniors":
      return "from-amber-400 to-amber-600";
    default:
      return "from-amber-200 to-amber-400";
  }
};

// Helper function to determine category based on points
const getCategory = (
  points: number
): "C" | "D" | "LOW D" | "Beginners" | "Juniors" => {
  if (points >= 500) return "C";
  if (points >= 300) return "D";
  if (points >= 200) return "LOW D";
  if (points >= 100) return "Beginners";
  return "Juniors";
};

export function PointSystem({ t }: PointSystemProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"rank" | "points" | "name">("rank");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [rankingSystem, setRankingSystem] = useState<"port-said" | "egypt">(
    "port-said"
  );

  // Port Said Rankings Data - to be loaded from API
  const portSaidPlayers: Player[] = [
    {
      id: 1,
      name: "Ahmed atef",
      points: 750,
      rank: 1,
      initials: "AA",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "C",
    },
    {
      id: 2,
      name: "Heshmat",
      points: 650,
      rank: 2,
      initials: "H",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "C",
    },
    {
      id: 3,
      name: "Tarek elsaed",
      points: 650,
      rank: 3,
      initials: "TE",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "C",
    },
    {
      id: 4,
      name: "Abdo Haridy",
      points: 550,
      rank: 4,
      initials: "AH",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "C",
    },
    {
      id: 5,
      name: "Saamakaa",
      points: 550,
      rank: 5,
      initials: "S",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "C",
    },
    {
      id: 6,
      name: "Amr Haridy",
      points: 550,
      rank: 6,
      initials: "AH",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "C",
    },
    {
      id: 7,
      name: "Sherif Haridy",
      points: 550,
      rank: 7,
      initials: "SH",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "C",
    },
    {
      id: 8,
      name: "Elllollll",
      points: 550,
      rank: 8,
      initials: "E",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "C",
    },
    {
      id: 9,
      name: "Omar elkhayat",
      points: 500,
      rank: 9,
      initials: "OE",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "C",
    },
    {
      id: 10,
      name: "Mostafa Tamer",
      points: 500,
      rank: 10,
      initials: "MT",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "C",
    },
    {
      id: 11,
      name: "Mohab ismilia",
      points: 500,
      rank: 11,
      initials: "MI",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "C",
    },
    {
      id: 12,
      name: "Elbehery",
      points: 400,
      rank: 12,
      initials: "E",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "C",
    },
    {
      id: 13,
      name: "Yousef Ghandr",
      points: 400,
      rank: 13,
      initials: "YG",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "C",
    },
    {
      id: 14,
      name: "Hazem Tanta",
      points: 400,
      rank: 14,
      initials: "HT",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "C",
    },
    {
      id: 15,
      name: "elawady ismilia",
      points: 400,
      rank: 15,
      initials: "EI",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "C",
    },
    {
      id: 16,
      name: "eldeeeb",
      points: 400,
      rank: 16,
      initials: "E",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "C",
    },
    {
      id: 17,
      name: "elzawawy",
      points: 400,
      rank: 17,
      initials: "E",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "C",
    },
    {
      id: 18,
      name: "M.Atef",
      points: 375,
      rank: 18,
      initials: "MA",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "C",
    },
    {
      id: 19,
      name: "Ziad Elbehery",
      points: 350,
      rank: 19,
      initials: "ZE",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "C",
    },
    {
      id: 20,
      name: "Adham Domiat",
      points: 350,
      rank: 20,
      initials: "AD",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "C",
    },
    {
      id: 21,
      name: "Bassem Tamam",
      points: 325,
      rank: 21,
      initials: "BT",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "D",
    },
    {
      id: 22,
      name: "Kafooo",
      points: 300,
      rank: 22,
      initials: "K",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "D",
    },
    {
      id: 23,
      name: "Ahmed elalfy",
      points: 300,
      rank: 23,
      initials: "AE",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "D",
    },
    {
      id: 24,
      name: "Mahmoud elmasry",
      points: 300,
      rank: 24,
      initials: "ME",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "D",
    },
    {
      id: 25,
      name: "Omar emad",
      points: 300,
      rank: 25,
      initials: "OE",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "D",
    },
    {
      id: 26,
      name: "ali elshahat",
      points: 300,
      rank: 26,
      initials: "AE",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "D",
    },
    {
      id: 27,
      name: "Ahmed elbatsh",
      points: 275,
      rank: 27,
      initials: "AE",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "D",
    },
    {
      id: 28,
      name: "Salah Tawfeek",
      points: 275,
      rank: 28,
      initials: "ST",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "D",
    },
    {
      id: 29,
      name: "Mohamed elalfy",
      points: 275,
      rank: 29,
      initials: "ME",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "D",
    },
    {
      id: 30,
      name: "Amir Domiat",
      points: 275,
      rank: 30,
      initials: "AD",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "D",
    },
    {
      id: 31,
      name: "Kareem Nour",
      points: 275,
      rank: 31,
      initials: "KN",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "D",
    },
    {
      id: 32,
      name: "Ahmed elhosyny",
      points: 275,
      rank: 32,
      initials: "AE",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "D",
    },
    {
      id: 33,
      name: "yahia heilal",
      points: 275,
      rank: 33,
      initials: "YH",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "D",
    },
    {
      id: 34,
      name: "Eslam Nadaa",
      points: 275,
      rank: 34,
      initials: "EN",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "D",
    },
    {
      id: 35,
      name: "elkhmisy Domiat",
      points: 275,
      rank: 35,
      initials: "ED",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "D",
    },
    {
      id: 36,
      name: "Jana elkhedrawy",
      points: 250,
      rank: 36,
      initials: "JE",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "D",
    },
    {
      id: 37,
      name: "Hamada salem",
      points: 250,
      rank: 37,
      initials: "HS",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "D",
    },
    {
      id: 38,
      name: "Karim Fadaly",
      points: 250,
      rank: 38,
      initials: "KF",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "D",
    },
    {
      id: 39,
      name: "yosef elezaby",
      points: 250,
      rank: 39,
      initials: "YE",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "D",
    },
    {
      id: 40,
      name: "Shadi Domiat",
      points: 250,
      rank: 40,
      initials: "SD",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "D",
    },
    {
      id: 41,
      name: "Ibrahim domiat",
      points: 250,
      rank: 41,
      initials: "ID",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "D",
    },
    {
      id: 42,
      name: "ibrahim Mansora",
      points: 250,
      rank: 42,
      initials: "IM",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "D",
    },
    {
      id: 43,
      name: "yousef Alex",
      points: 250,
      rank: 43,
      initials: "YA",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "D",
    },
    {
      id: 44,
      name: "Hassan Shahen",
      points: 250,
      rank: 44,
      initials: "HS",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "D",
    },
    {
      id: 45,
      name: "Ziad eletrby",
      points: 250,
      rank: 45,
      initials: "ZE",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "D",
    },
    {
      id: 46,
      name: "Moez abdlah",
      points: 225,
      rank: 46,
      initials: "MA",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "D",
    },
    {
      id: 47,
      name: "Ibrahim abo omar",
      points: 225,
      rank: 47,
      initials: "IA",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "D",
    },
    {
      id: 48,
      name: "Elbalo",
      points: 200,
      rank: 48,
      initials: "E",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "D",
    },
    {
      id: 49,
      name: "sakr",
      points: 200,
      rank: 49,
      initials: "S",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "D",
    },
    {
      id: 50,
      name: "Abd elgelel",
      points: 200,
      rank: 50,
      initials: "AE",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "D",
    },
    {
      id: 51,
      name: "Adham Mahlab",
      points: 200,
      rank: 51,
      initials: "AM",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "D",
    },
    {
      id: 52,
      name: "Rapso",
      points: 200,
      rank: 52,
      initials: "R",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "D",
    },
    {
      id: 53,
      name: "Adel Gadara",
      points: 200,
      rank: 53,
      initials: "AG",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "D",
    },
    {
      id: 54,
      name: "Salah Elfawy",
      points: 175,
      rank: 54,
      initials: "SE",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "LOW D",
    },
    {
      id: 55,
      name: "M.Hesham",
      points: 175,
      rank: 55,
      initials: "MH",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 56,
      name: "eslam Magic",
      points: 175,
      rank: 56,
      initials: "EM",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 57,
      name: "Negm",
      points: 175,
      rank: 57,
      initials: "N",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 58,
      name: "Abdelrhman sedeek",
      points: 175,
      rank: 58,
      initials: "AS",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "LOW D",
    },
    {
      id: 59,
      name: "mohamed Osama",
      points: 175,
      rank: 59,
      initials: "MO",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 60,
      name: "Omar Domiat",
      points: 175,
      rank: 60,
      initials: "OD",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 61,
      name: "Magdy ismalia",
      points: 175,
      rank: 61,
      initials: "MI",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 62,
      name: "Nabil Ismalia",
      points: 175,
      rank: 62,
      initials: "NI",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "LOW D",
    },
    {
      id: 63,
      name: "Ammar ismalia",
      points: 175,
      rank: 63,
      initials: "AI",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 64,
      name: "Khaled atef",
      points: 175,
      rank: 64,
      initials: "KA",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 65,
      name: "mostafa eid",
      points: 175,
      rank: 65,
      initials: "ME",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 66,
      name: "Ahmed elagamy",
      points: 175,
      rank: 66,
      initials: "AE",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "LOW D",
    },
    {
      id: 67,
      name: "Hamada abo elghit",
      points: 175,
      rank: 67,
      initials: "HA",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 68,
      name: "Abo Omar",
      points: 175,
      rank: 68,
      initials: "AO",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 69,
      name: "Omar elno3amy",
      points: 175,
      rank: 69,
      initials: "OE",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 70,
      name: "Elrashedy",
      points: 175,
      rank: 70,
      initials: "E",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "LOW D",
    },
    {
      id: 71,
      name: "Eslam Domiat",
      points: 175,
      rank: 71,
      initials: "ED",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 72,
      name: "Saleh",
      points: 175,
      rank: 72,
      initials: "S",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 73,
      name: "Masoud",
      points: 175,
      rank: 73,
      initials: "M",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 74,
      name: "Amr elhadidy",
      points: 175,
      rank: 74,
      initials: "AE",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "LOW D",
    },
    {
      id: 75,
      name: "Ahmed Ragab",
      points: 175,
      rank: 75,
      initials: "AR",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 76,
      name: "C.Wael",
      points: 150,
      rank: 76,
      initials: "CW",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 77,
      name: "Elkhodery Domiat",
      points: 150,
      rank: 77,
      initials: "ED",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 78,
      name: "ibrahim Elnoby",
      points: 150,
      rank: 78,
      initials: "IE",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "LOW D",
    },
    {
      id: 79,
      name: "Doc Batsh",
      points: 150,
      rank: 79,
      initials: "DB",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 80,
      name: "Mahmoud masry Porto",
      points: 150,
      rank: 80,
      initials: "MP",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 81,
      name: "Abo hala",
      points: 150,
      rank: 81,
      initials: "AH",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 82,
      name: "Sanko",
      points: 150,
      rank: 82,
      initials: "S",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "LOW D",
    },
    {
      id: 83,
      name: "Badwy",
      points: 150,
      rank: 83,
      initials: "B",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 84,
      name: "Hossam Gabala",
      points: 150,
      rank: 84,
      initials: "HG",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 85,
      name: "abdelrhman ashraf",
      points: 150,
      rank: 85,
      initials: "AA",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 86,
      name: "Kareem alaa",
      points: 150,
      rank: 86,
      initials: "KA",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "LOW D",
    },
    {
      id: 87,
      name: "Farag",
      points: 150,
      rank: 87,
      initials: "F",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 88,
      name: "Sedeek",
      points: 150,
      rank: 88,
      initials: "S",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 89,
      name: "Mousa",
      points: 150,
      rank: 89,
      initials: "M",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 90,
      name: "M.Ibrahim",
      points: 150,
      rank: 90,
      initials: "MI",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "LOW D",
    },
    {
      id: 91,
      name: "Hazem elno3amy",
      points: 150,
      rank: 91,
      initials: "HE",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 92,
      name: "elekrmyyyy",
      points: 125,
      rank: 92,
      initials: "E",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 93,
      name: "Bassem elNahal",
      points: 125,
      rank: 93,
      initials: "BE",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 94,
      name: "Mostafa Tarek",
      points: 125,
      rank: 94,
      initials: "MT",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "LOW D",
    },
    {
      id: 95,
      name: "Omar Magdy",
      points: 125,
      rank: 95,
      initials: "OM",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 96,
      name: "Amr Raouf",
      points: 125,
      rank: 96,
      initials: "AR",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 97,
      name: "Hossam elhendy",
      points: 125,
      rank: 97,
      initials: "HE",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 98,
      name: "Hafez",
      points: 125,
      rank: 98,
      initials: "H",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "LOW D",
    },
    {
      id: 99,
      name: "Elfeky",
      points: 125,
      rank: 99,
      initials: "E",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 100,
      name: "Bikoo",
      points: 125,
      rank: 100,
      initials: "B",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 101,
      name: "Ali elshouly",
      points: 125,
      rank: 101,
      initials: "AE",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 102,
      name: "Megawr",
      points: 125,
      rank: 102,
      initials: "M",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "LOW D",
    },
    {
      id: 103,
      name: "Mansy",
      points: 125,
      rank: 103,
      initials: "M",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 104,
      name: "Abdo elsayed",
      points: 125,
      rank: 104,
      initials: "AE",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 105,
      name: "Mohand badwy",
      points: 125,
      rank: 105,
      initials: "MB",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 106,
      name: "Mahmoud Elnkity",
      points: 125,
      rank: 106,
      initials: "ME",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "LOW D",
    },
    {
      id: 107,
      name: "khaled elbahry",
      points: 125,
      rank: 107,
      initials: "KE",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 108,
      name: "Fouad",
      points: 125,
      rank: 108,
      initials: "F",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 109,
      name: "Ahmed Osman",
      points: 125,
      rank: 109,
      initials: "AO",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 110,
      name: "M.Emad",
      points: 125,
      rank: 110,
      initials: "ME",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "LOW D",
    },
    {
      id: 111,
      name: "karim makhrita",
      points: 125,
      rank: 111,
      initials: "KM",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 112,
      name: "Eslam abo siar",
      points: 125,
      rank: 112,
      initials: "EA",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 113,
      name: "Abo Naga",
      points: 125,
      rank: 113,
      initials: "AN",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 114,
      name: "A.Emad",
      points: 125,
      rank: 114,
      initials: "AE",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "LOW D",
    },
    {
      id: 115,
      name: "Bousss",
      points: 150,
      rank: 115,
      initials: "B",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 116,
      name: "Ziko",
      points: 125,
      rank: 116,
      initials: "Z",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 117,
      name: "Amr Khaled",
      points: 125,
      rank: 117,
      initials: "AK",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 118,
      name: "Hassan",
      points: 125,
      rank: 118,
      initials: "H",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "LOW D",
    },
    {
      id: 119,
      name: "Eissa",
      points: 100,
      rank: 119,
      initials: "E",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "Beginners",
    },
    {
      id: 120,
      name: "Mohamed ali",
      points: 100,
      rank: 120,
      initials: "MA",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 121,
      name: "Elsherbeny",
      points: 100,
      rank: 121,
      initials: "E",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 122,
      name: "Younis",
      points: 100,
      rank: 122,
      initials: "Y",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "LOW D",
    },
    {
      id: 123,
      name: "mohamed elkhayat",
      points: 100,
      rank: 123,
      initials: "ME",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 124,
      name: "Ziad Nour",
      points: 100,
      rank: 124,
      initials: "ZN",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 125,
      name: "Mamado7",
      points: 100,
      rank: 125,
      initials: "M",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 126,
      name: "Eissa",
      points: 100,
      rank: 126,
      initials: "E",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "LOW D",
    },
    {
      id: 127,
      name: "omar abd elbaky",
      points: 100,
      rank: 127,
      initials: "OA",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 128,
      name: "Elazab",
      points: 100,
      rank: 128,
      initials: "E",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 129,
      name: "Tamer",
      points: 100,
      rank: 129,
      initials: "T",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 130,
      name: "Kareem ali",
      points: 100,
      rank: 130,
      initials: "KA",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "LOW D",
    },
    {
      id: 131,
      name: "Sehso",
      points: 100,
      rank: 131,
      initials: "S",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 132,
      name: "Khaled Nasr",
      points: 100,
      rank: 132,
      initials: "KN",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "Beginners",
    },
    {
      id: 133,
      name: "Bakr",
      points: 100,
      rank: 133,
      initials: "B",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 134,
      name: "Amar abo wafa",
      points: 100,
      rank: 134,
      initials: "AA",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "LOW D",
    },
    {
      id: 135,
      name: "Ayman Waleed",
      points: 100,
      rank: 135,
      initials: "AW",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 136,
      name: "Nasser",
      points: 125,
      rank: 136,
      initials: "N",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 137,
      name: "Mafreh",
      points: 100,
      rank: 137,
      initials: "M",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 138,
      name: "Ahmed nour",
      points: 100,
      rank: 138,
      initials: "AN",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "LOW D",
    },
    {
      id: 139,
      name: "Noor",
      points: 100,
      rank: 139,
      initials: "N",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "LOW D",
    },
    {
      id: 140,
      name: "ahmed elhelely",
      points: 100,
      rank: 140,
      initials: "AE",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "LOW D",
    },
    {
      id: 141,
      name: "Mazen elsefy",
      points: 100,
      rank: 141,
      initials: "ME",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "LOW D",
    },
    {
      id: 142,
      name: "Ataya",
      points: 100,
      rank: 142,
      initials: "A",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "LOW D",
    },
    {
      id: 143,
      name: "Biancy",
      points: 85,
      rank: 143,
      initials: "B",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "Beginners",
    },
    {
      id: 144,
      name: "Bataa",
      points: 85,
      rank: 144,
      initials: "B",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "Beginners",
    },
    {
      id: 145,
      name: "Somaya Melygy",
      points: 85,
      rank: 145,
      initials: "SM",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "Beginners",
    },
    {
      id: 146,
      name: "Somaya Nabil",
      points: 95,
      rank: 146,
      initials: "SN",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "Beginners",
    },
    {
      id: 147,
      name: "Aya Nabil",
      points: 85,
      rank: 147,
      initials: "AN",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "Beginners",
    },
    {
      id: 148,
      name: "hend mosaad",
      points: 75,
      rank: 148,
      initials: "HM",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "Beginners",
    },
    {
      id: 149,
      name: "Farah Mahlab",
      points: 75,
      rank: 149,
      initials: "FM",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "Beginners",
    },
    {
      id: 150,
      name: "Amy",
      points: 75,
      rank: 150,
      initials: "A",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "Beginners",
    },
    {
      id: 151,
      name: "Sara Bakr",
      points: 50,
      rank: 151,
      initials: "SB",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "Beginners",
    },
    {
      id: 152,
      name: "Tasnem Melygy",
      points: 50,
      rank: 152,
      initials: "TM",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "Beginners",
    },
    {
      id: 153,
      name: "Khadija Bakr",
      points: 50,
      rank: 153,
      initials: "KB",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "Beginners",
    },
    {
      id: 154,
      name: "shimaaa",
      points: 50,
      rank: 154,
      initials: "S",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "Beginners",
    },
    {
      id: 155,
      name: "Raghad elmelygy",
      points: 50,
      rank: 155,
      initials: "RE",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "Beginners",
    },
    {
      id: 156,
      name: "Radwa",
      points: 50,
      rank: 156,
      initials: "R",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "Beginners",
    },
    {
      id: 157,
      name: "Engy",
      points: 50,
      rank: 157,
      initials: "E",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "Beginners",
    },
    {
      id: 158,
      name: "Heba Fala",
      points: 50,
      rank: 158,
      initials: "HF",
      location: "Port Said",
      lastActive: "4 days ago",
      category: "Beginners",
    },
    {
      id: 159,
      name: "Menna Soliman",
      points: 50,
      rank: 159,
      initials: "MS",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "Beginners",
    },
    {
      id: 160,
      name: "Merna abo Hashish",
      points: 50,
      rank: 160,
      initials: "MA",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "Beginners",
    },
    {
      id: 161,
      name: "Zain elMahy",
      points: 50,
      rank: 161,
      initials: "ZE",
      location: "Port Said",
      lastActive: "2 days ago",
      category: "Juniors",
    },
    {
      id: 162,
      name: "Adaam Elbatsh",
      points: 50,
      rank: 162,
      initials: "AE",
      location: "Port Said",
      lastActive: "5 days ago",
      category: "Juniors",
    },
    {
      id: 163,
      name: "Omar elashry",
      points: 50,
      rank: 163,
      initials: "OE",
      location: "Port Said",
      lastActive: "1 day ago",
      category: "Juniors",
    },
    {
      id: 164,
      name: "Nily",
      points: 50,
      rank: 164,
      initials: "N",
      location: "Port Said",
      lastActive: "3 days ago",
      category: "Juniors",
    },
  ];

  // Egypt Rankings Data
  const egyptPlayers: Player[] = [
    {
      id: 1,
      name: "Youssef Hossam",
      points: 40030,
      rank: 1,
      initials: "YH",
      location: "Cairo",
      lastActive: "2 days ago",
    },
    {
      id: 2,
      name: "George Wakim",
      points: 19754,
      rank: 2,
      initials: "GW",
      location: "Alexandria",
      lastActive: "1 day ago",
    },
    {
      id: 3,
      name: "Aly Zaghloul",
      points: 19260,
      rank: 3,
      initials: "AZ",
      location: "Cairo",
      lastActive: "3 days ago",
    },
    {
      id: 4,
      name: "Sherif Makhlouf",
      points: 14635,
      rank: 4,
      initials: "SM",
      location: "Giza",
      lastActive: "1 day ago",
    },
    {
      id: 5,
      name: "Mohamed Abulkassem",
      points: 13641,
      rank: 5,
      initials: "MA",
      location: "Cairo",
      lastActive: "2 days ago",
    },
    {
      id: 6,
      name: "Omar Makhlouf",
      points: 10926,
      rank: 6,
      initials: "OM",
      location: "Giza",
      lastActive: "4 days ago",
    },
    {
      id: 7,
      name: "Mohamed El Garhy",
      points: 10846,
      rank: 7,
      initials: "MG",
      location: "Alexandria",
      lastActive: "1 day ago",
    },
    {
      id: 8,
      name: "Omar Sabry",
      points: 10655,
      rank: 8,
      initials: "OS",
      location: "Cairo",
      lastActive: "3 days ago",
    },
    {
      id: 9,
      name: "Mohamed Kassem",
      points: 10648,
      rank: 9,
      initials: "MK",
      location: "Giza",
      lastActive: "2 days ago",
    },
    {
      id: 10,
      name: "Aley Shokeir",
      points: 10507,
      rank: 10,
      initials: "AS",
      location: "Cairo",
      lastActive: "1 day ago",
    },
    {
      id: 11,
      name: "Wagdy Raslan",
      points: 8994,
      rank: 11,
      initials: "WR",
      location: "Alexandria",
      lastActive: "5 days ago",
    },
    {
      id: 12,
      name: "Marwan Fayad",
      points: 7360,
      rank: 12,
      initials: "MF",
      location: "Cairo",
      lastActive: "2 days ago",
    },
    {
      id: 13,
      name: "Ahmed Derwy",
      points: 6100,
      rank: 13,
      initials: "AD",
      location: "Giza",
      lastActive: "3 days ago",
    },
    {
      id: 14,
      name: "Hassan Shaheen",
      points: 5897,
      rank: 14,
      initials: "HS",
      location: "Cairo",
      lastActive: "1 day ago",
    },
    {
      id: 15,
      name: "Khaled Nagy",
      points: 5579,
      rank: 15,
      initials: "KN",
      location: "Alexandria",
      lastActive: "4 days ago",
    },
    {
      id: 16,
      name: "Ahmed Nazir",
      points: 4896,
      rank: 16,
      initials: "AN",
      location: "Cairo",
      lastActive: "2 days ago",
    },
    {
      id: 17,
      name: "Ahmed Alaa",
      points: 4613,
      rank: 17,
      initials: "AA",
      location: "Giza",
      lastActive: "3 days ago",
    },
    {
      id: 18,
      name: "Ali Khaled Abdelaziz",
      points: 4251,
      rank: 18,
      initials: "AK",
      location: "Cairo",
      lastActive: "1 day ago",
    },
    {
      id: 19,
      name: "Mahmoud Moharam",
      points: 4142,
      rank: 19,
      initials: "MM",
      location: "Alexandria",
      lastActive: "5 days ago",
    },
    {
      id: 20,
      name: "Amr Adel",
      points: 3762,
      rank: 20,
      initials: "AA",
      location: "Cairo",
      lastActive: "2 days ago",
    },
  ];

  // Get current players based on selected ranking system
  const currentPlayers =
    rankingSystem === "port-said" ? portSaidPlayers : egyptPlayers;

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let filtered = currentPlayers.filter((player) =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter by category for Port Said players
    if (rankingSystem === "port-said" && selectedCategory !== "all") {
      filtered = filtered.filter(
        (player) => player.category === selectedCategory
      );
    }

    // Sort players
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "rank":
          return a.rank - b.rank;
        case "points":
          return b.points - a.points;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return a.rank - b.rank;
      }
    });

    return filtered;
  }, [searchTerm, sortBy, selectedCategory, currentPlayers, rankingSystem]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalPlayers = currentPlayers.length;
    const topPlayer = currentPlayers[0];

    // For Port Said, calculate category counts
    const categoryStats =
      rankingSystem === "port-said"
        ? {
            CCount: currentPlayers.filter((p) => p.category === "C").length,
            proCount: currentPlayers.filter((p) => p.category === "D").length,
            advancedCount: currentPlayers.filter((p) => p.category === "LOW D")
              .length,
            intermediateCount: currentPlayers.filter(
              (p) => p.category === "Beginners"
            ).length,
            beginnerCount: currentPlayers.filter(
              (p) => p.category === "Juniors"
            ).length,
          }
        : null;

    return {
      totalPlayers,
      topPlayer: topPlayer.name,
      topPoints: topPlayer.points.toLocaleString(),
      categoryStats,
    };
  }, [currentPlayers, rankingSystem]);

  // Player Card Component for Grid View
  const PlayerCard = ({ player, index }: { player: Player; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="cursor-pointer"
    >
      <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                  index < 3
                    ? getRankBadgeColor(index + 1)
                    : `bg-gradient-to-r ${getCategoryColor(
                        player.category || "Beginners"
                      )}`
                }`}
              >
                {index < 3 ? getRankIcon(index + 1) : player.rank}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  {player.name}
                </h3>
                <div className="flex items-center text-white/75 text-sm">
                  <MapPin className="w-4 h-4 mr-1 text-[#D4A817]" />
                  {player.location}
                </div>
                {player.category && (
                  <Badge
                    variant="outline"
                    className={`text-xs mt-1 bg-gradient-to-r ${getCategoryColor(
                      player.category
                    )} text-white border-0`}
                  >
                    {player.category}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#D4A817]">
                {player.points.toLocaleString()}
              </div>
              <div className="text-sm text-white/60">points</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-white/75">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1 text-[#D4A817]" />
              {player.lastActive}
            </div>
            <Badge
              variant="outline"
              className="text-[#D4A817] border-[rgba(212,168,23,0.3)]"
            >
              Rank #{player.rank}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Table Row Component
  const TableRow = ({ player, index }: { player: Player; index: number }) => (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3 }}
      className="hover:bg-white/5 transition-colors duration-200 border-b border-[rgba(212,168,23,0.08)]"
    >
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
              index < 3
                ? getRankBadgeColor(index + 1)
                : `bg-gradient-to-r ${getCategoryColor(
                    player.category || "Beginners"
                  )}`
            }`}
          >
            {index < 3 ? getRankIcon(index + 1) : player.rank}
          </div>
          <div>
            <div className="font-semibold text-white">{player.name}</div>
            <div className="text-sm text-white/75">{player.location}</div>
            {player.category && (
              <Badge
                variant="outline"
                className={`text-xs mt-1 bg-gradient-to-r ${getCategoryColor(
                  player.category
                )} text-white border-0`}
              >
                {player.category}
              </Badge>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-right">
          <div className="font-bold text-[#D4A817] text-lg">
            {player.points.toLocaleString()}
          </div>
          <div className="text-sm text-white/60">points</div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-white/75">{player.lastActive}</td>
    </motion.tr>
  );

  return (
    <div className="point-system-page bg-gradient-to-b from-[#252015] to-[#1C1810] py-8 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - gold accent to match homepage */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#D4A817] via-[#F9D923] to-[#D4A817] rounded-full flex items-center justify-center mr-6 shadow-[0_0_32px_rgba(249,217,35,0.4)]">
              <Trophy className="w-10 h-10 text-[#121212]" />
            </div>
            <div>
              <motion.h1
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="text-4xl sm:text-5xl lg:text-6xl text-[#F9D923] font-bold mb-2 drop-shadow-[0_0_20px_rgba(249,217,35,0.3)]"
              >
                Point System
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg sm:text-xl text-white/75 font-light"
              >
                Comprehensive Padel Player Rankings
              </motion.p>
            </div>
          </div>
        </motion.div>

        {/* Ranking System Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-[#1A1612]/90 rounded-xl p-4 border border-[rgba(212,168,23,0.12)] shadow-[0_18px_40px_rgba(15,23,42,0.9)]">
            <div className="flex items-center space-x-4">
              <span
                className={`text-sm font-medium ${
                  rankingSystem === "port-said"
                    ? "text-[#D4A817]"
                    : "text-white/50"
                }`}
              >
                Port Said Rankings
              </span>
              <button
                onClick={() =>
                  setRankingSystem(
                    rankingSystem === "port-said" ? "egypt" : "port-said"
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:ring-offset-2 focus:ring-offset-[#252015] ${
                  rankingSystem === "egypt" ? "bg-[#D4A817]" : "bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rankingSystem === "egypt"
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium ${
                  rankingSystem === "egypt" ? "text-[#D4A817]" : "text-white/500"
                }`}
              >
                Egypt Rankings
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8"
        >
          <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] shadow-[0_18px_40px_rgba(15,23,42,0.9)]">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[rgba(212,168,23,0.15)] rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-[#D4A817]" />
              </div>
              <h3 className="text-sm font-medium text-white/75 mb-1">
                Total Players
              </h3>
              <p className="text-2xl font-bold text-white">
                {stats.totalPlayers}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] shadow-[0_18px_40px_rgba(15,23,42,0.9)]">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[rgba(212,168,23,0.15)] rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="h-6 w-6 text-[#D4A817]" />
              </div>
              <h3 className="text-sm font-medium text-white/75 mb-1">
                Top Player
              </h3>
              <p className="text-lg font-bold text-white">
                {stats.topPlayer}
              </p>
              <p className="text-sm text-[#D4A817]">{stats.topPoints} pts</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Filter for Port Said */}
        {rankingSystem === "port-said" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-6"
          >
            <div className="flex justify-center">
              <Tabs
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <TabsList className="bg-[#1A1612]/90 border border-[rgba(212,168,23,0.12)]">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-[#D4A817] data-[state=active]:text-[#121212] data-[state=inactive]:text-white/75"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="C"
                    className="data-[state=active]:bg-[#D4A817] data-[state=active]:text-[#121212] data-[state=inactive]:text-white/75"
                  >
                    C
                  </TabsTrigger>
                  <TabsTrigger
                    value="D"
                    className="data-[state=active]:bg-[#D4A817] data-[state=active]:text-[#121212] data-[state=inactive]:text-white/75"
                  >
                    D
                  </TabsTrigger>
                  <TabsTrigger
                    value="LOW D"
                    className="data-[state=active]:bg-[#D4A817] data-[state=active]:text-[#121212] data-[state=inactive]:text-white/75"
                  >
                    LOW D
                  </TabsTrigger>
                  <TabsTrigger
                    value="Beginners"
                    className="data-[state=active]:bg-[#D4A817] data-[state=active]:text-[#121212] data-[state=inactive]:text-white/75"
                  >
                    Beginners
                  </TabsTrigger>
                  <TabsTrigger
                    value="Juniors"
                    className="data-[state=active]:bg-[#D4A817] data-[state=active]:text-[#121212] data-[state=inactive]:text-white/75"
                  >
                    Juniors
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </motion.div>
        )}

        {/* Search and Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 bg-[#1A1612]/90 border-[rgba(212,168,23,0.2)] text-white placeholder:text-white/50 hover:border-[rgba(212,168,23,0.5)] hover:shadow-[0_0_0_1px_rgba(212,168,23,0.2)] focus:border-[#D4A817] focus:ring-[#D4A817]/40 focus:shadow-[0_0_0_3px_rgba(212,168,23,0.25)] focus-visible:shadow-[0_0_0_3px_rgba(212,168,23,0.25)]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-[#D4A817]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <Tabs
                value={sortBy}
                onValueChange={(value) => setSortBy(value as any)}
              >
                <TabsList className="bg-[#1A1612]/90 border border-[rgba(212,168,23,0.12)]">
                  <TabsTrigger
                    value="rank"
                    className="data-[state=active]:bg-[#D4A817] data-[state=active]:text-[#121212] data-[state=inactive]:text-white/75"
                  >
                    Rank
                  </TabsTrigger>

                  <TabsTrigger
                    value="name"
                    className="data-[state=active]:bg-[#D4A817] data-[state=active]:text-[#121212] data-[state=inactive]:text-white/75"
                  >
                    Name
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex bg-[#1A1612]/90 border border-[rgba(212,168,23,0.12)] rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={
                    viewMode === "grid"
                      ? "bg-[#D4A817] text-[#121212] font-semibold"
                      : "text-white/75 hover:text-white"
                  }
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={
                    viewMode === "table"
                      ? "bg-[#D4A817] text-[#121212] font-semibold"
                      : "text-white/75 hover:text-white"
                  }
                >
                  Table
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Players Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPlayers.map((player, index) => (
                <PlayerCard key={player.id} player={player} index={index} />
              ))}
            </div>
          ) : (
            <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] shadow-[0_18px_40px_rgba(15,23,42,0.9)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[rgba(212,168,23,0.08)] border-b border-[rgba(212,168,23,0.12)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Player
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">
                        Points
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Last Active
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((player, index) => (
                      <TableRow key={player.id} player={player} index={index} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function Page() {
  const t = useTranslations("en");
  return (
    <>
      <Navbar />
      <PointSystem t={t} />
    </>
  );
}
