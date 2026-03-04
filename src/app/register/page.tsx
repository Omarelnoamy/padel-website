"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  UserPlus,
  Loader2,
  Shield,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Location {
  id: string;
  name: string;
  address: string;
  ownerId: string | null;
  owner?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "user" as "user" | "admin" | "club_owner",
    adminType: "",
    userType: "",
    locationId: "",
  });
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdministration, setShowAdministration] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const formSectionRef = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = formSectionRef.current;
    if (!el) return;
    const handleScroll = () => {
      setHeaderCollapsed(el.scrollTop > 60);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch locations when club admin or moderator is selected
  useEffect(() => {
    const isClubAdmin =
      formData.role === "user" && formData.userType === "club_admin";
    const isModerator =
      formData.role === "admin" && formData.adminType === "moderator";
    if ((isClubAdmin || isModerator) && locations.length === 0) {
      fetchLocations();
    }
  }, [formData.role, formData.userType, formData.adminType]);

  // Auto-expand Administration section when an admin role is selected
  useEffect(() => {
    const isAdminRole =
      formData.role === "admin" ||
      formData.role === "club_owner" ||
      (formData.role === "user" && formData.userType === "club_admin");
    if (isAdminRole) {
      setShowAdministration(true);
    }
  }, [formData.role, formData.userType, formData.adminType]);

  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const data = await res.json();
        // Filter to only show locations with a club owner
        const locationsWithOwner = data.filter(
          (loc: Location) => loc.ownerId !== null,
        );
        setLocations(locationsWithOwner);
      }
    } catch (e) {
      console.error("Error fetching locations:", e);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.role === "admin" && !formData.adminType) {
      setError("Please select an admin type");
      return;
    }

    // Validate location selection for club admin or moderator
    if (
      (formData.role === "user" &&
        formData.userType === "club_admin" &&
        !formData.locationId) ||
      (formData.role === "admin" &&
        formData.adminType === "moderator" &&
        !formData.locationId)
    ) {
      setError("Please select a location");
      return;
    }

    // Prepare role and adminType for submission
    let finalRole: "user" | "admin" =
      formData.role === "club_owner" ? "admin" : formData.role;
    let finalAdminType: string =
      formData.role === "club_owner" ? "club_owner" : formData.adminType;

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: finalRole,
          adminType: finalAdminType || null,
          userType: formData.userType || null,
          locationId: formData.locationId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
      } else {
        if (finalRole === "admin") {
          alert(
            "Admin registration submitted! You will be notified once approved.",
          );
        } else if (formData.userType === "club_admin") {
          alert(
            "Club Admin registration submitted! The club owner will review your request and you will be notified once approved.",
          );
        } else if (formData.adminType === "moderator") {
          alert(
            "Moderator registration submitted! The club owner will review your request and you will be notified once approved.",
          );
        }
        router.push("/login?registered=true");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-canva min-h-screen flex flex-col">
      {/* Top section: same logo and background as login, same height; collapses on scroll */}
      <header
        className={`register-hero register-hero-collapsible flex-shrink-0 flex flex-col items-center justify-center px-4 py-12 sm:py-16 min-h-[32vh] sm:min-h-[35vh] transition-all duration-300 ease-out ${
          headerCollapsed ? "register-hero-collapsed" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          className="absolute top-4 left-4 text-white/90 hover:text-white text-2xl font-medium transition-colors z-10"
          aria-label="Back"
        >
          ←
        </button>
        <div
          className={`flex flex-col items-center text-center transition-all duration-500 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <Image
            src="/images/starpoint-logo-light.png"
            alt="StarPoint"
            width={300}
            height={100}
            className="h-20 sm:h-24 w-auto object-contain"
            priority
          />
        </div>
      </header>

      {/* White form section - scroll here hides header */}
      <main
        ref={formSectionRef}
        className="register-form-section flex-1 min-h-0 bg-white rounded-t-[2.5rem] sm:rounded-t-[2.5rem] -mt-6 relative z-10 px-6 sm:px-8 pt-8 sm:pt-10 pb-10 sm:pb-12 overflow-y-auto"
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-[#1a1a1a] text-3xl sm:text-4xl font-bold uppercase tracking-tight text-center">
            Sign up
          </h1>
          <p className="text-[#737373] text-sm sm:text-base text-center mt-2">
            Already Registered?{" "}
            <Link
              href="/login"
              className="register-canva-link text-[#1a1a1a] font-medium underline underline-offset-2"
            >
              Log in here.
            </Link>
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div
                className="rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-[#737373] text-xs font-medium uppercase tracking-wider"
                >
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="register-canva-input h-12 rounded-full bg-[#e5e5e5] border-0 text-[#1a1a1a] placeholder:text-[#737373] focus-visible:ring-2 focus-visible:ring-[#D4A817] focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-[#737373] text-xs font-medium uppercase tracking-wider"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="register-canva-input h-12 rounded-full bg-[#e5e5e5] border-0 text-[#1a1a1a] placeholder:text-[#737373] focus-visible:ring-2 focus-visible:ring-[#D4A817] focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="block text-[#737373] text-xs font-medium uppercase tracking-wider"
              >
                Phone Number
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+20 12 3456 7890"
                value={formData.phone}
                onChange={handleChange}
                className="register-canva-input h-12 rounded-full bg-[#e5e5e5] border-0 text-[#1a1a1a] placeholder:text-[#737373] focus-visible:ring-2 focus-visible:ring-[#D4A817] focus-visible:ring-offset-0"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-[#737373] text-xs font-medium uppercase tracking-wider"
                >
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="register-canva-input h-12 rounded-full bg-[#e5e5e5] border-0 text-[#1a1a1a] placeholder:text-[#737373] focus-visible:ring-2 focus-visible:ring-[#D4A817] focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-[#737373] text-xs font-medium uppercase tracking-wider"
                >
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="register-canva-input h-12 rounded-full bg-[#e5e5e5] border-0 text-[#1a1a1a] placeholder:text-[#737373] focus-visible:ring-2 focus-visible:ring-[#D4A817] focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-[#737373] text-xs font-medium uppercase tracking-wider">
                Account Type
              </label>
              <div className="flex flex-col gap-3 bg-[#f0f0f0] border border-[#e5e5e5] rounded-2xl p-4">
                {/* Player Option */}
                <label className="register-canva-option flex items-center gap-3 p-3 rounded-xl cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={
                      formData.role === "user" &&
                      formData.userType !== "club_admin"
                    }
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        role: e.target.value as "user" | "admin" | "club_owner",
                        adminType: "",
                        userType: "",
                      });
                      setShowAdministration(false);
                    }}
                    className="text-[#D4A817] focus:ring-[#D4A817]"
                  />
                  <Users className="h-4 w-4 text-[#1a1a1a]" />
                  <div className="flex flex-col">
                    <span className="text-sm text-[#1a1a1a] font-medium">
                      Player
                    </span>
                    <span className="text-xs text-[#737373] mt-0.5">
                      Book courts and join tournaments
                    </span>
                  </div>
                </label>

                {/* Administration Section */}
                <div className="border-t border-[#e5e5e5] pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAdministration(!showAdministration)}
                    className="register-canva-option w-full flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-[#1a1a1a]" />
                      <div className="flex flex-col text-left">
                        <span className="text-sm text-[#1a1a1a] font-medium">
                          Administration
                        </span>
                        <span className="text-xs text-[#737373] mt-0.5">
                          Staff and management roles (Requires Approval)
                        </span>
                      </div>
                    </div>
                    {showAdministration ? (
                      <ChevronUp className="h-4 w-4 text-[#1a1a1a]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#1a1a1a]" />
                    )}
                  </button>

                  {showAdministration && (
                    <div className="ml-6 mt-2 space-y-2">
                      {/* Club Admin */}
                      <label className="register-canva-option flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-white/40">
                        <input
                          type="radio"
                          name="role"
                          value="user"
                          checked={
                            formData.role === "user" &&
                            formData.userType === "club_admin"
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              role: "user",
                              userType: "club_admin",
                              adminType: "",
                              locationId: "",
                            })
                          }
                          className="text-[#D4A817] focus:ring-[#D4A817]"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm text-[#1a1a1a] font-medium">
                            Club Admin (Booking Staff)
                          </span>
                          <span className="text-xs text-[#737373] mt-0.5">
                            Manage bookings for a specific location
                          </span>
                        </div>
                      </label>
                      {formData.role === "user" &&
                        formData.userType === "club_admin" && (
                          <div className="ml-6 mt-2 space-y-2 bg-white/60 border border-[#e5e5e5] rounded-xl p-3">
                            <label
                              htmlFor="locationId"
                              className="text-xs font-medium text-[#737373] uppercase tracking-wider"
                            >
                              Select Location
                            </label>
                            {loadingLocations ? (
                              <p className="text-xs text-[#737373]">
                                Loading locations...
                              </p>
                            ) : locations.length === 0 ? (
                              <p className="text-xs text-red-600">
                                No locations with club owners available. Please
                                contact support.
                              </p>
                            ) : (
                              <Select
                                value={formData.locationId}
                                onValueChange={(value) =>
                                  setFormData({
                                    ...formData,
                                    locationId: value,
                                  })
                                }
                                required
                              >
                                <SelectTrigger className="w-full register-canva-input h-12 rounded-full bg-[#e5e5e5] border-0 text-[#1a1a1a] text-base md:text-sm min-h-[48px] touch-manipulation focus:ring-2 focus:ring-[#D4A817]">
                                  <SelectValue placeholder="Select a location" />
                                </SelectTrigger>
                                <SelectContent
                                  position="popper"
                                  className="max-h-[70vh] md:max-h-96 w-[calc(100vw-2rem)] md:w-[var(--radix-select-trigger-width)] z-[100] bg-white border-[#e5e5e5] text-[#1a1a1a]"
                                  sideOffset={8}
                                >
                                  {locations.map((location) => (
                                    <SelectItem
                                      key={location.id}
                                      value={location.id}
                                      className="py-3 md:py-1.5 px-3 text-base md:text-sm min-h-[56px] md:min-h-0 touch-manipulation focus:bg-[#f0f0f0] text-[#1a1a1a]"
                                    >
                                      <div className="flex flex-col gap-1">
                                        <span className="font-medium text-[#1a1a1a]">
                                          {location.name}
                                        </span>
                                        <span className="text-xs text-[#737373]">
                                          {location.address}
                                        </span>
                                        {location.owner?.name && (
                                          <span className="text-xs text-[#D4A817] mt-0.5">
                                            Owner: {location.owner.name}
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <p className="text-xs text-[#737373]">
                              The club owner of this location will review your
                              request
                            </p>
                          </div>
                        )}
                      {/* Moderator */}
                      <label className="register-canva-option flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-white/40">
                        <input
                          type="radio"
                          name="role"
                          value="admin"
                          checked={
                            formData.role === "admin" &&
                            formData.adminType === "moderator"
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              role: "admin",
                              adminType: "moderator",
                              userType: "",
                              locationId: "",
                            })
                          }
                          className="text-[#D4A817] focus:ring-[#D4A817]"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm text-[#1a1a1a] font-medium">
                            Moderator
                          </span>
                          <span className="text-xs text-[#737373] mt-0.5">
                            Location management and operations
                          </span>
                        </div>
                      </label>
                      {formData.role === "admin" &&
                        formData.adminType === "moderator" && (
                          <div className="ml-6 mt-2 space-y-2 bg-white/60 border border-[#e5e5e5] rounded-xl p-3">
                            <label
                              htmlFor="locationId-moderator"
                              className="text-xs font-medium text-[#737373] uppercase tracking-wider"
                            >
                              Select Location
                            </label>
                            {loadingLocations ? (
                              <p className="text-xs text-[#737373]">
                                Loading locations...
                              </p>
                            ) : locations.length === 0 ? (
                              <p className="text-xs text-red-600">
                                No locations with club owners available. Please
                                contact support.
                              </p>
                            ) : (
                              <Select
                                value={formData.locationId}
                                onValueChange={(value) =>
                                  setFormData({
                                    ...formData,
                                    locationId: value,
                                  })
                                }
                                required
                              >
                                <SelectTrigger className="w-full register-canva-input h-12 rounded-full bg-[#e5e5e5] border-0 text-[#1a1a1a] text-base md:text-sm min-h-[48px] touch-manipulation focus:ring-2 focus:ring-[#D4A817]">
                                  <SelectValue placeholder="Select a location" />
                                </SelectTrigger>
                                <SelectContent
                                  position="popper"
                                  className="max-h-[70vh] md:max-h-96 w-[calc(100vw-2rem)] md:w-[var(--radix-select-trigger-width)] z-[100] bg-white border-[#e5e5e5] text-[#1a1a1a]"
                                  sideOffset={8}
                                >
                                  {locations.map((location) => (
                                    <SelectItem
                                      key={location.id}
                                      value={location.id}
                                      className="py-3 md:py-1.5 px-3 text-base md:text-sm min-h-[56px] md:min-h-0 touch-manipulation focus:bg-[#f0f0f0] text-[#1a1a1a]"
                                    >
                                      <div className="flex flex-col gap-1">
                                        <span className="font-medium text-[#1a1a1a]">
                                          {location.name}
                                        </span>
                                        <span className="text-xs text-[#737373]">
                                          {location.address}
                                        </span>
                                        {location.owner?.name && (
                                          <span className="text-xs text-[#D4A817] mt-0.5">
                                            Owner: {location.owner.name}
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <p className="text-xs text-[#737373]">
                              The club owner of this location will review your
                              request
                            </p>
                          </div>
                        )}
                      {/* Owner (Partner) */}
                      <label className="register-canva-option flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-white/40">
                        <input
                          type="radio"
                          name="role"
                          value="admin"
                          checked={
                            formData.role === "admin" &&
                            formData.adminType === "owner_partner"
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              role: "admin",
                              adminType: "owner_partner",
                              userType: "",
                            })
                          }
                          className="text-[#D4A817] focus:ring-[#D4A817]"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm text-[#1a1a1a] font-medium">
                            Owner (Partner)
                          </span>
                          <span className="text-xs text-[#737373] mt-0.5">
                            Read-Only Financial Viewer - View financial reports
                            only
                          </span>
                        </div>
                      </label>

                      {/* Tournament Organizer */}
                      <label className="register-canva-option flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-white/40">
                        <input
                          type="radio"
                          name="role"
                          value="admin"
                          checked={
                            formData.role === "admin" &&
                            formData.adminType === "tournament_organizer"
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              role: "admin",
                              adminType: "tournament_organizer",
                              userType: "",
                            })
                          }
                          className="text-[#D4A817] focus:ring-[#D4A817]"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm text-[#1a1a1a] font-medium">
                            Tournament Organizer
                          </span>
                          <span className="text-xs text-[#737373] mt-0.5">
                            Create and manage tournaments and competitions
                          </span>
                        </div>
                      </label>

                      {/* Coach Admin */}
                      <label className="register-canva-option flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-white/40">
                        <input
                          type="radio"
                          name="role"
                          value="admin"
                          checked={
                            formData.role === "admin" &&
                            formData.adminType === "coach_admin"
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              role: "admin",
                              adminType: "coach_admin",
                              userType: "",
                            })
                          }
                          className="text-[#D4A817] focus:ring-[#D4A817]"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm text-[#1a1a1a] font-medium">
                            Coach Admin
                          </span>
                          <span className="text-xs text-[#737373] mt-0.5">
                            Manage coaching programs, schedules, and coaches
                          </span>
                        </div>
                      </label>

                      {/* Club Owner */}
                      <label className="register-canva-option flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-white/40">
                        <input
                          type="radio"
                          name="role"
                          value="club_owner"
                          checked={formData.role === "club_owner"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              role: e.target.value as
                                | "user"
                                | "admin"
                                | "club_owner",
                              adminType: "club_owner",
                            })
                          }
                          className="text-[#D4A817] focus:ring-[#D4A817]"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm text-[#1a1a1a] font-medium">
                            Club Owner
                          </span>
                          <span className="text-xs text-[#737373] mt-0.5">
                            Full access to club management and operations
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="register-canva-btn w-full h-12 rounded-2xl bg-[#1a1a1a] text-white font-bold uppercase tracking-wide text-base focus-visible:ring-[#D4A817] mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden />
                  Creating account...
                </>
              ) : (
                "Sign up"
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
