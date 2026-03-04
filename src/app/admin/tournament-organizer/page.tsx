"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Calendar,
  Award,
  Plus,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";

export default function TournamentOrganizerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organizerProfile, setOrganizerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    tournaments: 0,
    registrations: 0,
    rankCategories: 0,
    pendingApprovals: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user) {
      const user = session.user as any;
      
      // Check if user is a tournament organizer
      if (user.role !== "admin" || user.adminType !== "tournament_organizer") {
        router.push("/admin");
        return;
      }

      // Fetch organizer profile
      fetchOrganizerProfile(user.id);
    }
  }, [status, session, router]);

  const fetchOrganizerProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/organizers/me`);
      if (response.ok) {
        const data = await response.json();
        setOrganizerProfile(data.organizerProfile);
        
        if (data.organizerProfile?.isApproved) {
          // Fetch stats if approved
          fetchStats();
        }
      }
    } catch (error) {
      console.error("Error fetching organizer profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // TODO: Implement API endpoints for stats
      // For now, using placeholder data
      setStats({
        tournaments: 0,
        registrations: 0,
        rankCategories: 0,
        pendingApprovals: 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#0F172A] to-[#1E293B] flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </>
    );
  }

  // If not approved, show pending approval message
  if (organizerProfile && !organizerProfile.isApproved) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#0F172A] to-[#1E293B] py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-block mb-6"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-[#1E90FF]/30 rounded-full blur-xl animate-ping" />
                      <div className="relative bg-gradient-to-br from-[#1E90FF] via-[#3FA9F5] to-[#1E90FF] p-6 rounded-2xl shadow-[0_0_40px_rgba(30,144,255,0.5)]">
                        <Clock className="h-16 w-16 text-white" />
                      </div>
                    </div>
                  </motion.div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">
                    Approval Pending
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Your tournament organizer application is pending approval from a Super Admin.
                  </p>
                  {organizerProfile.rejectedAt && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                      <p className="text-destructive font-medium mb-2">Application Rejected</p>
                      <p className="text-sm text-muted-foreground">
                        {organizerProfile.rejectionReason || "No reason provided"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#0F172A] to-[#1E293B] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  Tournament Organizer Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Manage your tournaments, registrations, and rank categories
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => router.push("/admin/tournament-organizer/tournaments/create")}
                  className="bg-[#1E90FF] hover:bg-[#3FA9F5]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tournament
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="bg-card border-border hover:border-[#1E90FF]/30 transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Tournaments</p>
                      <p className="text-3xl font-bold text-foreground">{stats.tournaments}</p>
                    </div>
                    <Trophy className="h-10 w-10 text-[#1E90FF]" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="bg-card border-border hover:border-[#1E90FF]/30 transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Registrations</p>
                      <p className="text-3xl font-bold text-foreground">{stats.registrations}</p>
                    </div>
                    <Users className="h-10 w-10 text-[#1E90FF]" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-card border-border hover:border-[#1E90FF]/30 transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Rank Categories</p>
                      <p className="text-3xl font-bold text-foreground">{stats.rankCategories}</p>
                    </div>
                    <Award className="h-10 w-10 text-[#1E90FF]" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="bg-card border-border hover:border-[#1E90FF]/30 transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Pending Approvals</p>
                      <p className="text-3xl font-bold text-foreground">{stats.pendingApprovals}</p>
                    </div>
                    <Clock className="h-10 w-10 text-[#1E90FF]" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-8"
          >
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:border-[#1E90FF] hover:bg-[#1E90FF]/10"
                    onClick={() => router.push("/admin/tournament-organizer/tournaments/create")}
                  >
                    <Trophy className="h-6 w-6 text-[#1E90FF]" />
                    <span>Create Tournament</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:border-[#1E90FF] hover:bg-[#1E90FF]/10"
                    onClick={() => router.push("/admin/tournament-organizer/rank-categories")}
                  >
                    <Award className="h-6 w-6 text-[#1E90FF]" />
                    <span>Rank Categories</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:border-[#1E90FF] hover:bg-[#1E90FF]/10"
                    onClick={() => router.push("/admin/tournament-organizer/registrations")}
                  >
                    <Users className="h-6 w-6 text-[#1E90FF]" />
                    <span>View Registrations</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Coming Soon Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-[#1E90FF]" />
                  <h3 className="text-2xl font-semibold text-foreground mb-2">
                    Tournament Management
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Full tournament management features are coming soon. You can start by creating rank categories and tournaments.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={() => router.push("/admin/tournament-organizer/rank-categories")}
                      className="bg-[#1E90FF] hover:bg-[#3FA9F5]"
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Manage Rank Categories
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/admin/tournament-organizer/tournaments/create")}
                      className="border-border hover:border-[#1E90FF] hover:bg-[#1E90FF]/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Tournament
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
}
