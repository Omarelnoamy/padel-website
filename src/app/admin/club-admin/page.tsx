"use client";

import { useEffect, useState, useRef } from "react";
import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { Plus, Clock, CheckCircle, XCircle, DollarSign, Calendar, Wallet, CreditCard, Banknote, Smartphone, FileText, TrendingUp, Users, AlertCircle, Info, Trash2, Pencil, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type TransactionRequest = {
  id: string;
  amount: number;
  description: string | null;
  status: string;
  transactionDate: string;
  createdAt: string;
  location: {
    id: string;
    name: string;
  };
  court: {
    id: string;
    name: string;
  } | null;
  approvedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

type Location = {
  id: string;
  name: string;
  instapayPhone?: string | null; // Fixed InstaPay receiving number for this location
  courts: Array<{
    id: string;
    name: string;
  }>;
};

type Booking = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  paymentStatus: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  court: {
    id: string;
    name: string;
    type: string;
  };
  bookingPayments: Array<{
    id: string;
    method: string;
    amount: number;
    paymentReference: string | null;
    payerName: string | null;
    payerPhone: string | null;
    recordedAt: string;
  }>;
  location?: {
    id: string;
    name: string;
    instapayPhone?: string | null;
  };
  paymentSummary: {
    totalPrice: number;
    totalPaid: number;
    remaining: number;
    paymentsByMethod: Record<string, number>;
    paymentCount: number;
  };
};

export default function ClubAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"bookings" | "transactions" | "summary">("bookings");
  const [requests, setRequests] = useState<TransactionRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedBookings, setSelectedBookings] = useState<Booking[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [isDatePickerActive, setIsDatePickerActive] = useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  
  // Separate state for date input value (like booking page)
  const dateInputValue = selectedDate;

  const [requestForm, setRequestForm] = useState({
    courtId: "",
    amount: "",
    description: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });

  const [paymentForm, setPaymentForm] = useState({
    cash: "",
    visa: "",
    instapay: "",
    payerName: "", // Name of person who sent InstaPay
    payerPhone: "", // Phone number of person who sent InstaPay
    visaPhone: "",
  });
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingPayments: 0,
    partialPayments: 0,
    paidBookings: 0,
    totalRevenue: 0,
  });
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryDate, setSummaryDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      const user = session?.user as any;
      const isClubAdmin =
        user?.role === "user" &&
        user?.userType === "club_admin" &&
        user?.isApproved;

      if (!isClubAdmin) {
        router.push("/");
        return;
      }

      fetchLocation();
      if (activeTab === "bookings") {
        fetchBookings();
      }
    }
  }, [status, session, router, activeTab, selectedDate, paymentStatusFilter]);

  // Sync summaryDate with selectedDate when switching to summary tab
  useEffect(() => {
    if (activeTab === "summary" && selectedDate) {
      setSummaryDate(selectedDate);
    }
  }, [activeTab, selectedDate]);

  // Fetch daily summary when summary tab is active and summaryDate changes
  useEffect(() => {
    if (status === "authenticated" && activeTab === "summary" && location && summaryDate) {
      fetchDailySummary();
    }
  }, [summaryDate, activeTab, status, location]);

  const fetchLocation = async () => {
    try {
      setLoadingLocation(true);
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user?.clubAdminLocationId) {
          // Fetch location details
          const locationRes = await fetch("/api/locations");
          if (locationRes.ok) {
            const locations = await locationRes.json();
            const assignedLocation = locations.find(
              (loc: Location) => loc.id === data.user.clubAdminLocationId
            );
            if (assignedLocation) {
              setLocation(assignedLocation);
              // Fetch requests after location is loaded
              fetchRequests();
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching location:", error);
      toast.error("Failed to load location information");
    } finally {
      setLoadingLocation(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/club-admin/transactions/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      } else {
        // Handle non-ok responses gracefully
        try {
          const errorData = await res.json();
          console.error("Error fetching requests:", errorData);
        } catch {
          console.error("Error fetching requests: HTTP", res.status);
        }
        // Don't show toast for 401/403 errors (user might not be authorized yet)
        if (res.status !== 401 && res.status !== 403) {
          toast.error("Failed to load transaction requests");
        }
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      // Only show toast if it's not a network error (which might be temporary)
      if (error instanceof TypeError && error.message.includes("NetworkError")) {
        console.warn("Network error fetching requests - this might be temporary");
      } else {
        toast.error("Failed to load transaction requests");
      }
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);
      const params = new URLSearchParams();
      if (selectedDate) {
        params.append("date", selectedDate);
      }
      if (paymentStatusFilter && paymentStatusFilter !== "all") {
        params.append("paymentStatus", paymentStatusFilter);
      }
      const res = await fetch(`/api/club-admin/bookings?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        
        // Calculate statistics
        const statsData = {
          totalBookings: data.bookings?.length || 0,
          pendingPayments: data.bookings?.filter((b: Booking) => b.paymentStatus === "PENDING").length || 0,
          partialPayments: data.bookings?.filter((b: Booking) => b.paymentStatus === "PARTIAL").length || 0,
          paidBookings: data.bookings?.filter((b: Booking) => b.paymentStatus === "PAID").length || 0,
          totalRevenue: data.bookings?.reduce((sum: number, b: Booking) => sum + b.paymentSummary.totalPaid, 0) || 0,
        };
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setBookingsLoading(false);
    }
  };

  const fetchDailySummary = async () => {
    try {
      setLoadingSummary(true);
      const params = new URLSearchParams();
      // Use summaryDate, fallback to selectedDate if summaryDate is not set
      const dateToFetch = summaryDate || selectedDate || new Date().toISOString().split("T")[0];
      params.append("date", dateToFetch);
      const url = `/api/club-admin/payments/daily-summary?${params.toString()}`;
      console.log("Fetching daily summary from:", url, "Date:", dateToFetch);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log("Daily summary response:", data); // Debug log
        console.log("Summary date requested:", summaryDate); // Debug log
        console.log("Booking count:", data.bookingCount); // Debug log
        console.log("Total payments:", data.totals.total); // Debug log
        console.log("Bookings array length:", data.bookings?.length || 0); // Debug log
        setDailySummary(data);
      } else {
        const error = await res.json();
        console.error("Failed to load daily summary:", error);
        console.error("Response status:", res.status);
        toast.error(error.error || "Failed to load daily summary");
        setDailySummary(null);
      }
    } catch (error) {
      console.error("Error fetching daily summary:", error);
      toast.error("Failed to load daily summary");
      setDailySummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<{
    id: string;
    method: string;
    amount: string;
    paymentReference: string;
    payerName: string;
    payerPhone: string;
  } | null>(null);

  const handleRecordPayment = (bookings: Booking[]) => {
    // Set all bookings for this player
    setSelectedBookings(bookings);
    // Keep selectedBooking for backward compatibility in modal display
    setSelectedBooking(bookings[0]);
    
    // Reset payment form (don't pre-fill - let user see existing payments separately)
    setPaymentForm({
      cash: "",
      visa: "",
      instapay: "",
      payerName: "",
      payerPhone: "",
      visaPhone: "",
    });
    setShowPaymentModal(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment entry?")) {
      return;
    }

    try {
      setDeletingPaymentId(paymentId);
      const res = await fetch(`/api/club-admin/bookings/payments/${paymentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Payment deleted successfully");
        fetchBookings();
        // Refresh selected bookings to update payment info
        if (selectedBookings.length > 0) {
          const params = new URLSearchParams();
          if (selectedDate) {
            params.append("date", selectedDate);
          }
          if (paymentStatusFilter && paymentStatusFilter !== "all") {
            params.append("paymentStatus", paymentStatusFilter);
          }
          const res = await fetch(`/api/club-admin/bookings?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            const updatedBookings = data.bookings || [];
            // Find the same player's bookings
            const userId = selectedBookings[0].user.id;
            const playerBookings = updatedBookings.filter((b: Booking) => b.user.id === userId);
            if (playerBookings.length > 0) {
              setSelectedBookings(playerBookings);
              setSelectedBooking(playerBookings[0]);
            }
          }
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete payment");
      }
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment");
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleEditPayment = (payment: any) => {
    setEditingPaymentId(payment.id);
    setEditingPayment({
      id: payment.id,
      method: payment.method,
      amount: payment.amount.toString(),
      paymentReference: payment.paymentReference || "",
      payerName: payment.payerName || "",
      payerPhone: payment.payerPhone || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingPaymentId(null);
    setEditingPayment(null);
  };

  const handleSaveEdit = async () => {
    if (!editingPayment) return;

    const amount = Number(editingPayment.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setDeletingPaymentId(editingPayment.id); // Reuse loading state
      const res = await fetch(`/api/club-admin/bookings/payments/${editingPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount,
          method: editingPayment.method,
          paymentReference: editingPayment.paymentReference || null,
          payerName: editingPayment.payerName || null,
          payerPhone: editingPayment.payerPhone || null,
        }),
      });

      if (res.ok) {
        toast.success("Payment updated successfully");
        fetchBookings();
        // Refresh selected bookings to update payment info
        if (selectedBookings.length > 0) {
          const params = new URLSearchParams();
          if (selectedDate) {
            params.append("date", selectedDate);
          }
          if (paymentStatusFilter && paymentStatusFilter !== "all") {
            params.append("paymentStatus", paymentStatusFilter);
          }
          const res = await fetch(`/api/club-admin/bookings?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            const updatedBookings = data.bookings || [];
            // Find the same player's bookings
            const userId = selectedBookings[0].user.id;
            const playerBookings = updatedBookings.filter((b: Booking) => b.user.id === userId);
            if (playerBookings.length > 0) {
              setSelectedBookings(playerBookings);
              setSelectedBooking(playerBookings[0]);
            }
          }
        }
        setEditingPaymentId(null);
        setEditingPayment(null);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update payment");
      }
    } catch (error: any) {
      console.error("Error updating payment:", error);
      toast.error("Failed to update payment");
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedBookings || selectedBookings.length === 0) return;

    // Build payments array (only include non-zero amounts)
    const payments: Array<{ method: string; amount: number }> = [];
    if (paymentForm.cash && Number(paymentForm.cash) > 0) {
      payments.push({ method: "cash", amount: Number(paymentForm.cash) });
    }
    if (paymentForm.visa && Number(paymentForm.visa) > 0) {
      payments.push({ method: "visa", amount: Number(paymentForm.visa) });
    }
    if (paymentForm.instapay && Number(paymentForm.instapay) > 0) {
      payments.push({ method: "instapay", amount: Number(paymentForm.instapay) });
    }

    if (payments.length === 0) {
      toast.error("Please enter at least one payment amount");
      return;
    }

    // Calculate total payment amount
    const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Calculate total remaining across all bookings
    const totalRemaining = selectedBookings.reduce(
      (sum, booking) => sum + booking.paymentSummary.remaining,
      0
    );

    if (totalPayment > totalRemaining) {
      toast.error(`Total payment (${totalPayment.toLocaleString()} EGP) exceeds remaining amount (${totalRemaining.toLocaleString()} EGP)`);
      return;
    }

    try {
      setRecordingPayment(true);
      
      // Distribute payment proportionally across all unpaid bookings
      const unpaidBookings = selectedBookings.filter(
        (b) => b.paymentStatus !== "PAID" && b.paymentStatus !== "CLOSED"
      );
      
      if (unpaidBookings.length === 0) {
        toast.error("All bookings are already paid");
        setRecordingPayment(false);
        return;
      }

      // Calculate how much each booking should receive proportionally
      const distribution = unpaidBookings.map((booking) => {
        const proportion = booking.paymentSummary.remaining / totalRemaining;
        return {
          booking,
          proportion,
          amount: totalPayment * proportion,
        };
      });

      // Distribute each payment method proportionally
      const results = await Promise.allSettled(
        unpaidBookings.map(async (booking, index) => {
          const dist = distribution[index];
          
          // Calculate payment amounts for this booking based on proportion
          const bookingPayments = payments.map((payment) => {
            const paymentData: any = {
              method: payment.method,
              amount: Math.round(payment.amount * dist.proportion),
            };
            
            // Add payer info for InstaPay
            if (payment.method === "instapay") {
              paymentData.payerName = paymentForm.payerName || null;
              paymentData.payerPhone = paymentForm.payerPhone || null;
            }
            
            // Add reference for Visa
            if (payment.method === "visa" && paymentForm.visaPhone) {
              paymentData.paymentReference = paymentForm.visaPhone;
            }
            
            return paymentData;
          });

          // Adjust last booking to account for rounding
          if (index === unpaidBookings.length - 1) {
            const totalDistributed = distribution.slice(0, -1).reduce(
              (sum, d) => sum + d.amount,
              0
            );
            const remainingForLast = totalPayment - totalDistributed;
            const lastBookingTotal = bookingPayments.reduce((sum, p) => sum + p.amount, 0);
            const adjustment = remainingForLast - lastBookingTotal;
            
            if (bookingPayments.length > 0 && adjustment !== 0) {
              bookingPayments[0].amount += adjustment;
            }
          }

          // Filter out zero amounts
          const filteredPayments = bookingPayments.filter((p) => p.amount > 0);

          if (filteredPayments.length === 0) {
            return { success: true, bookingId: booking.id };
          }

          const res = await fetch(`/api/club-admin/bookings/${booking.id}/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payments: filteredPayments }),
          });

          if (res.ok) {
            return { success: true, bookingId: booking.id };
          } else {
            const error = await res.json();
            throw new Error(error.error || "Failed to record payment");
          }
        })
      );

      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        toast.error(`Failed to record payment for ${failed.length} booking(s)`);
      } else {
        toast.success(`Payment recorded successfully for ${unpaidBookings.length} booking(s)`);
        setShowPaymentModal(false);
        setSelectedBookings([]);
        setSelectedBooking(null);
        setPaymentForm({ cash: "", visa: "", instapay: "", payerName: "", payerPhone: "", visaPhone: "" });
        fetchBookings();
      }
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast.error(error?.message || "Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-[#FB923C]/20 text-[#FB923C] border-[#FB923C]/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      case "PAID":
        return (
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Closed
          </Badge>
        );
      default:
        return <Badge variant="outline" className="border-[rgba(212,168,23,0.15)] text-foreground">{status}</Badge>;
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.amount || !requestForm.description || !location) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amountNum = Number(requestForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/club-admin/transactions/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: requestForm.courtId || null,
          amount: amountNum,
          description: requestForm.description,
          transactionDate: requestForm.transactionDate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          data.message || "Transaction request submitted successfully"
        );
        setShowRequestForm(false);
        setRequestForm({
          courtId: "",
          amount: "",
          description: "",
          transactionDate: new Date().toISOString().split("T")[0],
        });
        fetchRequests();
      } else {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit request");
      }
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast.error(error?.message || "Failed to submit transaction request");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-[#FB923C]/20 text-[#FB923C] border-[#FB923C]/30"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/20 text-green-400 border-green-500/30"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/20 text-red-400 border-red-500/30"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline" className="border-[rgba(212,168,23,0.15)] text-foreground">{status}</Badge>;
    }
  };

  if (status === "loading") {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4A817] mx-auto"></div>
            <p className="mt-4 text-white/75">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (loadingLocation) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4A817] mx-auto"></div>
            <p className="mt-4 text-white/75">Loading location...</p>
          </div>
        </div>
      </>
    );
  }

  if (status === "authenticated" && !loadingLocation && !location) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] flex items-center justify-center">
          <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-white/75">
                  No assigned location found. Please contact the club owner.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // If not authenticated yet, show nothing (will redirect)
  if (status !== "authenticated") {
    return null;
  }

  // Type guard: ensure location exists before rendering main content
  // (We already checked loadingLocation above, so if we reach here, loading is done)
  if (!location) {
    return null;
  }
  

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] py-4 md:py-8">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-4 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                Club Admin Dashboard
              </h1>
              <p className="mt-1 md:mt-2 text-xs sm:text-sm md:text-base text-muted-foreground">
                Manage bookings and transactions for {location.name}
              </p>
            </div>
            {activeTab === "transactions" && (
              <Button
                onClick={() => setShowRequestForm(true)}
                className="bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612] w-full sm:w-auto h-12 sm:h-10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Request Transaction
              </Button>
            )}
          </div>

          {/* Statistics Cards - Only show on Bookings tab */}
          {activeTab === "bookings" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6"
            >
              <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] shadow-[0_4px_14px_rgba(0,0,0,0.2)]">
                <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-white/70 mb-1 truncate">Total Bookings</p>
                      <p className="text-xl sm:text-2xl font-bold text-white">{stats.totalBookings}</p>
                    </div>
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-[#D4A817] opacity-80 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] shadow-[0_4px_14px_rgba(0,0,0,0.2)]">
                <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-white/70 mb-1 truncate">Pending Payments</p>
                      <p className="text-xl sm:text-2xl font-bold text-white">{stats.pendingPayments}</p>
                    </div>
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-[#FB923C] opacity-80 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] shadow-[0_4px_14px_rgba(0,0,0,0.2)]">
                <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-white/70 mb-1 truncate">Partial Payments</p>
                      <p className="text-xl sm:text-2xl font-bold text-white">{stats.partialPayments}</p>
                    </div>
                    <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400 opacity-80 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] shadow-[0_4px_14px_rgba(0,0,0,0.2)]">
                <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-white/70 mb-1 truncate">Total Revenue</p>
                      <p className="text-xl sm:text-2xl font-bold text-white truncate">{stats.totalRevenue.toLocaleString()}</p>
                      <p className="text-xs text-white/60 mt-0.5">EGP</p>
                    </div>
                    <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-400 opacity-80 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-4 sm:space-y-6">
            <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-hide">
              <TabsList className="bg-[#1A1612]/90 border border-[rgba(212,168,23,0.12)] rounded-xl p-1.5 inline-flex w-auto min-w-full sm:min-w-0">
                <TabsTrigger value="bookings" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 flex-shrink-0 min-w-fit text-xs sm:text-sm data-[state=active]:bg-[#D4A817] data-[state=active]:text-[#1A1612] data-[state=inactive]:text-white/70 data-[state=inactive]:hover:bg-[rgba(212,168,23,0.1)] rounded-lg transition-all">
                  <Calendar className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Bookings</span>
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 flex-shrink-0 min-w-fit text-xs sm:text-sm data-[state=active]:bg-[#D4A817] data-[state=active]:text-[#1A1612] data-[state=inactive]:text-white/70 data-[state=inactive]:hover:bg-[rgba(212,168,23,0.1)] rounded-lg transition-all">
                  <DollarSign className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Transactions</span>
                </TabsTrigger>
                <TabsTrigger value="summary" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 flex-shrink-0 min-w-fit text-xs sm:text-sm data-[state=active]:bg-[#D4A817] data-[state=active]:text-[#1A1612] data-[state=inactive]:text-white/70 data-[state=inactive]:hover:bg-[rgba(212,168,23,0.1)] rounded-lg transition-all">
                  <FileText className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Summary</span>
                </TabsTrigger>
              </TabsList>
            </div>

          {/* Request Form Dialog */}
          <Dialog open={showRequestForm} onOpenChange={(open) => {
            // Don't close if date picker is active (mobile issue)
            if (!open && isDatePickerActive) {
              return;
            }
            setShowRequestForm(open);
          }}>
            <DialogContent className="max-w-md bg-[#1A1612] border-[rgba(212,168,23,0.12)] w-[calc(100vw-2rem)] sm:w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Request New Transaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="location" className="text-foreground">Location</Label>
                  <Input
                    id="location"
                    value={location.name}
                    disabled
                    className="mt-2 bg-[#252015] text-white/90 border-[rgba(212,168,23,0.25)]"
                  />
                </div>
                <div>
                  <Label htmlFor="court" className="text-foreground">Court (Optional)</Label>
                  <Select
                    value={requestForm.courtId || "none"}
                    onValueChange={(value) =>
                      setRequestForm({
                        ...requestForm,
                        courtId: value === "none" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="mt-2 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white focus:ring-[#D4A817] focus:border-[#D4A817]">
                      <SelectValue placeholder="Select a court (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-[rgba(212,168,23,0.15)]">
                      <SelectItem value="none" className="focus:bg-[rgba(212,168,23,0.2)] focus:text-foreground">None</SelectItem>
                      {location.courts.map((court) => (
                        <SelectItem key={court.id} value={court.id} className="focus:bg-[rgba(212,168,23,0.2)] focus:text-foreground">
                          {court.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount" className="text-foreground">
                    Amount (EGP) <span className="text-destructive">*</span>
                  </Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={requestForm.amount}
                      onChange={(e) =>
                        setRequestForm({ ...requestForm, amount: e.target.value })
                      }
                      placeholder="e.g., 500"
                      className="mt-2 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 focus:border-[#D4A817] focus:ring-[#D4A817] h-12 sm:h-10 text-base sm:text-sm"
                      style={{ fontSize: "16px" }}
                      required
                    />
                </div>
                <div>
                  <Label htmlFor="description" className="text-foreground">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={requestForm.description}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="e.g., Equipment maintenance, supplies, etc."
                    className="mt-2 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 focus:border-[#D4A817] focus:ring-[#D4A817]"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="transactionDate" className="text-foreground">Transaction Date</Label>
                  <Input
                    id="transactionDate"
                    type="date"
                    value={requestForm.transactionDate}
                    onChange={(e) => {
                      setIsDatePickerActive(false);
                      setTimeout(() => {
                        setRequestForm({
                          ...requestForm,
                          transactionDate: e.target.value,
                        });
                      }, 0);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setIsDatePickerActive(true);
                      const input = e.currentTarget as HTMLInputElement;
                      setTimeout(() => {
                        input.focus();
                      }, 0);
                    }}
                    onFocus={(e) => {
                      setIsDatePickerActive(true);
                    }}
                    onBlur={(e) => {
                      setTimeout(() => {
                        const input = e.target as HTMLInputElement;
                        if (input.value && input.value !== requestForm.transactionDate) {
                          setIsDatePickerActive(false);
                        } else if (isDatePickerActive) {
                          const activeElement = document.activeElement;
                          if (
                            activeElement !== input &&
                            activeElement !== document.body
                          ) {
                            setIsDatePickerActive(false);
                          } else {
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
                      setIsDatePickerActive(true);
                    }}
                    className="mt-2 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 focus:border-[#D4A817] focus:ring-[#D4A817] h-12 sm:h-10"
                    style={{ fontSize: "16px" }}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestForm(false)}
                  disabled={submitting}
                  className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817] w-full sm:w-auto h-12 sm:h-10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={submitting}
                  className="bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612] w-full sm:w-auto h-12 sm:h-10"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                  <CardHeader className="border-b border-[rgba(212,168,23,0.2)] p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <CardTitle className="flex items-center gap-2 text-foreground text-lg sm:text-xl">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[#D4A817]" />
                        Bookings
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                        <div className="relative w-full sm:w-auto">
                          <Input
                            ref={dateInputRef}
                            type="date"
                            value={dateInputValue}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              if (newDate) {
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
                                  try {
                                    input.showPicker();
                                  } catch (err) {
                                    // If showPicker fails (e.g., user activation required), just focus
                                    input.focus();
                                  }
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
                            className="bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 w-full sm:w-auto h-12 sm:h-10"
                            style={{ fontSize: "16px" }}
                          />
                        </div>
                        <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                          <SelectTrigger className="w-[150px] bg-[#252015] border-[rgba(212,168,23,0.25)] text-white focus:ring-[#D4A817] focus:border-[#D4A817]">
                            <SelectValue placeholder="Payment Status" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-[rgba(212,168,23,0.15)]">
                            <SelectItem value="all" className="focus:bg-[rgba(212,168,23,0.2)]">All</SelectItem>
                            <SelectItem value="PENDING" className="focus:bg-[rgba(212,168,23,0.2)]">Pending</SelectItem>
                            <SelectItem value="PARTIAL" className="focus:bg-[rgba(212,168,23,0.2)]">Partial</SelectItem>
                            <SelectItem value="PAID" className="focus:bg-[rgba(212,168,23,0.2)]">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {bookingsLoading ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                      >
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4A817] mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Loading bookings...</p>
                      </motion.div>
                    ) : bookings.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="text-center py-16"
                      >
                        <div className="relative inline-block mb-6">
                          <div className="absolute inset-0 bg-[#D4A817]/20 rounded-full blur-2xl animate-pulse" />
                          <div className="relative bg-gradient-to-br from-[#D4A817]/30 to-[#D4A817]/10 p-6 rounded-2xl">
                            <Calendar className="h-16 w-16 text-[#D4A817] mx-auto" />
                          </div>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No bookings found</h3>
                        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                          No bookings match your selected filters. Try adjusting the date or payment status filter.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Info className="h-4 w-4" />
                          <span>Tip: Select a different date or clear filters to see more bookings</span>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {(() => {
                            // Group bookings by player
                            const groupedByPlayer = bookings.reduce((acc: any, booking: any) => {
                              const userId = booking.user.id;
                              if (!acc[userId]) {
                                acc[userId] = {
                                  user: booking.user,
                                  bookings: [],
                                  totalPrice: 0,
                                  totalPaid: 0,
                                  totalRemaining: 0,
                                  paymentStatus: "PENDING",
                                  allPaymentsByMethod: {} as Record<string, number>,
                                };
                              }
                              acc[userId].bookings.push(booking);
                              acc[userId].totalPrice += booking.totalPrice;
                              acc[userId].totalPaid += booking.paymentSummary.totalPaid;
                              acc[userId].totalRemaining += booking.paymentSummary.remaining;
                              
                              // Merge payment methods
                              Object.entries(booking.paymentSummary.paymentsByMethod).forEach(([method, amount]) => {
                                acc[userId].allPaymentsByMethod[method] = 
                                  (acc[userId].allPaymentsByMethod[method] || 0) + (amount as number);
                              });
                              
                              // Determine overall payment status
                              if (acc[userId].totalRemaining === 0) {
                                acc[userId].paymentStatus = "PAID";
                              } else if (acc[userId].totalPaid > 0) {
                                acc[userId].paymentStatus = "PARTIAL";
                              } else {
                                acc[userId].paymentStatus = "PENDING";
                              }
                              
                              return acc;
                            }, {} as Record<string, any>);

                            // Sort bookings within each group by time
                            Object.values(groupedByPlayer).forEach((group: any) => {
                              group.bookings.sort((a: any, b: any) => {
                                if (a.date !== b.date) {
                                  return new Date(a.date).getTime() - new Date(b.date).getTime();
                                }
                                return a.startTime.localeCompare(b.startTime);
                              });
                            });

                            return Object.values(groupedByPlayer).map((group: any, index: number) => (
                              <motion.div
                                key={group.user.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                              >
                                <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] border-l-4 border-l-[#D4A817] hover:border-l-[#E6C420] transition-all duration-300 hover:shadow-lg hover:shadow-[0_8px_24px_rgba(212,168,23,0.15)]">
                                  <CardContent className="pt-6">
                                    <div className="flex items-start justify-between flex-wrap gap-4">
                                      <div className="flex-1 min-w-[200px]">
                                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                                          <div className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-[#D4A817]" />
                                            <h3 className="font-semibold text-lg text-foreground">
                                              {group.user.name || group.user.email}
                                              {group.user.phone && (
                                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                                  • {group.user.phone}
                                                </span>
                                              )}
                                            </h3>
                                          </div>
                                          {getPaymentStatusBadge(group.paymentStatus)}
                                        </div>
                                        
                                        {/* Time Slots */}
                                        <div className="space-y-2 mb-4">
                                          <p className="text-sm font-medium text-muted-foreground mb-2">Time Slots:</p>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {group.bookings.map((booking: any) => (
                                              <div
                                                key={booking.id}
                                                className="bg-muted/30 border border-[rgba(212,168,23,0.15)] rounded-lg p-3"
                                              >
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                  <div>
                                                    <span className="text-sm font-medium text-foreground">
                                                      {booking.court.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground ml-2">
                                                      {new Date(booking.date).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                      })}
                                                    </span>
                                                  </div>
                                                  <span className="text-sm text-foreground">
                                                    {booking.startTime} - {booking.endTime}
                                                  </span>
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                  {booking.totalPrice.toLocaleString()} EGP
                                                  {booking.paymentSummary.totalPaid > 0 && (
                                                    <span className="ml-2 text-green-400">
                                                      (Paid: {booking.paymentSummary.totalPaid.toLocaleString()} EGP)
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Totals */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pt-3 border-t border-[rgba(212,168,23,0.15)]">
                                          <div>
                                            <p className="text-xs text-muted-foreground mb-1">Total Price</p>
                                            <p className="text-base sm:text-lg font-bold text-[#D4A817]">
                                              {group.totalPrice.toLocaleString()} EGP
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                                            <p className="text-base sm:text-lg font-bold text-green-400">
                                              {group.totalPaid.toLocaleString()} EGP
                                            </p>
                                          </div>
                                          {group.totalRemaining > 0 && (
                                            <div>
                                              <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                                              <p className="text-base sm:text-lg font-bold text-[#FB923C]">
                                                {group.totalRemaining.toLocaleString()} EGP
                                              </p>
                                            </div>
                                          )}
                                        </div>

                                        {/* Payment Methods Summary */}
                                        {Object.keys(group.allPaymentsByMethod).length > 0 && (
                                          <div className="pt-3 border-t border-[rgba(212,168,23,0.15)] mt-3">
                                            <p className="text-xs text-muted-foreground mb-2">Payment Methods (Total)</p>
                                            <div className="flex flex-wrap gap-2">
                                              {Object.entries(group.allPaymentsByMethod).map(([method, amount]) => (
                                                <Badge
                                                  key={method}
                                                  variant="outline"
                                                  className="border-[rgba(212,168,23,0.15)] text-foreground bg-muted/30"
                                                >
                                                  {method.charAt(0).toUpperCase() + method.slice(1)}: {(amount as number).toLocaleString()} EGP
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Action Button */}
                                      <div className="w-full sm:w-auto mt-4 sm:mt-0">
                                        {group.paymentStatus !== "CLOSED" ? (
                                          <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                          >
                                            <Button
                                              onClick={() => {
                                                // Open payment modal for all bookings of this player
                                                handleRecordPayment(group.bookings);
                                              }}
                                              className="bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)] w-full sm:w-auto h-12 sm:h-10"
                                            >
                                              <Wallet className="h-4 w-4 mr-2" />
                                              {group.paymentStatus === "PAID" ? "Edit Payment" : "Record Payment"}
                                            </Button>
                                          </motion.div>
                                        ) : (
                                          <div className="flex items-center gap-2 text-gray-400">
                                            <XCircle className="h-5 w-5" />
                                            <span className="text-sm font-medium">Closed</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ));
                          })()}
                        </AnimatePresence>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Transaction Requests Tab */}
            <TabsContent value="transactions">
              {/* Transaction Requests List */}
              <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                <CardHeader className="border-b border-[rgba(212,168,23,0.2)] p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-foreground text-lg sm:text-xl">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-[#D4A817]" />
                    Transaction Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A817] mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-16"
                >
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-[#D4A817]/20 rounded-full blur-2xl animate-pulse" />
                    <div className="relative bg-gradient-to-br from-[#D4A817]/30 to-[#D4A817]/10 p-6 rounded-2xl">
                      <DollarSign className="h-16 w-16 text-[#D4A817] mx-auto" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No transaction requests
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    You haven't made any transaction requests yet. Create your first request to get started.
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => setShowRequestForm(true)}
                      className="bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Request Your First Transaction
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {requests.map((request, index) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] border-l-4 border-l-[#D4A817] hover:border-l-[#E6C420] transition-all duration-300 hover:shadow-lg hover:shadow-[0_8px_24px_rgba(212,168,23,0.15)]">
                      <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex-1 w-full min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(request.status)}
                              <span className="text-sm text-muted-foreground">
                                {new Date(
                                  request.createdAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="font-semibold text-lg mb-1 text-foreground">
                              {request.description || "No description"}
                            </h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium text-foreground">Amount:</span>{" "}
                                <span className="text-[#D4A817] font-semibold">
                                  {Math.abs(request.amount).toLocaleString()}{" "}
                                  EGP
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-foreground">Location:</span>{" "}
                                {request.location.name}
                              </div>
                              {request.court && (
                                <div>
                                  <span className="font-medium text-foreground">Court:</span>{" "}
                                  {request.court.name}
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-foreground">
                                  Transaction Date:
                                </span>{" "}
                                {new Date(
                                  request.transactionDate
                                ).toLocaleDateString()}
                              </div>
                              {request.status === "approved" &&
                                request.approvedBy && (
                                  <div>
                                    <span className="font-medium text-foreground">
                                      Approved by:
                                    </span>{" "}
                                    {request.approvedBy.name ||
                                      request.approvedBy.email}
                                  </div>
                                )}
                              {request.status === "rejected" &&
                                request.approvedBy && (
                                  <div>
                                    <span className="font-medium text-foreground">
                                      Rejected by:
                                    </span>{" "}
                                    {request.approvedBy.name ||
                                      request.approvedBy.email}
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
            </TabsContent>

            {/* Daily Summary Tab */}
            <TabsContent value="summary">
              <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                <CardHeader className="border-b border-[rgba(212,168,23,0.2)]">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <FileText className="h-5 w-5 text-[#D4A817]" />
                    Daily Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-4">
                    <Label className="text-foreground mb-2 block">Select Date</Label>
                    <Input
                      ref={dateInputRef}
                      type="date"
                      value={summaryDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        if (newDate) {
                          setIsDatePickerActive(false);
                          // Use setTimeout to delay state update until after picker closes
                          setTimeout(() => {
                            setSummaryDate(newDate);
                            // Fetch summary for the new date after state update
                            setTimeout(() => {
                              fetchDailySummary();
                            }, 100);
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
                            try {
                              input.showPicker();
                            } catch (err) {
                              input.focus();
                            }
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
                          if (input.value && input.value !== summaryDate) {
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
                      className="bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 w-full sm:w-auto h-12 sm:h-10"
                      style={{ fontSize: "16px" }}
                    />
                  </div>
                  {loadingSummary ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4A817] mx-auto"></div>
                      <p className="mt-4 text-muted-foreground">Loading summary...</p>
                    </div>
                  ) : dailySummary ? (
                    <div className="space-y-6">
                      {dailySummary.bookingCount === 0 && dailySummary.totals.total === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className="text-center py-16"
                        >
                          <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-[#D4A817]/20 rounded-full blur-2xl animate-pulse" />
                            <div className="relative bg-gradient-to-br from-[#D4A817]/30 to-[#D4A817]/10 p-6 rounded-2xl">
                              <FileText className="h-16 w-16 text-[#D4A817] mx-auto" />
                            </div>
                          </div>
                          <h3 className="text-xl font-semibold text-foreground mb-2">No data available</h3>
                          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                            No bookings or payments found for {new Date(summaryDate).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}.
                          </p>
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Info className="h-4 w-4" />
                            <span>Tip: Select a different date or check the Bookings tab</span>
                          </div>
                        </motion.div>
                      ) : (
                        <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-[#D4A817]/10 to-[#D4A817]/5 border-[#D4A817]/20">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Total Bookings</p>
                                <p className="text-2xl font-bold text-foreground">{dailySummary.bookingCount}</p>
                              </div>
                              <Calendar className="h-8 w-8 text-[#D4A817] opacity-50" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Paid</p>
                                <p className="text-2xl font-bold text-green-400">{dailySummary.paidBookings}</p>
                              </div>
                              <CheckCircle className="h-8 w-8 text-green-400 opacity-50" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Partial</p>
                                <p className="text-2xl font-bold text-yellow-400">{dailySummary.partialBookings}</p>
                              </div>
                              <Clock className="h-8 w-8 text-yellow-400 opacity-50" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-[#FB923C]/10 to-[#FB923C]/5 border-[#FB923C]/20">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Pending</p>
                                <p className="text-2xl font-bold text-[#FB923C]">{dailySummary.pendingBookings}</p>
                              </div>
                              <AlertCircle className="h-8 w-8 text-[#FB923C] opacity-50" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                        <CardHeader className="border-b border-[rgba(212,168,23,0.2)]">
                          <CardTitle className="text-foreground">Payment Totals by Method</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-[rgba(212,168,23,0.15)]">
                              <div className="flex items-center gap-3">
                                <Banknote className="h-6 w-6 text-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Cash</p>
                                  <p className="text-lg font-bold text-foreground">
                                    {dailySummary.totals.cash.toLocaleString()} EGP
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-[rgba(212,168,23,0.15)]">
                              <div className="flex items-center gap-3">
                                <CreditCard className="h-6 w-6 text-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Visa</p>
                                  <p className="text-lg font-bold text-foreground">
                                    {dailySummary.totals.visa.toLocaleString()} EGP
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-[rgba(212,168,23,0.15)]">
                              <div className="flex items-center gap-3">
                                <Smartphone className="h-6 w-6 text-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">InstaPay</p>
                                  <p className="text-lg font-bold text-foreground">
                                    {dailySummary.totals.instapay.toLocaleString()} EGP
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gradient-to-br from-[#D4A817]/10 to-[#D4A817]/5 rounded-lg border border-[#D4A817]/20">
                              <div className="flex items-center gap-3">
                                <Wallet className="h-6 w-6 text-[#D4A817]" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Total</p>
                                  <p className="text-lg font-bold text-[#D4A817]">
                                    {dailySummary.totals.total.toLocaleString()} EGP
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {dailySummary.bookings && dailySummary.bookings.length > 0 && (
                        <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
                          <CardHeader className="border-b border-[rgba(212,168,23,0.2)]">
                            <CardTitle className="text-foreground">Payment Details for {new Date(dailySummary.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              {(() => {
                                // Group bookings by player (userId)
                                const groupedByPlayer = dailySummary.bookings.reduce((acc: any, booking: any) => {
                                  const userId = booking.userId || booking.userName; // Fallback to userName if userId is missing
                                  if (!acc[userId]) {
                                    acc[userId] = {
                                      userId,
                                      userName: booking.userName,
                                      userPhone: booking.userPhone,
                                      bookings: [],
                                      totalPrice: 0,
                                      totalPaid: 0,
                                      totalRemaining: 0,
                                      paymentStatus: "PENDING",
                                      allPayments: [] as any[],
                                    };
                                  }
                                  acc[userId].bookings.push(booking);
                                  acc[userId].totalPrice += booking.totalPrice;
                                  acc[userId].totalPaid += booking.totalPaid;
                                  acc[userId].totalRemaining += (booking.totalPrice - booking.totalPaid);
                                  
                                  // Collect all payments
                                  if (booking.payments && booking.payments.length > 0) {
                                    acc[userId].allPayments.push(...booking.payments.map((p: any) => ({
                                      ...p,
                                      bookingId: booking.id,
                                      courtName: booking.courtName,
                                      startTime: booking.startTime,
                                      endTime: booking.endTime,
                                    })));
                                  }
                                  
                                  // Determine overall payment status
                                  if (acc[userId].totalRemaining === 0) {
                                    acc[userId].paymentStatus = "PAID";
                                  } else if (acc[userId].totalPaid > 0) {
                                    acc[userId].paymentStatus = "PARTIAL";
                                  } else {
                                    acc[userId].paymentStatus = "PENDING";
                                  }
                                  
                                  return acc;
                                }, {} as Record<string, any>);

                                // Sort bookings within each group by time
                                Object.values(groupedByPlayer).forEach((group: any) => {
                                  group.bookings.sort((a: any, b: any) => {
                                    return a.startTime.localeCompare(b.startTime);
                                  });
                                });

                                return Object.values(groupedByPlayer).map((group: any, index: number) => (
                                  <motion.div
                                    key={group.userId || index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                  >
                                    <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] border-l-4 border-l-[#D4A817] hover:border-l-[#E6C420] transition-all duration-300 hover:shadow-lg hover:shadow-[0_8px_24px_rgba(212,168,23,0.15)]">
                                      <CardContent className="pt-6">
                                        <div className="flex items-start justify-between flex-wrap gap-4">
                                          <div className="flex-1 min-w-[200px]">
                                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                                              <div className="flex items-center gap-2">
                                                <Users className="h-5 w-5 text-[#D4A817]" />
                                                <h3 className="font-semibold text-lg text-foreground">
                                                  {group.userName}
                                                  {group.userPhone && (
                                                    <span className="text-sm font-normal text-muted-foreground ml-2">
                                                      • {group.userPhone}
                                                    </span>
                                                  )}
                                                </h3>
                                              </div>
                                              {getPaymentStatusBadge(group.paymentStatus)}
                                            </div>
                                            
                                            {/* Time Slots */}
                                            <div className="space-y-2 mb-4">
                                              <p className="text-sm font-medium text-muted-foreground mb-2">Time Slots:</p>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {group.bookings.map((booking: any) => (
                                                  <div
                                                    key={booking.id}
                                                    className="bg-muted/30 border border-[rgba(212,168,23,0.15)] rounded-lg p-3"
                                                  >
                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                      <div>
                                                        <span className="text-sm font-medium text-foreground">
                                                          {booking.courtName}
                                                        </span>
                                                      </div>
                                                      <span className="text-sm text-foreground">
                                                        {booking.startTime} - {booking.endTime}
                                                      </span>
                                                    </div>
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                      {booking.totalPrice.toLocaleString()} EGP
                                                      {booking.totalPaid > 0 && (
                                                        <span className="ml-2 text-green-400">
                                                          (Paid: {booking.totalPaid.toLocaleString()} EGP)
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>

                                            {/* Totals */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pt-3 border-t border-[rgba(212,168,23,0.15)]">
                                              <div>
                                                <p className="text-xs text-muted-foreground mb-1">Total Price</p>
                                                <p className="text-base sm:text-lg font-bold text-[#D4A817]">
                                                  {group.totalPrice.toLocaleString()} EGP
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                                                <p className="text-base sm:text-lg font-bold text-green-400">
                                                  {group.totalPaid.toLocaleString()} EGP
                                                </p>
                                              </div>
                                              {group.totalRemaining > 0 && (
                                                <div>
                                                  <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                                                  <p className="text-base sm:text-lg font-bold text-[#FB923C]">
                                                    {group.totalRemaining.toLocaleString()} EGP
                                                  </p>
                                                </div>
                                              )}
                                            </div>

                                            {/* Payment Details */}
                                            {group.allPayments && group.allPayments.length > 0 && (
                                              <div className="pt-3 border-t border-[rgba(212,168,23,0.15)] mt-3">
                                                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Payments:</p>
                                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                                  {group.allPayments.map((payment: any, paymentIndex: number) => (
                                                    <div
                                                      key={paymentIndex}
                                                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-[rgba(212,168,23,0.12)]"
                                                    >
                                                      <div className="flex items-center gap-3 flex-1 flex-wrap">
                                                        <Badge
                                                          variant="outline"
                                                          className={`${
                                                            payment.method.toLowerCase() === "cash"
                                                              ? "border-green-500/30 bg-green-500/10 text-green-400"
                                                              : payment.method.toLowerCase() === "visa"
                                                              ? "border-[rgba(212,168,23,0.3)] bg-[rgba(212,168,23,0.15)] text-[#D4A817]"
                                                              : payment.method.toLowerCase() === "instapay"
                                                              ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                                                              : "border-[rgba(212,168,23,0.15)] text-foreground"
                                                          } capitalize`}
                                                        >
                                                          {payment.method}
                                                        </Badge>
                                                        <span className="text-sm font-semibold text-foreground">
                                                          {payment.amount.toLocaleString()} EGP
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                          {payment.courtName} • {payment.startTime} - {payment.endTime}
                                                        </span>
                                                        {payment.method.toLowerCase() === "instapay" && (payment.payerName || payment.payerPhone) && (
                                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Users className="h-3 w-3" />
                                                            <span>{payment.payerName || "N/A"}</span>
                                                            {payment.payerPhone && (
                                                              <>
                                                                <span>•</span>
                                                                <Smartphone className="h-3 w-3" />
                                                                <span>{payment.payerPhone}</span>
                                                              </>
                                                            )}
                                                          </div>
                                                        )}
                                                        {payment.method.toLowerCase() === "visa" && payment.paymentReference && (
                                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <CreditCard className="h-3 w-3" />
                                                            <span>Ref: {payment.paymentReference}</span>
                                                          </div>
                                                        )}
                                                      </div>
                                                      <span className="text-xs text-muted-foreground">
                                                        {new Date(payment.recordedAt).toLocaleTimeString("en-US", {
                                                          hour: "2-digit",
                                                          minute: "2-digit",
                                                        })}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </motion.div>
                                ));
                              })()}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No data available for this date.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Payment Recording Modal */}
          <Dialog open={showPaymentModal} onOpenChange={(open) => {
            // Don't close if date picker is active (mobile issue)
            if (!open && isDatePickerActive) {
              return;
            }
            setShowPaymentModal(open);
            if (!open) {
              setSelectedBooking(null);
              setSelectedBookings([]);
              setPaymentForm({ cash: "", visa: "", instapay: "", payerName: "", payerPhone: "", visaPhone: "" });
            }
          }}>
            <DialogContent className="max-w-md bg-[#1A1612] border-[rgba(212,168,23,0.12)] w-[calc(100vw-2rem)] sm:w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-[#D4A817]" />
                  Record Payment
                </DialogTitle>
              </DialogHeader>
              {selectedBookings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 py-4"
                >
                  <div className="bg-gradient-to-br from-[#D4A817]/10 to-[#D4A817]/5 p-4 rounded-lg border border-[#D4A817]/20">
                    <p className="text-xs font-medium text-[#D4A817] mb-2 uppercase tracking-wide">Player Details</p>
                    <p className="font-semibold text-foreground mb-3">
                      {selectedBookings[0].user.name || selectedBookings[0].user.email}
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      {selectedBookings.length} booking{selectedBookings.length > 1 ? "s" : ""} • Total: {
                        selectedBookings.reduce((sum, b) => sum + b.totalPrice, 0).toLocaleString()
                      } EGP
                    </p>
                    
                    {/* All Bookings List */}
                    <div className="max-h-48 overflow-y-auto space-y-2 mt-3 pt-3 border-t border-[#D4A817]/20">
                      {selectedBookings.map((booking) => (
                        <div key={booking.id} className="text-xs bg-muted/30 p-2 rounded">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">
                              {booking.court.name} • {new Date(booking.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} • {booking.startTime} - {booking.endTime}
                            </span>
                            <span className="text-muted-foreground">
                              {booking.totalPrice.toLocaleString()} EGP
                              {booking.paymentSummary.totalPaid > 0 && (
                                <span className="text-green-400 ml-1">
                                  (Paid: {booking.paymentSummary.totalPaid.toLocaleString()})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#D4A817]/20 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total</p>
                        <p className="font-bold text-foreground">
                          {selectedBookings.reduce((sum, b) => sum + b.totalPrice, 0).toLocaleString()} EGP
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Paid</p>
                        <p className="font-bold text-green-400">
                          {selectedBookings.reduce((sum, b) => sum + b.paymentSummary.totalPaid, 0).toLocaleString()} EGP
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                        <p className="font-bold text-[#FB923C]">
                          {selectedBookings.reduce((sum, b) => sum + b.paymentSummary.remaining, 0).toLocaleString()} EGP
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Progress Bar */}
                  {(() => {
                    const totalPrice = selectedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
                    const totalPaid = selectedBookings.reduce((sum, b) => sum + b.paymentSummary.totalPaid, 0);
                    const progress = totalPrice > 0 ? (totalPaid / totalPrice) * 100 : 0;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Payment Progress</span>
                          <span className="font-medium text-foreground">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-[#D4A817] to-green-400"
                          />
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Existing Payments */}
                  {(() => {
                    const allExistingPayments = selectedBookings.flatMap((booking) =>
                      booking.bookingPayments.map((payment) => ({
                        ...payment,
                        bookingId: booking.id,
                        bookingDate: booking.date,
                        bookingTime: `${booking.startTime} - ${booking.endTime}`,
                        courtName: booking.court.name,
                      }))
                    );
                    
                    if (allExistingPayments.length > 0) {
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-foreground text-sm font-medium">
                              Existing Payments
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {allExistingPayments.length} entr{allExistingPayments.length > 1 ? "ies" : "y"}
                            </span>
                          </div>
                          <div className="max-h-64 overflow-y-auto space-y-2 bg-muted/20 p-3 rounded-lg border border-[rgba(212,168,23,0.15)]">
                            {allExistingPayments.map((payment) => (
                              <div
                                key={payment.id}
                                className="flex items-center justify-between p-2 bg-card rounded border border-[rgba(212,168,23,0.15)] hover:border-[rgba(212,168,23,0.4)] transition-colors"
                              >
                                {editingPaymentId === payment.id && editingPayment ? (
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Select
                                        value={editingPayment.method}
                                        onValueChange={(value) =>
                                          setEditingPayment({ ...editingPayment, method: value })
                                        }
                                      >
                                        <SelectTrigger className="w-[100px] h-8 text-xs bg-[#252015] border-[rgba(212,168,23,0.25)] text-white focus:ring-[#D4A817] focus:border-[#D4A817]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-[rgba(212,168,23,0.15)]">
                                          <SelectItem value="cash" className="focus:bg-[rgba(212,168,23,0.2)]">Cash</SelectItem>
                                          <SelectItem value="visa" className="focus:bg-[rgba(212,168,23,0.2)]">Visa</SelectItem>
                                          <SelectItem value="instapay" className="focus:bg-[rgba(212,168,23,0.2)]">InstaPay</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editingPayment.amount}
                                        onChange={(e) =>
                                          setEditingPayment({ ...editingPayment, amount: e.target.value })
                                        }
                                        className="w-[120px] h-8 text-xs bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50"
                                        placeholder="Amount"
                                      />
                                      <span className="text-xs text-muted-foreground">EGP</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {payment.courtName} • {new Date(payment.bookingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} • {payment.bookingTime}
                                    </div>
                                    {/* Show payer fields for InstaPay */}
                                    {editingPayment.method === "instapay" && (
                                      <>
                                        <Input
                                          type="text"
                                          value={editingPayment.payerName}
                                          onChange={(e) =>
                                            setEditingPayment({ ...editingPayment, payerName: e.target.value })
                                          }
                                          placeholder="Payer Name"
                                          className="w-full h-8 text-xs bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50"
                                        />
                                        <Input
                                          type="tel"
                                          value={editingPayment.payerPhone}
                                          onChange={(e) =>
                                            setEditingPayment({ ...editingPayment, payerPhone: e.target.value })
                                          }
                                          placeholder="Payer Phone"
                                          className="w-full h-8 text-xs bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50"
                                        />
                                      </>
                                    )}
                                    {/* Show reference field for Visa */}
                                    {editingPayment.method === "visa" && (
                                      <Input
                                        type="text"
                                        value={editingPayment.paymentReference}
                                        onChange={(e) =>
                                          setEditingPayment({ ...editingPayment, paymentReference: e.target.value })
                                        }
                                        placeholder="Card/Reference"
                                        className="w-full h-8 text-xs bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50"
                                      />
                                    )}
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        disabled={deletingPaymentId === payment.id}
                                        className="h-7 text-xs bg-[#D4A817] hover:bg-[#E6C420] text-white"
                                      >
                                        {deletingPaymentId === payment.id ? (
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                        ) : (
                                          <>
                                            <Save className="h-3 w-3 mr-1" />
                                            Save
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        disabled={deletingPaymentId === payment.id}
                                        className="h-7 text-xs border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817]"
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge
                                          variant="outline"
                                          className="border-[rgba(212,168,23,0.2)] text-white/90 bg-[#252015]/60 capitalize"
                                        >
                                          {payment.method}
                                        </Badge>
                                        <span className="text-sm font-semibold text-foreground">
                                          {payment.amount.toLocaleString()} EGP
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          • {new Date(payment.recordedAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {payment.courtName} • {new Date(payment.bookingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} • {payment.bookingTime}
                                      </div>
                                      {/* Show payer info for InstaPay payments */}
                                      {payment.method === "instapay" && (payment.payerName || payment.payerPhone) && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Payer: {payment.payerName || "N/A"} • {payment.payerPhone || "N/A"}
                                        </div>
                                      )}
                                      {/* Show reference for Visa payments */}
                                      {payment.method === "visa" && payment.paymentReference && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Reference: {payment.paymentReference}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditPayment(payment)}
                                        disabled={deletingPaymentId === payment.id || editingPaymentId !== null}
                                        className="text-[#D4A817] hover:text-[#D4A817] hover:bg-[#D4A817]/10 h-8 w-8 p-0"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeletePayment(payment.id)}
                                        disabled={deletingPaymentId === payment.id || editingPaymentId !== null}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                      >
                                        {deletingPaymentId === payment.id ? (
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div>
                    <Label htmlFor="cash" className="text-foreground flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Cash (EGP)
                    </Label>
                    <Input
                      id="cash"
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.cash}
                      onChange={(e) => setPaymentForm({ ...paymentForm, cash: e.target.value })}
                      placeholder="0"
                      className="mt-2 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 focus:border-[#D4A817] focus:ring-[#D4A817] h-12 sm:h-10 text-base sm:text-sm"
                      style={{ fontSize: "16px" }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="visa" className="text-foreground flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Visa (EGP)
                    </Label>
                    <Input
                      id="visa"
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.visa}
                      onChange={(e) => setPaymentForm({ ...paymentForm, visa: e.target.value })}
                      placeholder="0"
                      className="mt-2 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 focus:border-[#D4A817] focus:ring-[#D4A817] h-12 sm:h-10 text-base sm:text-sm"
                      style={{ fontSize: "16px" }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="instapay" className="text-foreground flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      InstaPay (EGP)
                    </Label>
                    <Input
                      id="instapay"
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.instapay}
                      onChange={(e) => setPaymentForm({ ...paymentForm, instapay: e.target.value })}
                      placeholder="0"
                      className="mt-2 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 focus:border-[#D4A817] focus:ring-[#D4A817] h-12 sm:h-10 text-base sm:text-sm"
                      style={{ fontSize: "16px" }}
                    />
                    {paymentForm.instapay && Number(paymentForm.instapay) > 0 && (
                      <>
                        {/* Show location's fixed InstaPay receiving number */}
                        {selectedBookings[0]?.location?.instapayPhone && (
                          <div className="mt-2 p-3 bg-[rgba(212,168,23,0.1)] border border-[rgba(212,168,23,0.25)] rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">InstaPay Receiving Number:</p>
                            <p className="text-sm font-semibold text-[#D4A817]">{selectedBookings[0].location.instapayPhone}</p>
                          </div>
                        )}
                        <Input
                          id="payerName"
                          type="text"
                          value={paymentForm.payerName}
                          onChange={(e) => setPaymentForm({ ...paymentForm, payerName: e.target.value })}
                          placeholder="Payer Name (who sent the money)"
                          className="mt-2 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 focus:border-[#D4A817] focus:ring-[#D4A817] h-12 sm:h-10 text-base sm:text-sm"
                          style={{ fontSize: "16px" }}
                        />
                        <Input
                          id="payerPhone"
                          type="tel"
                          value={paymentForm.payerPhone}
                          onChange={(e) => setPaymentForm({ ...paymentForm, payerPhone: e.target.value })}
                          placeholder="Payer Phone Number (who sent the money)"
                          className="mt-2 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 focus:border-[#D4A817] focus:ring-[#D4A817] h-12 sm:h-10 text-base sm:text-sm"
                          style={{ fontSize: "16px" }}
                        />
                      </>
                    )}
                  </div>
                  {paymentForm.visa && Number(paymentForm.visa) > 0 && (
                    <div>
                      <Label htmlFor="visaPhone" className="text-foreground flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Visa Card/Reference (Optional)
                      </Label>
                      <Input
                        id="visaPhone"
                        type="text"
                        value={paymentForm.visaPhone}
                        onChange={(e) => setPaymentForm({ ...paymentForm, visaPhone: e.target.value })}
                        placeholder="Card number or reference"
                        className="mt-2 bg-[#252015] border-[rgba(212,168,23,0.25)] text-white placeholder:text-white/50 focus:border-[#D4A817] focus:ring-[#D4A817] h-12 sm:h-10 text-base sm:text-sm"
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                  )}
                  <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 rounded-lg border border-green-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Payment Amount:</span>
                      <span className="text-lg font-bold text-foreground">
                        {(
                          (Number(paymentForm.cash) || 0) +
                          (Number(paymentForm.visa) || 0) +
                          (Number(paymentForm.instapay) || 0)
                        ).toLocaleString()} EGP
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-green-500/20">
                      <span className="text-sm font-medium text-muted-foreground">New Total Paid:</span>
                      <span className="text-lg font-bold text-green-400">
                        {(() => {
                          const currentTotalPaid = selectedBookings.reduce((sum, b) => sum + b.paymentSummary.totalPaid, 0);
                          const newPayment = (Number(paymentForm.cash) || 0) + (Number(paymentForm.visa) || 0) + (Number(paymentForm.instapay) || 0);
                          return (currentTotalPaid + newPayment).toLocaleString();
                        })()} EGP
                      </span>
                    </div>
                    {(() => {
                      const totalRemaining = selectedBookings.reduce((sum, b) => sum + b.paymentSummary.remaining, 0);
                      const newPayment = (Number(paymentForm.cash) || 0) + (Number(paymentForm.visa) || 0) + (Number(paymentForm.instapay) || 0);
                      return totalRemaining > 0 ? (
                        <div className="mt-2 pt-2 border-t border-green-500/20">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Will Remain:</span>
                            <span className="text-sm font-semibold text-[#FB923C]">
                              {Math.max(0, totalRemaining - newPayment).toLocaleString()} EGP
                            </span>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </motion.div>
              )}
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedBooking(null);
                    setSelectedBookings([]);
                    setPaymentForm({ cash: "", visa: "", instapay: "", payerName: "", payerPhone: "", visaPhone: "" });
                  }}
                  disabled={recordingPayment}
                  className="border-[rgba(212,168,23,0.4)] text-white hover:bg-[#D4A817]/20 hover:border-[#D4A817] w-full sm:w-auto h-12 sm:h-10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitPayment}
                  disabled={recordingPayment}
                  className="bg-[#D4A817] hover:bg-[#E6C420] text-[#1A1612] w-full sm:w-auto h-12 sm:h-10"
                >
                  {recordingPayment ? "Recording..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}