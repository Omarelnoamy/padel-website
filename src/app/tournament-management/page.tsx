"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Trophy,
  Users,
  Shuffle,
  CheckCircle,
  Crown,
  Zap,
  Star,
  ArrowRight,
  Settings,
  Play,
  Award,
  Medal,
  Sparkles,
  RotateCcw,
  Target,
  Edit3,
  Save,
  X,
  Move,
  AlertTriangle,
  Eye,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Translations, useTranslations } from "@/app/translations";
import { ImageWithFallback } from "@/app/figma/ImageWithFallback";
import { SportsPoster } from "@/components/SportsPoster";
import Navbar from "@/components/Navbar";

// Seeded pseudo-random number generator for consistent SSR/CSR
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface TournamentManagementProps {
  t: Translations;
  onPageChange: (page: string) => void;
  tournamentId: string;
}

interface Team {
  id: number;
  player1: string;
  player2: string;
  totalPoints: number;
  groupId?: string;
  groupRank?: number;
  seed?: number;
  qualified?: boolean;
  player1Photo?: string;
  player2Photo?: string;
  category?: string;
}

interface Group {
  id: string;
  name: string;
  color: string;
  teams: Team[];
  rankingsSet: boolean;
}

interface Match {
  id: string;
  team1: Team | null;
  team2: Team | null;
  winner?: Team;
  round: "quarterfinals" | "semifinals" | "final";
  position: number;
  completed?: boolean;
}

// Player photos pool
const playerPhotos = [
  "https://images.unsplash.com/photo-1716041040048-228dbae7b6ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwYWRlbCUyMHBsYXllciUyMGF0aGxldGV8ZW58MXx8fHwxNzU4NDgxNzU5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1711290453815-43c5651e8ac8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZW5uaXMlMjBwbGF5ZXIlMjBhdGhsZXRlJTIwc3BvcnRzfGVufDF8fHx8MTc1ODQ4MTc2Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1660463530535-b8ba6a79ee37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdGhsZXRlJTIwc3BvcnRzJTIwcGxheWVyJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzU4NDgxNzY1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1633707167755-a1df2c727d40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBhdGhsZXRlJTIwbWFsZSUyMHBvcnRyYWl0fGVufDF8fHx8MTc1ODQ3NzQ2NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
];

// Get player photo with predictable distribution
const getPlayerPhoto = (index: number) =>
  playerPhotos[index % playerPhotos.length];

// All registered teams from the tournament (to be loaded from API)
const registeredTeams: Team[] = [];

const groupColors = [
  { id: "A", name: "Group A", color: "from-blue-500 to-blue-700" },
  { id: "B", name: "Group B", color: "from-green-500 to-green-700" },
  { id: "C", name: "Group C", color: "from-red-500 to-red-700" },
  { id: "D", name: "Group D", color: "from-purple-500 to-purple-700" },
  { id: "E", name: "Group E", color: "from-yellow-500 to-yellow-700" },
  { id: "F", name: "Group F", color: "from-pink-500 to-pink-700" },
  { id: "G", name: "Group G", color: "from-indigo-500 to-indigo-700" },
  { id: "H", name: "Group H", color: "from-teal-500 to-teal-700" },
];

