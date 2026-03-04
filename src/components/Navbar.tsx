"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Menu,
  X,
  Bell,
  Check,
  Home,
  Calendar,
  BookOpen,
  GraduationCap,
  Trophy,
  BarChart3,
  User,
  LogOut,
  Shield,
  Building2,
  Settings,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const role = (session?.user as any)?.role;
  const adminType = (session?.user as any)?.adminType;
  const isApproved = (session?.user as any)?.isApproved !== false;
  const isAdmin =
    ((role === "admin" || role === "club_owner") && isApproved);
  const isSuperAdmin =
    isAdmin && role === "admin" && adminType === "super_admin";
  const isClubOwner =
    isAdmin && (role === "club_owner" || adminType === "club_owner");
  const isModerator =
    isAdmin && (session?.user as any)?.adminType === "moderator";
  const isClubAdmin =
    (session?.user as any)?.role === "user" &&
    (session?.user as any)?.userType === "club_admin" &&
    (session?.user as any)?.isApproved;

  useEffect(() => {
    if (status === "authenticated") {
      fetchNotifications();

      // Trigger booking reminders check periodically (every 2 minutes)
      // More frequent checks ensure we catch bookings exactly 1 hour before
      const checkReminders = async () => {
        try {
          await fetch("/api/cron/booking-reminders", { method: "POST" });
          // Refresh notifications after checking reminders
          fetchNotifications();
        } catch (error) {
          console.error("Failed to check booking reminders", error);
        }
      };

      // Check immediately, then every 2 minutes to catch bookings at the 1-hour mark
      checkReminders();
      const reminderInterval = setInterval(checkReminders, 2 * 60 * 1000); // 2 minutes

      return () => clearInterval(reminderInterval);
    } else {
      setNotifications([]);
      setShowNotifications(false);
    }
  }, [status]);

  // Navbar scroll behavior - smooth shadow transition
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await fetch("/api/notifications?unread=true");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data ?? []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const unreadCount = notifications.length;

  const toggleNotifications = async () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState && notifications.length === 0 && !loadingNotifications) {
      await fetchNotifications();
    }
  };

  const markNotificationsRead = async () => {
    if (notifications.length === 0) return;
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationIds: notifications.map((n) => n.id),
        }),
      });
      setNotifications([]);
    } catch (error) {
      console.error("Failed to mark notifications read", error);
    }
  };

  const handleNotificationAction = async (
    notificationId: string,
    accept: boolean,
  ) => {
    try {
      await fetch("/api/players/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, accept }),
      });
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to respond to notification", error);
    }
  };

  const handleAdminApproval = async (
    userId: string,
    action: "approve" | "reject",
  ) => {
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to process request");
        return;
      }
      toast.success(
        action === "approve"
          ? "Club admin approved successfully"
          : "Request rejected",
      );
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to process approval", error);
      toast.error("Failed to process request");
    }
  };

  const isActive = (href: string) => pathname === href;

  const mainNavItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/booking", label: "Booking", icon: Calendar },
    ...(session
      ? [{ href: "/my-bookings", label: "My Bookings", icon: BookOpen }]
      : []),
    { href: "/coaching", label: "Coaching", icon: GraduationCap },
    { href: "/tournaments", label: "Tournaments", icon: Trophy },
    { href: "/point-system", label: "Points", icon: BarChart3 },
  ];

  const adminNavItems = isAdmin
    ? [
        {
          href: isSuperAdmin
            ? "/admin/super-admin"
            : isClubOwner || isModerator
              ? "/admin/club-owner"
              : "/admin",
          label: isSuperAdmin
            ? "Super Admin"
            : isClubOwner
              ? "Club Owner"
              : isModerator
                ? "Moderator"
                : "Admin",
          icon: Shield,
        },
      ]
    : isClubAdmin
      ? [
          {
            href: "/admin/club-admin",
            label: "Club Admin",
            icon: Building2,
          },
        ]
      : [];

  return (
    <>
      {/* Top Navbar - Desktop & Mobile Header */}
      <nav
        className={`sticky top-0 z-50 w-full border-b border-[rgba(255,255,255,0.08)] bg-[#0A0A0A] shadow-[0_4px_20px_rgba(212,168,23,0.1)] ${isScrolled ? "navbar-scrolled shadow-[0_4px_24px_rgba(0,0,0,0.25)]" : ""}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity duration-150"
            data-intro-target="navbar-logo"
          >
            <Image
              src="/images/starpoint-logo-light.png"
              alt="StarPoint Logo"
              width={180}
              height={60}
              className="h-10 sm:h-12 md:h-14 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive(item.href)
                      ? "bg-[#D4A817] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                      : "text-white/75 hover:text-white hover:bg-[rgba(255,255,255,0.08)]",
                  )}
                >
                  <span className="hidden lg:inline">{item.label}</span>
                  <Icon className="h-4 w-4 lg:hidden" />
                </Link>
              );
            })}
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive(item.href)
                      ? "bg-[#D4A817] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                      : "text-white/75 hover:text-white hover:bg-[rgba(255,255,255,0.08)]",
                  )}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop Auth & Notifications */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "relative",
                      showNotifications && "text-[#D4A817] hover:text-[#E6C420]",
                    )}
                    onClick={toggleNotifications}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[rgba(212,168,23,0.12)] bg-[#1A1612]/95 shadow-[0_20px_50px_rgba(212,168,23,0.2)] z-50 backdrop-blur-sm">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(212,168,23,0.12)]">
                        <span className="text-sm font-semibold text-white">
                          Notifications
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-[#D4A817] hover:text-[#E6C420] hover:bg-[rgba(212,168,23,0.1)]"
                          onClick={async () => {
                            await markNotificationsRead();
                            setShowNotifications(false);
                          }}
                          disabled={notifications.length === 0}
                        >
                          <Check className="h-3 w-3 mr-1" /> Mark read
                        </Button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {loadingNotifications ? (
                          <div className="px-4 py-8 text-center text-sm text-white/60">
                            Loading...
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-white/60">
                            No new notifications
                          </div>
                        ) : (
                          notifications.map((notification) => {
                            const metadata = notification.metadata ?? {};
                            const similarity = metadata.similarity
                              ? `${metadata.similarity}% match`
                              : null;
                            const matchedName = metadata.matchedName;
                            const matchedPoints = metadata.matchedPoints;
                            const showMatchActions =
                              notification.type === "player_match";
                            const isAdminApproval =
                              notification.type === "admin_approval";
                            const isSuperAdminUser =
                              (session?.user as any)?.role === "admin" &&
                              (session?.user as any)?.adminType ===
                                "super_admin";
                            const isClubOwnerUser =
                              (session?.user as any)?.role === "admin" &&
                              (session?.user as any)?.adminType ===
                                "club_owner";
                            const isClubAdminRequest =
                              isAdminApproval &&
                              metadata.userType === "club_admin" &&
                              metadata.locationId;

                            return (
                              <div
                                key={notification.id}
                                className="px-4 py-3 border-b border-[rgba(212,168,23,0.08)] last:border-b-0 hover:bg-[rgba(212,168,23,0.06)] transition-colors duration-150"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-white">
                                      {notification.title}
                                    </div>
                                    <div className="text-xs text-white/75 mt-1 whitespace-pre-line">
                                      {notification.message}
                                      {matchedName && (
                                        <div className="mt-1 text-white/60">
                                          Found:{" "}
                                          <strong className="text-[#D4A817]">
                                            {matchedName}
                                          </strong>
                                          {typeof matchedPoints ===
                                            "number" && (
                                            <span> · {matchedPoints} pts</span>
                                          )}
                                        </div>
                                      )}
                                      {similarity && (
                                        <div className="text-[11px] text-white/55">
                                          Similarity: {similarity}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-white/50 mt-1">
                                      {new Date(
                                        notification.createdAt,
                                      ).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                {showMatchActions && (
                                  <div className="mt-3 flex gap-2">
                                    <Button
                                      size="sm"
                                      className="flex-1 bg-[#D4A817] hover:bg-[#E6C420] text-white text-xs h-7 shadow-[0_2px_8px_rgba(212,168,23,0.25)]"
                                      onClick={async () =>
                                        handleNotificationAction(
                                          notification.id,
                                          true,
                                        )
                                      }
                                    >
                                      Yes, that's me
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 text-xs h-7 border-[rgba(212,168,23,0.3)] text-white/80 hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                                      onClick={async () =>
                                        handleNotificationAction(
                                          notification.id,
                                          false,
                                        )
                                      }
                                    >
                                      No, not me
                                    </Button>
                                  </div>
                                )}
                                {isAdminApproval &&
                                  isSuperAdminUser &&
                                  !isClubAdminRequest && (
                                    <div className="mt-3">
                                      <Link href="/admin/super-admin">
                                        <Button
                                          size="sm"
                                          className="w-full bg-[#D4A817] hover:bg-[#E6C420] text-white text-xs h-7 shadow-[0_2px_8px_rgba(212,168,23,0.25)]"
                                          onClick={() => {
                                            markNotificationsRead();
                                            setShowNotifications(false);
                                          }}
                                        >
                                          Review Pending Approvals
                                        </Button>
                                      </Link>
                                    </div>
                                  )}
                                {isAdminApproval &&
                                  isClubAdminRequest &&
                                  isClubOwnerUser && (
                                    <div className="mt-3 flex gap-2">
                                      <Button
                                        size="sm"
                                        className="flex-1 bg-[#D4A817] hover:bg-[#E6C420] text-white text-xs h-7 shadow-[0_2px_8px_rgba(212,168,23,0.25)]"
                                        onClick={async () => {
                                          await handleAdminApproval(
                                            metadata.pendingUserId,
                                            "approve",
                                          );
                                        }}
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 text-xs h-7 border-[rgba(212,168,23,0.3)] text-white/80 hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                                        onClick={async () => {
                                          await handleAdminApproval(
                                            metadata.pendingUserId,
                                            "reject",
                                          );
                                        }}
                                      >
                                        Reject
                                      </Button>
                                    </div>
                                  )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#D4A817] text-white text-xs">
                      {(session.user?.name || session.user?.email || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-white/75 hidden lg:block">
                    {session.user?.name || session.user?.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden lg:inline">Logout</span>
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle - Enhanced Animation */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2.5 min-w-[44px] min-h-[44px] text-white/75 hover:bg-[rgba(255,255,255,0.08)] hover:text-white active:bg-[rgba(255,255,255,0.12)] focus:outline-none focus:ring-2 focus:ring-[#D4A817] transition-all duration-300 touch-manipulation"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <div className="relative w-6 h-6">
              <Menu
                className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${
                  open
                    ? "opacity-0 rotate-90 scale-0"
                    : "opacity-100 rotate-0 scale-100"
                }`}
              />
              <X
                className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${
                  open
                    ? "opacity-100 rotate-0 scale-100"
                    : "opacity-0 -rotate-90 scale-0"
                }`}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Only for authenticated users */}
      {session && !isAdmin && !isClubAdmin && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A] border-t border-[rgba(255,255,255,0.08)] shadow-[0_-4px_20px_rgba(212,168,23,0.1)] md:hidden">
          <div className="grid grid-cols-4 gap-1 px-2 py-2">
            {mainNavItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all duration-150",
                    isActive(item.href)
                      ? "bg-[rgba(212,168,23,0.15)] text-[#D4A817]"
                      : "text-white/55 hover:text-white/75",
                  )}
                  onClick={() => setOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Mobile Slide-in Drawer - For Admin/All Users */}
      <div className={`md:hidden ${open ? "block" : "hidden"}`}>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setOpen(false)}
        />
        {/* Drawer - homepage theme: dark card + gold accents */}
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl transform transition-transform duration-300 ease-out",
            "bg-[#1A1612] border-t border-[rgba(212,168,23,0.2)] shadow-[0_-20px_50px_rgba(212,168,23,0.2)]",
            open ? "translate-y-0" : "translate-y-full",
          )}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-[#D4A817]/50 rounded-full" />
          </div>

          {/* User Info */}
          {session && (
            <div className="px-6 py-4 border-b border-[rgba(212,168,23,0.12)]">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-[rgba(212,168,23,0.3)]">
                  <AvatarFallback className="bg-[#D4A817] text-white font-medium">
                    {(session.user?.name || session.user?.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">
                    {session.user?.name || "User"}
                  </div>
                  <div className="text-sm text-white/60 truncate">
                    {session.user?.email}
                  </div>
                  {(isAdmin || isClubAdmin) && (
                    <div className="text-xs text-[#D4A817] font-medium mt-1">
                      {isSuperAdmin
                        ? "Super Admin"
                        : isClubOwner
                          ? "Club Owner"
                          : isModerator
                            ? "Moderator"
                            : isClubAdmin
                              ? "Club Admin"
                              : "Admin"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <div className="px-4 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="space-y-1">
              {/* Main Navigation */}
              <div className="px-2 py-2 text-xs font-semibold text-[#D4A817]/90 uppercase tracking-wider">
                Navigation
              </div>
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150",
                      isActive(item.href)
                        ? "bg-[#D4A817] text-white font-medium shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                        : "text-white/80 hover:bg-[rgba(212,168,23,0.1)] hover:text-[#D4A817]",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Admin Navigation */}
              {adminNavItems.length > 0 && (
                <>
                  <div className="px-2 py-2 mt-4 text-xs font-semibold text-[#D4A817]/90 uppercase tracking-wider">
                    Admin
                  </div>
                  {adminNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150",
                          isActive(item.href)
                            ? "bg-[#D4A817] text-white font-medium shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                            : "text-white/80 hover:bg-[rgba(212,168,23,0.1)] hover:text-[#D4A817]",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </>
              )}

              {/* Auth Buttons - Show when NOT logged in */}
              {!session && (
                <>
                  <div className="px-4 py-4 space-y-2 border-t border-[rgba(212,168,23,0.12)] mt-4">
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="block w-full"
                    >
                      <Button
                        variant="outline"
                        className="w-full justify-center border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                      >
                        Login
                      </Button>
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setOpen(false)}
                      className="block w-full"
                    >
                      <Button className="w-full justify-center bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </>
              )}

              {/* Settings & Logout */}
              {session && (
                <>
                  <div className="px-2 py-2 mt-4 text-xs font-semibold text-[#D4A817]/90 uppercase tracking-wider">
                    Account
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150",
                      isActive("/profile")
                        ? "bg-[#D4A817] text-white font-medium shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                        : "text-white/80 hover:bg-[rgba(212,168,23,0.1)] hover:text-[#D4A817]",
                    )}
                  >
                    <User className="h-5 w-5" />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      setOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-150"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
