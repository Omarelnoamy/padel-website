"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Wallet,
  MapPin,
  Filter,
  RefreshCw,
  Phone,
  Smartphone,
  Save,
  X,
  RotateCcw,
  CheckCircle,
  Clock,
  Lock,
  Pause,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import MonthlyFinanceChart from "@/components/financial-charts/MonthlyFinanceChart";
import IncomeExpenseTrendChart from "@/components/financial-charts/IncomeExpenseTrendChart";
import ProfitByLocationChart from "@/components/financial-charts/ProfitByLocationChart";
import RevenueSourceChart from "@/components/financial-charts/RevenueSourceChart";
import UserTypeBookingChart from "@/components/financial-charts/UserTypeBookingChart";

type Location = {
  id: string;
  name: string;
  address: string;
  image?: string | null;
  cancellationHours?: number;
  instapayPhone?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  owner?: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  } | null;
  courts: Court[];
};

type Court = {
  id: string;
  name: string;
  type: string;
  pricePerHour: number;
};

type Booking = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  category?: string; // regular, academy, tournament
  cancelledByUserId?: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  cancelledBy?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    adminType?: string | null;
  } | null;
  location: {
    id: string;
    name: string;
  };
  court: {
    id: string;
    name: string;
    type: string;
    pricePerHour: number;
  };
};

type FinancialSummary = {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  byLocation: Array<{
    locationId: string;
    locationName: string;
    income: number;
    expenses: number;
    profit: number;
  }>;
  byCourt: Array<{
    courtId: string;
    courtName: string;
    locationName: string;
    income: number;
    expenses: number;
    profit: number;
  }>;
};

type Transaction = {
  id: string;
  locationId: string;
  courtId: string | null;
  amount: number;
  type: "income" | "expense";
  source: "booking" | "manual";
  description: string | null;
  transactionDate: string;
  location: {
    id: string;
    name: string;
  };
  court: {
    id: string;
    name: string;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

export default function ClubOwnerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "overview" | "bookings" | "transactions" | "locations" | "fixed-bookings"
  >("overview");

  // Overview state
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [userTypeStats, setUserTypeStats] = useState<any>(null);
  const [userTypeStatsLoading, setUserTypeStatsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingDateFilter, setBookingDateFilter] = useState({
    startDate: "",
    endDate: "",
  });

  // Group bookings by date and status
  const groupedBookings = useMemo(() => {
    // Filter bookings by date range if filters are set
    let filteredBookings = bookings;
    if (bookingDateFilter.startDate || bookingDateFilter.endDate) {
      filteredBookings = bookings.filter((booking) => {
        const bookingDate = new Date(booking.date);
        bookingDate.setHours(0, 0, 0, 0); // Reset time to start of day

        if (bookingDateFilter.startDate) {
          const startDate = new Date(bookingDateFilter.startDate);
          startDate.setHours(0, 0, 0, 0);
          if (bookingDate < startDate) return false;
        }

        if (bookingDateFilter.endDate) {
          const endDate = new Date(bookingDateFilter.endDate);
          endDate.setHours(23, 59, 59, 999); // End of day
          if (bookingDate > endDate) return false;
        }

        return true;
      });
    }

    const grouped: Record<
      string,
      {
        confirmed: Booking[];
        cancelled: Booking[];
        pending: Booking[];
        date: Date;
      }
    > = {};

    filteredBookings.forEach((booking) => {
      const bookingDate = new Date(booking.date);
      const dateKey = bookingDate.toLocaleDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          confirmed: [],
          cancelled: [],
          pending: [],
          date: bookingDate,
        };
      }
      if (booking.status === "confirmed") {
        grouped[dateKey].confirmed.push(booking);
      } else if (booking.status === "cancelled") {
        grouped[dateKey].cancelled.push(booking);
      } else {
        grouped[dateKey].pending.push(booking);
      }
    });

    // Sort bookings within each group by time (ascending - earliest first)
    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].confirmed.sort((a, b) => {
        // Compare by startTime
        const timeA = a.startTime || "";
        const timeB = b.startTime || "";
        return timeA.localeCompare(timeB);
      });
      grouped[dateKey].cancelled.sort((a, b) => {
        const timeA = a.startTime || "";
        const timeB = b.startTime || "";
        return timeA.localeCompare(timeB);
      });
      grouped[dateKey].pending.sort((a, b) => {
        const timeA = a.startTime || "";
        const timeB = b.startTime || "";
        return timeA.localeCompare(timeB);
      });
    });

    // Sort dates in descending order (newest first) using the stored Date object
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      const dateA = grouped[a].date.getTime();
      const dateB = grouped[b].date.getTime();

      // First sort by date (descending - newest first)
      if (dateB !== dateA) {
        return dateB - dateA;
      }

      // If dates are equal, this shouldn't happen since we group by date
      // But if it does, maintain consistency
      return 0;
    });

    return { grouped, sortedDates };
  }, [bookings, bookingDateFilter]);

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<
    "all" | "income" | "expense"
  >("all");
  const [transactionFilters, setTransactionFilters] = useState({
    locationId: "",
    courtId: "",
    source: "" as "" | "booking" | "manual",
    startDate: "",
    endDate: "",
  });
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [isDatePickerActive, setIsDatePickerActive] = useState(false);
  const [isFilterStartDateActive, setIsFilterStartDateActive] = useState(false);
  const [isFilterEndDateActive, setIsFilterEndDateActive] = useState(false);
  const [isOverviewStartDateActive, setIsOverviewStartDateActive] =
    useState(false);
  const [isOverviewEndDateActive, setIsOverviewEndDateActive] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const filterStartDateRef = useRef<HTMLInputElement>(null);
  const filterEndDateRef = useRef<HTMLInputElement>(null);
  const overviewStartDateRef = useRef<HTMLInputElement>(null);
  const overviewEndDateRef = useRef<HTMLInputElement>(null);
  const [transactionForm, setTransactionForm] = useState({
    locationId: "",
    courtId: "",
    amount: "",
    type: "income" as "income" | "expense",
    description: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });

  // Memoize date values to prevent re-renders
  const dateInputValue = useMemo(
    () => transactionForm.transactionDate,
    [transactionForm.transactionDate]
  );
  const filterStartDateValue = useMemo(
    () => transactionFilters.startDate,
    [transactionFilters.startDate]
  );
  const filterEndDateValue = useMemo(
    () => transactionFilters.endDate,
    [transactionFilters.endDate]
  );
  const overviewStartDateValue = useMemo(
    () => dateRange.startDate,
    [dateRange.startDate]
  );
  const overviewEndDateValue = useMemo(
    () => dateRange.endDate,
    [dateRange.endDate]
  );

  // Locations state
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  
  // Fixed Bookings state
  const [fixedBookings, setFixedBookings] = useState<any[]>([]);
  const [fixedBookingsLoading, setFixedBookingsLoading] = useState(false);
  const [showFixedBookingDialog, setShowFixedBookingDialog] = useState(false);
  const [editingFixedBooking, setEditingFixedBooking] = useState<any | null>(null);
  //const [processingIncome, setProcessingIncome] = useState(false);
  const [processingDailyFinancials, setProcessingDailyFinancials] =
    useState(false);
  
  // Fixed Bookings filters
  const [fixedBookingFilters, setFixedBookingFilters] = useState({
    status: "all", // all, ACTIVE, PAUSED, CANCELED
    locationId: "all",
    courtId: "all",
    dayOfWeek: "all", // all, 0-6
    category: "all", // all, regular, academy, tournament
  });
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [fixedBookingForm, setFixedBookingForm] = useState({
    courtId: "",
    userId: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    startDate: "",
    endDate: "",
    notes: "",
    category: "regular" as "regular" | "academy" | "tournament",
  });
  
  // User search for fixed booking form
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [availableUsers, setAvailableUsers] = useState<Array<{
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role?: string;
    adminType?: string | null;
    userType?: string | null;
    hasPlayer?: boolean;
  }>>([]);
  const [showUserResults, setShowUserResults] = useState(false);
  const [selectedUserDisplay, setSelectedUserDisplay] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [clubAdmins, setClubAdmins] = useState<Record<string, any[]>>({});
  const [loadingClubAdmins, setLoadingClubAdmins] = useState<
    Record<string, boolean>
  >({});
  const [moderators, setModerators] = useState<Record<string, any[]>>({});
  const [loadingModerators, setLoadingModerators] = useState<
    Record<string, boolean>
  >({});
  const [availableModerators, setAvailableModerators] = useState<any[]>([]);
  const [showAddModeratorDialog, setShowAddModeratorDialog] = useState<{
    open: boolean;
    locationId: string;
  }>({ open: false, locationId: "" });
  const [selectedModeratorId, setSelectedModeratorId] = useState<string>("");
  const [assigningModerator, setAssigningModerator] = useState(false);
  const [showAddClubAdminDialog, setShowAddClubAdminDialog] = useState<{
    open: boolean;
    locationId: string;
  }>({ open: false, locationId: "" });
  const [selectedClubAdminId, setSelectedClubAdminId] = useState<string>("");
  const [availableClubAdmins, setAvailableClubAdmins] = useState<any[]>([]);
  const [assigningClubAdmin, setAssigningClubAdmin] = useState(false);
  const [removingModerator, setRemovingModerator] = useState<string | null>(
    null
  );
  const [removingClubAdmin, setRemovingClubAdmin] = useState<string | null>(
    null
  );
  const [editingCancellationHours, setEditingCancellationHours] = useState<
    string | null
  >(null);
  const [cancellationHoursValue, setCancellationHoursValue] =
    useState<number>(4);
  const [editingPhone, setEditingPhone] = useState<boolean>(false);
  const [phoneValue, setPhoneValue] = useState<string>("");
  const [editingInstapayPhone, setEditingInstapayPhone] = useState<
    string | null
  >(null);
  const [instapayPhoneValue, setInstapayPhoneValue] = useState<string>("");
  const [updatingInstapayPhone, setUpdatingInstapayPhone] = useState(false);
  const [editingOperatingHours, setEditingOperatingHours] = useState<
    string | null
  >(null);
  const [openingTimeValue, setOpeningTimeValue] = useState<string>("");
  const [closingTimeValue, setClosingTimeValue] = useState<string>("");
  const [updatingPhone, setUpdatingPhone] = useState<boolean>(false);
  const [rebookingId, setRebookingId] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState<
    string | null
  >(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<string | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);

  // Calculate user roles (available in component scope)
  const user = session?.user as any;
  const isClubOwner =
    user?.role === "club_owner" ||
    (user?.role === "admin" && user?.adminType === "club_owner");
  const isOwnerPartner =
    user?.role === "admin" && user?.adminType === "owner_partner";
  const isModerator = user?.role === "admin" && user?.adminType === "moderator";
  const isSuperAdmin =
    user?.role === "admin" && user?.adminType === "super_admin";
  const hasAccess =
    isClubOwner || isOwnerPartner || isModerator || isSuperAdmin;
  const isReadOnly = isOwnerPartner;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Check if user has access (club owner, owner partner, moderator, or super admin)
    if (status === "authenticated" && !hasAccess) {
      router.push("/");
      return;
    }

    if (status === "authenticated") {
      // Don't auto-fetch summary data - user must click "Update Summary" button
      fetchLocations();
      // Fetch user info to get current phone number
      fetchUserInfo();
    }
  }, [status, session, router]);

  const fetchUserInfo = async () => {
    try {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user?.phone) {
          setPhoneValue(data.user.phone);
        }
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const handleUpdatePhone = async () => {
    setUpdatingPhone(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneValue || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update phone number");
      }

      const data = await res.json();
      toast.success("Phone number updated successfully!");
      setEditingPhone(false);
      // Refresh locations to show updated phone number
      fetchLocations();
    } catch (error: any) {
      console.error("Error updating phone number:", error);
      toast.error(error?.message || "Failed to update phone number");
    } finally {
      setUpdatingPhone(false);
    }
  };

  useEffect(() => {
    if (activeTab === "bookings") {
      fetchBookings();
    } else if (activeTab === "fixed-bookings") {
      fetchFixedBookings();
    } else if (activeTab === "transactions") {
      fetchTransactions();
      fetchPendingRequests();
    } else if (activeTab === "overview") {
      fetchPendingApprovals();
    }
    // Don't auto-fetch overview data when switching to overview tab
    // User must click "Update Summary" button to fetch data
  }, [activeTab]);

  // Only fetch overview data when user clicks "Update Summary" button
  // Don't auto-fetch on dateRange change

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const res = await fetch(`/api/club-owner/financials/summary?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    setMonthlyLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const res = await fetch(`/api/club-owner/financials/monthly?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMonthlyData(data);
      }
    } catch (error) {
      console.error("Error fetching monthly data:", error);
    } finally {
      setMonthlyLoading(false);
    }
  };

  const fetchUserTypeStats = async () => {
    setUserTypeStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.append("startDate", dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append("endDate", dateRange.endDate);
      }
      const res = await fetch(
        `/api/club-owner/bookings/user-type-stats?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setUserTypeStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching user type stats:", error);
    } finally {
      setUserTypeStatsLoading(false);
    }
  };

  const handleRunDailyFinancialProcessing = async () => {
    if (
      !confirm(
        "This will run daily financial processing for your accessible locations.\nIt is safe to run multiple times (days already processed will be skipped).\n\nContinue?"
      )
    ) {
      return;
    }

    setProcessingDailyFinancials(true);
    try {
      const res = await fetch(
        "/api/club-owner/financials/run-daily-processing",
        {
          method: "POST",
        }
      );

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const processedCount =
          Array.isArray(data.results) && data.results.length
            ? data.results.filter(
                (r: any) => r.status && r.status === "processed"
              ).length
            : 0;

        toast.success(
          processedCount > 0
            ? `Daily financial processing completed. Processed ${processedCount} day(s).`
            : "Daily financial processing completed. No new days needed processing."
        );

        // Refresh financial views to reflect any new data
        fetchSummary();
        fetchMonthlyData();
        fetchUserTypeStats();
      } else {
        toast.error(
          data?.error || "Failed to run daily financial processing manually"
        );
      }
    } catch (error) {
      console.error("Error running daily financial processing:", error);
      toast.error("Failed to run daily financial processing");
    } finally {
      setProcessingDailyFinancials(false);
    }
  };

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await fetch("/api/club-owner/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setBookingsLoading(false);
    }
  };

  const checkAvailability = async (booking: Booking): Promise<boolean> => {
    try {
      // Check if the slot is still available
      const date = new Date(booking.date).toISOString().split("T")[0];
      const res = await fetch(
        `/api/availability?locationId=${
          booking.location.id
        }&date=${date}&_=${Date.now()}`
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
    if (!confirm("Are you sure you want to restore this cancelled booking?")) {
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

      // Restore the cancelled booking by updating its status to "confirmed"
      const res = await fetch(`/api/club-owner/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "confirmed",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to restore booking");
      }

      toast.success("Booking restored successfully!");
      // Refresh bookings to show the restored booking in confirmed section
      fetchBookings();
    } catch (e: any) {
      console.error("Error restoring booking:", e);
      toast.error(e?.message || "Failed to restore booking");
    } finally {
      setCheckingAvailability(null);
      setRebookingId(null);
    }
  };

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const res = await fetch("/api/club-owner/transactions");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/club-owner/transactions/requests");
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchPendingApprovals = async () => {
    setLoadingApprovals(true);
    try {
      const res = await fetch("/api/club-owner/pending-approvals");
      if (res.ok) {
        const data = await res.json();
        setPendingApprovals(data.approvals || []);
      }
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
    } finally {
      setLoadingApprovals(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    if (!confirm("Are you sure you want to approve this user?")) {
      return;
    }

    try {
      setApprovingUserId(userId);
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "approve" }),
      });

      if (res.ok) {
        toast.success("User approved successfully");
        fetchPendingApprovals();
      } else {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve user");
      }
    } catch (error: any) {
      console.error("Error approving user:", error);
      toast.error(error?.message || "Failed to approve user");
    } finally {
      setApprovingUserId(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!confirm("Are you sure you want to reject this request?")) {
      return;
    }

    try {
      setRejectingUserId(userId);
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "reject" }),
      });

      if (res.ok) {
        toast.success("Request rejected");
        fetchPendingApprovals();
      } else {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject request");
      }
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      toast.error(error?.message || "Failed to reject request");
    } finally {
      setRejectingUserId(null);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    if (
      !confirm("Are you sure you want to approve this transaction request?")
    ) {
      return;
    }

    try {
      setApprovingRequest(requestId);
      const res = await fetch(
        `/api/club-owner/transactions/${requestId}/approve`,
        {
          method: "PATCH",
        }
      );

      if (res.ok) {
        toast.success("Transaction request approved successfully");
        fetchPendingRequests();
        fetchTransactions(); // Refresh transactions to show the approved one
        fetchSummary(); // Refresh financial summary
      } else {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve request");
      }
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast.error(error?.message || "Failed to approve transaction request");
    } finally {
      setApprovingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to reject this transaction request?")) {
      return;
    }

    try {
      setRejectingRequest(requestId);
      const res = await fetch(
        `/api/club-owner/transactions/${requestId}/reject`,
        {
          method: "PATCH",
        }
      );

      if (res.ok) {
        toast.success("Transaction request rejected");
        fetchPendingRequests();
      } else {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject request");
      }
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast.error(error?.message || "Failed to reject transaction request");
    } finally {
      setRejectingRequest(null);
    }
  };

  const fetchLocations = async () => {
    setLocationsLoading(true);
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(data || []);
        // Fetch club admins and moderators for each location
        if (data && data.length > 0) {
          data.forEach((location: Location) => {
            fetchClubAdminsForLocation(location.id);
            fetchModeratorsForLocation(location.id);
          });
        }
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLocationsLoading(false);
    }
  };

  const fetchClubAdminsForLocation = async (locationId: string) => {
    setLoadingClubAdmins((prev) => ({ ...prev, [locationId]: true }));
    try {
      const res = await fetch(`/api/locations/${locationId}/club-admins`);
      if (res.ok) {
        const data = await res.json();
        setClubAdmins((prev) => ({
          ...prev,
          [locationId]: data.clubAdmins || [],
        }));
      }
    } catch (error) {
      console.error("Error fetching club admins:", error);
      setClubAdmins((prev) => ({ ...prev, [locationId]: [] }));
    } finally {
      setLoadingClubAdmins((prev) => ({ ...prev, [locationId]: false }));
    }
  };

  const fetchModeratorsForLocation = async (locationId: string) => {
    setLoadingModerators((prev) => ({ ...prev, [locationId]: true }));
    try {
      const res = await fetch(`/api/locations/${locationId}/moderators`);
      if (res.ok) {
        const data = await res.json();
        setModerators((prev) => ({
          ...prev,
          [locationId]: data.moderators || [],
        }));
      }
    } catch (error) {
      console.error("Error fetching moderators:", error);
      setModerators((prev) => ({ ...prev, [locationId]: [] }));
    } finally {
      setLoadingModerators((prev) => ({ ...prev, [locationId]: false }));
    }
  };

  const fetchAvailableModerators = async () => {
    try {
      const res = await fetch("/api/admin/moderators");
      if (res.ok) {
        const data = await res.json();
        setAvailableModerators(data.moderators || []);
      }
    } catch (error) {
      console.error("Error fetching available moderators:", error);
    }
  };

  const fetchAvailableClubAdmins = async (locationId: string) => {
    try {
      const res = await fetch(
        `/api/locations/${locationId}/club-admins/available`
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableClubAdmins(data.clubAdmins || []);
      }
    } catch (error) {
      console.error("Error fetching available club admins:", error);
      setAvailableClubAdmins([]);
    }
  };

  const handleAddModerator = async () => {
    if (!selectedModeratorId || !showAddModeratorDialog.locationId) {
      toast.error("Please select a moderator");
      return;
    }

    try {
      setAssigningModerator(true);
      const res = await fetch(
        `/api/locations/${showAddModeratorDialog.locationId}/moderators`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moderatorId: selectedModeratorId }),
        }
      );

      if (res.ok) {
        toast.success("Moderator assigned successfully");
        setShowAddModeratorDialog({ open: false, locationId: "" });
        setSelectedModeratorId("");
        fetchModeratorsForLocation(showAddModeratorDialog.locationId);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to assign moderator");
      }
    } catch (error) {
      console.error("Error assigning moderator:", error);
      toast.error("Failed to assign moderator");
    } finally {
      setAssigningModerator(false);
    }
  };

  const handleAddClubAdmin = async () => {
    if (!selectedClubAdminId || !showAddClubAdminDialog.locationId) {
      toast.error("Please select a club admin");
      return;
    }

    try {
      setAssigningClubAdmin(true);
      const res = await fetch(
        `/api/locations/${showAddClubAdminDialog.locationId}/club-admins`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clubAdminId: selectedClubAdminId }),
        }
      );

      if (res.ok) {
        toast.success("Club admin assigned successfully");
        setShowAddClubAdminDialog({ open: false, locationId: "" });
        setSelectedClubAdminId("");
        fetchClubAdminsForLocation(showAddClubAdminDialog.locationId);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to assign club admin");
      }
    } catch (error) {
      console.error("Error assigning club admin:", error);
      toast.error("Failed to assign club admin");
    } finally {
      setAssigningClubAdmin(false);
    }
  };

  const handleRemoveModerator = async (
    locationId: string,
    moderatorId: string
  ) => {
    if (!confirm("Are you sure you want to remove this moderator?")) {
      return;
    }

    try {
      setRemovingModerator(moderatorId);
      const res = await fetch(
        `/api/locations/${locationId}/moderators?moderatorId=${moderatorId}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        toast.success("Moderator removed successfully");
        fetchModeratorsForLocation(locationId);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to remove moderator");
      }
    } catch (error) {
      console.error("Error removing moderator:", error);
      toast.error("Failed to remove moderator");
    } finally {
      setRemovingModerator(null);
    }
  };

  const handleRemoveClubAdmin = async (
    locationId: string,
    clubAdminId: string
  ) => {
    if (!confirm("Are you sure you want to remove this club admin from this location?")) {
      return;
    }

    try {
      setRemovingClubAdmin(clubAdminId);
      const res = await fetch(
        `/api/locations/${locationId}/club-admins?clubAdminId=${clubAdminId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        toast.success("Club admin removed successfully");
        fetchClubAdminsForLocation(locationId);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to remove club admin");
      }
    } catch (error) {
      console.error("Error removing club admin:", error);
      toast.error("Failed to remove club admin");
    } finally {
      setRemovingClubAdmin(null);
    }
  };

  const createTransaction = async () => {
    if (!transactionForm.locationId || !transactionForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const res = await fetch("/api/club-owner/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...transactionForm,
          courtId: transactionForm.courtId || null,
          amount: Number(transactionForm.amount),
        }),
      });

      if (res.ok) {
        toast.success("Transaction created successfully");
        setShowTransactionForm(false);
        setTransactionForm({
          locationId: "",
          courtId: "",
          amount: "",
          type: "income",
          description: "",
          transactionDate: new Date().toISOString().split("T")[0],
        });
        fetchTransactions();
        fetchSummary();
        fetchMonthlyData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create transaction");
      }
    } catch (error) {
      toast.error("Failed to create transaction");
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const res = await fetch(`/api/club-owner/transactions/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Transaction deleted successfully");
        fetchTransactions();
        fetchSummary();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete transaction");
      }
    } catch (error) {
      toast.error("Failed to delete transaction");
    }
  };

  // Fixed Bookings functions
  const fetchFixedBookings = async () => {
    try {
      setFixedBookingsLoading(true);
      const res = await fetch("/api/fixed-bookings");
      if (res.ok) {
        const data = await res.json();
        setFixedBookings(data || []);
      }
    } catch (error) {
      console.error("Error fetching fixed bookings:", error);
      toast.error("Failed to load fixed bookings");
    } finally {
      setFixedBookingsLoading(false);
    }
  };

  const handleCreateFixedBooking = async () => {
    try {
      if (!fixedBookingForm.courtId || !fixedBookingForm.dayOfWeek || !fixedBookingForm.startTime || !fixedBookingForm.endTime || !fixedBookingForm.startDate) {
        toast.error("Please fill in all required fields");
        return;
      }

      const payload: any = {
        courtId: fixedBookingForm.courtId,
        dayOfWeek: parseInt(fixedBookingForm.dayOfWeek),
        startTime: fixedBookingForm.startTime,
        endTime: fixedBookingForm.endTime,
        startDate: new Date(fixedBookingForm.startDate).toISOString(),
        notes: fixedBookingForm.notes || null,
        category: fixedBookingForm.category || "regular",
      };

      if (fixedBookingForm.userId) {
        payload.userId = fixedBookingForm.userId;
      }

      if (fixedBookingForm.endDate) {
        payload.endDate = new Date(fixedBookingForm.endDate).toISOString();
      }

      const res = await fetch("/api/fixed-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Fixed booking created successfully");
        setShowFixedBookingDialog(false);
        resetFixedBookingForm();
        fetchFixedBookings();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create fixed booking");
      }
    } catch (error) {
      console.error("Error creating fixed booking:", error);
      toast.error("Failed to create fixed booking");
    }
  };

  const handleUpdateFixedBooking = async () => {
    if (!editingFixedBooking) return;

    try {
      const payload: any = {};

      if (fixedBookingForm.courtId) payload.courtId = fixedBookingForm.courtId;
      if (fixedBookingForm.dayOfWeek !== undefined) payload.dayOfWeek = parseInt(fixedBookingForm.dayOfWeek);
      if (fixedBookingForm.startTime) payload.startTime = fixedBookingForm.startTime;
      if (fixedBookingForm.endTime) payload.endTime = fixedBookingForm.endTime;
      if (fixedBookingForm.startDate) payload.startDate = new Date(fixedBookingForm.startDate).toISOString();
      if (fixedBookingForm.endDate !== undefined) {
        payload.endDate = fixedBookingForm.endDate ? new Date(fixedBookingForm.endDate).toISOString() : null;
      }
      if (fixedBookingForm.userId !== undefined) {
        payload.userId = fixedBookingForm.userId || null;
      }
      if (fixedBookingForm.notes !== undefined) {
        payload.notes = fixedBookingForm.notes || null;
      }

      if (fixedBookingForm.category !== undefined) {
        payload.category = fixedBookingForm.category || "regular";
      }

      const res = await fetch(`/api/fixed-bookings/${editingFixedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Fixed booking updated successfully");
        setShowFixedBookingDialog(false);
        setEditingFixedBooking(null);
        resetFixedBookingForm();
        fetchFixedBookings();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update fixed booking");
      }
    } catch (error) {
      console.error("Error updating fixed booking:", error);
      toast.error("Failed to update fixed booking");
    }
  };

  const handleDeleteFixedBooking = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fixed booking?")) {
      return;
    }

    try {
      const res = await fetch(`/api/fixed-bookings/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Fixed booking deleted successfully");
        fetchFixedBookings();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete fixed booking");
      }
    } catch (error) {
      console.error("Error deleting fixed booking:", error);
      toast.error("Failed to delete fixed booking");
    }
  };

  const handleToggleFixedBookingStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    
    try {
      const res = await fetch(`/api/fixed-bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Fixed booking ${newStatus === "ACTIVE" ? "activated" : "paused"}`);
        fetchFixedBookings();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update fixed booking");
      }
    } catch (error) {
      console.error("Error updating fixed booking status:", error);
      toast.error("Failed to update fixed booking status");
    }
  };

 /* const handleProcessFixedBookingIncome = async () => {
    if (!confirm("This will process income transactions for all completed fixed booking periods. Continue?")) {
      return;
    }

    try {
      setProcessingIncome(true);
      const res = await fetch("/api/fixed-bookings/process-income", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Processed ${data.processed} fixed bookings (created bookings and income transactions). ${data.skipped} already existed.`
        );
        // Refresh transactions, bookings, and summary to show new data
        fetchTransactions();
        fetchSummary();
        fetchBookings(); // Refresh bookings list to show new fixed booking entries
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to process fixed booking income");
      }
    } catch (error) {
      console.error("Error processing fixed booking income:", error);
      toast.error("Failed to process fixed booking income");
    } finally {
      setProcessingIncome(false);
    }
  };