function TournamentManagement({
  t,
  onPageChange,
  tournamentId,
}: TournamentManagementProps) {
  const [currentStage, setCurrentStage] = useState<
    "setup" | "groups" | "knockout"
  >("setup");
  const [numberOfGroups, setNumberOfGroups] = useState<number>(4);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsGenerated, setGroupsGenerated] = useState(false);
  const [groupsConfirmed, setGroupsConfirmed] = useState(false);
  const [draggedTeam, setDraggedTeam] = useState<Team | null>(null);
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);
  const [moveDetails, setMoveDetails] = useState<{
    team: Team;
    fromGroup: string;
    toGroup: string;
  } | null>(null);
  const [showRankingDialog, setShowRankingDialog] = useState(false);
  const [currentGroupForRanking, setCurrentGroupForRanking] =
    useState<string>("");
  const [tempRankings, setTempRankings] = useState<{
    [teamId: number]: number;
  }>({});
  const [knockoutMatches, setKnockoutMatches] = useState<Match[]>([]);
  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);
  const [currentKnockoutRound, setCurrentKnockoutRound] = useState<
    "quarterfinals" | "semifinals" | "final"
  >("quarterfinals");
  const [showTeamReveal, setShowTeamReveal] = useState(false);
  const [selectedTeamForReveal, setSelectedTeamForReveal] =
    useState<Team | null>(null);
  const [draggedKnockoutTeam, setDraggedKnockoutTeam] = useState<Team | null>(
    null
  );
  const [isSpinningWheel, setIsSpinningWheel] = useState(false);
  const [tournamentWinner, setTournamentWinner] = useState<Team | null>(null);
  const [showWinnerCelebration, setShowWinnerCelebration] = useState(false);
  const [showWinnersPopup, setShowWinnersPopup] = useState(false);

  const tournament = {
    name: "Ayman's Elite Tournament 2024",
    totalTeams: registeredTeams.length,
  };

  // Generate groups with fairness rules and equal distribution
  const generateGroups = () => {
    // Sort teams by ranking (highest points first)
    const sortedTeams = [...registeredTeams].sort(
      (a, b) => b.totalPoints - a.totalPoints
    );

    // Calculate teams per group for equal distribution
    const teamsPerGroup = Math.floor(sortedTeams.length / numberOfGroups);
    const extraTeams = sortedTeams.length % numberOfGroups;

    // Create empty groups
    const newGroups: Group[] = [];
    for (let i = 0; i < numberOfGroups; i++) {
      newGroups.push({
        id: groupColors[i].id,
        name: groupColors[i].name,
        color: groupColors[i].color,
        teams: [],
        rankingsSet: false,
      });
    }

    // Separate top teams for fair distribution (top 2 teams in different groups)
    const topTeams = sortedTeams.slice(0, Math.min(2, numberOfGroups));
    const remainingTeams = sortedTeams.slice(topTeams.length);

    // Shuffle remaining teams for randomness
    for (let i = remainingTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingTeams[i], remainingTeams[j]] = [
        remainingTeams[j],
        remainingTeams[i],
      ];
    }

    // Combine top teams with shuffled remaining teams
    const allTeamsToDistribute = [...topTeams, ...remainingTeams];

    // Distribute teams ensuring equal numbers per group
    let teamIndex = 0;

    // First, give each group the base number of teams
    for (let round = 0; round < teamsPerGroup; round++) {
      for (let groupIndex = 0; groupIndex < numberOfGroups; groupIndex++) {
        if (teamIndex < allTeamsToDistribute.length) {
          // For the first round, ensure top 2 teams don't go to same group
          if (round === 0 && teamIndex < 2) {
            // Skip if this would put top 2 teams in same group
            const targetGroup = newGroups[groupIndex];
            const hasTopTeam = targetGroup.teams.some((team) =>
              topTeams.some((topTeam) => topTeam.id === team.id)
            );

            if (hasTopTeam && teamIndex === 1) {
              // Find next available group for second top team
              const availableGroupIndex = newGroups.findIndex(
                (group) =>
                  !group.teams.some((team) =>
                    topTeams.some((topTeam) => topTeam.id === team.id)
                  )
              );
              if (availableGroupIndex !== -1) {
                newGroups[availableGroupIndex].teams.push({
                  ...allTeamsToDistribute[teamIndex],
                  groupId: newGroups[availableGroupIndex].id,
                });
              } else {
                newGroups[groupIndex].teams.push({
                  ...allTeamsToDistribute[teamIndex],
                  groupId: newGroups[groupIndex].id,
                });
              }
            } else {
              newGroups[groupIndex].teams.push({
                ...allTeamsToDistribute[teamIndex],
                groupId: newGroups[groupIndex].id,
              });
            }
          } else {
            newGroups[groupIndex].teams.push({
              ...allTeamsToDistribute[teamIndex],
              groupId: newGroups[groupIndex].id,
            });
          }
          teamIndex++;
        }
      }
    }

    // Distribute extra teams to first few groups
    for (
      let i = 0;
      i < extraTeams && teamIndex < allTeamsToDistribute.length;
      i++
    ) {
      newGroups[i].teams.push({
        ...allTeamsToDistribute[teamIndex],
        groupId: newGroups[i].id,
      });
      teamIndex++;
    }

    setGroups(newGroups);
    setGroupsGenerated(true);
  };

  // Handle team reveal
  const handleTeamReveal = (team: Team) => {
    setSelectedTeamForReveal(team);
    setShowTeamReveal(true);
  };

  // Handle drag and drop
  const handleDragStart = (team: Team) => {
    setDraggedTeam(team);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    if (!draggedTeam) return;

    const fromGroup = groups.find((g) =>
      g.teams.some((t) => t.id === draggedTeam.id)
    );
    const toGroup = groups.find((g) => g.id === targetGroupId);

    if (fromGroup && toGroup && fromGroup.id !== toGroup.id) {
      setMoveDetails({
        team: draggedTeam,
        fromGroup: fromGroup.name,
        toGroup: toGroup.name,
      });
      setShowMoveConfirmation(true);
    }
    setDraggedTeam(null);
  };

  const confirmTeamMove = () => {
    if (!moveDetails) return;

    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.teams.some((t) => t.id === moveDetails.team.id)) {
          // Remove from source group
          return {
            ...group,
            teams: group.teams.filter((t) => t.id !== moveDetails.team.id),
          };
        } else if (group.name === moveDetails.toGroup) {
          // Add to target group
          return {
            ...group,
            teams: [...group.teams, { ...moveDetails.team, groupId: group.id }],
          };
        }
        return group;
      })
    );

    setShowMoveConfirmation(false);
    setMoveDetails(null);
  };

  // Set team rankings in group
  const handleSetGroupRankings = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      setCurrentGroupForRanking(groupId);
      const rankings: { [teamId: number]: number } = {};
      group.teams.forEach((team, index) => {
        rankings[team.id] = team.groupRank || index + 1;
      });
      setTempRankings(rankings);
      setShowRankingDialog(true);
    }
  };

  const moveTeamRanking = (teamId: number, direction: "up" | "down") => {
    const currentRank = tempRankings[teamId];
    const targetRank = direction === "up" ? currentRank - 1 : currentRank + 1;

    if (targetRank < 1 || targetRank > Object.keys(tempRankings).length) return;

    const swapTeamId = Object.keys(tempRankings).find(
      (id) => tempRankings[parseInt(id)] === targetRank
    );

    if (swapTeamId) {
      setTempRankings((prev) => ({
        ...prev,
        [teamId]: targetRank,
        [parseInt(swapTeamId)]: currentRank,
      }));
    }
  };

  const confirmGroupRankings = () => {
    setGroups((prevGroups) =>
      prevGroups.map((group) =>
        group.id === currentGroupForRanking
          ? {
              ...group,
              rankingsSet: true,
              teams: group.teams.map((team) => ({
                ...team,
                groupRank: tempRankings[team.id],
                qualified: tempRankings[team.id] <= 2, // Top 2 qualify
                seed: tempRankings[team.id],
              })),
            }
          : group
      )
    );

    setShowRankingDialog(false);
    setTempRankings({});
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />;
      case 3:
        return <Award className="w-4 h-4 text-orange-500" />;
      default:
        return <Target className="w-4 h-4 text-gray-500" />;
    }
  };

  // Generate knockout bracket with complete randomization
  const generateKnockoutBracket = async () => {
    setIsGeneratingBracket(true);

    // Simulate generation time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get all qualified teams
    const qualifiedTeams = groups.flatMap((group) =>
      group.teams.filter((team) => team.qualified)
    );

    // Completely shuffle all qualified teams for random matchups
    const shuffledTeams = [...qualifiedTeams];
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeams[i], shuffledTeams[j]] = [
        shuffledTeams[j],
        shuffledTeams[i],
      ];
    }

    // Create matches from shuffled teams
    const matches: Match[] = [];
    let matchId = 1;

    // Pair teams randomly (every 2 teams make a match)
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        matches.push({
          id: `match-${matchId++}`,
          team1: shuffledTeams[i],
          team2: shuffledTeams[i + 1],
          round: "quarterfinals",
          position: matches.length + 1,
          completed: false,
        });
      }
    }

    // If odd number of teams, the last team gets a bye (or pair with a placeholder)
    if (shuffledTeams.length % 2 === 1) {
      matches.push({
        id: `match-${matchId++}`,
        team1: shuffledTeams[shuffledTeams.length - 1],
        team2: null, // Bye round
        round: "quarterfinals",
        position: matches.length + 1,
        completed: true,
        winner: shuffledTeams[shuffledTeams.length - 1],
      });
    }

    setKnockoutMatches(matches);
    setCurrentKnockoutRound("quarterfinals");
    setIsGeneratingBracket(false);
  };

  // Handle knockout team drag and drop
  const handleKnockoutDragStart = (team: Team) => {
    setDraggedKnockoutTeam(team);
  };

  const handleKnockoutDrop = (
    e: React.DragEvent,
    targetMatchId: string,
    targetPosition: "team1" | "team2"
  ) => {
    e.preventDefault();
    if (!draggedKnockoutTeam) return;

    setKnockoutMatches((prevMatches) => {
      // Find source position of dragged team
      let sourceMatchId = "";
      let sourcePosition: "team1" | "team2" | null = null;

      prevMatches.forEach((match) => {
        if (match.team1?.id === draggedKnockoutTeam.id) {
          sourceMatchId = match.id;
          sourcePosition = "team1";
        } else if (match.team2?.id === draggedKnockoutTeam.id) {
          sourceMatchId = match.id;
          sourcePosition = "team2";
        }
      });

      // Find target position team (if any)
      const targetMatch = prevMatches.find(
        (match) => match.id === targetMatchId
      );
      const targetTeam =
        targetPosition === "team1" ? targetMatch?.team1 : targetMatch?.team2;

      // Update matches with team swapping
      return prevMatches.map((match) => {
        if (match.id === sourceMatchId && match.id === targetMatchId) {
          // Same match - swap positions
          const updatedMatch = { ...match };
          if (sourcePosition === "team1" && targetPosition === "team2") {
            updatedMatch.team1 = targetTeam || null;
            updatedMatch.team2 = draggedKnockoutTeam;
          } else if (sourcePosition === "team2" && targetPosition === "team1") {
            updatedMatch.team1 = draggedKnockoutTeam;
            updatedMatch.team2 = targetTeam || null;
          }
          // Reset match completion if teams changed
          updatedMatch.completed = false;
          updatedMatch.winner = undefined;
          return updatedMatch;
        } else if (match.id === sourceMatchId) {
          // Source match - replace dragged team with target team
          const updatedMatch = { ...match };
          if (sourcePosition === "team1") {
            updatedMatch.team1 = targetTeam || null;
          } else if (sourcePosition === "team2") {
            updatedMatch.team2 = targetTeam || null;
          }
          // Reset match completion if teams changed
          updatedMatch.completed = false;
          updatedMatch.winner = undefined;
          return updatedMatch;
        } else if (match.id === targetMatchId) {
          // Target match - place dragged team in target position
          const updatedMatch = { ...match };
          if (targetPosition === "team1") {
            updatedMatch.team1 = draggedKnockoutTeam;
          } else {
            updatedMatch.team2 = draggedKnockoutTeam;
          }
          // Reset match completion if teams changed
          updatedMatch.completed = false;
          updatedMatch.winner = undefined;
          return updatedMatch;
        }
        return match;
      });
    });

    setDraggedKnockoutTeam(null);
  };

  // Set match winner
  const setMatchWinner = (matchId: string, winner: Team) => {
    setKnockoutMatches((prevMatches) =>
      prevMatches.map((match) =>
        match.id === matchId ? { ...match, winner, completed: true } : match
      )
    );

    // If we're in the final, immediately set tournament winner and show popup
    if (currentKnockoutRound === "final") {
      setTournamentWinner(winner);
      setShowWinnerCelebration(true);
      setShowWinnersPopup(true);
    }
  };

  // Generate next round with spinning wheel
  const generateNextRound = async () => {
    setIsSpinningWheel(true);

    // Get winners from current round
    const currentRoundMatches = knockoutMatches.filter(
      (match) => match.round === currentKnockoutRound
    );
    const winners = currentRoundMatches
      .filter((match) => match.winner)
      .map((match) => match.winner!);

    if (winners.length < 2) {
      setIsSpinningWheel(false);
      return;
    }

    // Simulate spinning wheel
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Determine next round
    let nextRound: "semifinals" | "final";
    if (currentKnockoutRound === "quarterfinals") {
      nextRound = "semifinals";
    } else {
      nextRound = "final";
    }

    // If it's the final and we have a winner
    if (nextRound === "final" && winners.length === 1) {
      setTournamentWinner(winners[0]);
      setShowWinnerCelebration(true);
      setShowWinnersPopup(true);
      setIsSpinningWheel(false);
      return;
    }

    // Shuffle winners for random pairing
    const shuffledWinners = [...winners];
    for (let i = shuffledWinners.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledWinners[i], shuffledWinners[j]] = [
        shuffledWinners[j],
        shuffledWinners[i],
      ];
    }

    // Create next round matches
    const nextRoundMatches: Match[] = [];
    let matchId = knockoutMatches.length + 1;

    for (let i = 0; i < shuffledWinners.length; i += 2) {
      if (i + 1 < shuffledWinners.length) {
        nextRoundMatches.push({
          id: `match-${matchId++}`,
          team1: shuffledWinners[i],
          team2: shuffledWinners[i + 1],
          round: nextRound,
          position: nextRoundMatches.length + 1,
          completed: false,
        });
      } else if (shuffledWinners.length === 1) {
        // Single winner (final)
        setTournamentWinner(shuffledWinners[0]);
        setShowWinnerCelebration(true);
        setShowWinnersPopup(true);
        setIsSpinningWheel(false);
        return;
      }
    }

    setKnockoutMatches((prev) => [...prev, ...nextRoundMatches]);
    setCurrentKnockoutRound(nextRound);
    setIsSpinningWheel(false);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 py-2 sm:py-4 lg:py-8 px-2 sm:px-4 lg:px-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => {
          const seededRandom = mulberry32(i + 1000);
          const width = seededRandom() * 300 + 100;
          const height = seededRandom() * 300 + 100;
          const left = seededRandom() * 100;
          const top = seededRandom() * 100;
          const animateX = seededRandom() * 100 - 50;
          const animateY = seededRandom() * 100 - 50;
          const duration = seededRandom() * 10 + 10;

          return (
            <motion.div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-blue-400/5 to-purple-400/5 blur-xl"
              style={{
                width,
                height,
                left: left + "%",
                top: top + "%",
              }}
              animate={{
                x: [0, animateX],
                y: [0, animateY],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-4 sm:mb-6 lg:mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => onPageChange("admin")}
            className="text-white hover:bg-white/10 border border-white/30 mb-3 sm:mb-4 lg:mb-6 text-sm sm:text-base"
          >
            <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Back to Tournaments Page
          </Button>

          <div className="text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center mb-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4 sm:mb-0 sm:mr-4 shadow-xl"
              >
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
                  Tournament Generator
                </h1>
                <p className="text-lg sm:text-xl lg:text-2xl text-blue-200">
                  {tournament.name}
                </p>
                <p className="text-sm sm:text-base lg:text-lg text-gray-300">
                  {tournament.totalTeams} Registered Teams
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stage Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4 sm:mb-6 lg:mb-8 text-center"
        >
          <div className="inline-flex bg-white/10 backdrop-blur-xl rounded-xl p-1 sm:p-2 border border-white/20 overflow-x-auto w-full sm:w-auto">
            <Button
              variant={currentStage === "setup" ? "default" : "ghost"}
              onClick={() => setCurrentStage("setup")}
              className={`px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg transition-all duration-300 text-xs sm:text-sm lg:text-base whitespace-nowrap flex-1 sm:flex-none ${
                currentStage === "setup"
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg transform scale-105"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Setup Groups</span>
              <span className="xs:hidden">Setup</span>
            </Button>
            <Button
              variant={currentStage === "groups" ? "default" : "ghost"}
              onClick={() => setCurrentStage("groups")}
              disabled={!groupsGenerated}
              className={`px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg transition-all duration-300 text-xs sm:text-sm lg:text-base whitespace-nowrap flex-1 sm:flex-none ${
                currentStage === "groups"
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg transform scale-105"
                  : "text-white hover:bg-white/10 disabled:opacity-50"
              }`}
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Manage Groups</span>
              <span className="xs:hidden">Groups</span>
            </Button>
            <Button
              variant={currentStage === "knockout" ? "default" : "ghost"}
              onClick={() => setCurrentStage("knockout")}
              disabled={!groupsConfirmed}
              className={`px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg transition-all duration-300 text-xs sm:text-sm lg:text-base whitespace-nowrap flex-1 sm:flex-none ${
                currentStage === "knockout"
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg transform scale-105"
                  : "text-white hover:bg-white/10 disabled:opacity-50"
              }`}
            >
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2" />
              <span className="xs:inline">Knockout Stage</span>
            </Button>
          </div>
        </motion.div>

        {/* Setup Stage */}
        <AnimatePresence mode="wait">
          {currentStage === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-white/10 backdrop-blur-xl border-white/20 mb-8">
                <CardHeader>
                  <CardTitle className="text-white text-center text-xl sm:text-2xl lg:text-3xl">
                    <Zap className="w-6 h-6 sm:w-8 sm:h-8 inline mr-3 text-yellow-400" />
                    Generate Tournament Groups
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-8">
                  {/* Group Count Selection */}
                  <div className="text-center space-y-4">
                    <h3 className="text-lg sm:text-xl text-white mb-4">
                      How many groups do you want?
                    </h3>
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <span className="text-blue-200">Number of Groups:</span>
                      <Select
                        value={numberOfGroups.toString()}
                        onValueChange={(value) =>
                          setNumberOfGroups(parseInt(value))
                        }
                      >
                        <SelectTrigger className="w-full sm:w-32 bg-white/10 border-white/30 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                            <SelectItem
                              key={num}
                              value={num.toString()}
                              className="text-white hover:bg-slate-700"
                            >
                              {num} Groups
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-gray-300">
                      {Math.floor(tournament.totalTeams / numberOfGroups)} teams
                      per group
                      {tournament.totalTeams % numberOfGroups > 0 &&
                        ` (${
                          tournament.totalTeams % numberOfGroups
                        } groups will have +1 team)`}
                    </div>
                  </div>

                  {/* Fairness Rules Display */}
                  <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 sm:p-6">
                    <h4 className="text-blue-200 mb-4 flex items-center">
                      <Star className="w-5 h-5 mr-2" />
                      Tournament Fairness Rules
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">
                          Top 2 ranked teams will be placed in different groups
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">
                          Remaining teams distributed randomly
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">
                          Each group will have similar skill level distribution
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">
                          You can manually adjust teams after generation
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="text-center">
                    <Button
                      onClick={generateGroups}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 sm:px-12 py-3 sm:py-4 text-lg sm:text-xl rounded-xl shadow-lg shadow-green-500/25 transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                    >
                      <Shuffle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                      Generate Groups
                    </Button>
                  </div>

                  {groupsGenerated && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center"
                    >
                      <Alert className="bg-green-500/20 border-green-400/30 max-w-md mx-auto">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <AlertDescription className="text-green-200">
                          Groups generated successfully! Click "Manage Groups"
                          to continue.
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Groups Management Stage */}
          {currentStage === "groups" && (
            <motion.div
              key="groups"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Groups Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {groups.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groups.map((group, groupIndex) => (
                        <Card
                          key={group.id}
                          className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-white/20 backdrop-blur-sm p-1 shadow-xl"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, group.id)}
                        >
                          <div className="bg-white/10 backdrop-blur-xl rounded-lg h-full border border-white/20">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-white text-center flex items-center justify-between">
                                <span className="text-lg">{group.name}</span>
                                {group.rankingsSet && (
                                  <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Ranked
                                  </Badge>
                                )}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 px-4">
                              {group.teams
                                .sort((a, b) => {
                                  if (group.rankingsSet) {
                                    return (
                                      (a.groupRank || 999) -
                                      (b.groupRank || 999)
                                    );
                                  }
                                  return b.totalPoints - a.totalPoints;
                                })
                                .map((team, teamIndex) => (
                                  <motion.div
                                    key={team.id}
                                    draggable
                                    onDragStart={() => handleDragStart(team)}
                                    className={`p-3 rounded-lg border transition-all duration-300 cursor-move hover:scale-105 ${
                                      group.rankingsSet && team.qualified
                                        ? "bg-green-500/20 border-green-400/30 shadow-lg"
                                        : group.rankingsSet && !team.qualified
                                        ? "bg-red-500/10 border-red-400/20"
                                        : "bg-white/10 border-white/20 hover:bg-white/20"
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <div className="flex items-center space-x-1 flex-shrink-0">
                                          {group.rankingsSet &&
                                            getRankIcon(
                                              team.groupRank || teamIndex + 1
                                            )}
                                          <span className="text-white font-bold text-sm">
                                            #
                                            {group.rankingsSet
                                              ? team.groupRank
                                              : teamIndex + 1}
                                          </span>
                                          <Move className="w-3 h-3 text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-white font-medium text-xs truncate">
                                            {team.player1} & {team.player2}
                                          </div>
                                          <div className="text-xs text-gray-300">
                                            {team.totalPoints} pts •{" "}
                                            {team.category}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-1 flex-shrink-0">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleTeamReveal(team);
                                          }}
                                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 p-1 h-auto"
                                        >
                                          <Eye className="w-3 h-3" />
                                        </Button>
                                        {group.rankingsSet &&
                                          team.qualified && (
                                            <Badge className="bg-green-500 text-white text-xs">
                                              <Sparkles className="w-3 h-3 mr-1" />
                                              Qualified
                                            </Badge>
                                          )}
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}

                              <Button
                                onClick={() => handleSetGroupRankings(group.id)}
                                className={`w-full mt-3 text-sm ${
                                  group.rankingsSet
                                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                    : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                                } text-black font-bold py-2 rounded-lg transition-all duration-300 transform hover:scale-105`}
                              >
                                {group.rankingsSet ? (
                                  <>
                                    <Edit3 className="w-3 h-3 mr-2" />
                                    Edit Rankings
                                  </>
                                ) : (
                                  <>
                                    <Settings className="w-3 h-3 mr-2" />
                                    Set Rankings
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Alert className="bg-yellow-500/20 border-yellow-400/30 max-w-md mx-auto">
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                        <AlertDescription className="text-yellow-200">
                          No groups generated yet. Please generate groups first.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {groups.length > 0 && !groupsConfirmed && (
                    <div className="text-center pt-4">
                      <Button
                        onClick={() => setGroupsConfirmed(true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirm Groups
                      </Button>
                    </div>
                  )}

                  {groupsConfirmed && (
                    <div className="text-center pt-4">
                      <Alert className="bg-green-500/20 border-green-400/30 max-w-md mx-auto">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <AlertDescription className="text-green-200">
                          Groups confirmed! You can now proceed to the knockout
                          stage.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Knockout Stage */}
          {currentStage === "knockout" && (
            <motion.div
              key="knockout"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Trophy className="mr-2 h-5 w-5" />
                    Knockout Stage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {knockoutMatches.length === 0 ? (
                    <div className="text-center max-w-4xl mx-auto">
                      {/* Qualified Teams Preview */}
                      <div className="mb-8">
                        <h3 className="text-xl font-bold text-white mb-6">
                          Qualified Teams
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          {groups
                            .flatMap((group) =>
                              group.teams.filter((team) => team.qualified)
                            )
                            .map((team, index) => (
                              <motion.div
                                key={team.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className={`p-4 rounded-lg border cursor-pointer hover:scale-105 transition-all ${
                                  team.seed === 1
                                    ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30"
                                    : "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/30"
                                }`}
                                onClick={() => handleTeamReveal(team)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    {getRankIcon(team.seed || 1)}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-white font-medium text-sm truncate">
                                        {team.player1} & {team.player2}
                                      </div>
                                      <div className="text-xs text-gray-300">
                                        Group {team.groupId} -{" "}
                                        {team.seed === 1
                                          ? "Winner"
                                          : "Runner-up"}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    <Eye className="w-4 h-4 text-blue-400" />
                                    <Badge
                                      className={
                                        team.seed === 1
                                          ? "bg-yellow-500 text-black text-xs"
                                          : "bg-blue-500 text-white text-xs"
                                      }
                                    >
                                      Qualified
                                    </Badge>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg text-white">
                          Bracket Generation Rules
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-start space-x-2">
                            <Shuffle className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">
                              Completely random matchups every generation
                            </span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">
                              Any team can face any other qualified team
                            </span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <Trophy className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">
                              Group winners can face any runner-up or 3rd place
                            </span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <Star className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">
                              Maximum excitement and unpredictability
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={generateKnockoutBracket}
                        disabled={isGeneratingBracket}
                        className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg shadow-purple-500/25 transform hover:scale-105 transition-all duration-300 w-full sm:w-auto mt-8"
                      >
                        {isGeneratingBracket ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                              className="w-5 h-5 mr-2"
                            >
                              <Trophy className="w-5 h-5" />
                            </motion.div>
                            Generating Bracket...
                          </>
                        ) : (
                          <>
                            <Shuffle className="w-5 h-5 mr-2" />
                            Generate Knockout Bracket
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Current Round Header */}
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {currentKnockoutRound === "quarterfinals" &&
                            "Quarterfinals"}
                          {currentKnockoutRound === "semifinals" &&
                            "Semifinals"}
                          {currentKnockoutRound === "final" && "Final"}
                        </h3>
                        <p className="text-gray-300">
                          {
                            knockoutMatches.filter(
                              (match) => match.round === currentKnockoutRound
                            ).length
                          }{" "}
                          matches
                        </p>
                      </div>

                      {/* Matches Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {knockoutMatches
                          .filter(
                            (match) => match.round === currentKnockoutRound
                          )
                          .map((match, index) => (
                            <motion.div
                              key={match.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6"
                            >
                              <div className="text-center mb-4">
                                <h4 className="text-white font-bold">
                                  Match {match.position}
                                </h4>
                                {match.completed && (
                                  <Badge className="bg-green-500 text-white mt-2">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Completed
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-4">
                                {/* Team 1 */}
                                <div
                                  className={`p-3 sm:p-4 rounded-lg border transition-all cursor-pointer hover:scale-105 ${
                                    match.completed &&
                                    match.winner?.id === match.team1?.id
                                      ? "bg-green-500/20 border-green-400/30 shadow-lg"
                                      : "bg-white/10 border-white/20 hover:bg-white/20"
                                  }`}
                                  draggable={!match.completed}
                                  onDragStart={() =>
                                    match.team1 &&
                                    handleKnockoutDragStart(match.team1)
                                  }
                                  onDrop={(e) =>
                                    handleKnockoutDrop(e, match.id, "team1")
                                  }
                                  onDragOver={(e) => e.preventDefault()}
                                  onClick={() =>
                                    match.team1 &&
                                    !match.completed &&
                                    setMatchWinner(match.id, match.team1)
                                  }
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                      {match.completed &&
                                        match.winner?.id ===
                                          match.team1?.id && (
                                          <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                                        )}
                                      <div className="min-w-0 flex-1">
                                        <div className="text-white font-medium text-sm sm:text-base truncate">
                                          {match.team1
                                            ? `${match.team1.player1} & ${match.team1.player2}`
                                            : "TBD"}
                                        </div>
                                        {match.team1 && (
                                          <div className="text-xs sm:text-sm text-gray-300">
                                            {match.team1.totalPoints} pts •
                                            Group {match.team1.groupId}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {match.completed &&
                                      match.winner?.id === match.team1?.id && (
                                        <Badge className="bg-green-500 text-white text-xs sm:text-sm flex-shrink-0">
                                          Winner
                                        </Badge>
                                      )}
                                  </div>
                                </div>

                                {/* VS */}
                                <div className="text-center">
                                  <div className="text-white font-bold text-lg">
                                    VS
                                  </div>
                                </div>

                                {/* Team 2 */}
                                <div
                                  className={`p-3 sm:p-4 rounded-lg border transition-all cursor-pointer hover:scale-105 ${
                                    match.completed &&
                                    match.winner?.id === match.team2?.id
                                      ? "bg-green-500/20 border-green-400/30 shadow-lg"
                                      : "bg-white/10 border-white/20 hover:bg-white/20"
                                  }`}
                                  draggable={!match.completed}
                                  onDragStart={() =>
                                    match.team2 &&
                                    handleKnockoutDragStart(match.team2)
                                  }
                                  onDrop={(e) =>
                                    handleKnockoutDrop(e, match.id, "team2")
                                  }
                                  onDragOver={(e) => e.preventDefault()}
                                  onClick={() =>
                                    match.team2 &&
                                    !match.completed &&
                                    setMatchWinner(match.id, match.team2)
                                  }
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                      {match.completed &&
                                        match.winner?.id ===
                                          match.team2?.id && (
                                          <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                                        )}
                                      <div className="min-w-0 flex-1">
                                        <div className="text-white font-medium text-sm sm:text-base truncate">
                                          {match.team2
                                            ? `${match.team2.player1} & ${match.team2.player2}`
                                            : "TBD"}
                                        </div>
                                        {match.team2 && (
                                          <div className="text-xs sm:text-sm text-gray-300">
                                            {match.team2.totalPoints} pts •
                                            Group {match.team2.groupId}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {match.completed &&
                                      match.winner?.id === match.team2?.id && (
                                        <Badge className="bg-green-500 text-white text-xs sm:text-sm flex-shrink-0">
                                          Winner
                                        </Badge>
                                      )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                      </div>

                      {/* Next Round Button */}
                      {knockoutMatches
                        .filter((match) => match.round === currentKnockoutRound)
                        .every((match) => match.completed) &&
                        currentKnockoutRound !== "final" && (
                          <div className="text-center">
                            <Button
                              onClick={generateNextRound}
                              disabled={isSpinningWheel}
                              className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg shadow-yellow-500/25 transform hover:scale-105 transition-all duration-300"
                            >
                              {isSpinningWheel ? (
                                <>
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                      duration: 1,
                                      repeat: Infinity,
                                      ease: "linear",
                                    }}
                                    className="w-5 h-5 mr-2"
                                  >
                                    <Trophy className="w-5 h-5" />
                                  </motion.div>
                                  Generating Next Round...
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="w-5 h-5 mr-2" />
                                  Generate Next Round
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                      {/* Tournament Winner */}
                      {tournamentWinner && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-xl p-4 sm:p-6 lg:p-8"
                        >
                          <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 mx-auto mb-3 sm:mb-4" />
                          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
                            Tournament Champion!
                          </h3>
                          <div className="text-lg sm:text-xl text-yellow-300 mb-3 sm:mb-4">
                            {tournamentWinner.player1} &{" "}
                            {tournamentWinner.player2}
                          </div>
                          <div className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">
                            {tournamentWinner.totalPoints} points • Group{" "}
                            {tournamentWinner.groupId}
                          </div>
                          <Button
                            onClick={() => setShowWinnersPopup(true)}
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400 font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg text-sm sm:text-base"
                          >
                            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            View Winners Poster
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Move Confirmation Dialog */}
        <Dialog
          open={showMoveConfirmation}
          onOpenChange={setShowMoveConfirmation}
        >
          <DialogContent className="max-w-md bg-slate-800 border-slate-600">
            <DialogHeader>
              <DialogTitle className="text-white">
                Confirm Team Move
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Are you sure you want to move this team?
              </DialogDescription>
            </DialogHeader>
            {moveDetails && (
              <div className="space-y-4">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <div className="text-white font-medium">
                    {moveDetails.team.player1} & {moveDetails.team.player2}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    From: {moveDetails.fromGroup} → To: {moveDetails.toGroup}
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowMoveConfirmation(false)}
                    className="text-white border-white/30 hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmTeamMove}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Confirm Move
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Group Rankings Dialog */}
        <Dialog open={showRankingDialog} onOpenChange={setShowRankingDialog}>
          <DialogContent className="max-w-2xl bg-slate-800 border-slate-600 max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">
                Set Group Rankings
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Drag teams to reorder their final rankings in this group. Top 2
                teams will qualify for knockout stage.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {currentGroupForRanking &&
                groups
                  .find((g) => g.id === currentGroupForRanking)
                  ?.teams.sort(
                    (a, b) =>
                      (tempRankings[a.id] || 1) - (tempRankings[b.id] || 1)
                  )
                  .map((team) => {
                    const ranking = tempRankings[team.id] || 1;
                    const willQualify = ranking <= 2;

                    return (
                      <div
                        key={team.id}
                        className={`p-4 rounded-lg border transition-all ${
                          willQualify
                            ? "bg-green-500/20 border-green-400/30"
                            : "bg-red-500/10 border-red-400/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex flex-col space-y-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveTeamRanking(team.id, "up")}
                                disabled={ranking === 1}
                                className="text-gray-400 hover:text-white p-1 h-auto"
                              >
                                ▲
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveTeamRanking(team.id, "down")}
                                disabled={
                                  ranking === Object.keys(tempRankings).length
                                }
                                className="text-gray-400 hover:text-white p-1 h-auto"
                              >
                                ▼
                              </Button>
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                {getRankIcon(ranking)}
                                <span className="font-bold text-lg">
                                  #{ranking}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-white">
                                  {team.player1} & {team.player2}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {team.totalPoints} points
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {willQualify ? (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Qualifies
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-gray-400 border-gray-500"
                              >
                                Eliminated
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-600">
                <Button
                  variant="outline"
                  onClick={() => setShowRankingDialog(false)}
                  className="text-white border-white/30 hover:bg-white/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={confirmGroupRankings}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Rankings
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Premier League Style Team Reveal Dialog */}
        <Dialog open={showTeamReveal} onOpenChange={setShowTeamReveal}>
          <DialogContent className="max-w-full max-h-full h-screen w-screen bg-black border-0 p-0 overflow-hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>Premier League Style Team Player Reveal</DialogTitle>
              <DialogDescription>
                Premier League style player cards with full-body cutouts and
                skill level gradients
              </DialogDescription>
            </DialogHeader>

            <AnimatePresence>
              {selectedTeamForReveal &&
                (() => {
                  // Skill level color mappings
                  const getSkillLevelGradient = (category: string) => {
                    switch (category) {
                      case "Elite Pro":
                        return {
                          gradient:
                            "from-purple-600 via-purple-500 to-purple-400",
                          glow: "shadow-purple-500/50",
                          accent: "text-purple-300",
                          border: "border-purple-400",
                        };
                      case "Pro":
                        return {
                          gradient: "from-blue-600 via-blue-500 to-blue-400",
                          glow: "shadow-blue-500/50",
                          accent: "text-blue-300",
                          border: "border-blue-400",
                        };
                      case "Advanced":
                        return {
                          gradient: "from-green-600 via-green-500 to-green-400",
                          glow: "shadow-green-500/50",
                          accent: "text-green-300",
                          border: "border-green-400",
                        };
                      case "Intermediate":
                        return {
                          gradient:
                            "from-orange-600 via-orange-500 to-orange-400",
                          glow: "shadow-orange-500/50",
                          accent: "text-orange-300",
                          border: "border-orange-400",
                        };
                      case "Beginner":
                        return {
                          gradient:
                            "from-yellow-600 via-yellow-500 to-yellow-400",
                          glow: "shadow-yellow-500/50",
                          accent: "text-yellow-300",
                          border: "border-yellow-400",
                        };
                      default:
                        return {
                          gradient: "from-gray-600 via-gray-500 to-gray-400",
                          glow: "shadow-gray-500/50",
                          accent: "text-gray-300",
                          border: "border-gray-400",
                        };
                    }
                  };

                  const skillColors = getSkillLevelGradient(
                    selectedTeamForReveal.category || "Beginner"
                  );

                  return (
                    <div className="relative h-full w-full overflow-hidden">
                      {/* Dynamic background with skill level colors */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className={`absolute inset-0 bg-gradient-to-br ${skillColors.gradient}/20 via-black to-black`}
                      />

                      {/* Stadium spotlight effect */}
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 2, opacity: 0.4 }}
                        transition={{ duration: 1.5, delay: 0.3 }}
                        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial ${skillColors.gradient}/30 rounded-full blur-3xl`}
                      />

                      {/* Premier League Style Player Cards */}
                      <div className="relative h-full w-full flex items-center justify-center px-4 sm:px-8 gap-4 sm:gap-8">
                        {/* Player 1 Sports Poster */}
                        <SportsPoster
                          playerName={selectedTeamForReveal.player1}
                          playerPhoto={selectedTeamForReveal.player1Photo}
                          points={Math.floor(
                            selectedTeamForReveal.totalPoints / 2
                          )}
                          category={
                            selectedTeamForReveal.category || "Beginner"
                          }
                          position="left"
                          delay={0.2}
                        />

                        {/* Player 2 Sports Poster */}
                        <SportsPoster
                          playerName={selectedTeamForReveal.player2}
                          playerPhoto={selectedTeamForReveal.player2Photo}
                          points={Math.ceil(
                            selectedTeamForReveal.totalPoints / 2
                          )}
                          category={
                            selectedTeamForReveal.category || "Beginner"
                          }
                          position="right"
                          delay={0.4}
                        />
                      </div>

                      {/* Center Glow Effect */}
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.6 }}
                        transition={{ duration: 1, delay: 2.2 }}
                        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-radial ${skillColors.gradient} rounded-full blur-2xl pointer-events-none`}
                      />

                      {/* Team Info Card */}
                      <motion.div
                        initial={{ y: 100, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.8,
                          delay: 2.5,
                          ease: "easeOut",
                        }}
                        className="absolute bottom-6 sm:bottom-12 left-1/2 transform -translate-x-1/2 z-20"
                      >
                        <div className="bg-black/90 backdrop-blur-xl rounded-2xl border border-white/20 p-4 sm:p-6 shadow-2xl mx-4">
                          <div className="text-center">
                            {/* Team Stats */}
                            <div className="flex items-center justify-center space-x-6 mb-4">
                              <div className="text-center">
                                <div className="text-2xl sm:text-3xl font-bold text-yellow-400">
                                  {selectedTeamForReveal.totalPoints}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-400">
                                  TOTAL PTS
                                </div>
                              </div>

                              {selectedTeamForReveal.groupId && (
                                <div className="text-center">
                                  <div
                                    className={`text-2xl sm:text-3xl font-bold ${skillColors.accent}`}
                                  >
                                    {selectedTeamForReveal.groupId}
                                  </div>
                                  <div className="text-xs sm:text-sm text-gray-400">
                                    GROUP
                                  </div>
                                </div>
                              )}

                              {selectedTeamForReveal.groupRank && (
                                <div className="text-center">
                                  <div className="text-2xl sm:text-3xl font-bold text-white">
                                    #{selectedTeamForReveal.groupRank}
                                  </div>
                                  <div className="text-xs sm:text-sm text-gray-400">
                                    RANK
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Close Button */}
                            <Button
                              onClick={() => setShowTeamReveal(false)}
                              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
                            >
                              <X className="w-4 h-4 mr-2" />
                              CLOSE
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })()}
            </AnimatePresence>
          </DialogContent>
        </Dialog>

        {/* Winners Poster Popup */}
        <Dialog open={showWinnersPopup} onOpenChange={setShowWinnersPopup}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl bg-transparent border-0 p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Winners Poster</DialogTitle>
              <DialogDescription>
                Final winners celebration poster
              </DialogDescription>
            </DialogHeader>
            <div className="relative w-full">
              <img
                src="/images/winners.png"
                alt="Winners Poster"
                className="w-full h-auto rounded-xl shadow-2xl"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
              <Button
                onClick={() => setShowWinnersPopup(false)}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white h-8 px-3 rounded-full"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function Page() {
  const t = useTranslations("en");

  // Get tournament ID from URL parameters
  const [tournamentId, setTournamentId] = useState("ayman-1");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tournament = urlParams.get("tournament");
      if (tournament) {
        setTournamentId(tournament);
      }
    }
  }, []);

  const handlePageChange = () => {
    window.location.href = "/tournaments";
  };

  return (
    <>
      <Navbar />
      <TournamentManagement
        t={t}
        onPageChange={handlePageChange}
        tournamentId={tournamentId}
      />
    </>
  );
}
