"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Calendar, 
  MapPin, 
  Clock, 
  Trophy, 
  ArrowLeft, 
  Check, 
  Sparkles,
  Info,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Location {
  id: string;
  name: string;
  address: string;
  courts: Court[];
}

interface Court {
  id: string;
  name: string;
  type: string;
}

export default function CreateTournamentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    locationId: "",
    customLocation: "", // Custom location text if not in website
    customLocationCourts: "", // Number of courts at custom location
    useCustomLocation: false, // Toggle for custom location
    selectedCourts: [] as string[],
    description: "",
    isMultiDay: false, // Toggle for multi-day tournaments
    maxTeamPoints: "", // Maximum combined points for both players
    tournamentSystem: "knockout", // Tournament system: knockout, league, or groups
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchLocations();
    
    // Track mouse position for parallax
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations");
      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not wrapped in { locations: [] }
        setLocations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const selectedLocation = locations.find((loc) => loc.id === formData.locationId);
  const availableCourts = selectedLocation?.courts || [];

  const handleLocationChange = (locationId: string) => {
    setFormData({
      ...formData,
      locationId,
      selectedCourts: [], // Reset selected courts when location changes
    });
    setErrors({ ...errors, locationId: "" });
  };

  const handleCourtToggle = (courtId: string) => {
    setFormData((prev) => {
      const isSelected = prev.selectedCourts.includes(courtId);
      return {
        ...prev,
        selectedCourts: isSelected
          ? prev.selectedCourts.filter((id) => id !== courtId)
          : [...prev.selectedCourts, courtId],
      };
    });
    setErrors({ ...errors, selectedCourts: "" });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Tournament name is required";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    // Only validate end date if it's a multi-day tournament
    if (formData.isMultiDay && !formData.endDate) {
      newErrors.endDate = "End date is required for multi-day tournaments";
    }

    if (formData.startDate && formData.endDate && formData.isMultiDay) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
    }

    // Validate location
    if (!formData.useCustomLocation && !formData.locationId) {
      newErrors.locationId = "Location is required";
    }

    if (formData.useCustomLocation && !formData.customLocation.trim()) {
      newErrors.customLocation = "Custom location is required";
    }

    if (formData.useCustomLocation && (!formData.customLocationCourts || parseInt(formData.customLocationCourts) <= 0)) {
      newErrors.customLocationCourts = "Number of courts is required and must be greater than 0";
    }

    // Validate max team points (required)
    if (!formData.maxTeamPoints || parseInt(formData.maxTeamPoints) <= 0) {
      newErrors.maxTeamPoints = "Max team points is required and must be greater than 0";
    }

    // End time is optional - will default to end of day if not provided

    if (!formData.locationId) {
      newErrors.locationId = "Location is required";
    }

    if (formData.selectedCourts.length === 0) {
      newErrors.selectedCourts = "At least one court must be selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API endpoint for tournament creation
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.isMultiDay ? formData.endDate : formData.startDate, // Use start date if single day
          startTime: formData.startTime,
          endTime: formData.endTime || "06:00", // Use end of booking day (06:00) if end time not provided
          tournamentSystem: formData.tournamentSystem,
          locationId: formData.useCustomLocation ? null : formData.locationId,
          customLocation: formData.useCustomLocation ? formData.customLocation : null,
          customLocationCourts: formData.useCustomLocation ? parseInt(formData.customLocationCourts) : null,
          courtIds: formData.useCustomLocation ? [] : formData.selectedCourts,
          description: formData.description,
          maxTeamPoints: parseInt(formData.maxTeamPoints),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Show success message and redirect to dashboard
        alert("Tournament created successfully!");
        router.push("/admin/tournament-organizer");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create tournament");
      }
    } catch (error) {
      console.error("Error creating tournament:", error);
      alert("An error occurred while creating the tournament");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#0F172A] to-[#1E293B] py-8 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#1E90FF]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              transform: `translate(${mousePosition.x * 0.3}px, ${mousePosition.y * 0.3}px)`,
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#3FA9F5]/8 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.08, 0.15, 0.08],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            style={{
              transform: `translate(${-mousePosition.x * 0.2}px, ${-mousePosition.y * 0.2}px)`,
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-6 text-muted-foreground hover:text-foreground hover:bg-[#1E90FF]/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, type: "spring" }}
                className="relative"
              >
                <div className="absolute inset-0 bg-[#1E90FF]/30 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-gradient-to-br from-[#1E90FF] via-[#3FA9F5] to-[#1E90FF] p-4 rounded-2xl shadow-[0_0_40px_rgba(30,144,255,0.3)]">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
              </motion.div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2 bg-gradient-to-r from-white via-[#1E90FF] to-white bg-clip-text text-transparent">
                  Create Tournament
                </h1>
                <p className="text-muted-foreground text-lg">
                  Fill in the details to create your tournament
                </p>
              </div>
            </div>

          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-card border-border hover:border-[#1E90FF]/30 transition-all duration-300 shadow-xl">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#1E90FF]" />
                    Tournament Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                {/* Tournament Name and Max Team Points */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <Label htmlFor="name" className="text-foreground flex items-center gap-2 mb-2">
                      <Trophy className="h-4 w-4 text-[#1E90FF]" />
                      Tournament Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        setErrors({ ...errors, name: "" });
                      }}
                      placeholder="e.g., Summer Championship 2024"
                      className="mt-2 bg-input border-input text-foreground focus:border-[#1E90FF] focus:ring-[#1E90FF] h-12 text-base"
                    />
                    <AnimatePresence>
                      {errors.name && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-destructive mt-2 flex items-center gap-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {errors.name}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <Label htmlFor="maxTeamPoints" className="text-foreground flex items-center gap-2 mb-2">
                      <Trophy className="h-4 w-4 text-[#1E90FF]" />
                      Max Team Points *
                    </Label>
                    <Input
                      id="maxTeamPoints"
                      type="number"
                      min="1"
                      value={formData.maxTeamPoints}
                      onChange={(e) => {
                        setFormData({ ...formData, maxTeamPoints: e.target.value });
                        setErrors({ ...errors, maxTeamPoints: "" });
                      }}
                      placeholder="e.g., 1500"
                      className="mt-2 bg-input border-input text-foreground focus:border-[#1E90FF] focus:ring-[#1E90FF] h-12 text-base"
                    />
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Maximum combined points for both players
                    </p>
                    <AnimatePresence>
                      {errors.maxTeamPoints && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-destructive mt-2 flex items-center gap-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {errors.maxTeamPoints}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Tournament Date with Multi-Day Toggle */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <Label htmlFor="startDate" className="text-foreground flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-[#1E90FF]" />
                      Tournament Date *
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => {
                        setFormData({ ...formData, startDate: e.target.value });
                        setErrors({ ...errors, startDate: "" });
                      }}
                      className="mt-2 bg-input border-input text-foreground focus:border-[#1E90FF] focus:ring-[#1E90FF] h-12 text-base"
                    />
                    <AnimatePresence>
                      {errors.startDate && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-destructive mt-2 flex items-center gap-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {errors.startDate}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col">
                    <Label className="text-foreground flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-[#1E90FF]" />
                      <span className="text-sm text-muted-foreground">Multi-day</span>
                    </Label>
                    <div className="flex items-center gap-3 mt-2">
                      <div
                        onClick={() => {
                          setFormData({ 
                            ...formData, 
                            isMultiDay: !formData.isMultiDay,
                            endDate: !formData.isMultiDay ? formData.endDate : "",
                          });
                          setErrors({ ...errors, endDate: "" });
                        }}
                        className={`relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 flex-shrink-0 ${
                          formData.isMultiDay
                            ? "bg-[#1E90FF]/10 border-[#1E90FF] shadow-md shadow-[#1E90FF]/20"
                            : "bg-muted/30 border-border hover:border-[#1E90FF]/50 hover:bg-muted/50"
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <div
                            className={`w-10 h-5 rounded-full transition-all duration-300 ${
                              formData.isMultiDay ? "bg-[#1E90FF]" : "bg-muted"
                            }`}
                          >
                            <motion.div
                              className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md"
                              animate={{
                                x: formData.isMultiDay ? 20 : 0,
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                            />
                          </div>
                        </div>
                        {formData.isMultiDay && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-[#1E90FF]"
                          >
                            <Check className="h-4 w-4" />
                          </motion.div>
                        )}
                      </div>

                      <AnimatePresence>
                        {formData.isMultiDay && (
                          <motion.div
                            initial={{ opacity: 0, x: -10, width: 0 }}
                            animate={{ opacity: 1, x: 0, width: "auto" }}
                            exit={{ opacity: 0, x: -10, width: 0 }}
                            transition={{ duration: 0.3 }}
                            className="flex-1 min-w-0"
                          >
                            <Input
                              id="endDate"
                              type="date"
                              value={formData.endDate}
                              onChange={(e) => {
                                setFormData({ ...formData, endDate: e.target.value });
                                setErrors({ ...errors, endDate: "" });
                              }}
                              min={formData.startDate}
                              className="bg-input border-input text-foreground focus:border-[#1E90FF] focus:ring-[#1E90FF] h-12 text-base"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <AnimatePresence>
                      {errors.endDate && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-destructive mt-2 flex items-center gap-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {errors.endDate}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Time Range */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <Label htmlFor="startTime" className="text-foreground flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-[#1E90FF]" />
                      Start Time *
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => {
                        setFormData({ ...formData, startTime: e.target.value });
                        setErrors({ ...errors, startTime: "" });
                      }}
                      className="mt-2 bg-input border-input text-foreground focus:border-[#1E90FF] focus:ring-[#1E90FF] h-12 text-base"
                    />
                    <AnimatePresence>
                      {errors.startTime && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-destructive mt-2 flex items-center gap-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {errors.startTime}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <Label htmlFor="endTime" className="text-foreground flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-[#1E90FF]" />
                      End Time <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => {
                        setFormData({ ...formData, endTime: e.target.value });
                        setErrors({ ...errors, endTime: "" });
                      }}
                      className="mt-2 bg-input border-input text-foreground focus:border-[#1E90FF] focus:ring-[#1E90FF] h-12 text-base"
                    />
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Leave empty to use end of booking day (06:00) as end time
                    </p>
                    <AnimatePresence>
                      {errors.endTime && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-destructive mt-2 flex items-center gap-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {errors.endTime}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Tournament System */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 }}
                >
                  <Label htmlFor="tournamentSystem" className="text-foreground flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-[#1E90FF]" />
                    Tournament System *
                  </Label>
                  <Select
                    value={formData.tournamentSystem}
                    onValueChange={(value) => {
                      setFormData({ ...formData, tournamentSystem: value });
                      setErrors({ ...errors, tournamentSystem: "" });
                    }}
                  >
                    <SelectTrigger className="mt-2 bg-input border-input text-foreground focus:border-[#1E90FF] focus:ring-[#1E90FF] h-12 text-base">
                      <SelectValue placeholder="Select tournament system" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="knockout" className="focus:bg-[#1E90FF]/10 focus:text-foreground">
                        Knockouts
                      </SelectItem>
                      <SelectItem value="league" className="focus:bg-[#1E90FF]/10 focus:text-foreground">
                        League
                      </SelectItem>
                      <SelectItem value="groups" className="focus:bg-[#1E90FF]/10 focus:text-foreground">
                        Group Stage
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Choose the tournament format: Knockouts (single elimination), League (round-robin), or Group Stage
                  </p>
                  <AnimatePresence>
                    {errors.tournamentSystem && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm text-destructive mt-2 flex items-center gap-1"
                      >
                        <AlertCircle className="h-4 w-4" />
                        {errors.tournamentSystem}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Location Selection */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="space-y-4"
                >
                  <Label className="text-foreground flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-[#1E90FF]" />
                    Location *
                  </Label>

                  {/* Custom Location Toggle */}
                  <div
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        useCustomLocation: !formData.useCustomLocation,
                        locationId: !formData.useCustomLocation ? "" : formData.locationId,
                        customLocation: formData.useCustomLocation ? "" : formData.customLocation,
                        customLocationCourts: formData.useCustomLocation ? "" : formData.customLocationCourts,
                        selectedCourts: !formData.useCustomLocation ? [] : formData.selectedCourts,
                      });
                      setErrors({ ...errors, locationId: "", customLocation: "", customLocationCourts: "", selectedCourts: "" });
                    }}
                    className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                      formData.useCustomLocation
                        ? "bg-[#1E90FF]/10 border-[#1E90FF] shadow-lg shadow-[#1E90FF]/20"
                        : "bg-muted/30 border-border hover:border-[#1E90FF]/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-10 h-5 rounded-full transition-all duration-300 ${
                          formData.useCustomLocation ? "bg-[#1E90FF]" : "bg-muted"
                        }`}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md"
                          animate={{
                            x: formData.useCustomLocation ? 20 : 0,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className={`font-medium text-sm ${formData.useCustomLocation ? "text-[#1E90FF]" : "text-foreground"}`}>
                        Use custom location (not in website)
                      </span>
                    </div>
                    {formData.useCustomLocation && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-[#1E90FF]"
                      >
                        <Check className="h-4 w-4" />
                      </motion.div>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {formData.useCustomLocation ? (
                      <motion.div
                        key="custom"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <div>
                          <Label htmlFor="customLocation" className="text-foreground flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-[#1E90FF]" />
                            Location Name *
                          </Label>
                          <Input
                            id="customLocation"
                            value={formData.customLocation}
                            onChange={(e) => {
                              setFormData({ ...formData, customLocation: e.target.value });
                              setErrors({ ...errors, customLocation: "" });
                            }}
                            placeholder="e.g., Outdoor Court at Central Park"
                            className="bg-input border-input text-foreground focus:border-[#1E90FF] focus:ring-[#1E90FF] h-12 text-base"
                          />
                          <AnimatePresence>
                            {errors.customLocation && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-sm text-destructive mt-2 flex items-center gap-1"
                              >
                                <AlertCircle className="h-4 w-4" />
                                {errors.customLocation}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>

                        <div>
                          <Label htmlFor="customLocationCourts" className="text-foreground flex items-center gap-2 mb-2">
                            <Trophy className="h-4 w-4 text-[#1E90FF]" />
                            Number of Courts *
                          </Label>
                          <Input
                            id="customLocationCourts"
                            type="number"
                            min="1"
                            value={formData.customLocationCourts}
                            onChange={(e) => {
                              setFormData({ ...formData, customLocationCourts: e.target.value });
                              setErrors({ ...errors, customLocationCourts: "" });
                            }}
                            placeholder="e.g., 4"
                            className="bg-input border-input text-foreground focus:border-[#1E90FF] focus:ring-[#1E90FF] h-12 text-base"
                          />
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            How many courts are available at this location
                          </p>
                          <AnimatePresence>
                            {errors.customLocationCourts && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-sm text-destructive mt-2 flex items-center gap-1"
                              >
                                <AlertCircle className="h-4 w-4" />
                                {errors.customLocationCourts}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="website"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        {loadingLocations ? (
                          <div className="p-4 bg-muted rounded-lg border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <Clock className="h-4 w-4" />
                              </motion.div>
                              Loading locations...
                            </div>
                          </div>
                        ) : (
                          <Select
                            value={formData.locationId}
                            onValueChange={handleLocationChange}
                          >
                            <SelectTrigger className="bg-input border-input text-foreground focus:border-[#1E90FF] focus:ring-[#1E90FF] h-12 text-base">
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border max-h-[300px]">
                              {locations.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">
                                  No locations available
                                </div>
                              ) : (
                                locations.map((location) => (
                                  <SelectItem
                                    key={location.id}
                                    value={location.id}
                                    className="focus:bg-[#1E90FF]/10 focus:text-foreground py-3"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{location.name}</span>
                                      <span className="text-xs text-muted-foreground mt-0.5">
                                        {location.address}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        <AnimatePresence>
                          {errors.locationId && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="text-sm text-destructive mt-2 flex items-center gap-1"
                            >
                              <AlertCircle className="h-4 w-4" />
                              {errors.locationId}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Court Selection - Only show when using website location */}
                <AnimatePresence>
                  {!formData.useCustomLocation && selectedLocation && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, delay: 0.5 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <Label className="text-foreground flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-[#1E90FF]" />
                          Select Courts *
                        </Label>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`
                            px-3 py-1 rounded-full text-sm font-medium transition-all
                            ${
                              formData.selectedCourts.length > 0
                                ? "bg-[#1E90FF]/20 text-[#1E90FF] border border-[#1E90FF]/30"
                                : "bg-muted text-muted-foreground border border-border"
                            }
                          `}
                        >
                          {formData.selectedCourts.length} selected
                        </motion.div>
                      </div>
                      
                      {availableCourts.length === 0 ? (
                        <div className="p-6 bg-muted/50 rounded-lg border border-border text-center">
                          <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            No courts available for this location
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {availableCourts.map((court, index) => {
                            const isSelected = formData.selectedCourts.includes(court.id);
                            return (
                              <motion.button
                                key={court.id}
                                type="button"
                                onClick={() => handleCourtToggle(court.id)}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                className={`
                                  relative p-4 rounded-xl border-2 transition-all duration-200
                                  ${
                                    isSelected
                                      ? "border-[#1E90FF] bg-[#1E90FF]/10 text-foreground shadow-lg shadow-[#1E90FF]/20"
                                      : "border-border bg-card hover:border-[#1E90FF]/50 hover:bg-[#1E90FF]/5 text-foreground"
                                  }
                                `}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-left flex-1">
                                    <div className="font-semibold text-base">{court.name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {court.type}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0, rotate: -180 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      className="ml-2"
                                    >
                                      <div className="bg-[#1E90FF] rounded-full p-1">
                                        <Check className="h-4 w-4 text-white" />
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                                {isSelected && (
                                  <motion.div
                                    className="absolute inset-0 border-2 border-[#1E90FF] rounded-xl"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.3 }}
                                    transition={{ duration: 0.2 }}
                                  />
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                      
                      <AnimatePresence>
                        {errors.selectedCourts && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-sm text-destructive flex items-center gap-1"
                          >
                            <AlertCircle className="h-4 w-4" />
                            {errors.selectedCourts}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Description */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  <Label htmlFor="description" className="text-foreground flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-[#1E90FF]" />
                    Description (Optional)
                  </Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Add a description for your tournament..."
                    rows={4}
                    maxLength={500}
                    className="mt-2 w-full px-4 py-3 bg-input border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent resize-none transition-all"
                  />
                  <p className={`text-xs mt-1 ${
                    formData.description.length > 450 
                      ? "text-destructive" 
                      : "text-muted-foreground"
                  }`}>
                    {formData.description.length}/500 characters
                  </p>
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.7 }}
                  className="flex gap-4 pt-6 border-t border-border"
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1 border-border hover:border-[#1E90FF] hover:bg-[#1E90FF]/10 h-12 text-base"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#1E90FF] hover:bg-[#3FA9F5] h-12 text-base shadow-lg shadow-[#1E90FF]/25 hover:shadow-[#1E90FF]/40 transition-all"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Clock className="h-4 w-4" />
                        </motion.div>
                        Creating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Create Tournament
                      </span>
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
          </form>
        </div>
      </div>
    </>
  );
}
