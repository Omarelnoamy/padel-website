"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users,
  Calendar,
  Building2,
  MapPin,
  UserCheck,
  UserX,
  TrendingUp,
  ArrowRight,
  Shield,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PendingAdmin = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  adminType: string | null;
  createdAt: string;
};

type Stats = {
  totalUsers: number;
  totalBookings: number;
  totalLocations: number;
  totalCourts: number;
  pendingAdmins: number;
};

export default function SuperAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pendingAdmins, setPendingAdmins] = useState<PendingAdmin[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (
      status === "authenticated" &&
      ((session?.user as any)?.role !== "admin" ||
        (session?.user as any)?.adminType !== "super_admin")
    ) {
      router.push("/");
      return;
    }

    if (status === "authenticated") {
      fetchData();
    }
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const [pendingRes, statsRes] = await Promise.all([
        fetch("/api/admin/pending"),
        fetch("/api/admin/stats"),
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingAdmins(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (
    userId: string,
    action: "approve" | "reject"
  ) => {
    setProcessing(userId);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Error processing approval:", error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading || status === "loading") {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] py-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-center h-64">
              <div className="text-white/70">Loading...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      href: undefined as string | undefined,
    },
    {
      title: "Bookings",
      value: stats?.totalBookings || 0,
      icon: Calendar,
      href: "/admin/bookings",
    },
    {
      title: "Locations",
      value: stats?.totalLocations || 0,
      icon: Building2,
      href: undefined as string | undefined,
    },
    {
      title: "Courts",
      value: stats?.totalCourts || 0,
      icon: MapPin,
      href: undefined as string | undefined,
    },
    {
      title: "Pending Admins",
      value: stats?.pendingAdmins || 0,
      icon: UserCheck,
      href: undefined as string | undefined,
      highlight: stats && stats.pendingAdmins > 0,
    },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] pb-16 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
                <Shield className="h-8 w-8 text-[#D4A817]" />
                Super Admin Dashboard
              </h1>
              <p className="text-white/70 mt-2">
                Manage users, locations, and admin approvals
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 border-[rgba(212,168,23,0.4)] text-[#D4A817] bg-[rgba(212,168,23,0.08)]">
                <Activity className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              const cardContent = (
                <Card
                  className={cn(
                    "h-full transition-all bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)]",
                    stat.href && "cursor-pointer hover:scale-[1.02]",
                    stat.highlight && "ring-2 ring-[rgba(212,168,23,0.4)]"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-white/80">
                        {stat.title}
                      </CardTitle>
                      <div className="p-2 rounded-lg bg-[rgba(212,168,23,0.15)] text-[#D4A817]">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <div
                        className={cn(
                          "text-3xl font-bold text-[#D4A817]",
                          stat.highlight && "animate-pulse"
                        )}
                      >
                        {stat.value.toLocaleString()}
                      </div>
                      {stat.href && (
                        <ArrowRight className="h-4 w-4 text-[#D4A817]" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );

              if (stat.href) {
                return (
                  <Link key={index} href={stat.href}>
                    {cardContent}
                  </Link>
                );
              }

              return <div key={index}>{cardContent}</div>;
            })}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:border-[rgba(212,168,23,0.3)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="h-5 w-5 text-[#D4A817]" />
                  Players Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/admin/players">
                  <Button className="w-full border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]" variant="outline">
                    Manage Players
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:border-[rgba(212,168,23,0.3)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Building2 className="h-5 w-5 text-[#D4A817]" />
                  Locations Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/admin/locations">
                  <Button className="w-full bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]">
                    Manage Locations
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Pending Admin Approvals */}
          <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2 text-white">
                  <UserCheck className="h-5 w-5 text-[#D4A817]" />
                  Pending Admin Approvals
                  {pendingAdmins.length > 0 && (
                    <Badge className="ml-2 bg-[#D4A817]/20 text-[#D4A817] border border-[rgba(212,168,23,0.4)]">
                      {pendingAdmins.length}
                    </Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {pendingAdmins.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-[#D4A817]/50 mx-auto mb-4" />
                  <p className="text-white/80 font-medium">
                    No pending admin approvals
                  </p>
                  <p className="text-sm text-white/55 mt-1">
                    All admin requests have been processed
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAdmins.map((admin) => (
                    <Card
                      key={admin.id}
                      className="border-l-4 border-l-[#D4A817] bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_8px_24px_rgba(212,168,23,0.15)] transition-shadow"
                    >
                      <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-[rgba(212,168,23,0.15)] flex items-center justify-center">
                                <Shield className="h-5 w-5 text-[#D4A817]" />
                              </div>
                              <div>
                                <div className="font-semibold text-white">
                                  {admin.name || "No name"}
                                </div>
                                <div className="text-sm text-white/70">
                                  {admin.email}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <Badge variant="outline" className="font-medium border-[rgba(212,168,23,0.3)] text-[#D4A817] bg-[rgba(212,168,23,0.08)]">
                                {admin.adminType || "Admin"}
                              </Badge>
                              {admin.phone && (
                                <span className="text-white/60">
                                  📞 {admin.phone}
                                </span>
                              )}
                              <span className="text-white/50">
                                Requested:{" "}
                                {new Date(admin.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 sm:flex-shrink-0">
                            <Button
                              onClick={() => handleApprove(admin.id, "approve")}
                              disabled={processing === admin.id}
                              className="bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)] flex-1 sm:flex-none"
                            >
                              {processing === admin.id ? (
                                <>
                                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleApprove(admin.id, "reject")}
                              disabled={processing === admin.id}
                              className="flex-1 sm:flex-none bg-transparent border border-red-500/60 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
