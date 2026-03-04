"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, ArrowLeft, Filter } from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  court: {
    id: string;
    name: string;
    type: string;
    location: {
      id: string;
      name: string;
      address: string;
    };
  };
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: session, status } = useSession();
  const router = useRouter();

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
      fetchBookings();
    }
  }, [status, router, session]);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter((b) => b.status === statusFilter));
    }
  }, [statusFilter, bookings]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/bookings");
      if (!res.ok) throw new Error("Failed to load bookings");
      const data = await res.json();
      setBookings(data);
      setFilteredBookings(data);
    } catch (e: any) {
      console.error("Error fetching bookings:", e);
      toast.error(e?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-[rgba(212,168,23,0.2)] text-[#D4A817] border border-[rgba(212,168,23,0.4)]">
            Confirmed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40">
            Pending
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-500/20 text-red-400 border border-red-500/40">
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-[rgba(212,168,23,0.3)] text-white/80">
            {status}
          </Badge>
        );
    }
  };

  if (loading || status === "loading") {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4A817] mx-auto"></div>
            <p className="mt-4 text-white/70">Loading bookings...</p>
          </div>
        </div>
      </>
    );
  }

  const statusCounts = {
    all: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const filterBtnClass = (active: boolean) =>
    active
      ? "bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_2px_8px_rgba(212,168,23,0.25)]"
      : "border-[rgba(212,168,23,0.3)] text-white/80 hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Button
              variant="outline"
              className="mb-4 border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-white">
              All Bookings Management
            </h1>
            <p className="mt-2 text-white/70">
              View and manage all bookings in the system
            </p>
          </div>

          {/* Filter Section */}
          <Card className="mb-6 bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[#D4A817]" />
                  <span className="text-sm font-medium text-white/90">
                    Filter by Status:
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                    className={filterBtnClass(statusFilter === "all")}
                  >
                    All ({statusCounts.all})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusFilter("confirmed")}
                    className={filterBtnClass(statusFilter === "confirmed")}
                  >
                    Confirmed ({statusCounts.confirmed})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusFilter("pending")}
                    className={filterBtnClass(statusFilter === "pending")}
                  >
                    Pending ({statusCounts.pending})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusFilter("cancelled")}
                    className={filterBtnClass(statusFilter === "cancelled")}
                  >
                    Cancelled ({statusCounts.cancelled})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-[#D4A817]/60 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No bookings found
                  </h3>
                  <p className="text-white/70">
                    {statusFilter === "all"
                      ? "There are no bookings in the system yet."
                      : `There are no ${statusFilter} bookings.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const isOvernight =
                  parseInt(booking.startTime.split(":")[0]) >= 8 &&
                  parseInt(booking.endTime.split(":")[0]) <= 5;

                return (
                  <Card
                    key={booking.id}
                    className={
                      booking.status === "cancelled"
                        ? "opacity-75 bg-[#1A1612]/70 border-red-500/30"
                        : "bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_8px_24px_rgba(212,168,23,0.15)] transition-all"
                    }
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-xl text-white">
                              {booking.court.location.name}
                            </CardTitle>
                            {getStatusBadge(booking.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <MapPin className="h-4 w-4 text-[#D4A817]" />
                            <span>{booking.court.location.address}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#D4A817]">
                            {booking.totalPrice} EGP
                          </div>
                          <div className="text-xs text-white/55">
                            Created: {formatDateTime(booking.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* User Information */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <User className="h-4 w-4 text-[#D4A817]" />
                            <span className="font-medium">User</span>
                          </div>
                          <div className="pl-6">
                            <div className="font-semibold text-white">
                              {booking.user.name || "No Name"}
                            </div>
                            <div className="text-sm text-white/60">
                              {booking.user.email}
                            </div>
                          </div>
                        </div>

                        {/* Court Information */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <MapPin className="h-4 w-4 text-[#D4A817]" />
                            <span className="font-medium">Court</span>
                          </div>
                          <div className="pl-6">
                            <div className="font-semibold text-white">
                              {booking.court.name}
                            </div>
                            <div className="text-sm text-white/60">
                              {booking.court.type}
                            </div>
                          </div>
                        </div>

                        {/* Date & Time */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <Calendar className="h-4 w-4 text-[#D4A817]" />
                            <span className="font-medium">Date</span>
                          </div>
                          <div className="pl-6">
                            <div className="font-semibold text-white">
                              {formatDate(booking.date)}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/60 mt-1">
                              <Clock className="h-3 w-3 text-[#D4A817]" />
                              <span>
                                {booking.startTime} - {booking.endTime}
                                {isOvernight && " (next day)"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Duration & Price */}
                        <div className="space-y-2">
                          <div className="text-sm text-white/70 font-medium">
                            Details
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm text-white/80">
                              <span className="font-medium">Duration:</span>{" "}
                              {parseInt(booking.endTime.split(":")[0]) -
                                parseInt(booking.startTime.split(":")[0])}{" "}
                              hour
                              {parseInt(booking.endTime.split(":")[0]) -
                                parseInt(booking.startTime.split(":")[0]) !==
                              1
                                ? "s"
                                : ""}
                            </div>
                            <div className="text-sm text-white/80">
                              <span className="font-medium">Price:</span>{" "}
                              <span className="text-[#D4A817]">{booking.totalPrice} EGP</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