*/
  const resetFixedBookingForm = () => {
    setFixedBookingForm({
      courtId: "",
      userId: "",
      dayOfWeek: "",
      startTime: "",
      endTime: "",
      startDate: "",
      endDate: "",
      notes: "",
      category: "regular",
    });
    setUserSearchTerm("");
    setSelectedUserDisplay("");
    setShowUserResults(false);
  };

  const openEditFixedBooking = (fixedBooking: any) => {
    setEditingFixedBooking(fixedBooking);
    setFixedBookingForm({
      courtId: fixedBooking.courtId,
      userId: fixedBooking.userId || "",
      dayOfWeek: fixedBooking.dayOfWeek.toString(),
      startTime: fixedBooking.startTime,
      endTime: fixedBooking.endTime,
      startDate: new Date(fixedBooking.startDate).toISOString().split("T")[0],
      endDate: fixedBooking.endDate ? new Date(fixedBooking.endDate).toISOString().split("T")[0] : "",
      notes: fixedBooking.notes || "",
      category: (fixedBooking.category as "regular" | "academy" | "tournament") || "regular",
    });
    // Set user display if user exists
    if (fixedBooking.user) {
      const phoneDisplay = fixedBooking.user.phone ? ` • ${fixedBooking.user.phone}` : "";
      setSelectedUserDisplay(
        `${fixedBooking.user.name || fixedBooking.user.email} (${fixedBooking.user.email}${phoneDisplay})`
      );
    } else {
      setSelectedUserDisplay("");
    }
    setUserSearchTerm("");
    setShowUserResults(false);
    setShowFixedBookingDialog(true);
  };

  const openCreateFixedBooking = () => {
    setEditingFixedBooking(null);
    resetFixedBookingForm();
    setUserSearchTerm("");
    setSelectedUserDisplay("");
    setShowUserResults(false);
    setShowFixedBookingDialog(true);
  };

  // Debounced user search for fixed booking form
  useEffect(() => {
    if (!showFixedBookingDialog) return;
    
    if (userSearchTerm.trim().length === 0) {
      setAvailableUsers([]);
      setShowUserResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchUsersForFixedBooking(userSearchTerm.trim());
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [userSearchTerm, showFixedBookingDialog]);

  const fetchUsersForFixedBooking = async (search: string = "") => {
    setLoadingUsers(true);
    try {
      // Search all users (users, players, moderators, etc.)
      const url = search
        ? `/api/users/search?search=${encodeURIComponent(search)}&limit=20`
        : "/api/users/search?limit=20";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Map the response to match expected format
        const users = (data.users || []).map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          adminType: user.adminType,
          userType: user.userType,
          hasPlayer: !!user.player,
        }));
        setAvailableUsers(users);
        setShowUserResults(true);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSelectForFixedBooking = (selectedUser: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role?: string;
    adminType?: string | null;
    userType?: string | null;
    hasPlayer?: boolean;
  }) => {
    setFixedBookingForm({ ...fixedBookingForm, userId: selectedUser.id });
    const phoneDisplay = selectedUser.phone ? ` • ${selectedUser.phone}` : "";
    
    // Add role/type info to display
    let roleInfo = "";
    if (selectedUser.role === "admin" && selectedUser.adminType) {
      roleInfo = ` • ${selectedUser.adminType === "moderator" ? "Moderator" : selectedUser.adminType}`;
    } else if (selectedUser.role === "club_owner") {
      roleInfo = " • Club Owner";
    } else if (selectedUser.userType === "club_admin") {
      roleInfo = " • Club Admin";
    } else if (selectedUser.hasPlayer) {
      roleInfo = " • Player";
    }
    
    setSelectedUserDisplay(
      `${selectedUser.name || selectedUser.email} (${selectedUser.email}${phoneDisplay}${roleInfo})`
    );
    setUserSearchTerm("");
    setShowUserResults(false);
  };

  const updateBookingStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/club-owner/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.success("Booking updated successfully");
        fetchBookings();
        fetchSummary();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update booking");
      }
    } catch (error) {
      toast.error("Failed to update booking");
    }
  };

  if (status === "loading" || !session) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] flex items-center justify-center">
          <div className="text-white/75">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="bg-gradient-to-b from-[#252015] to-[#1C1810] pb-16 md:pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          {/* Header - Mobile Optimized */}
          <div className="mb-4 md:mb-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white flex items-center gap-2 md:gap-3">
              <Building2 className="h-6 w-6 md:h-8 md:w-8 text-[#D4A817] flex-shrink-0" />
              <span className="leading-tight">
                {isOwnerPartner && "Owner (Partner) Dashboard"}
                {isModerator && "Moderator Dashboard"}
                {isSuperAdmin && "Super Admin Dashboard"}
                {isClubOwner && !isSuperAdmin && "Club Owner Dashboard"}
              </span>
              {isReadOnly && (
                <Badge
                  variant="outline"
                  className="ml-1 md:ml-2 text-xs bg-[rgba(251,146,60,0.15)] text-[#FB923C] border-[rgba(251,146,60,0.3)]"
                >
                  Read-Only
                </Badge>
              )}
            </h1>
            <p className="text-sm md:text-base text-white/70 mt-1.5 md:mt-2 leading-relaxed">
              Manage your locations, bookings, and finances
            </p>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as any)}
            className="space-y-6"
          >
            {/* Tabs - Mobile Scrollable Pills */}
            <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-hide pb-2 md:pb-0">
              <TabsList className={cn(
                "inline-flex w-auto min-w-full sm:min-w-0",
                "sm:w-fit h-auto",
                "bg-[#1A1612]/90 border border-[rgba(212,168,23,0.12)] rounded-xl p-1.5",
                "gap-1"
              )}>
                <TabsTrigger 
                  value="overview" 
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 md:px-3 md:py-1.5",
                    "flex-shrink-0 min-w-fit rounded-lg",
                    "text-xs md:text-sm whitespace-nowrap",
                    "h-11 md:h-9",
                    "data-[state=active]:bg-[#D4A817] data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(212,168,23,0.25)]",
                    "data-[state=inactive]:text-white/70 data-[state=inactive]:hover:text-white/90 data-[state=inactive]:hover:bg-[rgba(212,168,23,0.08)]",
                    "transition-all"
                  )}
                >
                  <BarChart3 className="h-4 w-4 flex-shrink-0" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="bookings" 
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 md:px-3 md:py-1.5",
                    "flex-shrink-0 min-w-fit rounded-lg",
                    "text-xs md:text-sm whitespace-nowrap",
                    "h-11 md:h-9",
                    "data-[state=active]:bg-[#D4A817] data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(212,168,23,0.25)]",
                    "data-[state=inactive]:text-white/70 data-[state=inactive]:hover:text-white/90 data-[state=inactive]:hover:bg-[rgba(212,168,23,0.08)]",
                    "transition-all"
                  )}
                >
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>Bookings</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="fixed-bookings" 
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 md:px-3 md:py-1.5",
                    "flex-shrink-0 min-w-fit rounded-lg",
                    "text-xs md:text-sm whitespace-nowrap",
                    "h-11 md:h-9",
                    "data-[state=active]:bg-[#D4A817] data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(212,168,23,0.25)]",
                    "data-[state=inactive]:text-white/70 data-[state=inactive]:hover:text-white/90 data-[state=inactive]:hover:bg-[rgba(212,168,23,0.08)]",
                    "transition-all"
                  )}
                >
                  <Lock className="h-4 w-4 flex-shrink-0" />
                  <span>Fixed</span>
                </TabsTrigger>
                {!isModerator && (
                  <TabsTrigger
                    value="transactions"
                    className={cn(
                      "flex items-center gap-1.5 sm:gap-2 px-4 sm:px-3 py-2.5 sm:py-1 flex-shrink-0 min-w-fit rounded-lg h-11 md:h-9",
                      "data-[state=active]:bg-[#D4A817] data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(212,168,23,0.25)]",
                      "data-[state=inactive]:text-white/70 data-[state=inactive]:hover:text-white/90 data-[state=inactive]:hover:bg-[rgba(212,168,23,0.08)]"
                    )}
                  >
                    <Wallet className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm whitespace-nowrap">Transactions</span>
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="locations"
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-4 sm:px-3 py-2.5 sm:py-1 flex-shrink-0 min-w-fit rounded-lg h-11 md:h-9",
                    "data-[state=active]:bg-[#D4A817] data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(212,168,23,0.25)]",
                    "data-[state=inactive]:text-white/70 data-[state=inactive]:hover:text-white/90 data-[state=inactive]:hover:bg-[rgba(212,168,23,0.08)]"
                  )}
                >
                  <MapPin className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm whitespace-nowrap">Locations</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Pending Approvals Section */}
              {pendingApprovals.length > 0 && (
                <Card className="border-[rgba(251,146,60,0.3)] bg-[rgba(251,146,60,0.1)]">
                  <CardHeader className="bg-[rgba(251,146,60,0.15)] border-b border-[rgba(251,146,60,0.3)] p-3 sm:p-6">
                    <CardTitle className="text-[#FB923C] flex items-center gap-2 text-sm sm:text-base">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                      Pending Approval Requests ({pendingApprovals.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {pendingApprovals.map((approval) => (
                        <Card
                          key={approval.id}
                          className="border-l-4 border-l-[#FB923C]"
                        >
                          <CardContent className="pt-4 sm:pt-6">
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                              <div className="flex-1 w-full">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <Badge
                                    variant="outline"
                                    className="bg-[rgba(251,146,60,0.15)] text-[#FB923C] border-[rgba(251,146,60,0.3)] text-xs"
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending Approval
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="bg-[rgba(212,168,23,0.15)] text-[#D4A817] border-[rgba(212,168,23,0.3)] text-xs"
                                  >
                                    {approval.role === "moderator"
                                      ? "Moderator"
                                      : "Club Admin"}
                                  </Badge>
                                  <span className="text-xs sm:text-sm text-white/60">
                                    {new Date(
                                      approval.createdAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-base sm:text-lg mb-3 text-white">
                                  {approval.title || "New Registration Request"}
                                </h3>
                                <div className="space-y-1.5 text-xs sm:text-sm text-white/75">
                                  <div className="flex flex-wrap gap-x-2">
                                    <span className="font-medium">Name:</span>
                                    <span>
                                      {approval.name || approval.email}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-2">
                                    <span className="font-medium">Email:</span>
                                    <span className="break-all">
                                      {approval.email}
                                    </span>
                                  </div>
                                  {approval.phone && (
                                    <div className="flex flex-wrap gap-x-2">
                                      <span className="font-medium">
                                        Phone:
                                      </span>
                                      <span>{approval.phone}</span>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-x-2">
                                    <span className="font-medium">
                                      Location:
                                    </span>
                                    <span>{approval.locationName}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-2">
                                    <span className="font-medium">Message:</span>
                                    <span className="text-white/90">
                                      {approval.message}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleApproveUser(approval.userId)
                                  }
                                  disabled={
                                    approvingUserId === approval.userId ||
                                    rejectingUserId === approval.userId
                                  }
                                  className="bg-[#D4A817] hover:bg-[#E6C420] flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  {approvingUserId === approval.userId ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                                      <span className="hidden sm:inline">
                                        Approving...
                                      </span>
                                      <span className="sm:hidden">
                                        Approving
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                      <span>Approve</span>
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleRejectUser(approval.userId)
                                  }
                                  disabled={
                                    approvingUserId === approval.userId ||
                                    rejectingUserId === approval.userId
                                  }
                                  className="border-[rgba(239,68,68,0.3)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  {rejectingUserId === approval.userId ? (
                                    <span className="hidden sm:inline">
                                      Rejecting...
                                    </span>
                                  ) : (
                                    <>
                                      <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                      <span>Reject</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Moderator Notice */}
              {isModerator && (
                <Card className="border-[rgba(212,168,23,0.3)] bg-[rgba(212,168,23,0.08)]">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Building2 className="h-5 w-5 text-[#D4A817]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#D4A817] mb-1">
                          Moderator Access
                        </h3>
                        <p className="text-sm text-white/75">
                          As a moderator, you can view and manage operational data
                          (bookings, locations) for your assigned locations. Financial
                          data (transactions, revenue, expenses) requires Club Owner or
                          Super Admin access.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Date Range Filter and Financial Summary - Hidden for moderators */}
              {!isModerator && (
                <>
                  <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Filter className="h-5 w-5 text-[#D4A817]" />
                        Date Range Filter
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white/90">Start Date</Label>
                      <Input
                        ref={overviewStartDateRef}
                        type="date"
                        value={overviewStartDateValue}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setDateRange({
                            ...dateRange,
                            startDate: newValue,
                          });
                          setTimeout(() => {
                            setIsOverviewStartDateActive(false);
                          }, 100);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setIsOverviewStartDateActive(true);
                          const input = e.currentTarget as HTMLInputElement;
                          if (typeof input.showPicker === "function") {
                            input.focus();
                            requestAnimationFrame(() => {
                              try {
                                (input as any).showPicker();
                              } catch (err) {
                                input.focus();
                              }
                            });
                          } else {
                            input.focus();
                          }
                        }}
                        onFocus={(e) => {
                          setIsOverviewStartDateActive(true);
                        }}
                        onBlur={(e) => {
                          setTimeout(() => {
                            const input = e.target as HTMLInputElement;
                            if (
                              input.value &&
                              input.value !== overviewStartDateValue
                            ) {
                              setIsOverviewStartDateActive(false);
                            } else if (isOverviewStartDateActive) {
                              const activeElement = document.activeElement;
                              if (
                                activeElement !== input &&
                                activeElement !== document.body
                              ) {
                                setIsOverviewStartDateActive(false);
                              } else {
                                input.focus();
                              }
                            }
                          }, 200);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOverviewStartDateActive(true);
                          e.currentTarget.focus();
                        }}
                        onMouseDown={(e) => {
                          setIsOverviewStartDateActive(true);
                        }}
                        className="mt-1"
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                    <div>
                      <Label className="text-white/90">End Date</Label>
                      <Input
                        ref={overviewEndDateRef}
                        type="date"
                        value={overviewEndDateValue}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setDateRange({
                            ...dateRange,
                            endDate: newValue,
                          });
                          setTimeout(() => {
                            setIsOverviewEndDateActive(false);
                          }, 100);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setIsOverviewEndDateActive(true);
                          const input = e.currentTarget as HTMLInputElement;
                          if (typeof input.showPicker === "function") {
                            input.focus();
                            requestAnimationFrame(() => {
                              try {
                                (input as any).showPicker();
                              } catch (err) {
                                input.focus();
                              }
                            });
                          } else {
                            input.focus();
                          }
                        }}
                        onFocus={(e) => {
                          setIsOverviewEndDateActive(true);
                        }}
                        onBlur={(e) => {
                          setTimeout(() => {
                            const input = e.target as HTMLInputElement;
                            if (
                              input.value &&
                              input.value !== overviewEndDateValue
                            ) {
                              setIsOverviewEndDateActive(false);
                            } else if (isOverviewEndDateActive) {
                              const activeElement = document.activeElement;
                              if (
                                activeElement !== input &&
                                activeElement !== document.body
                              ) {
                                setIsOverviewEndDateActive(false);
                              } else {
                                input.focus();
                              }
                            }
                          }, 200);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOverviewEndDateActive(true);
                          e.currentTarget.focus();
                        }}
                        onMouseDown={(e) => {
                          setIsOverviewEndDateActive(true);
                        }}
                        className="mt-1"
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => {
                        fetchSummary();
                        fetchMonthlyData();
                        fetchUserTypeStats();
                      }}
                      className="w-full sm:w-auto bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                      disabled={
                        summaryLoading ||
                        monthlyLoading ||
                        userTypeStatsLoading ||
                        processingDailyFinancials
                      }
                    >
                      {summaryLoading ||
                      monthlyLoading ||
                      userTypeStatsLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Update Summary
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                      onClick={handleRunDailyFinancialProcessing}
                      disabled={
                        processingDailyFinancials ||
                        summaryLoading ||
                        monthlyLoading ||
                        userTypeStatsLoading
                      }
                    >
                      {processingDailyFinancials ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Running Daily Processing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Run Daily Income Processing
                        </>
                      )}
                    </Button>
                  </div>
                    </CardContent>
                  </Card>

                  {/* Financial Summary Cards */}
                  {summaryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 text-white/60 animate-spin" />
                </div>
              ) : summary ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                    <Card className="border-l-4 border-l-[#D4A817] bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_8px_24px_rgba(212,168,23,0.15)] transition-all">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-sm font-medium text-white/75">
                          Total Income
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-[rgba(212,168,23,0.15)]">
                          <TrendingUp className="h-5 w-5 text-[#D4A817]" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-[#D4A817]">
                          {summary.totalIncome.toLocaleString()}
                        </div>
                        <div className="text-xs text-white/60 mt-1">EGP</div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-[#EF4444] bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_8px_24px_rgba(212,168,23,0.15)] transition-all">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-sm font-medium text-white/75">
                          Total Expenses
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-[rgba(239,68,68,0.15)]">
                          <TrendingDown className="h-5 w-5 text-[#EF4444]" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-[#EF4444]">
                          {summary.totalExpenses.toLocaleString()}
                        </div>
                        <div className="text-xs text-white/60 mt-1">EGP</div>
                      </CardContent>
                    </Card>

                    <Card
                      className={cn(
                        "border-l-4 bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_8px_24px_rgba(212,168,23,0.15)] transition-all",
                        summary.netProfit >= 0
                          ? "border-l-[#D4A817]"
                          : "border-l-[#EF4444]"
                      )}
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-sm font-medium text-white/75">
                          Net Profit
                        </CardTitle>
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            summary.netProfit >= 0 ? "bg-[rgba(212,168,23,0.15)]" : "bg-[rgba(239,68,68,0.15)]"
                          )}
                        >
                          <DollarSign
                            className={cn(
                              "h-5 w-5",
                              summary.netProfit >= 0
                                ? "text-[#D4A817]"
                                : "text-[#EF4444]"
                            )}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div
                          className={cn(
                            "text-3xl font-bold",
                            summary.netProfit >= 0
                              ? "text-[#D4A817]"
                              : "text-[#EF4444]"
                          )}
                        >
                          {summary.netProfit.toLocaleString()}
                        </div>
                        <div className="text-xs text-white/60 mt-1">EGP</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Financial Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MonthlyFinanceChart
                      data={monthlyData?.monthlyData || []}
                      loading={monthlyLoading}
                    />
                    <IncomeExpenseTrendChart
                      data={monthlyData?.monthlyData || []}
                      loading={monthlyLoading}
                    />
                  </div>

                  {/* User Type Booking Statistics */}
                  <UserTypeBookingChart
                    stats={
                      userTypeStats || {
                        player: 0,
                        clubAdmin: 0,
                        clubOwner: 0,
                        moderator: 0,
                        other: 0,
                      }
                    }
                    loading={userTypeStatsLoading}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {locations.length > 1 && (
                      <ProfitByLocationChart
                        data={monthlyData?.profitByLocation || []}
                        loading={monthlyLoading}
                      />
                    )}
                    <RevenueSourceChart
                      data={
                        monthlyData?.revenueBySource || {
                          booking: 0,
                          manual: 0,
                        }
                      }
                      loading={monthlyLoading}
                    />
                  </div>

                  {/* By Location */}
                  {summary.byLocation.length > 0 && (
                    <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                      <CardHeader>
                        <CardTitle className="text-white">Financial Summary by Location</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-[rgba(212,168,23,0.2)]">
                                <th className="text-left p-2 text-white/90">Location</th>
                                <th className="text-right p-2 text-white/90">Income</th>
                                <th className="text-right p-2 text-white/90">Expenses</th>
                                <th className="text-right p-2 text-white/90">Profit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {summary.byLocation.map((loc) => (
                                <tr key={loc.locationId} className="border-b border-[rgba(212,168,23,0.12)]">
                                  <td className="p-2 text-white">{loc.locationName}</td>
                                  <td className="text-right p-2 text-[#D4A817]">
                                    {loc.income.toLocaleString()} EGP
                                  </td>
                                  <td className="text-right p-2 text-[#EF4444]">
                                    {loc.expenses.toLocaleString()} EGP
                                  </td>
                                  <td
                                    className={`text-right p-2 font-semibold ${
                                      loc.profit >= 0
                                        ? "text-[#D4A817]"
                                        : "text-[#EF4444]"
                                    }`}
                                  >
                                    {loc.profit.toLocaleString()} EGP
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* By Court */}
                  {summary.byCourt.length > 0 && (
                    <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                      <CardHeader>
                        <CardTitle className="text-white">Financial Summary by Court</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-[rgba(212,168,23,0.2)]">
                                <th className="text-left p-2 text-white/90">Court</th>
                                <th className="text-left p-2 text-white/90">Location</th>
                                <th className="text-right p-2 text-white/90">Income</th>
                                <th className="text-right p-2 text-white/90">Expenses</th>
                                <th className="text-right p-2 text-white/90">Profit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {summary.byCourt.map((court) => (
                                <tr key={court.courtId} className="border-b border-[rgba(212,168,23,0.12)]">
                                  <td className="p-2 text-white">{court.courtName}</td>
                                  <td className="p-2 text-white/75">
                                    {court.locationName}
                                  </td>
                                  <td className="text-right p-2 text-[#D4A817]">
                                    {court.income.toLocaleString()} EGP
                                  </td>
                                  <td className="text-right p-2 text-[#EF4444]">
                                    {court.expenses.toLocaleString()} EGP
                                  </td>
                                  <td
                                    className={`text-right p-2 font-semibold ${
                                      court.profit >= 0
                                        ? "text-[#D4A817]"
                                        : "text-[#EF4444]"
                                    }`}
                                  >
                                    {court.profit.toLocaleString()} EGP
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BarChart3 className="h-12 w-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60 font-medium">
                      No financial data available
                    </p>
                    <p className="text-sm text-white/50 mt-1">
                      Select a date range and update summary
                    </p>
                  </CardContent>
                </Card>
              )}
                </>
              )}
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-6">
              {/* Date Filter */}
              <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Filter className="h-5 w-5 text-[#D4A817]" />
                    Filter Bookings by Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white/90">Start Date</Label>
                      <Input
                        type="date"
                        value={bookingDateFilter.startDate}
                        onChange={(e) =>
                          setBookingDateFilter({
                            ...bookingDateFilter,
                            startDate: e.target.value,
                          })
                        }
                        className="mt-1 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 [&+svg]:text-[#D4A817]"
                      />
                    </div>
                    <div>
                      <Label className="text-white/90">End Date</Label>
                      <Input
                        type="date"
                        value={bookingDateFilter.endDate}
                        onChange={(e) =>
                          setBookingDateFilter({
                            ...bookingDateFilter,
                            endDate: e.target.value,
                          })
                        }
                        className="mt-1 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 [&+svg]:text-[#D4A817]"
                      />
                    </div>
                  </div>
                  {(bookingDateFilter.startDate ||
                    bookingDateFilter.endDate) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setBookingDateFilter({ startDate: "", endDate: "" })
                      }
                      className="mt-4 border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                    >
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>

              {bookingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A817]"></div>
                  <span className="ml-3 text-white/80">Loading bookings...</span>
                </div>
              ) : bookings.length === 0 ? (
                <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                  <CardContent className="py-8 text-center text-white/60">
                    No bookings found
                  </CardContent>
                </Card>
              ) : groupedBookings.sortedDates.length === 0 ? (
                <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                  <CardContent className="py-8 text-center text-white/60">
                    No bookings found for the selected date range
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {groupedBookings.sortedDates.map((dateKey) => {
                    const dateGroup = groupedBookings.grouped[dateKey];
                    const hasBookings =
                      dateGroup.confirmed.length > 0 ||
                      dateGroup.cancelled.length > 0 ||
                      dateGroup.pending.length > 0;

                    if (!hasBookings) return null;

                    return (
                      <div key={dateKey} className="space-y-4">
                        {/* Date Header */}
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">
                            {dateKey} ({dateGroup.date.toLocaleDateString('en-US', { weekday: 'long' })})
                          </h3>
                          <div className="flex-1 border-t border-[rgba(212,168,23,0.2)]"></div>
                          <div className="flex items-center gap-4 text-sm text-white/75">
                            {dateGroup.confirmed.length > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#D4A817]"></span>
                                {dateGroup.confirmed.length} Confirmed
                              </span>
                            )}
                            {dateGroup.cancelled.length > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                                {dateGroup.cancelled.length} Cancelled
                              </span>
                            )}
                            {dateGroup.pending.length > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#FB923C]"></span>
                                {dateGroup.pending.length} Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Confirmed Bookings */}
                        {dateGroup.confirmed.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-white/90 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#D4A817]"></span>
                              Confirmed ({dateGroup.confirmed.length})
                            </h4>
                            {dateGroup.confirmed.map((booking) => (
                              <Card key={booking.id} className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                                <CardContent className="pt-6">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <Badge className="bg-[rgba(212,168,23,0.25)] text-[#D4A817] border border-[rgba(212,168,23,0.4)] hover:bg-[rgba(212,168,23,0.35)]">
                                          {booking.status}
                                        </Badge>
                                        {booking.category &&
                                          booking.category !== "regular" && (
                                            <Badge
                                              variant="outline"
                                              className="bg-[rgba(212,168,23,0.15)] text-[#D4A817] border-[rgba(212,168,23,0.3)]"
                                            >
                                              {booking.category
                                                .charAt(0)
                                                .toUpperCase() +
                                                booking.category.slice(1)}
                                            </Badge>
                                          )}
                                        <span className="font-semibold">
                                          {booking.court.name}
                                        </span>
                                        <span className="text-white/60">•</span>
                                        <span>{booking.location.name}</span>
                                      </div>
                                      <div className="text-sm text-white/75 space-y-1">
                                        <div>
                                          <strong>Time:</strong>{" "}
                                          {booking.startTime} -{" "}
                                          {booking.endTime}
                                        </div>
                                        <div>
                                          <strong>User:</strong>{" "}
                                          {booking.user.name ||
                                            booking.user.email}
                                          {booking.user.phone &&
                                            ` (${booking.user.phone})`}
                                        </div>
                                        <div>
                                          <strong>Price:</strong>{" "}
                                          {booking.totalPrice} EGP
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          updateBookingStatus(
                                            booking.id,
                                            "cancelled"
                                          )
                                        }
                                        className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#EF4444] hover:text-white hover:border-[#EF4444]"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}

                        {/* Cancelled Bookings */}
                        {dateGroup.cancelled.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-white/90 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                              Cancelled ({dateGroup.cancelled.length})
                            </h4>
                            {dateGroup.cancelled.map((booking) => (
                              <Card key={booking.id} className="opacity-75 bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                                <CardContent className="pt-6">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <Badge variant="destructive">
                                          {booking.status}
                                        </Badge>
                                        {booking.category &&
                                          booking.category !== "regular" && (
                                            <Badge
                                              variant="outline"
                                              className="bg-[rgba(212,168,23,0.15)] text-[#D4A817] border-[rgba(212,168,23,0.3)]"
                                            >
                                              {booking.category
                                                .charAt(0)
                                                .toUpperCase() +
                                                booking.category.slice(1)}
                                            </Badge>
                                          )}
                                        <span className="font-semibold">
                                          {booking.court.name}
                                        </span>
                                        <span className="text-white/60">•</span>
                                        <span>{booking.location.name}</span>
                                      </div>
                                      <div className="text-sm text-white/75 space-y-1">
                                        <div>
                                          <strong>Time:</strong>{" "}
                                          {booking.startTime} -{" "}
                                          {booking.endTime}
                                        </div>
                                        <div>
                                          <strong>User:</strong>{" "}
                                          {booking.user.name ||
                                            booking.user.email}
                                          {booking.user.phone &&
                                            ` (${booking.user.phone})`}
                                        </div>
                                        <div>
                                          <strong>Price:</strong>{" "}
                                          {booking.totalPrice} EGP
                                        </div>
                                        {booking.status === "cancelled" && (
                                          <div>
                                            <strong>Cancelled by:</strong>{" "}
                                            {booking.cancelledBy ? (
                                              <>
                                                {booking.cancelledBy.name ||
                                                  booking.cancelledBy.email}
                                                {booking.cancelledBy.role ===
                                                  "club_owner" ||
                                                (booking.cancelledBy.role ===
                                                  "admin" &&
                                                  booking.cancelledBy
                                                    .adminType ===
                                                    "club_owner") ? (
                                                  <span className="ml-1 text-xs text-white/60">
                                                    (Club Owner)
                                                  </span>
                                                ) : booking.cancelledBy.role ===
                                                  "admin" ? (
                                                  <span className="ml-1 text-xs text-white/60">
                                                    (Admin)
                                                  </span>
                                                ) : null}
                                              </>
                                            ) : (
                                              <span>
                                                {booking.user.name ||
                                                  booking.user.email}{" "}
                                                <span className="text-xs text-white/60">
                                                  (Player)
                                                </span>
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0 ml-4">
                                      <Button
                                        variant="default"
                                        size="sm"
                                        className="bg-[#D4A817] hover:bg-[#E6C420]"
                                        onClick={() => handleBookAgain(booking)}
                                        disabled={
                                          checkingAvailability === booking.id ||
                                          rebookingId === booking.id
                                        }
                                      >
                                        {checkingAvailability === booking.id ? (
                                          <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Checking...
                                          </>
                                        ) : rebookingId === booking.id ? (
                                          "Booking..."
                                        ) : (
                                          <>
                                            <RotateCcw className="h-4 w-4 mr-2" />
                                            Book Again
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}

                        {/* Pending Bookings */}
                        {dateGroup.pending.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-white/90 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#FB923C]"></span>
                              Pending ({dateGroup.pending.length})
                            </h4>
                            {dateGroup.pending.map((booking) => (
                              <Card key={booking.id} className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                                <CardContent className="pt-6">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <Badge className="bg-[rgba(251,146,60,0.2)] text-[#FB923C] border border-[rgba(251,146,60,0.4)]">
                                          {booking.status}
                                        </Badge>
                                        {booking.category &&
                                          booking.category !== "regular" && (
                                            <Badge
                                              variant="outline"
                                              className="bg-[rgba(212,168,23,0.15)] text-[#D4A817] border-[rgba(212,168,23,0.3)]"
                                            >
                                              {booking.category
                                                .charAt(0)
                                                .toUpperCase() +
                                                booking.category.slice(1)}
                                            </Badge>
                                          )}
                                        <span className="font-semibold">
                                          {booking.court.name}
                                        </span>
                                        <span className="text-white/60">•</span>
                                        <span>{booking.location.name}</span>
                                      </div>
                                      <div className="text-sm text-white/75 space-y-1">
                                        <div>
                                          <strong>Time:</strong>{" "}
                                          {booking.startTime} -{" "}
                                          {booking.endTime}
                                        </div>
                                        <div>
                                          <strong>User:</strong>{" "}
                                          {booking.user.name ||
                                            booking.user.email}
                                          {booking.user.phone &&
                                            ` (${booking.user.phone})`}
                                        </div>
                                        <div>
                                          <strong>Price:</strong>{" "}
                                          {booking.totalPrice} EGP
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          updateBookingStatus(
                                            booking.id,
                                            "cancelled"
                                          )
                                        }
                                        className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#EF4444] hover:text-white hover:border-[#EF4444]"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612]"
                                        onClick={() =>
                                          updateBookingStatus(
                                            booking.id,
                                            "confirmed"
                                          )
                                        }
                                      >
                                        Confirm
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Transactions Tab - Hidden for moderators */}
            {!isModerator && (
            <TabsContent value="transactions" className="space-y-6">
              {/* Pending Transaction Requests Section */}
              {pendingRequests.length > 0 && (
                <Card className="border-[rgba(251,146,60,0.3)] bg-[rgba(251,146,60,0.1)]">
                  <CardHeader className="bg-[rgba(251,146,60,0.15)] border-b border-[rgba(251,146,60,0.3)] p-3 sm:p-6">
                    <CardTitle className="text-[#FB923C] flex items-center gap-2 text-sm sm:text-base">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                      Pending Transaction Requests ({pendingRequests.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {pendingRequests.map((request) => (
                        <Card
                          key={request.id}
                          className="border-l-4 border-l-yellow-500"
                        >
                          <CardContent className="pt-4 sm:pt-6">
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                              <div className="flex-1 w-full">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <Badge
                                    variant="outline"
                                    className="bg-[rgba(251,146,60,0.15)] text-[#FB923C] border-[rgba(251,146,60,0.3)] text-xs"
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending Approval
                                  </Badge>
                                  <span className="text-xs sm:text-sm text-white/60">
                                    {new Date(
                                      request.createdAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-base sm:text-lg mb-3">
                                  {request.description || "No description"}
                                </h3>
                                <div className="space-y-1.5 text-xs sm:text-sm text-white/75">
                                  <div className="flex flex-wrap gap-x-2">
                                    <span className="font-medium">Amount:</span>
                                    <span className="text-[#EF4444] font-semibold">
                                      {Math.abs(
                                        request.amount
                                      ).toLocaleString()}{" "}
                                      EGP
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-2">
                                    <span className="font-medium">
                                      Location:
                                    </span>
                                    <span>{request.location.name}</span>
                                  </div>
                                  {request.court && (
                                    <div className="flex flex-wrap gap-x-2">
                                      <span className="font-medium">
                                        Court:
                                      </span>
                                      <span>{request.court.name}</span>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-x-2">
                                    <span className="font-medium">
                                      Requested by:
                                    </span>
                                    <span className="break-all">
                                      {request.requestedBy?.name ||
                                        request.requestedBy?.email}
                                      {request.requestedBy?.phone &&
                                        ` (${request.requestedBy.phone})`}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-2">
                                    <span className="font-medium">
                                      Transaction Date:
                                    </span>
                                    <span>
                                      {new Date(
                                        request.transactionDate
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleApproveRequest(request.id)
                                  }
                                  disabled={
                                    approvingRequest === request.id ||
                                    rejectingRequest === request.id
                                  }
                                  className="bg-[#D4A817] hover:bg-[#E6C420] flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  {approvingRequest === request.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                                      <span className="hidden sm:inline">
                                        Approving...
                                      </span>
                                      <span className="sm:hidden">
                                        Approving
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                      <span>Approve</span>
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleRejectRequest(request.id)
                                  }
                                  disabled={
                                    approvingRequest === request.id ||
                                    rejectingRequest === request.id
                                  }
                                  className="border-[rgba(239,68,68,0.3)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  {rejectingRequest === request.id ? (
                                    <span className="hidden sm:inline">
                                      Rejecting...
                                    </span>
                                  ) : (
                                    <>
                                      <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                      <span>Reject</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-white">
                    Financial Transactions
                  </h2>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {/* Filter Buttons */}
                    <div className="flex gap-1 sm:gap-2 border border-[rgba(212,168,23,0.3)] rounded-lg p-1 bg-[rgba(255,255,255,0.05)] flex-1 sm:flex-initial min-w-0">
                      <Button
                        variant={
                          transactionFilter === "all" ? "default" : "ghost"
                        }
                        size="sm"
                        onClick={() => setTransactionFilter("all")}
                        className={`flex-1 sm:flex-initial text-xs sm:text-sm ${
                          transactionFilter === "all"
                            ? "bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612]"
                            : "text-white/90 hover:bg-[rgba(212,168,23,0.1)]"
                        }`}
                      >
                        All
                      </Button>
                      <Button
                        variant={
                          transactionFilter === "income" ? "default" : "ghost"
                        }
                        size="sm"
                        onClick={() => setTransactionFilter("income")}
                        className={`flex-1 sm:flex-initial text-xs sm:text-sm ${
                          transactionFilter === "income"
                            ? "bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612]"
                            : "text-white/90 hover:bg-[rgba(212,168,23,0.1)]"
                        }`}
                      >
                        Income
                      </Button>
                      <Button
                        variant={
                          transactionFilter === "expense" ? "default" : "ghost"
                        }
                        size="sm"
                        onClick={() => setTransactionFilter("expense")}
                        className={`flex-1 sm:flex-initial text-xs sm:text-sm ${
                          transactionFilter === "expense"
                            ? "bg-[#EF4444] hover:bg-[#DC2626] text-white"
                            : "text-white/90 hover:bg-[rgba(212,168,23,0.1)]"
                        }`}
                      >
                        Expense
                      </Button>
                    </div>
                    <Button
                      onClick={() =>
                        setShowTransactionForm(!showTransactionForm)
                      }
                      className="whitespace-nowrap bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612]"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Add Transaction</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  </div>
                </div>

                {/* Advanced Filters */}
                <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                      <Filter className="h-4 w-4 text-[#D4A817]" />
                      Filter Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <Label className="text-white/90">Location</Label>
                        <select
                          className="w-full border border-[rgba(212,168,23,0.25)] rounded px-3 py-2 mt-1 bg-[#252015] text-white focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817]"
                          value={transactionFilters.locationId}
                          onChange={(e) =>
                            setTransactionFilters({
                              ...transactionFilters,
                              locationId: e.target.value,
                              courtId: "", // Reset court when location changes
                            })
                          }
                        >
                          <option value="">All Locations</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-white/90">Court</Label>
                        <select
                          className="w-full border border-[rgba(212,168,23,0.25)] rounded px-3 py-2 mt-1 bg-[#252015] text-white focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817] disabled:opacity-50"
                          value={transactionFilters.courtId}
                          onChange={(e) =>
                            setTransactionFilters({
                              ...transactionFilters,
                              courtId: e.target.value,
                            })
                          }
                          disabled={!transactionFilters.locationId}
                        >
                          <option value="">All Courts</option>
                          {transactionFilters.locationId &&
                            locations
                              .find(
                                (l) => l.id === transactionFilters.locationId
                              )
                              ?.courts.map((court) => (
                                <option key={court.id} value={court.id}>
                                  {court.name}
                                </option>
                              ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-white/90">Source</Label>
                        <select
                          className="w-full border border-[rgba(212,168,23,0.25)] rounded px-3 py-2 mt-1 bg-[#252015] text-white focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817]"
                          value={transactionFilters.source}
                          onChange={(e) =>
                            setTransactionFilters({
                              ...transactionFilters,
                              source: e.target.value as
                                | ""
                                | "booking"
                                | "manual",
                            })
                          }
                        >
                          <option value="">All Sources</option>
                          <option value="booking">Booking</option>
                          <option value="manual">Manual</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-white/90">Start Date</Label>
                        <Input
                          ref={filterStartDateRef}
                          type="date"
                          value={filterStartDateValue}
                          className="mt-1 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white"
                          style={{ fontSize: "16px" }}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setTransactionFilters({
                              ...transactionFilters,
                              startDate: newValue,
                            });
                            setTimeout(() => {
                              setIsFilterStartDateActive(false);
                            }, 100);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setIsFilterStartDateActive(true);
                            const input = e.currentTarget as HTMLInputElement;
                            if (typeof input.showPicker === "function") {
                              input.focus();
                              requestAnimationFrame(() => {
                                try {
                                  (input as any).showPicker();
                                } catch (err) {
                                  input.focus();
                                }
                              });
                            } else {
                              input.focus();
                            }
                          }}
                          onFocus={(e) => {
                            setIsFilterStartDateActive(true);
                          }}
                          onBlur={(e) => {
                            setTimeout(() => {
                              const input = e.target as HTMLInputElement;
                              if (
                                input.value &&
                                input.value !== filterStartDateValue
                              ) {
                                setIsFilterStartDateActive(false);
                              } else if (isFilterStartDateActive) {
                                const activeElement = document.activeElement;
                                if (
                                  activeElement !== input &&
                                  activeElement !== document.body
                                ) {
                                  setIsFilterStartDateActive(false);
                                } else {
                                  input.focus();
                                }
                              }
                            }, 200);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsFilterStartDateActive(true);
                            e.currentTarget.focus();
                          }}
                          onMouseDown={(e) => {
                            setIsFilterStartDateActive(true);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-white/90">End Date</Label>
                        <Input
                          ref={filterEndDateRef}
                          type="date"
                          value={filterEndDateValue}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setTransactionFilters({
                              ...transactionFilters,
                              endDate: newValue,
                            });
                            setTimeout(() => {
                              setIsFilterEndDateActive(false);
                            }, 100);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setIsFilterEndDateActive(true);
                            const input = e.currentTarget as HTMLInputElement;
                            if (typeof input.showPicker === "function") {
                              input.focus();
                              requestAnimationFrame(() => {
                                try {
                                  (input as any).showPicker();
                                } catch (err) {
                                  input.focus();
                                }
                              });
                            } else {
                              input.focus();
                            }
                          }}
                          onFocus={(e) => {
                            setIsFilterEndDateActive(true);
                          }}
                          onBlur={(e) => {
                            setTimeout(() => {
                              const input = e.target as HTMLInputElement;
                              if (
                                input.value &&
                                input.value !== filterEndDateValue
                              ) {
                                setIsFilterEndDateActive(false);
                              } else if (isFilterEndDateActive) {
                                const activeElement = document.activeElement;
                                if (
                                  activeElement !== input &&
                                  activeElement !== document.body
                                ) {
                                  setIsFilterEndDateActive(false);
                                } else {
                                  input.focus();
                                }
                              }
                            }, 200);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsFilterEndDateActive(true);
                            e.currentTarget.focus();
                          }}
                          onMouseDown={(e) => {
                            setIsFilterEndDateActive(true);
                          }}
                          className="mt-1 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white"
                          style={{ fontSize: "16px" }}
                        />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTransactionFilters({
                          locationId: "",
                          courtId: "",
                          source: "",
                          startDate: "",
                          endDate: "",
                        })
                      }
                      className="mt-4 border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                    >
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Add Transaction Modal */}
              <Dialog
                open={showTransactionForm}
                onOpenChange={(open) => {
                  // Don't close if date picker is active (mobile issue)
                  if (!open && isDatePickerActive) {
                    // Check again after a short delay - picker might have closed
                    setTimeout(() => {
                      if (!isDatePickerActive) {
                        setShowTransactionForm(false);
                        setTransactionForm({
                          locationId: "",
                          courtId: "",
                          amount: "",
                          type: "income",
                          description: "",
                          transactionDate: new Date()
                            .toISOString()
                            .split("T")[0],
                        });
                      }
                    }, 300);
                    return;
                  }
                  setShowTransactionForm(open);
                  if (!open) {
                    // Reset form when closing
                    setIsDatePickerActive(false);
                    setTransactionForm({
                      locationId: "",
                      courtId: "",
                      amount: "",
                      type: "income",
                      description: "",
                      transactionDate: new Date().toISOString().split("T")[0],
                    });
                  }
                }}
              >
                <DialogContent
                  className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1A1612] border-[rgba(212,168,23,0.12)] text-white"
                  onPointerDownOutside={(e) => {
                    // Prevent closing when clicking on date picker or its native overlay
                    const target = e.target as HTMLElement;
                    // Check if clicking on date input or if date picker is active
                    if (
                      target.closest('input[type="date"]') ||
                      isDatePickerActive ||
                      // On mobile, the native picker creates elements outside the dialog
                      (target.tagName === "INPUT" &&
                        target.getAttribute("type") === "date")
                    ) {
                      e.preventDefault();
                      return;
                    }
                  }}
                  onInteractOutside={(e) => {
                    // Prevent closing when interacting with date picker
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('input[type="date"]') ||
                      isDatePickerActive ||
                      // On mobile, prevent closing when native picker is visible
                      (target.tagName === "INPUT" &&
                        target.getAttribute("type") === "date")
                    ) {
                      e.preventDefault();
                      return;
                    }
                  }}
                  onEscapeKeyDown={(e) => {
                    // Don't close on ESC if date picker is active
                    if (isDatePickerActive) {
                      e.preventDefault();
                    }
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-white">Create Manual Transaction</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white/90">Location *</Label>
                        <select
                          className="w-full border rounded px-3 py-2 mt-1 bg-[#252015] border-[rgba(212,168,23,0.3)] text-white focus:border-[#D4A817] focus:ring-2 focus:ring-[#D4A817]/40 focus:outline-none"
                          value={transactionForm.locationId}
                          onChange={(e) =>
                            setTransactionForm({
                              ...transactionForm,
                              locationId: e.target.value,
                              courtId: "",
                            })
                          }
                        >
                          <option value="">Select location</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-white/90">Court (optional)</Label>
                        <select
                          className="w-full border rounded px-3 py-2 mt-1 bg-[#252015] border-[rgba(212,168,23,0.3)] text-white focus:border-[#D4A817] focus:ring-2 focus:ring-[#D4A817]/40 focus:outline-none"
                          value={transactionForm.courtId}
                          onChange={(e) =>
                            setTransactionForm({
                              ...transactionForm,
                              courtId: e.target.value,
                            })
                          }
                          disabled={!transactionForm.locationId}
                        >
                          <option value="">Location-level</option>
                          {locations
                            .find((l) => l.id === transactionForm.locationId)
                            ?.courts.map((court) => (
                              <option key={court.id} value={court.id}>
                                {court.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white/90">Amount (EGP) *</Label>
                        <Input
                          type="number"
                          value={transactionForm.amount}
                          onChange={(e) =>
                            setTransactionForm({
                              ...transactionForm,
                              amount: e.target.value,
                            })
                          }
                          className="mt-1 bg-[#252015] border-[rgba(212,168,23,0.25)] focus:border-[#D4A817] focus:ring-[#D4A817]/40"
                        />
                      </div>
                      <div>
                        <Label className="text-white/90">Type *</Label>
                        <select
                          className="w-full border rounded px-3 py-2 mt-1 bg-[#252015] border-[rgba(212,168,23,0.3)] text-white focus:border-[#D4A817] focus:ring-2 focus:ring-[#D4A817]/40 focus:outline-none"
                          value={transactionForm.type}
                          onChange={(e) =>
                            setTransactionForm({
                              ...transactionForm,
                              type: e.target.value as "income" | "expense",
                            })
                          }
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-white/90">Description</Label>
                      <Input
                        value={transactionForm.description}
                        onChange={(e) =>
                          setTransactionForm({
                            ...transactionForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="e.g., Maintenance fee, Sponsorship"
                        className="mt-1 bg-[#252015] border-[rgba(212,168,23,0.25)] focus:border-[#D4A817] focus:ring-[#D4A817]/40"
                      />
                    </div>
                    <div>
                      <Label className="text-white/90">Date</Label>
                      <Input
                        ref={dateInputRef}
                        type="date"
                        value={dateInputValue}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          // Update immediately but don't mark as inactive yet
                          setTransactionForm({
                            ...transactionForm,
                            transactionDate: newValue,
                          });
                          // Mark as inactive after a short delay
                          setTimeout(() => {
                            setIsDatePickerActive(false);
                          }, 100);
                        }}
                        onTouchStart={(e) => {
                          // Prevent any event propagation to dialog
                          e.stopPropagation();
                          e.preventDefault();
                          setIsDatePickerActive(true);
                          // Force focus immediately and try to show picker
                          const input = e.currentTarget as HTMLInputElement;
                          // Use showPicker() if available (modern browsers)
                          if (typeof input.showPicker === "function") {
                            input.focus();
                            // Small delay to ensure focus is set
                            requestAnimationFrame(() => {
                              try {
                                (input as any).showPicker();
                              } catch (err) {
                                // If showPicker fails, just focus
                                input.focus();
                              }
                            });
                          } else {
                            // Fallback for older browsers
                            input.focus();
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
                        className="mt-1 bg-[#252015] border-[rgba(212,168,23,0.25)] focus:border-[#D4A817] focus:ring-[#D4A817]/40"
                        style={{ fontSize: "16px" }} // Prevent iOS zoom
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      className="border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.08)] hover:border-[#D4A817]"
                      onClick={() => {
                        setShowTransactionForm(false);
                        setTransactionForm({
                          locationId: "",
                          courtId: "",
                          amount: "",
                          type: "income",
                          description: "",
                          transactionDate: new Date()
                            .toISOString()
                            .split("T")[0],
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={createTransaction}>
                      Create Transaction
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {transactionsLoading ? (
                <div>Loading transactions...</div>
              ) : (
                (() => {
                  // Apply all filters
                  let filteredTransactions = transactions;

                  // Type filter
                  if (transactionFilter !== "all") {
                    filteredTransactions = filteredTransactions.filter(
                      (t) => t.type === transactionFilter
                    );
                  }

                  // Location filter
                  if (transactionFilters.locationId) {
                    filteredTransactions = filteredTransactions.filter(
                      (t) => t.locationId === transactionFilters.locationId
                    );
                  }

                  // Court filter
                  if (transactionFilters.courtId) {
                    filteredTransactions = filteredTransactions.filter(
                      (t) => t.courtId === transactionFilters.courtId
                    );
                  }

                  // Source filter
                  if (transactionFilters.source) {
                    filteredTransactions = filteredTransactions.filter(
                      (t) => t.source === transactionFilters.source
                    );
                  }

                  // Date range filter
                  if (transactionFilters.startDate) {
                    filteredTransactions = filteredTransactions.filter(
                      (t) =>
                        new Date(t.transactionDate) >=
                        new Date(transactionFilters.startDate)
                    );
                  }
                  if (transactionFilters.endDate) {
                    filteredTransactions = filteredTransactions.filter(
                      (t) =>
                        new Date(t.transactionDate) <=
                        new Date(transactionFilters.endDate)
                    );
                  }

                  // Group booking transactions by date
                  const groupBookingTransactions = (
                    transactions: Transaction[]
                  ) => {
                    const bookingGroups: Record<
                      string,
                      {
                        transactions: Transaction[];
                        totalAmount: number;
                        date: string;
                        location: string;
                        courts: Set<string>;
                      }
                    > = {};
                    const manualTransactions: Transaction[] = [];

                    transactions.forEach((transaction) => {
                      if (transaction.source === "booking") {
                        const dateKey = new Date(transaction.transactionDate)
                          .toISOString()
                          .split("T")[0];

                        if (!bookingGroups[dateKey]) {
                          bookingGroups[dateKey] = {
                            transactions: [],
                            totalAmount: 0,
                            date: dateKey,
                            location: transaction.location.name,
                            courts: new Set(),
                          };
                        }

                        bookingGroups[dateKey].transactions.push(transaction);
                        // Sum actual amounts (negative amounts subtract, positive add)
                        bookingGroups[dateKey].totalAmount +=
                          transaction.amount;
                        if (transaction.court) {
                          bookingGroups[dateKey].courts.add(
                            transaction.court.name
                          );
                        }
                      } else {
                        manualTransactions.push(transaction);
                      }
                    });

                    return { bookingGroups, manualTransactions };
                  };

                  const { bookingGroups, manualTransactions } =
                    groupBookingTransactions(filteredTransactions);

                  // Group transactions by type
                  // For income groups: only show groups with net positive amount (confirmed bookings minus cancellations)
                  // Count only positive income transactions (confirmed bookings) in the description
                  const incomeBookingGroups = Object.values(bookingGroups)
                    .map((group) => {
                      // Count only positive income transactions (confirmed bookings)
                      const confirmedBookings = group.transactions.filter(
                        (t) => t.type === "income" && t.amount > 0
                      ).length;
                      // Calculate net amount (positive - negative)
                      const netAmount = group.transactions.reduce(
                        (sum, t) => sum + (t.type === "income" ? t.amount : 0),
                        0
                      );
                      return {
                        ...group,
                        confirmedBookings,
                        netAmount,
                      };
                    })
                    .filter(
                      (group) =>
                        group.netAmount > 0 && // Only show groups with net positive income
                        (transactionFilter === "all" ||
                          transactionFilter === "income")
                    );

                  // Expense groups should only show actual expense transactions (not booking cancellations)
                  // Since cancellations are recorded as negative income, hide booking-based expense groups entirely
                  const expenseBookingGroups: any[] = [];

                  const incomeTransactions = manualTransactions.filter(
                    (t) => t.type === "income"
                  );
                  const expenseTransactions = manualTransactions.filter(
                    (t) => t.type === "expense"
                  );

                  const totalDisplayed =
                    incomeBookingGroups.length +
                    expenseBookingGroups.length +
                    incomeTransactions.length +
                    expenseTransactions.length;

                  if (totalDisplayed === 0) {
                    return (
                      <Card>
                        <CardContent className="py-8 text-center text-white/60">
                          No{" "}
                          {transactionFilter !== "all" ? transactionFilter : ""}{" "}
                          transactions found
                        </CardContent>
                      </Card>
                    );
                  }

                  const totalIncome =
                    incomeBookingGroups.reduce(
                      (sum, g) => sum + (g.netAmount || g.totalAmount),
                      0
                    ) +
                    incomeTransactions.reduce(
                      (sum, t) => sum + (t.amount > 0 ? t.amount : 0),
                      0
                    );
                  const totalExpenses =
                    expenseBookingGroups.reduce(
                      (sum, g) => sum + g.totalAmount,
                      0
                    ) +
                    expenseTransactions.reduce(
                      (sum, t) => sum + Math.abs(t.amount),
                      0
                    );

                  return (
                    <div className="space-y-6">
                      {/* Summary Cards */}
                      {transactionFilter === "all" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] border-l-4 border-l-[#D4A817]">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium text-white/75">
                                Total Income
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-[#D4A817]">
                                {totalIncome.toLocaleString()} EGP
                              </div>
                              <div className="text-xs text-white/60 mt-1">
                                {incomeBookingGroups.length +
                                  incomeTransactions.length}{" "}
                                transaction
                                {incomeBookingGroups.length +
                                  incomeTransactions.length !==
                                1
                                  ? "s"
                                  : ""}
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] border-l-4 border-l-[#EF4444]">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium text-white/75">
                                Total Expenses
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-[#EF4444]">
                                {totalExpenses.toLocaleString()} EGP
                              </div>
                              <div className="text-xs text-white/60 mt-1">
                                {expenseTransactions.length} transaction
                                {expenseTransactions.length !== 1 ? "s" : ""}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Income Section */}
                      {transactionFilter !== "expense" &&
                        (incomeBookingGroups.length > 0 ||
                          incomeTransactions.length > 0) && (
                          <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                            <CardHeader className="bg-[rgba(212,168,23,0.15)] border-b border-[rgba(212,168,23,0.3)]">
                              <CardTitle className="text-[#D4A817] flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Income Transactions (
                                {incomeBookingGroups.length +
                                  incomeTransactions.length}
                                )
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              {/* Desktop Table View */}
                              <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-[rgba(212,168,23,0.2)] bg-[#252015]/80">
                                      <th className="text-left p-3 text-xs sm:text-sm text-white/90">
                                        Date
                                      </th>
                                      <th className="text-left p-3 text-xs sm:text-sm text-white/90">
                                        Location
                                      </th>
                                      <th className="text-left p-3 text-xs sm:text-sm text-white/90">
                                        Court
                                      </th>
                                      <th className="text-left p-3 text-xs sm:text-sm text-white/90">
                                        Source
                                      </th>
                                      <th className="text-left p-3 text-xs sm:text-sm text-white/90">
                                        Description
                                      </th>
                                      <th className="text-right p-3 text-xs sm:text-sm text-white/90">
                                        Amount
                                      </th>
                                      <th className="text-right p-3 text-xs sm:text-sm text-white/90">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {/* Grouped Booking Transactions */}
                                    {incomeBookingGroups.map((group, idx) => (
                                      <tr
                                        key={`booking-group-${group.date}-${idx}`}
                                        className="border-b border-[rgba(212,168,23,0.12)] hover:bg-[rgba(212,168,23,0.08)]"
                                      >
                                        <td className="p-3 text-xs sm:text-sm">
                                          {new Date(
                                            group.date
                                          ).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 text-xs sm:text-sm">
                                          {group.location}
                                        </td>
                                        <td className="p-3 text-xs sm:text-sm">
                                          {Array.from(group.courts).join(", ")}
                                        </td>
                                        <td className="p-3">
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-[rgba(212,168,23,0.15)] text-[#D4A817] border-[rgba(212,168,23,0.3)]"
                                          >
                                            booking
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-xs sm:text-sm">
                                          {group.confirmedBookings ||
                                            group.transactions.filter(
                                              (t: any) =>
                                                t.type === "income" &&
                                                t.amount > 0
                                            ).length}{" "}
                                          confirmed booking
                                          {(group.confirmedBookings ||
                                            group.transactions.filter(
                                              (t: any) =>
                                                t.type === "income" &&
                                                t.amount > 0
                                            ).length) !== 1
                                            ? "s"
                                            : ""}{" "}
                                          on this day
                                        </td>
                                        <td className="text-right p-3 font-semibold text-[#D4A817] text-xs sm:text-sm">
                                          {(
                                            group.netAmount || group.totalAmount
                                          ).toLocaleString()}{" "}
                                          EGP
                                        </td>
                                        <td className="p-3 text-right">—</td>
                                      </tr>
                                    ))}
                                    {/* Manual Income Transactions */}
                                    {incomeTransactions.map((transaction) => (
                                      <tr
                                        key={transaction.id}
                                        className="border-b border-[rgba(212,168,23,0.12)] hover:bg-[rgba(212,168,23,0.08)]"
                                      >
                                        <td className="p-3 text-xs sm:text-sm">
                                          {new Date(
                                            transaction.transactionDate
                                          ).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 text-xs sm:text-sm">
                                          {transaction.location.name}
                                        </td>
                                        <td className="p-3 text-xs sm:text-sm">
                                          {transaction.court?.name || "—"}
                                        </td>
                                        <td className="p-3">
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-[rgba(212,168,23,0.15)] text-[#D4A817] border-[rgba(212,168,23,0.3)]"
                                          >
                                            {transaction.source}
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-xs sm:text-sm">
                                          {transaction.description || "—"}
                                        </td>
                                        <td className="text-right p-3 font-semibold text-[#D4A817] text-xs sm:text-sm">
                                          {Math.abs(
                                            transaction.amount
                                          ).toLocaleString()}{" "}
                                          EGP
                                        </td>
                                        <td className="p-3 text-right">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              deleteTransaction(transaction.id)
                                            }
                                            className="h-7 w-7 p-0"
                                          >
                                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-[#EF4444]" />
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {/* Mobile Card View */}
                              <div className="md:hidden space-y-3 p-3">
                                {/* Grouped Booking Transactions */}
                                {incomeBookingGroups.map((group, idx) => (
                                  <Card
                                    key={`booking-group-${group.date}-${idx}`}
                                    className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] border-l-4 border-l-[#D4A817]"
                                  >
                                    <CardContent className="pt-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-white/60">
                                            {new Date(
                                              group.date
                                            ).toLocaleDateString()}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-[rgba(212,168,23,0.15)] text-[#D4A817] border-[rgba(212,168,23,0.3)]"
                                          >
                                            booking
                                          </Badge>
                                        </div>
                                        <div className="font-semibold text-[#D4A817] text-lg">
                                          {(
                                            group.netAmount || group.totalAmount
                                          ).toLocaleString()}{" "}
                                          EGP
                                        </div>
                                        <div className="text-sm">
                                          <div>
                                            <span className="font-medium">
                                              Location:
                                            </span>{" "}
                                            {group.location}
                                          </div>
                                          <div>
                                            <span className="font-medium">
                                              Courts:
                                            </span>{" "}
                                            {Array.from(group.courts).join(
                                              ", "
                                            )}
                                          </div>
                                          <div className="text-xs text-white/75 mt-1">
                                            {group.confirmedBookings ||
                                              group.transactions.filter(
                                                (t: any) =>
                                                  t.type === "income" &&
                                                  t.amount > 0
                                              ).length}{" "}
                                            confirmed booking
                                            {(group.confirmedBookings ||
                                              group.transactions.filter(
                                                (t: any) =>
                                                  t.type === "income" &&
                                                  t.amount > 0
                                              ).length) !== 1
                                              ? "s"
                                              : ""}{" "}
                                            on this day
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                                {/* Manual Income Transactions */}
                                {incomeTransactions.map((transaction) => (
                                  <Card
                                    key={transaction.id}
                                    className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] border-l-4 border-l-[#D4A817]"
                                  >
                                    <CardContent className="pt-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-white/60">
                                            {new Date(
                                              transaction.transactionDate
                                            ).toLocaleDateString()}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-[rgba(212,168,23,0.15)] text-[#D4A817] border-[rgba(212,168,23,0.3)]"
                                          >
                                            {transaction.source}
                                          </Badge>
                                        </div>
                                        <div className="font-semibold text-[#D4A817] text-lg">
                                          {Math.abs(
                                            transaction.amount
                                          ).toLocaleString()}{" "}
                                          EGP
                                        </div>
                                        <div className="text-sm space-y-1">
                                          <div>
                                            <span className="font-medium">
                                              Location:
                                            </span>{" "}
                                            {transaction.location.name}
                                          </div>
                                          {transaction.court && (
                                            <div>
                                              <span className="font-medium">
                                                Court:
                                              </span>{" "}
                                              {transaction.court.name}
                                            </div>
                                          )}
                                          {transaction.description && (
                                            <div>
                                              <span className="font-medium">
                                                Description:
                                              </span>{" "}
                                              {transaction.description}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex justify-end pt-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              deleteTransaction(transaction.id)
                                            }
                                            className="h-8 w-8 p-0"
                                          >
                                            <Trash2 className="h-4 w-4 text-[#EF4444]" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                      {/* Expense Section */}
                      {transactionFilter !== "income" &&
                        expenseTransactions.length > 0 && (
                          <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                            <CardHeader className="bg-[rgba(239,68,68,0.15)] border-b border-[rgba(239,68,68,0.3)]">
                              <CardTitle className="text-[#EF4444] flex items-center gap-2">
                                <TrendingDown className="h-5 w-5" />
                                Expense Transactions (
                                {expenseTransactions.length})
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              {/* Desktop Table View */}
                              <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-[rgba(212,168,23,0.2)] bg-[#252015]/80">
                                      <th className="text-left p-3 text-xs sm:text-sm text-white/90">
                                        Date
                                      </th>
                                      <th className="text-left p-3 text-xs sm:text-sm text-white/90">
                                        Location
                                      </th>
                                      <th className="text-left p-3 text-xs sm:text-sm text-white/90">
                                        Court
                                      </th>
                                      <th className="text-left p-3 text-xs sm:text-sm text-white/90">
                                        Source
                                      </th>
                                      <th className="text-left p-3 text-xs sm:text-sm text-white/90">
                                        Description
                                      </th>
                                      <th className="text-right p-3 text-xs sm:text-sm text-white/90">
                                        Amount
                                      </th>
                                      <th className="text-right p-3 text-xs sm:text-sm text-white/90">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {/* Grouped Booking Transactions */}
                                    {expenseBookingGroups.map((group, idx) => (
                                      <tr
                                        key={`booking-group-${group.date}-${idx}`}
                                        className="border-b border-[rgba(212,168,23,0.12)] hover:bg-[rgba(239,68,68,0.1)]"
                                      >
                                        <td className="p-3 text-xs sm:text-sm">
                                          {new Date(
                                            group.date
                                          ).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 text-xs sm:text-sm">
                                          {group.location}
                                        </td>
                                        <td className="p-3 text-xs sm:text-sm">
                                          {Array.from(group.courts).join(", ")}
                                        </td>
                                        <td className="p-3">
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-[rgba(239,68,68,0.15)] text-[#EF4444] border-[rgba(239,68,68,0.3)]"
                                          >
                                            booking
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-xs sm:text-sm">
                                          {group.transactions.length} booking
                                          {group.transactions.length !== 1
                                            ? "s"
                                            : ""}{" "}
                                          on this day
                                        </td>
                                        <td className="text-right p-3 font-semibold text-[#EF4444] text-xs sm:text-sm">
                                          {group.totalAmount.toLocaleString()}{" "}
                                          EGP
                                        </td>
                                        <td className="p-3 text-right">—</td>
                                      </tr>
                                    ))}
                                    {/* Manual Expense Transactions */}
                                    {expenseTransactions.map((transaction) => (
                                      <tr
                                        key={transaction.id}
                                        className="border-b border-[rgba(212,168,23,0.12)] hover:bg-[rgba(239,68,68,0.1)]"
                                      >
                                        <td className="p-3 text-xs sm:text-sm">
                                          {new Date(
                                            transaction.transactionDate
                                          ).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 text-xs sm:text-sm">
                                          {transaction.location.name}
                                        </td>
                                        <td className="p-3 text-xs sm:text-sm">
                                          {transaction.court?.name || "—"}
                                        </td>
                                        <td className="p-3">
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-[rgba(239,68,68,0.15)] text-[#EF4444] border-[rgba(239,68,68,0.3)]"
                                          >
                                            {transaction.source}
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-xs sm:text-sm">
                                          {transaction.description || "—"}
                                        </td>
                                        <td className="text-right p-3 font-semibold text-[#EF4444] text-xs sm:text-sm">
                                          {Math.abs(
                                            transaction.amount
                                          ).toLocaleString()}{" "}
                                          EGP
                                        </td>
                                        <td className="p-3 text-right">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              deleteTransaction(transaction.id)
                                            }
                                            className="h-7 w-7 p-0"
                                          >
                                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-[#EF4444]" />
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {/* Mobile Card View */}
                              <div className="md:hidden space-y-3 p-3">
                                {/* Grouped Booking Transactions */}
                                {expenseBookingGroups.map((group, idx) => (
                                  <Card
                                    key={`booking-group-${group.date}-${idx}`}
                                    className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] border-l-4 border-l-[#EF4444]"
                                  >
                                    <CardContent className="pt-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-white/60">
                                            {new Date(
                                              group.date
                                            ).toLocaleDateString()}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-[rgba(239,68,68,0.15)] text-[#EF4444] border-[rgba(239,68,68,0.3)]"
                                          >
                                            booking
                                          </Badge>
                                        </div>
                                        <div className="font-semibold text-[#EF4444] text-lg">
                                          {group.totalAmount.toLocaleString()}{" "}
                                          EGP
                                        </div>
                                        <div className="text-sm">
                                          <div>
                                            <span className="font-medium">
                                              Location:
                                            </span>{" "}
                                            {group.location}
                                          </div>
                                          <div>
                                            <span className="font-medium">
                                              Courts:
                                            </span>{" "}
                                            {Array.from(group.courts).join(
                                              ", "
                                            )}
                                          </div>
                                          <div className="text-xs text-white/75 mt-1">
                                            {group.transactions.length} booking
                                            {group.transactions.length !== 1
                                              ? "s"
                                              : ""}{" "}
                                            on this day
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                                {/* Manual Expense Transactions */}
                                {expenseTransactions.map((transaction) => (
                                  <Card
                                    key={transaction.id}
                                    className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] border-l-4 border-l-[#EF4444]"
                                  >
                                    <CardContent className="pt-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-white/60">
                                            {new Date(
                                              transaction.transactionDate
                                            ).toLocaleDateString()}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-[rgba(239,68,68,0.15)] text-[#EF4444] border-[rgba(239,68,68,0.3)]"
                                          >
                                            {transaction.source}
                                          </Badge>
                                        </div>
                                        <div className="font-semibold text-[#EF4444] text-lg">
                                          {Math.abs(
                                            transaction.amount
                                          ).toLocaleString()}{" "}
                                          EGP
                                        </div>
                                        <div className="text-sm space-y-1">
                                          <div>
                                            <span className="font-medium">
                                              Location:
                                            </span>{" "}
                                            {transaction.location.name}
                                          </div>
                                          {transaction.court && (
                                            <div>
                                              <span className="font-medium">
                                                Court:
                                              </span>{" "}
                                              {transaction.court.name}
                                            </div>
                                          )}
                                          {transaction.description && (
                                            <div>
                                              <span className="font-medium">
                                                Description:
                                              </span>{" "}
                                              {transaction.description}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex justify-end pt-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              deleteTransaction(transaction.id)
                                            }
                                            className="h-8 w-8 p-0"
                                          >
                                            <Trash2 className="h-4 w-4 text-[#EF4444]" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                    </div>
                  );
                })()
              )}
            </TabsContent>
            )}

            {/* Fixed Bookings Tab */}
            <TabsContent value="fixed-bookings" className="space-y-4 md:space-y-6">
              {/* Header - Mobile Optimized */}
              <div className="space-y-3 md:space-y-0 md:flex md:justify-between md:items-start">
                <div className="space-y-1">
                  <h2 className="text-xl md:text-2xl font-bold text-white">Fixed Bookings</h2>
                  <p className="text-sm md:text-base text-white/70 leading-relaxed">
                    Manage recurring weekly bookings that automatically block time slots
                  </p>
                </div>
                {/* Action Buttons - Stacked on mobile, horizontal on desktop */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-2 w-full md:w-auto">
                  <Button 
                    onClick={openCreateFixedBooking} 
                    className="w-full md:w-auto flex items-center justify-center gap-2 h-11 md:h-10 bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612]"
                  >
                    <Plus className="h-4 w-4" />
                    Create Fixed Booking
                  </Button>
                </div>
              </div>

              {/* Filters - Mobile Drawer / Desktop Inline */}
              <div className="space-y-3">
                {/* Mobile: Filter Button */}
                <div className="md:hidden">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                    className="w-full flex items-center justify-between h-11 border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-[#D4A817]" />
                      <span>Filters</span>
                      {(fixedBookingFilters.status !== "all" ||
                        fixedBookingFilters.locationId !== "all" ||
                        fixedBookingFilters.courtId !== "all" ||
                        fixedBookingFilters.dayOfWeek !== "all" ||
                        fixedBookingFilters.category !== "all") && (
                        <Badge className="ml-1 bg-[rgba(212,168,23,0.25)] text-[#D4A817] border border-[rgba(212,168,23,0.4)]">
                          {[
                            fixedBookingFilters.status !== "all",
                            fixedBookingFilters.locationId !== "all",
                            fixedBookingFilters.courtId !== "all",
                            fixedBookingFilters.dayOfWeek !== "all",
                            fixedBookingFilters.category !== "all",
                          ].filter(Boolean).length}
                        </Badge>
                      )}
                    </div>
                    <X className={cn(
                      "h-4 w-4 transition-transform",
                      showFilterDrawer && "rotate-90"
                    )} />
                  </Button>
                </div>

                {/* Mobile: Collapsible Filter Drawer */}
                {showFilterDrawer && (
                  <Card className="md:hidden rounded-xl bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] shadow-lg">
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-white/90 mb-2 block">Status</Label>
                          <select
                            value={fixedBookingFilters.status}
                            onChange={(e) =>
                              setFixedBookingFilters({
                                ...fixedBookingFilters,
                                status: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 bg-[#252015] border border-[rgba(212,168,23,0.25)] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817] transition-colors"
                          >
                            <option value="all">All</option>
                            <option value="ACTIVE">Active</option>
                            <option value="PAUSED">Paused</option>
                            <option value="CANCELED">Canceled</option>
                          </select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-white/90 mb-2 block">Location</Label>
                          <select
                            value={fixedBookingFilters.locationId}
                            onChange={(e) =>
                              setFixedBookingFilters({
                                ...fixedBookingFilters,
                                locationId: e.target.value,
                                courtId: "all",
                              })
                            }
                            className="w-full px-4 py-3 bg-[#252015] border border-[rgba(212,168,23,0.25)] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817] transition-colors"
                          >
                            <option value="all">All Locations</option>
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-white/90 mb-2 block">Court</Label>
                          <select
                            value={fixedBookingFilters.courtId}
                            onChange={(e) =>
                              setFixedBookingFilters({
                                ...fixedBookingFilters,
                                courtId: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 bg-[#252015] border border-[rgba(212,168,23,0.25)] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={fixedBookingFilters.locationId === "all"}
                          >
                            <option value="all">All Courts</option>
                            {locations
                              .find((loc) => loc.id === fixedBookingFilters.locationId)
                              ?.courts.map((court) => (
                                <option key={court.id} value={court.id}>
                                  {court.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-white/90 mb-2 block">Day of Week</Label>
                          <select
                            value={fixedBookingFilters.dayOfWeek}
                            onChange={(e) =>
                              setFixedBookingFilters({
                                ...fixedBookingFilters,
                                dayOfWeek: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 bg-[#252015] border border-[rgba(212,168,23,0.25)] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817] transition-colors"
                          >
                            <option value="all">All Days</option>
                            <option value="0">Sunday</option>
                            <option value="1">Monday</option>
                            <option value="2">Tuesday</option>
                            <option value="3">Wednesday</option>
                            <option value="4">Thursday</option>
                            <option value="5">Friday</option>
                            <option value="6">Saturday</option>
                          </select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-white/90 mb-2 block">Category</Label>
                          <select
                            value={fixedBookingFilters.category}
                            onChange={(e) =>
                              setFixedBookingFilters({
                                ...fixedBookingFilters,
                                category: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 bg-[#252015] border border-[rgba(212,168,23,0.25)] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817] transition-colors"
                          >
                            <option value="all">All Categories</option>
                            <option value="regular">Regular</option>
                            <option value="academy">Academy</option>
                            <option value="tournament">Tournament</option>
                          </select>
                        </div>
                      </div>

                      {(fixedBookingFilters.status !== "all" ||
                        fixedBookingFilters.locationId !== "all" ||
                        fixedBookingFilters.courtId !== "all" ||
                        fixedBookingFilters.dayOfWeek !== "all" ||
                        fixedBookingFilters.category !== "all") && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            setFixedBookingFilters({
                              status: "all",
                              locationId: "all",
                              courtId: "all",
                              dayOfWeek: "all",
                              category: "all",
                            })
                          }
                          className="w-full h-11 border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear All Filters
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Desktop: Inline Filters */}
                <Card className="hidden md:block rounded-xl bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-white/75">Status:</Label>
                        <select
                          value={fixedBookingFilters.status}
                          onChange={(e) =>
                            setFixedBookingFilters({
                              ...fixedBookingFilters,
                              status: e.target.value,
                            })
                          }
                          className="px-3 py-1.5 bg-[#252015] border border-[rgba(212,168,23,0.25)] rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817]"
                        >
                          <option value="all">All</option>
                          <option value="ACTIVE">Active</option>
                          <option value="PAUSED">Paused</option>
                          <option value="CANCELED">Canceled</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-white/75">Location:</Label>
                        <select
                          value={fixedBookingFilters.locationId}
                          onChange={(e) =>
                            setFixedBookingFilters({
                              ...fixedBookingFilters,
                              locationId: e.target.value,
                              courtId: "all",
                            })
                          }
                          className="px-3 py-1.5 bg-[#252015] border border-[rgba(212,168,23,0.25)] rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817]"
                        >
                          <option value="all">All Locations</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-white/75">Court:</Label>
                        <select
                          value={fixedBookingFilters.courtId}
                          onChange={(e) =>
                            setFixedBookingFilters({
                              ...fixedBookingFilters,
                              courtId: e.target.value,
                            })
                          }
                          className="px-3 py-1.5 bg-[#252015] border border-[rgba(212,168,23,0.25)] rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817] disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={fixedBookingFilters.locationId === "all"}
                        >
                          <option value="all">All Courts</option>
                          {locations
                            .find((loc) => loc.id === fixedBookingFilters.locationId)
                            ?.courts.map((court) => (
                              <option key={court.id} value={court.id}>
                                {court.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-white/75">Day:</Label>
                        <select
                          value={fixedBookingFilters.dayOfWeek}
                          onChange={(e) =>
                            setFixedBookingFilters({
                              ...fixedBookingFilters,
                              dayOfWeek: e.target.value,
                            })
                          }
                          className="px-3 py-1.5 bg-[#252015] border border-[rgba(212,168,23,0.25)] rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817]"
                        >
                          <option value="all">All Days</option>
                          <option value="0">Sunday</option>
                          <option value="1">Monday</option>
                          <option value="2">Tuesday</option>
                          <option value="3">Wednesday</option>
                          <option value="4">Thursday</option>
                          <option value="5">Friday</option>
                          <option value="6">Saturday</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-white/75">Category:</Label>
                        <select
                          value={fixedBookingFilters.category}
                          onChange={(e) =>
                            setFixedBookingFilters({
                              ...fixedBookingFilters,
                              category: e.target.value,
                            })
                          }
                          className="px-3 py-1.5 bg-[#252015] border border-[rgba(212,168,23,0.25)] rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817]"
                        >
                          <option value="all">All Categories</option>
                          <option value="regular">Regular</option>
                          <option value="academy">Academy</option>
                          <option value="tournament">Tournament</option>
                        </select>
                      </div>

                      {(fixedBookingFilters.status !== "all" ||
                        fixedBookingFilters.locationId !== "all" ||
                        fixedBookingFilters.courtId !== "all" ||
                        fixedBookingFilters.dayOfWeek !== "all" ||
                        fixedBookingFilters.category !== "all") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setFixedBookingFilters({
                              status: "all",
                              locationId: "all",
                              courtId: "all",
                              dayOfWeek: "all",
                              category: "all",
                            })
                          }
                          className="ml-auto border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {fixedBookingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A817]"></div>
                    <p className="text-sm text-white/70">Loading fixed bookings...</p>
                  </div>
                </div>
              ) : (() => {
                // Apply filters
                const filteredBookings = fixedBookings.filter((fb) => {
                  if (
                    fixedBookingFilters.status !== "all" &&
                    fb.status !== fixedBookingFilters.status
                  ) {
                    return false;
                  }
                  if (
                    fixedBookingFilters.locationId !== "all" &&
                    fb.locationId !== fixedBookingFilters.locationId
                  ) {
                    return false;
                  }
                  if (
                    fixedBookingFilters.courtId !== "all" &&
                    fb.courtId !== fixedBookingFilters.courtId
                  ) {
                    return false;
                  }
                  if (
                    fixedBookingFilters.dayOfWeek !== "all" &&
                    fb.dayOfWeek.toString() !== fixedBookingFilters.dayOfWeek
                  ) {
                    return false;
                  }
                  if (
                    fixedBookingFilters.category !== "all" &&
                    (fb.category || "regular") !== fixedBookingFilters.category
                  ) {
                    return false;
                  }
                  return true;
                });

                if (filteredBookings.length === 0) {
                  return (
                    <Card className="rounded-xl bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] shadow-lg">
                      <CardContent className="py-12 md:py-16 text-center">
                        <Filter className="h-12 w-12 md:h-16 md:w-16 mx-auto text-[#D4A817]/60 mb-4" />
                        <p className="text-base md:text-lg text-white/80 mb-4 font-medium">No fixed bookings match your filters</p>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setFixedBookingFilters({
                              status: "all",
                              locationId: "all",
                              courtId: "all",
                              dayOfWeek: "all",
                              category: "all",
                            })
                          }
                          className="h-11 px-6 border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear Filters
                        </Button>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <div className="space-y-3 md:space-y-4">
                    {filteredBookings.map((fb) => (
                    <Card 
                      key={fb.id} 
                      className={cn(
                        "rounded-xl border-l-4 shadow-lg transition-all hover:shadow-xl",
                        "bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]",
                        fb.status === "ACTIVE" ? "border-l-green-500" : 
                        fb.status === "PAUSED" ? "border-l-[#D4A817]" : 
                        "border-l-gray-400"
                      )}
                    >
                      <CardContent className="p-4 md:p-5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            {/* Header with badges and court info */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <Badge 
                                variant={fb.status === "ACTIVE" ? "default" : "secondary"}
                                className="text-xs px-2 py-1"
                              >
                                {fb.status}
                              </Badge>
                              {fb.category && fb.category !== "regular" && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs px-2 py-1",
                                    fb.category === "academy"
                                      ? "border-[#D4A817] text-[#D4A817] bg-[rgba(212,168,23,0.15)]"
                                      : fb.category === "tournament"
                                      ? "border-amber-500 text-amber-500 bg-amber-500/10"
                                      : ""
                                  )}
                                >
                                  {fb.category.charAt(0).toUpperCase() + fb.category.slice(1)}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-base text-white">{fb.court.name}</span>
                                <span className="text-white/40">•</span>
                                <span className="text-sm text-white/70">{fb.location.name}</span>
                              </div>
                            </div>
                            
                            {/* Details Grid - Stacked on mobile, 2 columns on desktop */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm leading-relaxed">
                              <div className="flex flex-col">
                                <span className="text-xs text-white/60 mb-0.5">Day</span>
                                <span className="font-medium text-white">
                                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][fb.dayOfWeek]}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs text-white/60 mb-0.5">Time</span>
                                <span className="font-medium text-white">{fb.startTime} - {fb.endTime}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs text-white/60 mb-0.5">Starts</span>
                                <span className="font-medium text-white">
                                  {new Date(fb.startDate).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs text-white/60 mb-0.5">Ends</span>
                                <span className="font-medium text-white">
                                  {fb.endDate ? new Date(fb.endDate).toLocaleDateString() : "Never"}
                                </span>
                              </div>
                              {fb.user && (
                                <div className="flex flex-col md:col-span-1">
                                  <span className="text-xs text-white/60 mb-0.5">User</span>
                                  <span className="font-medium text-white">
                                    {fb.user.name || fb.user.email}
                                    {fb.user.phone && (
                                      <span className="text-white/60 ml-1.5 text-xs">({fb.user.phone})</span>
                                    )}
                                  </span>
                                </div>
                              )}
                              {fb.createdBy && (
                                <div className="flex flex-col md:col-span-1">
                                  <span className="text-xs text-white/60 mb-0.5">Fixed by</span>
                                  <span className="font-medium text-white">{fb.createdBy.name || fb.createdBy.email}</span>
                                </div>
                              )}
                              {fb.notes && (
                                <div className="flex flex-col md:col-span-2">
                                  <span className="text-xs text-white/60 mb-0.5">Notes</span>
                                  <span className="font-medium text-white text-sm leading-relaxed">{fb.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons - Stacked on mobile, horizontal on desktop */}
                          <div className="flex flex-row md:flex-col gap-2 md:ml-4 md:flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleFixedBookingStatus(fb.id, fb.status)}
                              title={fb.status === "ACTIVE" ? "Pause" : "Activate"}
                              className="flex-1 md:flex-none h-10 md:h-9"
                            >
                              {fb.status === "ACTIVE" ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditFixedBooking(fb)}
                              className="flex-1 md:flex-none h-10 md:h-9"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteFixedBooking(fb.id)}
                              className="text-[#EF4444] hover:text-red-700 hover:bg-red-500/10 flex-1 md:flex-none h-10 md:h-9"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    ))}
                  </div>
                );
              })()}
            </TabsContent>

            {/* Locations Tab */}
            <TabsContent value="locations" className="space-y-6">
              {locationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A817]"></div>
                  <span className="ml-3 text-white/80">Loading locations...</span>
                </div>
              ) : locations.length === 0 ? (
                <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                  <CardContent className="py-8 text-center text-white/60">
                    No locations found. Contact an admin to assign locations to
                    you.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {locations.map((location) => (
                    <Card key={location.id} className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-white">
                          <span>{location.name}</span>
                          <Badge className="bg-[rgba(212,168,23,0.25)] text-[#D4A817] border border-[rgba(212,168,23,0.4)]">
                            {location.courts.length} courts
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-sm text-white/75">
                            {location.address}
                          </div>

                          {/* Owner Phone Number */}
                          <div className="border-t border-[rgba(212,168,23,0.15)] pt-4">
                            <Label className="text-sm font-medium mb-2 block flex items-center gap-1 text-white/90">
                              <Phone className="h-4 w-4 text-[#D4A817]" /> Contact Phone
                            </Label>
                            {editingPhone ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="tel"
                                  value={phoneValue}
                                  onChange={(e) =>
                                    setPhoneValue(e.target.value)
                                  }
                                  placeholder="e.g., +20 123 456 7890"
                                  className="flex-1 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white"
                                />
                                <Button
                                  size="sm"
                                  onClick={handleUpdatePhone}
                                  disabled={updatingPhone}
                                  className="bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612]"
                                >
                                  {updatingPhone ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1A1612] mr-2"></div>
                                      Updating...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="h-4 w-4 mr-1" />
                                      Save
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingPhone(false);
                                    // Reset to current phone from location owner or session
                                    const currentPhone =
                                      location.owner?.phone || "";
                                    setPhoneValue(currentPhone);
                                  }}
                                  disabled={updatingPhone}
                                  className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-white/90">
                                  {location.owner?.phone ? (
                                    <span>{location.owner.phone}</span>
                                  ) : (
                                    <span className="text-white/50 italic">
                                      No phone number set
                                    </span>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingPhone(true);
                                    // Initialize with current phone from location owner
                                    const currentPhone =
                                      location.owner?.phone || "";
                                    setPhoneValue(currentPhone);
                                  }}
                                  className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* InstaPay Phone Number */}
                          <div className="border-t border-[rgba(212,168,23,0.15)] pt-4">
                            <Label className="text-sm font-medium mb-2 block flex items-center gap-1 text-white/90">
                              <Smartphone className="h-4 w-4 text-[#D4A817]" /> InstaPay Receiving Number
                            </Label>
                            {editingInstapayPhone === location.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="tel"
                                  value={instapayPhoneValue}
                                  onChange={(e) =>
                                    setInstapayPhoneValue(e.target.value)
                                  }
                                  placeholder="e.g., 01234567890"
                                  className="flex-1 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white"
                                />
                                <Button
                                  size="sm"
                                  className="bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612]"
                                  onClick={async () => {
                                    try {
                                      setUpdatingInstapayPhone(true);
                                      const res = await fetch(
                                        `/api/locations/${location.id}`,
                                        {
                                          method: "PATCH",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            instapayPhone: instapayPhoneValue || null,
                                          }),
                                        }
                                      );
                                      if (res.ok) {
                                        toast.success(
                                          "InstaPay phone number updated"
                                        );
                                        setEditingInstapayPhone(null);
                                        fetchLocations();
                                      } else {
                                        const errorData = await res.json();
                                        throw new Error(
                                          errorData?.details ||
                                            errorData?.error ||
                                            "Failed to update InstaPay phone number"
                                        );
                                      }
                                    } catch (error: any) {
                                      console.error(
                                        "Error updating InstaPay phone:",
                                        error
                                      );
                                      toast.error(
                                        error?.message ||
                                          "Failed to update InstaPay phone number"
                                      );
                                    } finally {
                                      setUpdatingInstapayPhone(false);
                                    }
                                  }}
                                  disabled={updatingInstapayPhone}
                                >
                                  {updatingInstapayPhone ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1A1612] mr-2"></div>
                                      Updating...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="h-4 w-4 mr-1" />
                                      Save
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingInstapayPhone(null);
                                    setInstapayPhoneValue(
                                      location.instapayPhone || ""
                                    );
                                  }}
                                  disabled={updatingInstapayPhone}
                                  className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-white/90">
                                  {location.instapayPhone ? (
                                    <span className="font-mono">{location.instapayPhone}</span>
                                  ) : (
                                    <span className="text-white/50 italic">
                                      No InstaPay number set
                                    </span>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingInstapayPhone(location.id);
                                    setInstapayPhoneValue(
                                      location.instapayPhone || ""
                                    );
                                  }}
                                  className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  {location.instapayPhone ? "Edit" : "Set"}
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Operating Hours */}
                          <div className="border-t border-[rgba(212,168,23,0.15)] pt-4">
                            <Label className="text-sm font-medium mb-2 block flex items-center gap-1 text-white/90">
                              <Clock className="h-4 w-4 text-[#D4A817]" />
                              Operating Hours
                            </Label>
                            {editingOperatingHours === location.id ? (
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-white/75">
                                    Open:
                                  </span>
                                  <Input
                                    type="time"
                                    value={openingTimeValue}
                                    onChange={(e) =>
                                      setOpeningTimeValue(e.target.value)
                                    }
                                    className="w-24 md:w-28 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-white/75">
                                    Close:
                                  </span>
                                  <Input
                                    type="time"
                                    value={closingTimeValue}
                                    onChange={(e) =>
                                      setClosingTimeValue(e.target.value)
                                    }
                                    className="w-24 md:w-34 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white"
                                  />
                                  <span className="text-xs text-white/75">
                                    (supports overnight)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(
                                          `/api/locations/${location.id}`,
                                          {
                                            method: "PATCH",
                                            headers: {
                                              "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({
                                              openingTime:
                                                openingTimeValue || null,
                                              closingTime:
                                                closingTimeValue || null,
                                            }),
                                          }
                                        );
                                        if (res.ok) {
                                          toast.success(
                                            "Operating hours updated"
                                          );
                                          setEditingOperatingHours(null);
                                          fetchLocations();
                                        } else {
                                          const errorData = await res.json();
                                          throw new Error(
                                            errorData?.details ||
                                              errorData?.error ||
                                              "Failed to update operating hours"
                                          );
                                        }
                                      } catch (error: any) {
                                        console.error(
                                          "Error updating operating hours:",
                                          error
                                        );
                                        toast.error(
                                          error?.message ||
                                            "Failed to update operating hours"
                                        );
                                      }
                                    }}
                                    className="bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612]"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingOperatingHours(null);
                                      setOpeningTimeValue(
                                        location.openingTime || "08:00"
                                      );
                                      setClosingTimeValue(
                                        location.closingTime || "05:00"
                                      );
                                    }}
                                    className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-white/90">
                                  {location.openingTime || location.closingTime ? (
                                    <>
                                      Open from{" "}
                                      <span className="font-semibold text-[#D4A817]">
                                        {location.openingTime || "08:00"}
                                      </span>{" "}
                                      to{" "}
                                      <span className="font-semibold text-[#D4A817]">
                                        {location.closingTime || "05:00"}
                                      </span>
                                      {location.closingTime &&
                                        location.openingTime &&
                                        location.closingTime <
                                          location.openingTime && (
                                          <span className="text-xs text-white/60 ml-1">
                                            (next day)
                                          </span>
                                        )}
                                    </>
                                  ) : (
                                    <span className="text-white/50 italic">
                                      Using default hours (08:00 → 05:00 next day)
                                    </span>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingOperatingHours(location.id);
                                    setOpeningTimeValue(
                                      location.openingTime || "08:00"
                                    );
                                    setClosingTimeValue(
                                      location.closingTime || "05:00"
                                    );
                                  }}
                                  className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  {location.openingTime || location.closingTime
                                    ? "Edit"
                                    : "Set"}
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Cancellation Hours Setting */}
                          <div className="border-t border-[rgba(212,168,23,0.15)] pt-4">
                            <Label className="text-sm font-medium mb-2 block text-white/90">
                              Cancellation Policy
                            </Label>
                            {editingCancellationHours === location.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="24"
                                  value={cancellationHoursValue}
                                  onChange={(e) =>
                                    setCancellationHoursValue(
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white"
                                />
                                <span className="text-sm text-white/75">
                                  hour(s) before booking
                                </span>
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(
                                        `/api/locations/${location.id}`,
                                        {
                                          method: "PATCH",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            cancellationHours:
                                              cancellationHoursValue,
                                          }),
                                        }
                                      );
                                      if (res.ok) {
                                        toast.success(
                                          "Cancellation hours updated"
                                        );
                                        setEditingCancellationHours(null);
                                        fetchLocations();
                                      } else {
                                        const errorData = await res.json();
                                        throw new Error(
                                          errorData?.details ||
                                            errorData?.error ||
                                            "Failed to update cancellation hours"
                                        );
                                      }
                                    } catch (error: any) {
                                      console.error(
                                        "Error updating cancellation hours:",
                                        error
                                      );
                                      toast.error(
                                        error?.message ||
                                          "Failed to update cancellation hours"
                                      );
                                    }
                                  }}
                                  className="bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612]"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCancellationHours(null);
                                    setCancellationHoursValue(
                                      location.cancellationHours ?? 4
                                    );
                                  }}
                                  className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-white/90">
                                  Players can cancel up to{" "}
                                  <span className="font-semibold text-[#D4A817]">
                                    {location.cancellationHours ?? 4} hour
                                    {(location.cancellationHours ?? 4) !== 1
                                      ? "s"
                                      : ""}{" "}
                                    before
                                  </span>{" "}
                                  their booking
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCancellationHours(location.id);
                                    setCancellationHoursValue(
                                      location.cancellationHours ?? 4
                                    );
                                  }}
                                  className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            )}
                          </div>

                          {location.courts.length > 0 && (
                            <div className="mt-4 border-t border-[rgba(212,168,23,0.15)] pt-4">
                              <div className="text-sm font-medium mb-2 text-white/90">
                                Courts:
                              </div>
                              <div className="space-y-1">
                                {location.courts.map((court) => (
                                  <div
                                    key={court.id}
                                    className="text-sm flex justify-between items-center text-white/90"
                                  >
                                    <span>
                                      {court.name} • {court.type}
                                    </span>
                                    <span className="text-[#D4A817] font-semibold">
                                      {court.pricePerHour} EGP/hr
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Club Admins */}
                          <div className="mt-4 border-t border-[rgba(212,168,23,0.15)] pt-4">
                            <div className="text-sm font-medium mb-2 flex items-center justify-between text-white/90">
                              <span>Club Admins:</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setShowAddClubAdminDialog({
                                    open: true,
                                    locationId: location.id,
                                  });
                                  fetchAvailableClubAdmins(location.id);
                                }}
                                className="text-xs border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Club Admin
                              </Button>
                            </div>
                            {loadingClubAdmins[location.id] ? (
                              <div className="text-xs text-white/60">
                                Loading...
                              </div>
                            ) : clubAdmins[location.id]?.length > 0 ? (
                              <div className="space-y-2">
                                {clubAdmins[location.id].map((admin) => (
                                  <div
                                    key={admin.id}
                                    className="text-sm flex items-center justify-between p-2 bg-[#252015]/60 rounded border border-[rgba(212,168,23,0.12)]"
                                  >
                                    <div className="flex-1">
                                      <div className="font-medium text-white/90">
                                        {admin.name || admin.email}
                                      </div>
                                      {admin.name && (
                                        <div className="text-xs text-white/60">
                                          {admin.email}
                                        </div>
                                      )}
                                      {admin.phone && (
                                        <div className="text-xs text-white/60">
                                          {admin.phone}
                                        </div>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleRemoveClubAdmin(
                                          location.id,
                                          admin.id
                                        )
                                      }
                                      disabled={
                                        removingClubAdmin === admin.id
                                      }
                                      className="ml-2 text-[#EF4444] hover:text-white border-[rgba(239,68,68,0.4)] hover:bg-[#EF4444]/20 hover:border-[#EF4444]"
                                    >
                                      {removingClubAdmin === admin.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                      ) : (
                                        <>
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          Remove
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-white/60">
                                No club admins assigned
                              </div>
                            )}
                          </div>

                          {/* Moderators */}
                          <div className="mt-4 border-t border-[rgba(212,168,23,0.15)] pt-4">
                            <div className="text-sm font-medium mb-2 flex items-center justify-between text-white/90">
                              <span>Moderators:</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setShowAddModeratorDialog({
                                    open: true,
                                    locationId: location.id,
                                  });
                                  fetchAvailableModerators();
                                }}
                                className="text-xs border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Moderator
                              </Button>
                            </div>
                            {loadingModerators[location.id] ? (
                              <div className="text-xs text-white/60">
                                Loading...
                              </div>
                            ) : moderators[location.id]?.length > 0 ? (
                              <div className="space-y-2">
                                {moderators[location.id].map((moderator) => (
                                  <div
                                    key={moderator.id}
                                    className="text-sm flex items-center justify-between p-2 bg-[#252015]/60 rounded border border-[rgba(212,168,23,0.12)]"
                                  >
                                    <div className="flex-1">
                                      <div className="font-medium text-white/90">
                                        {moderator.name || moderator.email}
                                      </div>
                                      {moderator.name && (
                                        <div className="text-xs text-white/60">
                                          {moderator.email}
                                        </div>
                                      )}
                                      {moderator.phone && (
                                        <div className="text-xs text-white/60">
                                          {moderator.phone}
                                        </div>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleRemoveModerator(
                                          location.id,
                                          moderator.id
                                        )
                                      }
                                      disabled={
                                        removingModerator === moderator.id
                                      }
                                      className="ml-2 text-[#EF4444] hover:text-white border-[rgba(239,68,68,0.4)] hover:bg-[#EF4444]/20 hover:border-[#EF4444]"
                                    >
                                      {removingModerator === moderator.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                      ) : (
                                        <>
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          Remove
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-white/60">
                                No moderators assigned
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Moderator Dialog */}
      <Dialog
        open={showAddModeratorDialog.open}
        onOpenChange={(open) =>
          setShowAddModeratorDialog({ open, locationId: "" })
        }
      >
        <DialogContent className="bg-[#1A1612] border-[rgba(212,168,23,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-white">Add Moderator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="moderator-select" className="text-white/90">Select Moderator</Label>
              <select
                id="moderator-select"
                value={selectedModeratorId}
                onChange={(e) => setSelectedModeratorId(e.target.value)}
                className="w-full mt-2 p-2 border border-[rgba(212,168,23,0.25)] rounded-md bg-[#252015] text-white focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817]"
              >
                <option value="">Choose a moderator...</option>
                {availableModerators
                  .filter(
                    (mod) =>
                      !moderators[showAddModeratorDialog.locationId]?.some(
                        (assigned) => assigned.id === mod.id
                      )
                  )
                  .map((moderator) => (
                    <option key={moderator.id} value={moderator.id}>
                      {moderator.name || moderator.email} ({moderator.email})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModeratorDialog({ open: false, locationId: "" });
                setSelectedModeratorId("");
              }}
              disabled={assigningModerator}
              className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddModerator}
              disabled={!selectedModeratorId || assigningModerator}
              className="bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612]"
            >
              {assigningModerator ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1A1612] mr-2"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Moderator
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Club Admin Dialog */}
      <Dialog
        open={showAddClubAdminDialog.open}
        onOpenChange={(open) =>
          setShowAddClubAdminDialog({ open, locationId: "" })
        }
      >
        <DialogContent className="bg-[#1A1612] border-[rgba(212,168,23,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-white">Add Club Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="club-admin-select" className="text-white/90">
                Select Club Admin
              </Label>
              <select
                id="club-admin-select"
                value={selectedClubAdminId}
                onChange={(e) => setSelectedClubAdminId(e.target.value)}
                className="w-full mt-2 p-2 border border-[rgba(212,168,23,0.25)] rounded-md bg-[#252015] text-white focus:outline-none focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817]"
              >
                <option value="">Choose a club admin...</option>
                {availableClubAdmins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name || admin.email} ({admin.email})
                  </option>
                ))}
              </select>
              {availableClubAdmins.length === 0 && (
                <p className="text-xs text-white/60 mt-1">
                  No approved club admins available to assign. Club admins must register and be approved first.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddClubAdminDialog({ open: false, locationId: "" });
                setSelectedClubAdminId("");
              }}
              disabled={assigningClubAdmin}
              className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddClubAdmin}
              disabled={!selectedClubAdminId || assigningClubAdmin}
              className="bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612]"
            >
              {assigningClubAdmin ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1A1612] mr-2"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Club Admin
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fixed Booking Dialog */}
      <Dialog open={showFixedBookingDialog} onOpenChange={setShowFixedBookingDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1A1612] border-[rgba(212,168,23,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingFixedBooking ? "Edit Fixed Booking" : "Create Fixed Booking"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/90">Court *</Label>
              <select
                value={fixedBookingForm.courtId}
                onChange={(e) => setFixedBookingForm({ ...fixedBookingForm, courtId: e.target.value })}
                className="w-full px-3 py-2 border border-[rgba(212,168,23,0.25)] rounded-md bg-[#252015] text-white focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817]"
                required
              >
                <option value="">Select a court</option>
                {locations.flatMap(loc => 
                  loc.courts.map(court => (
                    <option key={court.id} value={court.id}>
                      {court.name} - {loc.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="relative">
              <Label className="text-white/90">User (Optional)</Label>
              {selectedUserDisplay ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={selectedUserDisplay}
                    disabled
                    className="flex-1 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white/80"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFixedBookingForm({ ...fixedBookingForm, userId: "" });
                      setSelectedUserDisplay("");
                      setUserSearchTerm("");
                      setShowUserResults(false);
                    }}
                    className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search user by name or email..."
                    value={userSearchTerm}
                    onChange={(e) => {
                      setUserSearchTerm(e.target.value);
                      setShowUserResults(true);
                    }}
                    onFocus={() => {
                      if (userSearchTerm.trim() && availableUsers.length > 0) {
                        setShowUserResults(true);
                      }
                    }}
                    onBlur={(e) => {
                      // Delay to allow click on dropdown items
                      setTimeout(() => {
                        setShowUserResults(false);
                      }, 200);
                    }}
                    className="bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50"
                  />
                  {showUserResults && (
                    <div className="absolute z-50 w-full mt-1 bg-[#1A1612] border border-[rgba(212,168,23,0.2)] rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {loadingUsers ? (
                        <div className="p-3 text-sm text-white/60 text-center">
                          Searching...
                        </div>
                      ) : availableUsers.length > 0 ? (
                        <>
                          <div className="px-3 py-2 text-xs text-white/60 border-b border-[rgba(212,168,23,0.2)] bg-[#252015]/80">
                            Available Users ({availableUsers.length}) - Type to search
                          </div>
                          {availableUsers.map((user) => {
                            // Determine role badge
                            let roleBadge = "";
                            if (user.role === "admin" && user.adminType) {
                              roleBadge = user.adminType === "moderator" ? "Moderator" : user.adminType;
                            } else if (user.role === "club_owner") {
                              roleBadge = "Club Owner";
                            } else if (user.userType === "club_admin") {
                              roleBadge = "Club Admin";
                            } else if (user.hasPlayer) {
                              roleBadge = "Player";
                            } else {
                              roleBadge = "User";
                            }
                            
                            return (
                              <button
                                key={user.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent blur from firing
                                  handleUserSelectForFixedBooking(user);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-[rgba(212,168,23,0.1)] focus:bg-[rgba(212,168,23,0.1)] focus:outline-none transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-white">
                                    {user.name || user.email}
                                  </span>
                                  <Badge variant="outline" className="text-xs bg-[rgba(212,168,23,0.15)] text-[#D4A817] border-[rgba(212,168,23,0.3)]">
                                    {roleBadge}
                                  </Badge>
                                </div>
                                <div className="text-xs text-white/60">
                                  {user.email}
                                  {user.phone && ` • ${user.phone}`}
                                </div>
                              </button>
                            );
                          })}
                          {userSearchTerm && (
                            <div className="px-3 py-2 text-xs text-white/60 border-t border-[rgba(212,168,23,0.2)] bg-[#252015]/80">
                              Showing top 20 results. Refine search for more.
                            </div>
                          )}
                        </>
                      ) : userSearchTerm ? (
                        <div className="p-3 text-sm text-white/60 text-center">
                          No users found matching "{userSearchTerm}"
                        </div>
                      ) : (
                        <div className="p-3 text-sm text-white/60 text-center">
                          Type to search for users...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-white/60 mt-1">
                Leave empty to create for yourself, or search and select a user
              </p>
            </div>

            <div>
              <Label className="text-white/90">Day of Week *</Label>
              <select
                value={fixedBookingForm.dayOfWeek}
                onChange={(e) => setFixedBookingForm({ ...fixedBookingForm, dayOfWeek: e.target.value })}
                className="w-full px-3 py-2 border border-[rgba(212,168,23,0.25)] rounded-md bg-[#252015] text-white focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817]"
                required
              >
                <option value="">Select day</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>

            <div>
              <Label className="text-white/90">Booking Type *</Label>
              <select
                value={fixedBookingForm.category}
                onChange={(e) =>
                  setFixedBookingForm({
                    ...fixedBookingForm,
                    category: e.target.value as "regular" | "academy" | "tournament",
                  })
                }
                className="w-full px-3 py-2 border border-[rgba(212,168,23,0.25)] rounded-md bg-[#252015] text-white focus:ring-2 focus:ring-[#D4A817] focus:border-[#D4A817]"
                required
              >
                <option value="regular">Regular Fixed Booking</option>
                <option value="academy">Academy Fixed Booking</option>
                <option value="tournament">Tournament Fixed Booking</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/90">Start Time * (HH:MM)</Label>
                <Input
                  type="time"
                  value={fixedBookingForm.startTime}
                  onChange={(e) => setFixedBookingForm({ ...fixedBookingForm, startTime: e.target.value })}
                  className="bg-[#252015] border-[rgba(212,168,23,0.25)] text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-white/90">End Time * (HH:MM)</Label>
                <Input
                  type="time"
                  value={fixedBookingForm.endTime}
                  onChange={(e) => setFixedBookingForm({ ...fixedBookingForm, endTime: e.target.value })}
                  className="bg-[#252015] border-[rgba(212,168,23,0.25)] text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/90">Start Date *</Label>
                <Input
                  type="date"
                  value={fixedBookingForm.startDate}
                  onChange={(e) => setFixedBookingForm({ ...fixedBookingForm, startDate: e.target.value })}
                  className="bg-[#252015] border-[rgba(212,168,23,0.25)] text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-white/90">End Date (Optional)</Label>
                <Input
                  type="date"
                  value={fixedBookingForm.endDate}
                  onChange={(e) => setFixedBookingForm({ ...fixedBookingForm, endDate: e.target.value })}
                  className="bg-[#252015] border-[rgba(212,168,23,0.25)] text-white"
                />
                <p className="text-xs text-white/60 mt-1">
                  Leave empty for infinite duration
                </p>
              </div>
            </div>

            <div>
              <Label className="text-white/90">Notes (Optional)</Label>
              <Input
                type="text"
                placeholder="Additional notes about this fixed booking"
                value={fixedBookingForm.notes}
                onChange={(e) => setFixedBookingForm({ ...fixedBookingForm, notes: e.target.value })}
                className="bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFixedBookingDialog(false)}
              className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
            >
              Cancel
            </Button>
            <Button
              onClick={editingFixedBooking ? handleUpdateFixedBooking : handleCreateFixedBooking}
              className="bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612]"
            >
              {editingFixedBooking ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
