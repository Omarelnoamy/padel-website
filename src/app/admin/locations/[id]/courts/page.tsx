"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Edit, Save, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  address: string;
}

interface Court {
  id: string;
  name: string;
  type: string;
  pricePerHour: number;
}

export default function LocationCourtsPage() {
  const params = useParams();
  const locationId = params.id as string;
  const [location, setLocation] = useState<Location | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    pricePerHour: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    type: "",
    pricePerHour: "",
  });
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    const role = (session?.user as any)?.role;
    const canAccess =
      (role === "admin" || role === "club_owner") &&
      (session?.user as any)?.isApproved !== false;
    if (status === "authenticated" && !canAccess) {
      router.push("/");
      return;
    }

    if (status === "authenticated" && locationId) {
      fetchData();
    }
  }, [status, router, session, locationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [locationsRes, courtsRes] = await Promise.all([
        fetch("/api/locations"),
        fetch(`/api/courts?locationId=${locationId}`),
      ]);

      if (locationsRes.ok) {
        const locations = await locationsRes.json();
        const foundLocation = locations.find(
          (loc: Location) => loc.id === locationId
        );
        setLocation(foundLocation || null);
      }

      if (courtsRes.ok) {
        const data = await courtsRes.json();
        setCourts(data);
      }
    } catch (e: any) {
      console.error("Error fetching data:", e);
      toast.error(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourt = (court: Court) => {
    setEditingCourtId(court.id);
    setEditFormData({
      name: court.name,
      type: court.type,
      pricePerHour: court.pricePerHour.toString(),
    });
  };

  const handleUpdateCourt = async (courtId: string) => {
    if (
      !editFormData.name ||
      !editFormData.type ||
      !editFormData.pricePerHour
    ) {
      toast.error("All fields are required");
      return;
    }

    const price = parseFloat(editFormData.pricePerHour);
    if (isNaN(price) || price <= 0) {
      toast.error("Price must be a positive number");
      return;
    }

    setUpdating(true);
    try {
      const requestBody = {
        name: editFormData.name,
        type: editFormData.type,
        pricePerHour: price,
      };
      console.log("Updating court with data:", requestBody);
      const res = await fetch(`/api/courts/${courtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Update court error:", error);
        const errorMessage =
          error.details || error.error || "Failed to update court";
        throw new Error(errorMessage);
      }

      const updatedCourt = await res.json();
      toast.success("Court updated successfully!");
      setEditingCourtId(null);
      setEditFormData({ name: "", type: "", pricePerHour: "" });
      fetchData();
    } catch (e: any) {
      console.error("Error updating court:", e);
      toast.error(e?.message || "Failed to update court");
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.type || !formData.pricePerHour) {
      toast.error("All fields are required");
      return;
    }

    const price = parseFloat(formData.pricePerHour);
    if (isNaN(price) || price <= 0) {
      toast.error("Price must be a positive number");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          name: formData.name,
          type: formData.type,
          pricePerHour: price,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create court");
      }

      const newCourt = await res.json();
      toast.success("Court created successfully!");
      setFormData({ name: "", type: "", pricePerHour: "" });
      setShowAddForm(false);
      fetchData();
    } catch (e: any) {
      console.error("Error creating court:", e);
      toast.error(e?.message || "Failed to create court");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4A817] mx-auto"></div>
            <p className="mt-4 text-white/70">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (!location) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] py-8">
          <div className="max-w-7xl mx-auto px-4">
            <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-white/80">Location not found</p>
                  <Button
                    className="mt-4 border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                    variant="outline"
                    onClick={() => router.push("/admin/locations")}
                  >
                    Back to Locations
                  </Button>
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
      <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Button
              variant="outline"
              className="mb-4 border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
              onClick={() => router.push("/admin/locations")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Locations
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {location.name}
                </h1>
                <p className="mt-2 text-white/70">{location.address}</p>
              </div>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
              >
                <Plus className="mr-2 h-4 w-4" />
                {showAddForm ? "Cancel" : "Add Court"}
              </Button>
            </div>
          </div>

          {/* Add Court Form */}
          {showAddForm && (
            <Card className="mb-6 bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
              <CardHeader>
                <CardTitle className="text-white">Add New Court</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-white/90">Court Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Court 1, Court A"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="type" className="text-white/90">Court Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, type: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select court type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Indoor">Indoor</SelectItem>
                        <SelectItem value="Outdoor">Outdoor</SelectItem>
                        <SelectItem value="Covered">Covered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="pricePerHour" className="text-white/90">Price Per Hour (EGP) *</Label>
                    <Input
                      id="pricePerHour"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.pricePerHour}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricePerHour: e.target.value,
                        })
                      }
                      placeholder="e.g., 200"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                    >
                      {submitting ? "Creating..." : "Create Court"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                      onClick={() => {
                        setShowAddForm(false);
                        setFormData({ name: "", type: "", pricePerHour: "" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Courts List */}
          {courts.length === 0 ? (
            <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-white/80 mb-4">
                    No courts found for this location.
                  </p>
                  <p className="text-sm text-white/60">
                    Add your first court to get started.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {courts.map((court) => (
                <Card key={court.id} className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] transition-all">
                  {editingCourtId === court.id ? (
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`edit-name-${court.id}`} className="text-white/90">
                            Court Name *
                          </Label>
                          <Input
                            id={`edit-name-${court.id}`}
                            value={editFormData.name}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                name: e.target.value,
                              })
                            }
                            placeholder="e.g., Court 1, Court A"
                            required
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-type-${court.id}`} className="text-white/90">
                            Court Type *
                          </Label>
                          <Select
                            value={editFormData.type}
                            onValueChange={(value) =>
                              setEditFormData({ ...editFormData, type: value })
                            }
                            required
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select court type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Indoor">Indoor</SelectItem>
                              <SelectItem value="Outdoor">Outdoor</SelectItem>
                              <SelectItem value="Covered">Covered</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`edit-price-${court.id}`} className="text-white/90">
                            Price Per Hour (EGP) *
                          </Label>
                          <Input
                            id={`edit-price-${court.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={editFormData.pricePerHour}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                pricePerHour: e.target.value,
                              })
                            }
                            placeholder="e.g., 200"
                            required
                            className="mt-2"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleUpdateCourt(court.id)}
                            disabled={updating}
                            className="flex-1 bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                          >
                            {updating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Updating...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Update Court
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            className="border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                            onClick={() => {
                              setEditingCourtId(null);
                              setEditFormData({
                                name: "",
                                type: "",
                                pricePerHour: "",
                              });
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  ) : (
                    <>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg text-white">
                            {court.name}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-white/80 hover:text-[#D4A817] hover:bg-[rgba(212,168,23,0.1)]"
                            onClick={() => handleEditCourt(court)}
                            title="Edit Court"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm text-white/70">
                            <span className="font-medium">Type:</span>{" "}
                            {court.type}
                          </div>
                          <div className="text-sm text-white/70">
                            <span className="font-medium">Price:</span>{" "}
                            <span className="text-[#D4A817] font-semibold">
                              {court.pricePerHour} EGP/hour
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
