"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  MapPin,
  ArrowLeft,
  Users,
  Calendar,
  Phone,
  Globe,
} from "lucide-react";
import { Translations, useTranslations } from "@/app/translations";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

interface BookingPageProps {
  t: Translations;
}

interface Location {
  id: string;
  name: string;
  address: string;
  image?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  googleMapsUrl?: string | null;
  cancellationHours?: number;
  openingTime?: string | null;
  closingTime?: string | null;
  owner?: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  } | null;
  courts: Court[];
}

interface Court {
  id: string;
  name: string;
  type: string;
  pricePerHour: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
  courtId: string;
  courtName?: string;
  reason?: string; // "booked", "past", or "reserved"
  fixedBookingInfo?: {
    userId: string | null;
    createdById: string;
    notes: string | null;
  };
}

/** Format date as YYYY-MM-DD in local time (so API and calendar day match) */
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BookingPage({ t }: BookingPageProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]); // Array of selected time slots
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [bookingCategory, setBookingCategory] = useState<string>("regular"); // regular, academy, tournament (club owner only)

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dailyHoursBooked, setDailyHoursBooked] = useState<number>(0);
  const [isDatePickerActive, setIsDatePickerActive] = useState(false);
  const [clubAdminLocationId, setClubAdminLocationId] = useState<string | null>(
    null
  );
  const { data: session, status } = useSession();
  const router = useRouter();

  // Fetch locations from API
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/locations");
        if (!res.ok) throw new Error("Failed to load locations");
        const data = await res.json();
        setLocations(data || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load locations");
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  // Fetch user info including club admin location
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const fetchUserInfo = async () => {
        try {
          const res = await fetch("/api/users/me");
          if (res.ok) {
            const data = await res.json();
            if (data.user?.clubAdminLocationId) {
              setClubAdminLocationId(data.user.clubAdminLocationId);
              console.log(
                "Club admin location ID set:",
                data.user.clubAdminLocationId
              );
            } else {
              console.log(
                "No club admin location ID found for user:",
                data.user
              );
              setClubAdminLocationId(null);
            }
          }
        } catch (e) {
          console.error("Error fetching user info:", e);
        }
      };
      fetchUserInfo();
    } else {
      setClubAdminLocationId(null);
    }
  }, [status, session]);

  // Generate days starting from today - 4 days on mobile, 7 on desktop
  // Booking day runs from 8:00 AM to 5:00 AM the next day
  // So if current time is 0:00-5:59, the previous day's booking day is still active
  const getWeekDays = () => {
    const days = [];
    const now = new Date();
    const currentHour = now.getHours();

    // If current time is 0:00-5:59, include the previous day (booking day is still active)
    // Otherwise, start from today
    const startOffset = currentHour < 6 ? -1 : 0;

    // Always generate 7 days, but we'll only show 4 on mobile via CSS
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + startOffset + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();
  // For mobile, only show first 4 days
  const mobileWeekDays = weekDays.slice(0, 4);

  // Memoize date strings to prevent unnecessary re-renders
  const dateInputValue = useMemo(() => {
    return toLocalDateString(selectedDate);
  }, [selectedDate]);

  const minDateValue = useMemo(() => {
    return toLocalDateString(new Date());
  }, []);

  // Ref to prevent input from losing focus
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Fetch real availability from API
  useEffect(() => {
    // Don't run if date picker is active (to prevent re-renders that close the picker)
    if (isDatePickerActive) {
      return;
    }

    if (!selectedLocation || !selectedDate) {
      setAvailability([]);
      return;
    }

    // Reset selection when date or location changes
    setSelectedSlots([]);
    setSelectedCourtId(null);

    const fetchAvailability = async () => {
      setLoadingAvailability(true);
      try {
        const dateStr = toLocalDateString(selectedDate);
        const nowIso = new Date().toISOString();
        const res = await fetch(
          `/api/availability?locationId=${selectedLocation.id}&date=${dateStr}&now=${encodeURIComponent(nowIso)}&_t=${Date.now()}`
        );
        if (!res.ok) throw new Error("Failed to load availability");
        const data = await res.json();
        setAvailability(data || []);
      } catch (e: any) {
        console.error("Error fetching availability:", e);
        setError(e?.message || "Failed to load availability");
        setAvailability([]);
      } finally {
        setLoadingAvailability(false);
      }
    };

    fetchAvailability();

    // Fetch user's daily booking hours if logged in (only for regular users)
    const user = session?.user as any;
    const isAdmin = user?.role === "admin";
    const isClubOwner =
      user?.role === "club_owner" ||
      (isAdmin && user?.adminType === "club_owner");
    const isModerator = isAdmin && user?.adminType === "moderator";
    const isClubAdmin =
      user?.role === "user" && user?.userType === "club_admin";
    // Club admins only have unrestricted booking for their assigned location
    const hasUnrestrictedBooking =
      isAdmin ||
      isClubOwner ||
      isModerator ||
      (isClubAdmin &&
        clubAdminLocationId &&
        selectedLocation?.id === clubAdminLocationId);

    if (status === "authenticated" && !hasUnrestrictedBooking) {
      const fetchDailyHours = async () => {
        try {
          const dateStr = toLocalDateString(selectedDate);
          const res = await fetch(`/api/bookings?date=${dateStr}`);
          if (res.ok) {
            const bookings = await res.json();
            let totalHours = 0;
            // Only count confirmed bookings (exclude cancelled ones)
            bookings
              .filter((booking: any) => booking.status !== "cancelled")
              .forEach((booking: any) => {
                const start = parseInt(booking.startTime.split(":")[0]);
                const end = parseInt(booking.endTime.split(":")[0]);
                // Handle overnight bookings (e.g., 22:00 to 00:00 = 2 hours)
                const bookingHours =
                  end < start ? 24 - start + end : end - start;
                totalHours += bookingHours;
              });
            setDailyHoursBooked(totalHours);
          }
        } catch (e) {
          console.error("Error fetching daily hours:", e);
        }
      };
      fetchDailyHours();
    } else {
      setDailyHoursBooked(0);
    }
  }, [
    selectedLocation,
    selectedDate,
    status,
    session,
    isDatePickerActive,
    clubAdminLocationId,
  ]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const currentHour = now.getHours();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // If current time is 0:00-5:59, the previous day's booking day is still active
    // So treat yesterday as "today" for booking purposes
    const effectiveToday = currentHour < 6 ? yesterday : today;

    if (date.toDateString() === effectiveToday.toDateString()) {
      return `${t.today} - ${date.toLocaleDateString("en", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `${t.tomorrow} - ${date.toLocaleDateString("en", {
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

  // Helper function to check if a slot is selected
  const isSlotSelected = (time: string, courtId: string) => {
    return selectedSlots.includes(time) && selectedCourtId === courtId;
  };

  // Helper function to handle slot selection
  const handleSlotClick = (time: string, courtId: string) => {
    const user = session?.user as any;
    const isAdmin = user?.role === "admin";
    const isClubOwner =
      user?.role === "club_owner" ||
      (isAdmin && user?.adminType === "club_owner");
    const isModerator = isAdmin && user?.adminType === "moderator";
    const isClubAdmin =
      user?.role === "user" && user?.userType === "club_admin";
    // Club admins only have unrestricted booking for their assigned location
    const hasUnrestrictedBooking =
      isAdmin ||
      isClubOwner ||
      isModerator ||
      (isClubAdmin &&
        clubAdminLocationId &&
        selectedLocation?.id === clubAdminLocationId);

    // FIRST: Check if slot is already selected (for deselection) - this should happen before any other checks
    if (selectedCourtId === courtId && selectedSlots.includes(time)) {
      // Deselect if clicking a selected slot
      if (selectedSlots.length === 1) {
        // If it's the only slot, clear selection
        setSelectedSlots([]);
        setSelectedCourtId(null);
      } else {
        // Remove this slot
        setSelectedSlots(selectedSlots.filter((t) => t !== time));
      }
      return;
    }

    // Check daily limit for regular users (only when selecting NEW slots, not deselecting)
    if (!hasUnrestrictedBooking) {
      const newSlotCount =
        selectedSlots.length === 0 ? 1 : selectedSlots.length + 1;
      if (dailyHoursBooked + newSlotCount > 2) {
        const remaining = 2 - dailyHoursBooked;
        toast.error(
          `You have already booked ${dailyHoursBooked} hour${
            dailyHoursBooked !== 1 ? "s" : ""
          } today. You can only book up to ${remaining} more hour${
            remaining !== 1 ? "s" : ""
          }.`
        );
        return;
      }
    }

    if (!selectedCourtId) {
      // First slot selection
      setSelectedCourtId(courtId);
      setSelectedSlots([time]);
      return;
    }

    if (selectedCourtId !== courtId) {
      // Different court - reset selection
      setSelectedCourtId(courtId);
      setSelectedSlots([time]);
      return;
    }

    // Helper function to sort hours properly (0-5 come after 8-23)
    const sortHours = (times: string[]) => {
      return times.sort((a, b) => {
        const hourA = parseInt(a.split(":")[0]);
        const hourB = parseInt(b.split(":")[0]);
        // If both are in same range (both 0-5 or both 8-23), normal sort
        if ((hourA <= 5 && hourB <= 5) || (hourA >= 8 && hourB >= 8)) {
          return hourA - hourB;
        }
        // If A is 0-5 and B is 8-23, A comes after B
        if (hourA <= 5 && hourB >= 8) return 1;
        // If A is 8-23 and B is 0-5, A comes before B
        return -1;
      });
    };

    // For admins: allow selecting any slot (not just adjacent ones)
    if (hasUnrestrictedBooking) {
      // For admins, club owners, moderators, and club admins at their location: allow non-consecutive slots
      // Simply add the slot to selection if not already selected
      if (!selectedSlots.includes(time)) {
        setSelectedSlots(sortHours([...selectedSlots, time]));
      }
      return;
    }

    // For regular users: only allow consecutive slots
    // Helper function to check if two hours are adjacent (handles overnight wrap-around)
    const isAdjacentHour = (hour1: number, hour2: number) => {
      // Normal adjacent (e.g., 10 and 11, 22 and 23)
      if (Math.abs(hour1 - hour2) === 1) {
        // But exclude invalid boundaries
        if ((hour1 === 5 && hour2 === 6) || (hour1 === 6 && hour2 === 5))
          return false;
        if ((hour1 === 7 && hour2 === 8) || (hour1 === 8 && hour2 === 7))
          return false;
        return true;
      }
      // Overnight wrap-around: 23 and 0
      if ((hour1 === 23 && hour2 === 0) || (hour1 === 0 && hour2 === 23))
        return true;
      return false;
    };

    const timeHour = parseInt(time.split(":")[0]);
    const maxSlots = 2; // Regular users limited to 2 slots

    // Sort selected slots to get proper first and last
    const sortedSelected = sortHours([...selectedSlots]);
    const sortedHours = sortedSelected.map((t) => parseInt(t.split(":")[0]));
    const firstHour = sortedHours[0];
    const lastHour = sortedHours[sortedHours.length - 1];

    // Check if we can extend backward (before first hour)
    let canExtendBackward = false;
    if (isAdjacentHour(timeHour, firstHour)) {
      // Check if timeHour logically comes before firstHour
      if (firstHour >= 8 && timeHour === firstHour - 1) {
        canExtendBackward = true; // Normal case: e.g., firstHour=10, timeHour=9
      } else if (firstHour === 0 && timeHour === 23) {
        canExtendBackward = true; // Overnight: firstHour=0, timeHour=23
      }
    }

    // Check if we can extend forward (after last hour)
    let canExtendForward = false;
    if (isAdjacentHour(timeHour, lastHour)) {
      // Check if timeHour logically comes after lastHour
      if (lastHour < 5 && timeHour === lastHour + 1) {
        canExtendForward = true; // Normal case: e.g., lastHour=10, timeHour=11
      } else if (lastHour === 23 && timeHour === 0) {
        canExtendForward = true; // Overnight: lastHour=23, timeHour=0
      } else if (lastHour >= 8 && lastHour < 23 && timeHour === lastHour + 1) {
        canExtendForward = true; // Normal case in evening
      }
    }

    // Special case: if lastHour is 5, we can't extend forward (5 is the last slot)
    if (lastHour === 5 && timeHour !== 5) {
      // Can't extend beyond 5:00 AM
      if (timeHour > 5 || (timeHour >= 0 && timeHour < 5)) {
        // This would be trying to extend, but 5 is the limit
        if (canExtendForward) {
          toast.error("Booking cannot extend beyond 5:00 AM");
          return;
        }
      }
    }

    // Special case: if firstHour is 8, we can't extend backward (8 is the first slot)
    if (firstHour === 8 && timeHour < 8 && timeHour !== 7) {
      if (canExtendBackward) {
        toast.error("Booking cannot start before 8:00 AM");
        return;
      }
    }

    if (canExtendBackward) {
      // Extending backward
      if (selectedSlots.length >= maxSlots) {
        toast.error("Regular users can only book up to 2 hours");
        return;
      }
      setSelectedSlots(sortHours([time, ...selectedSlots]));
    } else if (canExtendForward) {
      // Extending forward
      if (selectedSlots.length >= maxSlots) {
        toast.error("Regular users can only book up to 2 hours");
        return;
      }
      setSelectedSlots(sortHours([...selectedSlots, time]));
    } else {
      // Not adjacent and not selected - reset to this slot
      setSelectedSlots([time]);
    }
  };

  // Helper to refresh availability + daily hours after a booking attempt
  const refreshAvailabilityAndDailyHours = async () => {
    if (!selectedLocation) return;

    const dateStr2 = toLocalDateString(selectedDate);
    const refreshUser = session?.user as any;
    const refreshIsAdmin = refreshUser?.role === "admin";
    const refreshIsClubOwner =
      refreshUser?.role === "club_owner" ||
      (refreshIsAdmin && refreshUser?.adminType === "club_owner");
    const refreshIsModerator =
      refreshIsAdmin && refreshUser?.adminType === "moderator";
    const refreshIsClubAdmin =
      refreshUser?.role === "user" && refreshUser?.userType === "club_admin";
    const refreshHasUnrestrictedBooking =
      refreshIsAdmin ||
      refreshIsClubOwner ||
      refreshIsModerator ||
      refreshIsClubAdmin;

    const nowIso = new Date().toISOString();
    const [availabilityRes, bookingsRes] = await Promise.all([
      fetch(
        `/api/availability?locationId=${selectedLocation.id}&date=${dateStr2}&now=${encodeURIComponent(
          nowIso
        )}`
      ),
      !refreshHasUnrestrictedBooking
        ? fetch(`/api/bookings?date=${dateStr2}`)
        : Promise.resolve(null),
    ]);

    if (availabilityRes.ok) {
      const data = await availabilityRes.json();
      setAvailability(data || []);
    }

    // Update daily hours booked
    if (bookingsRes && bookingsRes.ok) {
      const bookings = await bookingsRes.json();
      let totalHours = 0;
      // Only count confirmed bookings (exclude cancelled ones)
      bookings
        .filter((booking: any) => booking.status !== "cancelled")
        .forEach((booking: any) => {
          const start = parseInt(booking.startTime.split(":")[0]);
          const end = parseInt(booking.endTime.split(":")[0]);
          // Handle overnight bookings (e.g., 22:00 to 00:00 = 2 hours)
          const bookingHours = end < start ? 24 - start + end : end - start;
          totalHours += bookingHours;
        });
      setDailyHoursBooked(totalHours);
    }
  };

  const handleBooking = async () => {
    // Check authentication
    if (status === "unauthenticated") {
      toast.error("Please login to make a booking");
      router.push("/login");
      return;
    }

    if (
      !selectedLocation ||
      !selectedDate ||
      selectedSlots.length === 0 ||
      !selectedCourtId
    ) {
      toast.error("Please select a location, date, and time slot(s)");
      return;
    }

    setSubmitting(true);
    try {
      const court = selectedLocation.courts.find(
        (c) => c.id === selectedCourtId
      );

      if (!court) {
        throw new Error("Court not found");
      }

      // Format date as YYYY-MM-DD
      const dateStr = toLocalDateString(selectedDate);

      const user = session?.user as any;
      const isAdmin = user?.role === "admin";
      const isClubOwner =
        user?.role === "club_owner" ||
        (isAdmin && user?.adminType === "club_owner");
      const isModerator = isAdmin && user?.adminType === "moderator";
      const isClubAdmin =
        user?.role === "user" && user?.userType === "club_admin";
      // Club admins only have unrestricted booking for their assigned location
      const hasUnrestrictedBooking =
        isAdmin ||
        isClubOwner ||
        isModerator ||
        (isClubAdmin &&
          clubAdminLocationId &&
          selectedLocation?.id === clubAdminLocationId);
      const canSetCategory = isClubOwner || isModerator || isAdmin;
      const category = canSetCategory ? bookingCategory : "regular";

      // For users with unrestricted booking (admins, club owners, moderators, club admins):
      // create separate bookings for each selected slot (non-consecutive allowed)
      // For regular users: create one booking from first to last slot (consecutive only)
      if (hasUnrestrictedBooking) {
        // Create a booking for each selected slot (each slot = 1 hour), sequentially,
        // so we can handle partial success and clear error messages.
        const successfulBookings: any[] = [];
        const failedSlots: { slot: string; message: string }[] = [];

        for (const slotTime of selectedSlots) {
          const slotHour = parseInt(slotTime.split(":")[0]);
          let endHour = slotHour + 1;
          // Handle wrap-around: if slot is 23:00, end is 00:00 (next day)
          if (slotHour === 23) {
            endHour = 0;
          } else if (slotHour === 5) {
            endHour = 6; // If slot is 5:00, end is 6:00 (next day)
          }
          const endTime = `${endHour.toString().padStart(2, "0")}:00`;

          try {
            const response = await fetch("/api/bookings", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                locationId: selectedLocation.id,
                courtId: selectedCourtId,
                date: dateStr,
                startTime: slotTime,
                endTime: endTime,
                duration: 1,
                ...(isClubOwner && { category: category }), // Only send category for club owners
              }),
            });

            if (!response.ok) {
              let errorData: { error?: string; message?: string } = {};
              try {
                const text = await response.text();
                errorData = text
                  ? JSON.parse(text)
                  : { error: "Unknown error occurred" };
              } catch {
                errorData = {
                  error: `Failed to create booking (${response.status} ${response.statusText})`,
                };
              }
              const message =
                errorData?.error ?? errorData?.message ?? "Failed to create booking";
              console.error("Booking error:", errorData);
              failedSlots.push({ slot: slotTime, message });
              continue;
            }

            const booking = await response.json();
            successfulBookings.push(booking);
          } catch (err: any) {
            const message =
              err?.message || "Failed to create booking due to a network error";
            console.error("Booking error:", err);
            failedSlots.push({ slot: slotTime, message });
          }
        }

        if (successfulBookings.length > 0) {
          toast.success(
            `Successfully created ${successfulBookings.length} booking${
              successfulBookings.length !== 1 ? "s" : ""
            } for ${court.name} on ${formatDate(selectedDate)}`
          );
        }
        if (failedSlots.length > 0) {
          const first = failedSlots[0];
          const extra =
            failedSlots.length > 1
              ? ` (+${failedSlots.length - 1} more slot${
                  failedSlots.length - 1 !== 1 ? "s" : ""
                } failed)`
              : "";
          toast.error(`${first.message}${extra}`);
        }
        // If nothing succeeded, bail out before clearing selection
        if (successfulBookings.length === 0) {
          return;
        }
      } else {
        // Check if user can set category
        const user = session?.user as any;
        const isClubOwner =
          user?.role === "club_owner" ||
          (isAdmin && user?.adminType === "club_owner");
        const isModerator = isAdmin && user?.adminType === "moderator";
        const canSetCategory = isClubOwner || isModerator || isAdmin;
        const category = canSetCategory ? bookingCategory : "regular";

        // Regular users: create one booking from first to last slot
        // Sort slots properly (0-5 come after 8-23)
        const sortedSlots = [...selectedSlots].sort((a, b) => {
          const hourA = parseInt(a.split(":")[0]);
          const hourB = parseInt(b.split(":")[0]);
          // If both are in same range (both 0-5 or both 8-23), normal sort
          if ((hourA <= 5 && hourB <= 5) || (hourA >= 8 && hourB >= 8)) {
            return hourA - hourB;
          }
          // If A is 0-5 and B is 8-23, A comes after B
          if (hourA <= 5 && hourB >= 8) return 1;
          // If A is 8-23 and B is 0-5, A comes before B
          return -1;
        });

        const startTime = sortedSlots[0];
        const lastSlotHour = parseInt(
          sortedSlots[sortedSlots.length - 1].split(":")[0]
        );
        // Calculate end hour - handle wrap-around
        let endHour = lastSlotHour + 1;
        // If last slot is 23:00, end time wraps to 00:00 (next day)
        if (lastSlotHour === 23) {
          endHour = 0; // Wrap to 00:00 next day
        } else if (lastSlotHour === 5) {
          endHour = 6; // If last slot is 5:00, end time is 6:00 (next day)
        }
        const endTime = `${endHour.toString().padStart(2, "0")}:00`;

        // Ensure times are in HH:00 format
        const formattedStartTime = startTime.includes(":")
          ? startTime
          : `${startTime.padStart(2, "0")}:00`;
        const formattedEndTime = endTime.includes(":")
          ? endTime
          : `${endTime.padStart(2, "0")}:00`;

        const requestBody = {
          locationId: selectedLocation.id,
          courtId: selectedCourtId,
          date: dateStr,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
          duration: selectedSlots.length,
          ...(isClubOwner && { category: category }), // Only send category for club owners
        };

        console.log("Booking request:", requestBody);

        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          let errorData;
          try {
            const text = await response.text();
            console.log("Error response text:", text);
            errorData = text
              ? JSON.parse(text)
              : { error: "Unknown error occurred" };
          } catch (parseError) {
            console.error("Error parsing response:", parseError);
            errorData = {
              error: `Failed to create booking (${response.status} ${response.statusText})`,
            };
          }
          console.error("Booking error:", errorData);
          throw new Error(errorData.error || "Failed to create booking");
        }

        const booking = await response.json();

        toast.success(
          `Booking confirmed! Court ${court.name} on ${formatDate(
            selectedDate
          )} from ${startTime} to ${endTime}`
        );
      }

      // Reset selection
      setSelectedSlots([]);
      setSelectedCourtId(null);

      // Refresh availability and daily hours after any successful booking
      await refreshAvailabilityAndDailyHours();
    } catch (e: any) {
      console.error("Booking error:", e);
      toast.error(e?.message || "Failed to create booking");
      // Even on error, refresh in case state on the server changed (e.g. conflict)
      await refreshAvailabilityAndDailyHours();
    } finally {
      setSubmitting(false);
    }
  };

  // Location Selection View
  if (!selectedLocation) {
    return (
      <>
        <Navbar />
        <div className="bg-gradient-to-b from-[#252015] to-[#1C1810] py-8 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-4xl mb-4 text-white font-bold">
                {t.selectLocation}
              </h1>
              <p className="text-xl text-white/75">
                {t.choosePreferredLocation}
              </p>
            </div>
            {loading && (
              <div className="text-white/75">Loading locations...</div>
            )}
            {error && <div className="text-[#DC2626] mb-4">{error}</div>}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <Card
                  key={location.id}
                  className="overflow-hidden hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] transition-all duration-150 cursor-pointer bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]"
                >
                  <div className="relative h-48">
                    <img
                      src={
                        location.image ||
                        "https://images.unsplash.com/photo-1658491830143-72808ca237e3?auto=format&fit=crop&w=1200&q=60"
                      }
                      alt={location.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-[#D4A817] text-[#121212] font-semibold">
                        {location.courts.length} {t.courts}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader>
                    <CardTitle className="text-xl text-white">{location.name}</CardTitle>
                    <div className="space-y-1">
                      <div className="flex items-start text-sm text-white/75">
                        <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0 text-[#D4A817]" />
                        {location.address}
                      </div>
                      {location.owner?.phone && (
                        <div className="flex items-center text-sm text-white/75">
                          <Phone className="h-4 w-4 mr-1 flex-shrink-0 text-[#D4A817]" />
                          <span>{location.owner.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm mb-2 text-white">{t.courts}</h4>
                        <div className="space-y-1">
                          {location.courts.map((court) => (
                            <div
                              key={court.id}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-white/75">
                                {court.name} - {court.type}
                              </span>
                              <span className="text-[#D4A817] font-semibold">
                                {court.pricePerHour} {t.egp}/{t.hour}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {(location.instagram ||
                        location.facebook ||
                        location.tiktok ||
                        location.googleMapsUrl) && (
                        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[rgba(212,168,23,0.12)]">
                          {location.instagram && (
                            <a
                              href={location.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#D4A817] hover:text-[#F9D923] flex items-center gap-1 transition-colors duration-150"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="h-3 w-3" />
                              Instagram
                            </a>
                          )}
                          {location.facebook && (
                            <a
                              href={location.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#D4A817] hover:text-[#F9D923] flex items-center gap-1 transition-colors duration-150"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="h-3 w-3" />
                              Facebook
                            </a>
                          )}
                          {location.tiktok && (
                            <a
                              href={location.tiktok}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#D4A817] hover:text-[#F9D923] flex items-center gap-1 transition-colors duration-150"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="h-3 w-3" />
                              TikTok
                            </a>
                          )}
                          {location.googleMapsUrl && (
                            <a
                              href={location.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#D4A817] hover:text-[#F9D923] flex items-center gap-1 transition-colors duration-150"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MapPin className="h-3 w-3" />
                              Google Maps
                            </a>
                          )}
                        </div>
                      )}

                      <Button
                        className="w-full bg-[#F9D923] hover:bg-[#FBE156] text-[#121212] font-semibold shadow-[0_10px_30px_rgba(249,217,35,0.35)]"
                        onClick={() => setSelectedLocation(location)}
                      >
                        {t.selectLocation}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Court Booking View
  const location = selectedLocation as Location;
  return (
    <>
      <Navbar />
        <div className="bg-gradient-to-b from-[#252015] to-[#1C1810] py-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Button
              variant="outline"
              className="mb-4 border-[rgba(212,168,23,0.3)] text-white hover:border-[#D4A817] hover:text-[#D4A817] hover:bg-[rgba(212,168,23,0.08)]"
              onClick={() => setSelectedLocation(null)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.backToLocations}
            </Button>

            <h1 className="text-4xl mb-4 text-white font-bold">{location.name}</h1>
            <p className="text-xl text-white/75 flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-[#D4A817]" />
              {location.address}
            </p>
          </div>

          {/* Date Selection */}
          <Card className="mb-8 bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Calendar className="mr-2 h-5 w-5 text-[#D4A817]" />
                {t.selectDate}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Date Picker - Visible on all devices */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <Label htmlFor="date-picker" className="text-sm font-medium">
                    Select Date:
                  </Label>
                  <div className="relative w-full sm:w-auto max-w-xs">
                    <Input
                      ref={dateInputRef}
                      id="date-picker"
                      type="date"
                      value={dateInputValue}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        if (!isNaN(newDate.getTime())) {
                          setIsDatePickerActive(false);
                          // Use setTimeout to delay state update until after picker closes
                          setTimeout(() => {
                            setSelectedDate(newDate);
                          }, 0);
                        }
                      }}
                      onTouchStart={(e) => {
                        // Prevent any event propagation
                        e.stopPropagation();
                        setIsDatePickerActive(true);
                        // Force focus immediately and try to show picker
                        const input = e.currentTarget as HTMLInputElement;
                        // Use showPicker() if available (modern browsers)
                        if (input.showPicker) {
                          e.preventDefault();
                          input.focus();
                          setTimeout(() => {
                            input.showPicker();
                          }, 0);
                        } else {
                          // Fallback for older browsers
                          setTimeout(() => {
                            input.focus();
                          }, 0);
                        }
                      }}
                      onFocus={(e) => {
                        setIsDatePickerActive(true);
                      }}
                      onBlur={(e) => {
                        // Don't handle blur immediately - let the native picker work
                        // Only mark as inactive after a delay
                        setTimeout(() => {
                          const input = e.target as HTMLInputElement;
                          // If value changed, user selected a date
                          if (input.value && input.value !== dateInputValue) {
                            setIsDatePickerActive(false);
                          } else if (isDatePickerActive) {
                            // If still active and no change, try to keep it open
                            // This handles the case where picker opens but immediately closes
                            const activeElement = document.activeElement;
                            if (
                              activeElement !== input &&
                              activeElement !== document.body
                            ) {
                              // Something else got focus, allow it
                              setIsDatePickerActive(false);
                            } else {
                              // Try to refocus to keep picker open
                              input.focus();
                            }
                          }
                        }, 200);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDatePickerActive(true);
                        e.currentTarget.focus();
                      }}
                      onMouseDown={(e) => {
                        // Don't prevent default - let the native behavior work
                        setIsDatePickerActive(true);
                      }}
                      min={minDateValue}
                      className="w-full bg-[#1A1612]/90 border-[rgba(212,168,23,0.2)] text-white focus-visible:border-[#D4A817] focus-visible:ring-[#D4A817] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#252015] selection:bg-[#D4A817]/30 selection:text-white"
                      style={{
                        fontSize: "16px",
                      }}
                    />
                  </div>
                </div>

                {/* Quick Week View - 4 days on mobile, 7 on desktop */}
                <div>
                  <p className="text-sm text-white/75 mb-2">Quick Select:</p>
                  {/* Mobile: Show only 4 days */}
                  <div className="grid grid-cols-4 md:hidden gap-2">
                    {mobileWeekDays.map((day, index) => (
                      <Button
                        key={index}
                        variant={
                          selectedDate.toDateString() === day.toDateString()
                            ? "default"
                            : "outline"
                        }
                        className={`p-4 h-auto flex flex-col ${
                          selectedDate.toDateString() === day.toDateString()
                            ? "bg-[#F9D923] hover:bg-[#FBE156] text-[#121212] font-semibold"
                            : "hover:bg-[rgba(212,168,23,0.1)] text-white/75 border-[rgba(212,168,23,0.2)]"
                        }`}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className="text-xs opacity-75 mb-1">
                          {day.toLocaleDateString("en", {
                            weekday: "short",
                          })}
                        </div>
                        <div className="text-lg">{day.getDate()}</div>
                        <div className="text-xs opacity-75">
                          {day.toLocaleDateString("en", {
                            month: "short",
                          })}
                        </div>
                      </Button>
                    ))}
                  </div>
                  {/* Desktop: Show 7 days */}
                  <div className="hidden md:grid md:grid-cols-7 gap-2">
                    {weekDays.map((day, index) => (
                      <Button
                        key={index}
                        variant={
                          selectedDate.toDateString() === day.toDateString()
                            ? "default"
                            : "outline"
                        }
                        className={`p-4 h-auto flex flex-col ${
                          selectedDate.toDateString() === day.toDateString()
                            ? "bg-[#F9D923] hover:bg-[#FBE156] text-[#121212] font-semibold"
                            : "hover:bg-[rgba(212,168,23,0.1)] text-white/75 border-[rgba(212,168,23,0.2)]"
                        }`}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className="text-xs opacity-75 mb-1">
                          {day.toLocaleDateString("en", {
                            weekday: "short",
                          })}
                        </div>
                        <div className="text-lg">{day.getDate()}</div>
                        <div className="text-xs opacity-75">
                          {day.toLocaleDateString("en", {
                            month: "short",
                          })}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <p className="text-sm text-white/75 text-center pt-2 border-t border-[rgba(212,168,23,0.12)]">
                  {t.selectedDate}: {formatDate(selectedDate)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Time Slots Grid */}
          <Card className="mb-8 bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Clock className="mr-2 h-5 w-5 text-[#D4A817]" />
                {t.availableTimes} - {formatDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              {/* Mobile: Two courts side by side with compact time slot grid */}
              <div className="md:hidden">
                <div className="grid grid-cols-2 gap-2.5 px-3 pb-4">
                  {location.courts.map((court) => {
                    // Generate hours from 00:00 to 23:00 (full day, same as desktop) so 06:00 and 07:00 show
                    const hours: number[] = [];
                    for (let h = 0; h < 24; h++) {
                      hours.push(h);
                    }

                    return (
                      <div
                        key={court.id}
                        className="bg-[#1A1612]/90 rounded-xl border border-[rgba(212,168,23,0.12)] shadow-[0_4px_12px_rgba(212,168,23,0.1)] overflow-hidden"
                      >
                        {/* Court Header - Compact */}
                        <div className="bg-gradient-to-br from-[rgba(212,168,23,0.15)] to-[rgba(212,168,23,0.08)] px-2.5 py-2 border-b border-[rgba(212,168,23,0.12)]">
                          <h3 className="font-semibold text-white text-xs leading-tight">
                            {court.name}
                          </h3>
                          <p className="text-[10px] text-white/75 mt-0.5 leading-tight">
                            {court.type}
                          </p>
                          <p className="text-[10px] font-bold text-[#D4A817] mt-1">
                            {court.pricePerHour} {t.egp}
                          </p>
                        </div>

                        {/* Time Slots Grid - Compact 2-column grid */}
                        <div className="p-2 max-h-[70vh] overflow-y-auto scrollbar-hide">
                          <div className="grid grid-cols-2 gap-1">
                            {hours.map((hour) => {
                              const time = `${hour
                                .toString()
                                .padStart(2, "0")}:00`;
                              const slot = availability.find(
                                (s) => s.time === time && s.courtId === court.id
                              );
                              const isSelected = isSlotSelected(time, court.id);

                              const timeHour = parseInt(time.split(":")[0]);
                              const selectedHours = selectedSlots.map((t) =>
                                parseInt(t.split(":")[0])
                              );
                              const minHour =
                                selectedHours.length > 0
                                  ? Math.min(...selectedHours)
                                  : null;
                              const maxHour =
                                selectedHours.length > 0
                                  ? Math.max(...selectedHours)
                                  : null;

                              const isAdjacentHour = (
                                h1: number,
                                h2: number
                              ) => {
                                if (Math.abs(h1 - h2) === 1) return true;
                                if (
                                  (h1 === 23 && h2 === 0) ||
                                  (h1 === 0 && h2 === 23)
                                )
                                  return true;
                                return false;
                              };

                              const isAdjacent =
                                minHour !== null &&
                                maxHour !== null &&
                                selectedCourtId === court.id &&
                                (isAdjacentHour(timeHour, minHour) ||
                                  isAdjacentHour(timeHour, maxHour)) &&
                                !selectedSlots.includes(time);

                              const isBooked = slot?.reason === "booked";
                              const isPast = slot?.reason === "past";
                              const isReserved = slot?.reason === "reserved";
                              const isClosed = slot?.reason === "closed";

                              return (
                                <button
                                  key={time}
                                  title={
                                    isReserved
                                      ? "Reserved (fixed)"
                                      : isBooked
                                      ? "Booked"
                                      : isPast
                                      ? "Past"
                                      : isClosed
                                      ? "Outside opening hours"
                                      : undefined
                                  }
                                  disabled={
                                    (!slot?.available && !isSelected) ||
                                    loadingAvailability
                                  }
                                  onClick={() => {
                                    if (
                                      (slot?.available || isSelected) &&
                                      !loadingAvailability
                                    ) {
                                      handleSlotClick(time, court.id);
                                    }
                                  }}
                                  className={`
                                    h-8 rounded-md text-[11px] font-semibold transition-all duration-150
                                    active:scale-95 touch-manipulation
                                    ${
                                      loadingAvailability
                                        ? "bg-[rgba(255,255,255,0.05)] text-white/40 cursor-wait"
                                        : isPast
                                        ? "bg-[rgba(255,255,255,0.05)] text-white/40 cursor-not-allowed opacity-50"
                                        : isClosed
                                        ? "bg-[rgba(255,255,255,0.03)] text-white/30 border border-[rgba(255,255,255,0.05)] cursor-not-allowed opacity-60"
                                        : isReserved
                                        ? "bg-[rgba(251,146,60,0.15)] text-[#FB923C] border border-[rgba(251,146,60,0.3)] cursor-not-allowed"
                                        : isBooked
                                        ? "bg-[rgba(220,38,38,0.15)] text-[#DC2626] border border-[rgba(220,38,38,0.3)] cursor-not-allowed"
                                        : !slot || !slot.available
                                        ? "bg-[rgba(220,38,38,0.15)] text-[#DC2626] border border-[rgba(220,38,38,0.3)] cursor-not-allowed"
                                        : isSelected
                                        ? "bg-[#F9D923] text-[#121212] shadow-[0_4px_12px_rgba(249,217,35,0.3)] border-2 border-[#D4A817]"
                                        : isAdjacent && slot.available
                                        ? "bg-[rgba(212,168,23,0.2)] text-[#D4A817] border-2 border-[#D4A817]"
                                        : slot.available
                                        ? "bg-[rgba(212,168,23,0.1)] text-[#D4A817] border border-[rgba(212,168,23,0.3)] active:bg-[rgba(212,168,23,0.15)]"
                                        : "bg-[rgba(255,255,255,0.05)] text-white/40 border border-[rgba(255,255,255,0.08)]"
                                    }
                                  `}
                                >
                                  {loadingAvailability ? (
                                    <span className="text-[9px]">...</span>
                                  ) : (
                                    time
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop: Grid layout */}
              <div className="hidden md:grid md:grid-cols-2 md:gap-6">
                {location.courts.map((court) => {
                  // Generate hours from 00:00 to 23:00 (full day)
                  const hours: number[] = [];
                  for (let h = 0; h < 24; h++) {
                    hours.push(h);
                  }

                  return (
                    <Card key={court.id} className="border-2 border-[rgba(212,168,23,0.12)] bg-[#1A1612]/90">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-white">{court.name}</CardTitle>
                        <div className="text-sm text-white/75 mt-1">
                          {court.type}
                        </div>
                        <div className="text-sm text-[#D4A817] font-semibold mt-1">
                          {court.pricePerHour} {t.egp}/{t.hour}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {hours.map((hour) => {
                            const time = `${hour
                              .toString()
                              .padStart(2, "0")}:00`;
                            const slot = availability.find(
                              (s) => s.time === time && s.courtId === court.id
                            );
                            const isSelected = isSlotSelected(time, court.id);

                            // Check if this slot is adjacent to selected slots (for visual feedback)
                            const timeHour = parseInt(time.split(":")[0]);
                            const selectedHours = selectedSlots.map((t) =>
                              parseInt(t.split(":")[0])
                            );
                            const minHour =
                              selectedHours.length > 0
                                ? Math.min(...selectedHours)
                                : null;
                            const maxHour =
                              selectedHours.length > 0
                                ? Math.max(...selectedHours)
                                : null;

                            // Helper to check if hours are adjacent (handles overnight)
                            const isAdjacentHour = (h1: number, h2: number) => {
                              if (Math.abs(h1 - h2) === 1) return true;
                              if (
                                (h1 === 23 && h2 === 0) ||
                                (h1 === 0 && h2 === 23)
                              )
                                return true;
                              return false;
                            };

                            const isAdjacent =
                              minHour !== null &&
                              maxHour !== null &&
                              selectedCourtId === court.id &&
                              (isAdjacentHour(timeHour, minHour) ||
                                isAdjacentHour(timeHour, maxHour)) &&
                              !selectedSlots.includes(time);

                            // Determine styling based on slot status
                            const isBooked = slot?.reason === "booked";
                            const isPast = slot?.reason === "past";
                            const isReserved = slot?.reason === "reserved"; // Fixed booking
                            const isClosed = slot?.reason === "closed";

                            return (
                              <Button
                                key={time}
                                variant={isSelected ? "default" : "outline"}
                                className={`w-full h-10 text-sm font-medium relative ${
                                  loadingAvailability
                                    ? "bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-white/40 cursor-wait"
                                    : isPast
                                    ? "bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-white/40 cursor-not-allowed"
                                    : isClosed
                                    ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)] text-white/30 cursor-not-allowed"
                                    : isReserved
                                    ? "bg-[rgba(251,146,60,0.15)] border-[rgba(251,146,60,0.3)] text-[#FB923C] cursor-not-allowed"
                                    : isBooked
                                    ? "bg-[rgba(220,38,38,0.15)] border-[rgba(220,38,38,0.3)] text-[#DC2626] cursor-not-allowed"
                                    : !slot || !slot.available
                                    ? "bg-[rgba(220,38,38,0.15)] border-[rgba(220,38,38,0.3)] text-[#DC2626] cursor-not-allowed"
                                    : isSelected
                                    ? "bg-[#F9D923] hover:bg-[#FBE156] text-[#121212] shadow-[0_4px_12px_rgba(249,217,35,0.3)]"
                                    : isAdjacent && slot.available
                                    ? "bg-[rgba(212,168,23,0.2)] border-[#D4A817] text-[#D4A817] hover:bg-[rgba(212,168,23,0.25)] border-2"
                                    : slot.available
                                    ? "bg-[rgba(212,168,23,0.1)] border-[rgba(212,168,23,0.3)] text-[#D4A817] hover:bg-[rgba(212,168,23,0.15)]"
                                    : "bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-white/40"
                                }`}
                                title={
                                  isReserved
                                    ? "Reserved by fixed booking (recurring weekly)"
                                    : isBooked
                                    ? "Already booked"
                                    : isPast
                                    ? "Time slot has passed"
                                    : isClosed
                                    ? "Outside opening hours"
                                    : undefined
                                }
                                disabled={
                                  (!slot?.available && !isSelected) ||
                                  loadingAvailability
                                }
                                onClick={() => {
                                  // Allow clicking if slot is available OR if it's already selected (for deselection)
                                  if (
                                    (slot?.available || isSelected) &&
                                    !loadingAvailability
                                  ) {
                                    handleSlotClick(time, court.id);
                                  }
                                }}
                              >
                                {loadingAvailability ? (
                                  <span className="text-xs">Loading...</span>
                                ) : (
                                  <span className="flex items-center justify-center gap-1">
                                    {isReserved && (
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                        />
                                      </svg>
                                    )}
                                    {time}
                                  </span>
                                )}
                              </Button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-[#1A1612]/90 rounded-lg border border-[rgba(212,168,23,0.12)]">
                <h4 className="text-sm mb-3 font-semibold text-white">Legend</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 flex-shrink-0 bg-[rgba(212,168,23,0.1)] border border-[rgba(212,168,23,0.3)] rounded"></div>
                    <span className="text-white/75">{t.available} — click to select</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 flex-shrink-0 bg-[#F9D923] rounded"></div>
                    <span className="text-white/75">Selected — click adjacent to extend</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 flex-shrink-0 bg-[rgba(212,168,23,0.1)] border-2 border-[#D4A817] rounded"></div>
                    <span className="text-white/75">Adjacent — click to extend</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 flex-shrink-0 bg-[rgba(251,146,60,0.15)] border border-[rgba(251,146,60,0.3)] rounded"></div>
                    <span className="text-white/75">Reserved (Fixed)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 flex-shrink-0 bg-[rgba(220,38,38,0.15)] border border-[rgba(220,38,38,0.3)] rounded"></div>
                    <span className="text-white/75">{t.booked}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 flex-shrink-0 bg-[rgba(255,255,255,0.05)] border border-[rgba(212,168,23,0.12)] rounded"></div>
                    <span className="text-white/75">Past</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 flex-shrink-0 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded"></div>
                    <span className="text-white/75">Closed (outside opening hours)</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[rgba(212,168,23,0.12)] text-xs text-white/55">
                    {(session?.user as any)?.role === "admin"
                      ? "Admins can select any slots (non-consecutive allowed)"
                      : "Regular users can book 1 or 2 consecutive hours"}
                  </div>
                <div className="mt-2 pt-2 border-t border-[rgba(212,168,23,0.12)] text-xs text-[#FB923C] font-medium">
                  ⚠️ Bookings can only be cancelled if they are at least{" "}
                  {selectedLocation?.cancellationHours ?? 4} hour
                  {(selectedLocation?.cancellationHours ?? 4) !== 1
                    ? "s"
                    : ""}{" "}
                  in the future
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Booking Limit Info for Regular Users */}
          {status === "authenticated" &&
            (() => {
              const user = session?.user as any;
              const isAdmin = user?.role === "admin";
              const isClubOwner =
                user?.role === "club_owner" ||
                (isAdmin && user?.adminType === "club_owner");
              const isModerator = isAdmin && user?.adminType === "moderator";
              const isClubAdmin =
                user?.role === "user" && user?.userType === "club_admin";
              // Club admins only have unrestricted booking for their assigned location
              const hasUnrestrictedBooking =
                isAdmin ||
                isClubOwner ||
                isModerator ||
                (isClubAdmin &&
                  clubAdminLocationId &&
                  selectedLocation?.id === clubAdminLocationId);
              return !hasUnrestrictedBooking;
            })() && (
              <Card className="mb-4 border-[rgba(212,168,23,0.3)] bg-[rgba(212,168,23,0.1)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#D4A817]">
                        Daily Booking Limit
                      </p>
                      <p className="text-xs text-[#F9D923]/90 mt-1">
                        {(() => {
                          const totalIfConfirmed =
                            dailyHoursBooked + selectedSlots.length;
                          const remaining = 2 - totalIfConfirmed;
                          return (
                            <>
                              You have booked {dailyHoursBooked} hour
                              {dailyHoursBooked !== 1 ? "s" : ""} today
                              {selectedSlots.length > 0 && (
                                <span className="ml-1 font-semibold">
                                  + {selectedSlots.length} hour
                                  {selectedSlots.length !== 1 ? "s" : ""}{" "}
                                  selected
                                </span>
                              )}
                              {remaining > 0 && (
                                <span className="ml-1">
                                  ({remaining} hour{remaining !== 1 ? "s" : ""}{" "}
                                  remaining)
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#D4A817]">
                        {dailyHoursBooked + selectedSlots.length}/2
                      </div>
                      <div className="text-xs text-[#F9D923]/90">hours</div>
                    </div>
                  </div>
                  {dailyHoursBooked + selectedSlots.length >= 2 && (
                    <div className="mt-3 p-2 bg-[rgba(251,146,60,0.15)] border border-[rgba(251,146,60,0.3)] rounded text-xs text-[#FB923C]">
                      ⚠️{" "}
                      {dailyHoursBooked + selectedSlots.length === 2 ? (
                        <>
                          You have reached your daily limit of 2 hours with this
                          selection. If you need more time, please contact the
                          club owner for this location
                          {location.owner?.phone ? (
                            <>
                              {" "}
                              at{" "}
                              <a
                                href={`tel:${location.owner.phone}`}
                                className="font-semibold underline underline-offset-2 hover:text-[#FBE156]"
                              >
                                {location.owner.phone}
                              </a>
                              .
                            </>
                          ) : (
                            "."
                          )}
                        </>
                      ) : (
                        "This selection would exceed your daily limit of 2 hours. Please reduce your selection."
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          {/* Booking Summary */}
          {selectedSlots.length > 0 && selectedCourtId && (
            <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
              <CardHeader>
                <CardTitle className="text-white">{t.bookingSummary}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm text-white/75 mb-1">
                        {t.location}
                      </h4>
                      <p className="text-white">{location.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm text-white/75 mb-1">{t.court}</h4>
                      <p className="text-white">
                        {
                          location.courts.find((c) => c.id === selectedCourtId)
                            ?.name
                        }
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm text-white/75 mb-1">{t.date}</h4>
                      <p className="text-white">{formatDate(selectedDate)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm text-white/75 mb-1">{t.time}</h4>
                      <p className="text-white">
                        {(() => {
                          // Sort slots properly for display
                          const sorted = [...selectedSlots].sort((a, b) => {
                            const hourA = parseInt(a.split(":")[0]);
                            const hourB = parseInt(b.split(":")[0]);
                            if (
                              (hourA <= 5 && hourB <= 5) ||
                              (hourA >= 8 && hourB >= 8)
                            ) {
                              return hourA - hourB;
                            }
                            if (hourA <= 5 && hourB >= 8) return 1;
                            return -1;
                          });
                          const startTime = sorted[0];
                          const lastHour = parseInt(
                            sorted[sorted.length - 1].split(":")[0]
                          );
                          let endHour = lastHour + 1;
                          if (lastHour === 23) {
                            endHour = 0; // Wrap to 00:00 next day
                          } else if (lastHour === 5) {
                            endHour = 6; // If last slot is 5:00, end is 6:00 (next day)
                          }
                          const endTime = `${endHour
                            .toString()
                            .padStart(2, "0")}:00`;
                          // If booking goes past midnight, show next day indicator
                          if (
                            lastHour <= 5 &&
                            parseInt(startTime.split(":")[0]) >= 8
                          ) {
                            return `${startTime} - ${endTime} (next day)`;
                          }
                          return `${startTime} - ${endTime}`;
                        })()}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm text-white/75 mb-1">Duration</h4>
                      <p className="text-white">
                        {selectedSlots.length} hour
                        {selectedSlots.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm text-white/75 mb-1">
                        Selected Slots
                      </h4>
                      <p className="text-xs text-white/55">
                        {(() => {
                          // Sort slots properly (0-5 come after 8-23)
                          return [...selectedSlots]
                            .sort((a, b) => {
                              const hourA = parseInt(a.split(":")[0]);
                              const hourB = parseInt(b.split(":")[0]);
                              if (
                                (hourA <= 5 && hourB <= 5) ||
                                (hourA >= 8 && hourB >= 8)
                              ) {
                                return hourA - hourB;
                              }
                              if (hourA <= 5 && hourB >= 8) return 1;
                              return -1;
                            })
                            .join(", ");
                        })()}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[rgba(212,168,23,0.12)] pt-4">
                    <div className="mb-2">
                      <p className="text-sm text-white/75 mb-2">
                        {(session?.user as any)?.role === "admin"
                          ? "Click any available slot to select it. You can select non-consecutive slots."
                          : "Click the slot before or after to extend to 2 hours"}
                      </p>
                    </div>
                    <div className="border-t border-[rgba(212,168,23,0.12)] pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg text-white">{t.totalPrice}</span>
                        <span className="text-2xl text-[#D4A817] font-bold">
                          {(location.courts.find(
                            (c) => c.id === selectedCourtId
                          )?.pricePerHour || 0) * selectedSlots.length}{" "}
                          {t.egp}
                        </span>
                      </div>
                      <div className="text-sm text-white/55 mt-1">
                        {
                          location.courts.find((c) => c.id === selectedCourtId)
                            ?.pricePerHour
                        }{" "}
                        {t.egp} × {selectedSlots.length} hour
                        {selectedSlots.length > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Category Selector - Club Owners and Moderators Only - Before Confirm Button */}
                  {(() => {
                    const user = session?.user as any;
                    const isAdmin = user?.role === "admin";
                    const isClubOwner =
                      user?.role === "club_owner" ||
                      (isAdmin && user?.adminType === "club_owner");
                    const isModerator =
                      isAdmin && user?.adminType === "moderator";
                    return isClubOwner || isModerator || isAdmin;
                  })() && (
                    <div className="border-t border-[rgba(212,168,23,0.12)] pt-4">
                      <Label className="text-sm font-medium mb-2 block text-white">
                        Booking Category
                      </Label>
                      <Select
                        value={bookingCategory}
                        onValueChange={setBookingCategory}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="academy">Academy</SelectItem>
                          <SelectItem value="tournament">Tournament</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-white/55 mt-2">
                        Selected:{" "}
                        <span className="font-semibold capitalize text-white">
                          {bookingCategory}
                        </span>
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full bg-[#F9D923] hover:bg-[#FBE156] text-[#121212] font-semibold shadow-[0_10px_30px_rgba(249,217,35,0.35)]"
                    onClick={handleBooking}
                    disabled={submitting}
                  >
                    {submitting ? "Processing..." : t.confirmBooking}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

export default function Page() {
  const t = useTranslations("en");
  return <BookingPage t={t} />;
}
