"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  X,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  category?: string; // regular, academy, tournament
  court: {
    id: string;
    name: string;
    type: string;
    location: {
      id: string;
      name: string;
      address: string;
      cancellationHours?: number;
    };
  };
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [rebookingId, setRebookingId] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState<
    string | null
  >(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchBookings();
    }
  }, [status, router]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/bookings");
      if (!res.ok) throw new Error("Failed to load bookings");
      const data = await res.json();

      // Separate active and cancelled bookings
      const active = data.filter((b: Booking) => b.status !== "cancelled");
      const cancelled = data.filter((b: Booking) => b.status === "cancelled");

      // Sort by date (descending - newest first) and then by startTime (ascending - earliest first)
      const sortBookings = (bookings: Booking[]) => {
        return [...bookings].sort((a: Booking, b: Booking) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          // First sort by date (descending)
          if (dateB !== dateA) {
            return dateB - dateA;
          }
          // If same date, sort by startTime (ascending)
          return a.startTime.localeCompare(b.startTime);
        });
      };

      setBookings(sortBookings(active));
      setCancelledBookings(sortBookings(cancelled));
    } catch (e: any) {
      console.error("Error fetching bookings:", e);
      toast.error(e?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  // Group bookings by court
  const bookingsByCourt = useMemo(() => {
    const grouped: Record<string, Booking[]> = {};
    bookings.forEach((booking) => {
      const courtKey = `${booking.court.location.name} - ${booking.court.name}`;
      if (!grouped[courtKey]) {
        grouped[courtKey] = [];
      }
      grouped[courtKey].push(booking);
    });

    // Sort bookings within each court by date and time
    Object.keys(grouped).forEach((courtKey) => {
      grouped[courtKey].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        return a.startTime.localeCompare(b.startTime);
      });
    });

    return grouped;
  }, [bookings]);

  // Helper function to check if a booking is in the past
  const isBookingPast = (booking: Booking): boolean => {
    const now = new Date();
    const bookingDate = new Date(booking.date);
    
    // Get the booking start time
    const startHour = parseInt(booking.startTime.split(":")[0]);
    const startMinute = parseInt(booking.startTime.split(":")[1] || "0");
    
    // Handle overnight slots (0-5) - they're on the next day
    if (startHour <= 5) {
      bookingDate.setDate(bookingDate.getDate() + 1);
    }
    
    bookingDate.setHours(startHour, startMinute, 0, 0);
    
    // Check if booking time has passed
    return bookingDate.getTime() < now.getTime();
  };

  const canCancel = (booking: Booking): boolean => {
    // Admins can cancel at any time
    const isAdmin = (session?.user as any)?.role === "admin";
    if (isAdmin) {
      return true;
    }

    // Cannot cancel past bookings
    if (isBookingPast(booking)) {
      return false;
    }

    // Get cancellation hours from location (default to 4 if not set)
    const cancellationHours = booking.court.location.cancellationHours ?? 4;

    // Regular users: check location-specific cancellation restriction
    const now = new Date();
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(0, 0, 0, 0);
    const currentDate = new Date(now);
    currentDate.setHours(0, 0, 0, 0);
    const isToday = bookingDate.getTime() === currentDate.getTime();

    if (!isToday) {
      // Future dates are always cancellable (if not past)
      return true;
    }

    const bookingStartDateTime = new Date(now);
    const currentHour = now.getHours();
    const startHour = parseInt(booking.startTime.split(":")[0]);

    // Handle overnight slots (0-5) - they're on the next day
    if (startHour <= 5) {
      // If current hour is 8-23, overnight slots (0-5) are tomorrow, so they're more than cancellationHours away
      if (currentHour >= 8) {
        return true;
      } else {
        // If current hour is 0-5, check if booking is at least cancellationHours away
        if (startHour > currentHour) {
          bookingStartDateTime.setHours(startHour, 0, 0, 0);
        } else {
          // Slot is tomorrow
          bookingStartDateTime.setDate(bookingStartDateTime.getDate() + 1);
          bookingStartDateTime.setHours(startHour, 0, 0, 0);
        }
        const hoursUntilBooking =
          (bookingStartDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntilBooking >= cancellationHours;
      }
    } else {
      // Regular slots (8-23) on the same day
      bookingStartDateTime.setHours(startHour, 0, 0, 0);
      const hoursUntilBooking =
        (bookingStartDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilBooking >= cancellationHours;
    }
  };

  // Check if a cancelled booking can be rebooked
  const canRebook = (booking: Booking): boolean => {
    // Cannot rebook past bookings
    if (isBookingPast(booking)) {
      return false;
    }

    // Get cancellation hours from location (default to 4 if not set)
    const cancellationHours = booking.court.location.cancellationHours ?? 4;

    // Check if booking is within cancellation deadline
    const now = new Date();
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(0, 0, 0, 0);
    const currentDate = new Date(now);
    currentDate.setHours(0, 0, 0, 0);
    const isToday = bookingDate.getTime() === currentDate.getTime();

    if (!isToday) {
      // Future dates can be rebooked (if not past)
      return true;
    }

    const bookingStartDateTime = new Date(now);
    const currentHour = now.getHours();
    const startHour = parseInt(booking.startTime.split(":")[0]);

    // Handle overnight slots (0-5) - they're on the next day
    if (startHour <= 5) {
      // If current hour is 8-23, overnight slots (0-5) are tomorrow, so they're more than cancellationHours away
      if (currentHour >= 8) {
        return true;
      } else {
        // If current hour is 0-5, check if booking is at least cancellationHours away
        if (startHour > currentHour) {
          bookingStartDateTime.setHours(startHour, 0, 0, 0);
        } else {
          // Slot is tomorrow
          bookingStartDateTime.setDate(bookingStartDateTime.getDate() + 1);
          bookingStartDateTime.setHours(startHour, 0, 0, 0);
        }
        const hoursUntilBooking =
          (bookingStartDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntilBooking >= cancellationHours;
      }
    } else {
      // Regular slots (8-23) on the same day
      bookingStartDateTime.setHours(startHour, 0, 0, 0);
      const hoursUntilBooking =
        (bookingStartDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilBooking >= cancellationHours;
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      setCancellingId(bookingId);
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to cancel booking");
      }

      toast.success("Booking cancelled successfully");
      // Refresh bookings to show cancelled booking in cancelled section
      fetchBookings();
    } catch (e: any) {
      console.error("Error cancelling booking:", e);
      toast.error(e?.message || "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  // Helper function to extract date in YYYY-MM-DD format using local time
  // This ensures we use the same date that's displayed in the UI
  const getLocalDateString = (dateValue: string | Date): string => {
    // Always create a Date object and extract local date components
    // This matches what formatDate shows the user
    const d = new Date(dateValue);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const checkAvailability = async (booking: Booking): Promise<boolean> => {
    try {
      // Check if the slot is still available
      // Use local date to match what the user sees in the UI
      const bookingDateStr = getLocalDateString(booking.date);

      const res = await fetch(
        `/api/availability?locationId=${
          booking.court.location.id
        }&date=${bookingDateStr}&_=${Date.now()}`
      );

      if (!res.ok) {
        throw new Error("Failed to check availability");
      }

      const slots = await res.json();

      // Get start and end hours
      const startHour = parseInt(booking.startTime.split(":")[0]);
      const endHour = parseInt(booking.endTime.split(":")[0]);

      // Check if all slots in the booking range are available
      const hoursToCheck: number[] = [];
      if (endHour < startHour) {
        // Overnight booking (e.g., 22:00 to 00:00)
        for (let h = startHour; h <= 23; h++) hoursToCheck.push(h);
        for (let h = 0; h < endHour; h++) hoursToCheck.push(h);
      } else {
        // Regular booking (e.g., 10:00 to 12:00)
        for (let h = startHour; h < endHour; h++) hoursToCheck.push(h);
      }

      // Check each slot for this court
      for (const hour of hoursToCheck) {
        const time = `${hour.toString().padStart(2, "0")}:00`;
        const slot = slots.find(
          (s: any) => s.courtId === booking.court.id && s.time === time
        );

        if (!slot || !slot.available) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error checking availability:", error);
      return false;
    }
  };

  const handleBookAgain = async (booking: Booking) => {
    if (!confirm("Are you sure you want to book this slot again?")) {
      return;
    }

    try {
      setCheckingAvailability(booking.id);

      // First check availability
      const isAvailable = await checkAvailability(booking);

      if (!isAvailable) {
        toast.error(
          "This slot is no longer available. It may have been booked by someone else."
        );
        setCheckingAvailability(null);
        return;
      }

      setRebookingId(booking.id);

      // Create new booking
      // Use local date to match what the user sees in the UI (same as formatDate shows)
      const bookingDateStr = getLocalDateString(booking.date);

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: booking.court.id,
          locationId: booking.court.location.id,
          date: bookingDateStr,
          startTime: booking.startTime,
          endTime: booking.endTime,
          category: booking.category || "regular",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to book again");
      }

      toast.success("Booking created successfully!");
      // Refresh bookings to show the new booking in active section
      fetchBookings();
    } catch (e: any) {
      console.error("Error rebooking:", e);
      toast.error(e?.message || "Failed to book again");
    } finally {
      setCheckingAvailability(null);
      setRebookingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today - ${date.toLocaleDateString("en", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow - ${date.toLocaleDateString("en", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}`;
    } else {
      return date.toLocaleDateString("en", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4A817] mx-auto"></div>
            <p className="mt-4 text-white/75">Loading your bookings...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="bg-gradient-to-b from-[#252015] to-[#1C1810] py-4 md:py-8 pb-16 md:pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-4 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              My Bookings
            </h1>
            <p className="mt-1 md:mt-2 text-sm md:text-base text-white/75">
              View and manage your court bookings
            </p>
          </div>

          {bookings.length === 0 ? (
            <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-[rgba(212,168,23,0.15)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-7 w-7 text-[#D4A817]" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    No bookings found
                  </h3>
                  <p className="text-white/75 mb-6">
                    You don't have any active bookings yet.
                  </p>
                  <Button
                    onClick={() => router.push("/booking")}
                    className="bg-[#F9D923] hover:bg-[#FBE156] text-[#121212] font-semibold shadow-[0_10px_30px_rgba(249,217,35,0.35)]"
                  >
                    Book a Court
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
              {Object.entries(bookingsByCourt).map(
                ([courtKey, courtBookings]) => {
                  const [locationName, courtName] = courtKey.split(" - ");
                  const firstBooking = courtBookings[0];
                  const courtType = firstBooking.court.type;

                  return (
                    <div key={courtKey} className="flex flex-col min-w-0">
                      {/* Court Header */}
                      <Card className="mb-3 md:mb-4 border-l-4 border-l-[#D4A817] bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                        <CardHeader className="pb-2 md:pb-3">
                          <CardTitle className="flex items-center gap-1 md:gap-2 text-sm md:text-lg">
                            <MapPin className="h-3 w-3 md:h-5 md:w-5 text-[#D4A817] flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-xs md:text-base truncate text-white">
                                {courtName}
                              </div>
                              <div className="text-[10px] md:text-sm font-normal text-white/75 mt-0.5 md:mt-1 truncate">
                                {locationName}
                              </div>
                              <div className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">
                                {courtType} • {courtBookings.length}
                              </div>
                            </div>
                          </CardTitle>
                        </CardHeader>
                      </Card>

                      {/* Bookings for this court */}
                      <div className="flex-1 space-y-2 md:space-y-3 max-h-[70vh] overflow-y-auto pb-4 md:pb-6">
                        {courtBookings.map((booking) => {
                          const cancellable = canCancel(booking);
                          const isOvernight =
                            parseInt(booking.startTime.split(":")[0]) >= 8 &&
                            parseInt(booking.endTime.split(":")[0]) <= 5;

                          return (
                            <Card
                              key={booking.id}
                              className="hover:shadow-md transition-shadow bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]"
                            >
                              <CardContent className="pt-2 md:pt-4 px-2 md:px-6">
                                {/* Date, Status, and Category */}
                                <div className="flex items-center justify-between mb-1.5 md:mb-3 gap-1 flex-wrap">
                                  <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
                                    <Calendar className="h-3 w-3 md:h-4 md:w-4 text-white/60 flex-shrink-0" />
                                    <span className="text-[10px] md:text-sm font-medium text-white truncate">
                                      {formatDate(booking.date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {booking.category &&
                                      booking.category !== "regular" && (
                                        <Badge
                                          variant="outline"
                                          className="text-[8px] md:text-[10px] px-1 md:px-1.5 py-0"
                                        >
                                          {booking.category
                                            .charAt(0)
                                            .toUpperCase() +
                                            booking.category.slice(1)}
                                        </Badge>
                                      )}
                                    <Badge
                                      variant={
                                        booking.status === "confirmed"
                                          ? "default"
                                          : booking.status === "pending"
                                          ? "secondary"
                                          : "destructive"
                                      }
                                      className="text-[9px] md:text-xs"
                                    >
                                      {booking.status}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Time */}
                                <div className="flex items-center gap-1 md:gap-2 mb-1.5 md:mb-3">
                                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-white/60 flex-shrink-0" />
                                  <span className="text-[10px] md:text-sm text-white/90 truncate">
                                    {booking.startTime} - {booking.endTime}
                                    {isOvernight && (
                                      <span className="text-[9px] md:text-xs text-white/60 ml-0.5 md:ml-1">
                                        (next day)
                                      </span>
                                    )}
                                  </span>
                                </div>

                                {/* Price and Duration */}
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-1.5 md:mb-3 gap-1 md:gap-0">
                                  <div className="text-white/90 text-[10px] md:text-sm">
                                    <span className="font-medium">Price:</span>{" "}
                                    <span className="text-[#D4A817] font-semibold">
                                      {booking.totalPrice} EGP
                                    </span>
                                  </div>
                                  <div className="text-white/75 text-[10px] md:text-sm">
                                    <span className="font-medium">Dur:</span>{" "}
                                    {parseInt(booking.endTime.split(":")[0]) -
                                      parseInt(
                                        booking.startTime.split(":")[0]
                                      )}{" "}
                                    hr
                                    {parseInt(booking.endTime.split(":")[0]) -
                                      parseInt(
                                        booking.startTime.split(":")[0]
                                      ) !==
                                    1
                                      ? "s"
                                      : ""}
                                  </div>
                                </div>

                                {/* Cancellation Warning */}
                                {!cancellable &&
                                  (session?.user as any)?.role !== "admin" && (
                                    <div className="mb-1.5 md:mb-3 p-1 md:p-2 bg-[rgba(251,146,60,0.15)] border border-[rgba(251,146,60,0.3)] rounded-md">
                                      <div className="flex items-start gap-1 md:gap-2">
                                        <AlertCircle className="h-2.5 w-2.5 md:h-3 md:w-3 text-[#FB923C] mt-0.5 flex-shrink-0" />
                                        <p className="text-[9px] md:text-xs text-[#FB923C]">
                                          {isBookingPast(booking)
                                            ? "This booking has already passed"
                                            : `Cannot cancel within ${
                                                booking.court.location
                                                  .cancellationHours ?? 4
                                              } hr${
                                                (booking.court.location
                                                  .cancellationHours ?? 4) !== 1
                                                  ? "s"
                                                  : ""
                                              }`}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                {/* Cancel Button */}
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="w-full text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-4"
                                  onClick={() => handleCancel(booking.id)}
                                  disabled={
                                    !cancellable || cancellingId === booking.id
                                  }
                                >
                                  {cancellingId === booking.id ? (
                                    "Cancelling..."
                                  ) : (
                                    <>
                                      <X className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                      <span className="hidden md:inline">
                                        Cancel Booking
                                      </span>
                                      <span className="md:hidden">Cancel</span>
                                    </>
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* Cancelled Bookings Section */}
          {cancelledBookings.length > 0 && (
            <div className="mt-8 md:mt-12">
              <div className="mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-white">
                  Cancelled Bookings
                </h2>
                <p className="mt-1 md:mt-2 text-sm md:text-base text-white/75">
                  Your cancelled bookings - Book again if the slot is still
                  available
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
                {Object.entries(
                  cancelledBookings.reduce(
                    (acc: Record<string, Booking[]>, booking) => {
                      const courtKey = `${booking.court.location.name} - ${booking.court.name}`;
                      if (!acc[courtKey]) {
                        acc[courtKey] = [];
                      }
                      acc[courtKey].push(booking);
                      return acc;
                    },
                    {}
                  )
                ).map(([courtKey, courtBookings]) => {
                  const [locationName, courtName] = courtKey.split(" - ");
                  const firstBooking = courtBookings[0];
                  const courtType = firstBooking.court.type;

                  return (
                    <div key={courtKey} className="flex flex-col min-w-0">
                      {/* Court Header */}
                      <Card className="mb-3 md:mb-4 border-l-4 border-l-[#EF4444] opacity-75 bg-[#1A1612]/70 border-[rgba(212,168,23,0.08)]">
                        <CardHeader className="pb-2 md:pb-3">
                          <CardTitle className="flex items-center gap-1 md:gap-2 text-sm md:text-lg">
                            <MapPin className="h-3 w-3 md:h-5 md:w-5 text-[#EF4444] flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-xs md:text-base truncate text-white">
                                {courtName}
                              </div>
                              <div className="text-[10px] md:text-sm font-normal text-white/75 mt-0.5 md:mt-1 truncate">
                                {locationName}
                              </div>
                              <div className="text-[9px] md:text-xs text-white/60 mt-0.5 md:mt-1">
                                {courtType} • {courtBookings.length} cancelled
                              </div>
                            </div>
                          </CardTitle>
                        </CardHeader>
                      </Card>

                      {/* Cancelled Bookings for this court */}
                      <div className="flex-1 space-y-2 md:space-y-3 max-h-[70vh] overflow-y-auto pb-4 md:pb-6">
                        {courtBookings.map((booking) => {
                          const isOvernight =
                            parseInt(booking.startTime.split(":")[0]) >= 8 &&
                            parseInt(booking.endTime.split(":")[0]) <= 5;
                          const isChecking =
                            checkingAvailability === booking.id;
                          const isRebooking = rebookingId === booking.id;
                          const rebookable = canRebook(booking);
                          const isPast = isBookingPast(booking);

                          return (
                            <Card
                              key={booking.id}
                              className="hover:shadow-md transition-shadow opacity-75 bg-[#1A1612]/70 border-[rgba(212,168,23,0.08)]"
                            >
                              <CardContent className="pt-2 md:pt-4 px-2 md:px-6">
                                {/* Date, Status, and Category */}
                                <div className="flex items-center justify-between mb-1.5 md:mb-3 gap-1 flex-wrap">
                                  <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
                                    <Calendar className="h-3 w-3 md:h-4 md:w-4 text-white/60 flex-shrink-0" />
                                    <span className="text-[10px] md:text-sm font-medium text-white truncate">
                                      {formatDate(booking.date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {booking.category &&
                                      booking.category !== "regular" && (
                                        <Badge
                                          variant="outline"
                                          className="text-[8px] md:text-[10px] px-1 md:px-1.5 py-0"
                                        >
                                          {booking.category
                                            .charAt(0)
                                            .toUpperCase() +
                                            booking.category.slice(1)}
                                        </Badge>
                                      )}
                                    <Badge
                                      variant="destructive"
                                      className="text-[9px] md:text-xs"
                                    >
                                      {booking.status}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Time */}
                                <div className="flex items-center gap-1 md:gap-2 mb-1.5 md:mb-3">
                                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-white/60 flex-shrink-0" />
                                  <span className="text-[10px] md:text-sm text-white/90 truncate">
                                    {booking.startTime} - {booking.endTime}
                                    {isOvernight && (
                                      <span className="text-[9px] md:text-xs text-white/60 ml-0.5 md:ml-1">
                                        (next day)
                                      </span>
                                    )}
                                  </span>
                                </div>

                                {/* Price */}
                                <div className="flex items-center justify-between mb-1.5 md:mb-3">
                                  <div className="text-white/90 text-[10px] md:text-sm">
                                    <span className="font-medium">Price:</span>{" "}
                                    <span className="text-[#D4A817] font-semibold">
                                      {booking.totalPrice} EGP
                                    </span>
                                  </div>
                                </div>

                                {/* Rebooking Warning */}
                                {!rebookable && (
                                  <div className="mb-1.5 md:mb-3 p-1 md:p-2 bg-[rgba(251,146,60,0.15)] border border-[rgba(251,146,60,0.3)] rounded-md">
                                    <div className="flex items-start gap-1 md:gap-2">
                                      <AlertCircle className="h-2.5 w-2.5 md:h-3 md:w-3 text-[#FB923C] mt-0.5 flex-shrink-0" />
                                      <p className="text-[9px] md:text-xs text-[#FB923C]">
                                        {isPast
                                          ? "This booking has already passed"
                                          : `Cannot rebook within ${
                                              booking.court.location
                                                .cancellationHours ?? 4
                                            } hr${
                                              (booking.court.location
                                                .cancellationHours ?? 4) !== 1
                                                ? "s"
                                                : ""
                                            }`}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Book Again Button */}
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="w-full text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-4 bg-[#F9D923] hover:bg-[#FBE156] text-[#121212] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => handleBookAgain(booking)}
                                  disabled={isChecking || isRebooking || !rebookable}
                                >
                                  {isChecking ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white mr-1 md:mr-2"></div>
                                      Checking...
                                    </>
                                  ) : isRebooking ? (
                                    "Booking..."
                                  ) : (
                                    <>
                                      <RotateCcw className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                      <span className="hidden md:inline">
                                        Book Again
                                      </span>
                                      <span className="md:hidden">Re-book</span>
                                    </>
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
