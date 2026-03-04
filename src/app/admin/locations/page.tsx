"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  MapPin,
  Upload,
  X,
  Image as ImageIcon,
  Edit,
  Save,
  User,
  Phone,
  Globe,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Location {
  id: string;
  name: string;
  address: string;
  image: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  googleMapsUrl?: string | null;
  ownerId: string | null;
  owner?: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  } | null;
  courts: Array<{
    id: string;
    name: string;
    type: string;
    pricePerHour: number;
  }>;
}

interface ClubOwner {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  isApproved: boolean;
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [clubOwners, setClubOwners] = useState<ClubOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(
    null
  );
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    image: "",
    ownerId: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    googleMapsUrl: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    address: "",
    image: "",
    ownerId: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    googleMapsUrl: "",
  });
  const [editingLocationDetails, setEditingLocationDetails] = useState<
    string | null
  >(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [updatingImage, setUpdatingImage] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    const role = (session?.user as any)?.role;
    const adminType = (session?.user as any)?.adminType;
    const canAccessAdmin =
      (role === "admin" || role === "club_owner") &&
      (session?.user as any)?.isApproved !== false;
    if (status === "authenticated" && !canAccessAdmin) {
      router.push("/");
      return;
    }

    if (status === "authenticated") {
      fetchLocations();
      // Fetch club owners if super admin
      if (role === "admin" && adminType === "super_admin") {
        fetchClubOwners();
      }
    }
  }, [status, router, session]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("Failed to load locations");
      const data = await res.json();
      setLocations(data);
    } catch (e: any) {
      console.error("Error fetching locations:", e);
      toast.error(e?.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  const fetchClubOwners = async () => {
    try {
      const res = await fetch("/api/admin/club-owners");
      if (res.ok) {
        const data = await res.json();
        setClubOwners(data);
      }
    } catch (e: any) {
      console.error("Error fetching club owners:", e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File size too large. Maximum size is 5MB.");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File size too large. Maximum size is 5MB.");
      return;
    }

    setEditSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleEditFileUpload = async () => {
    if (!editSelectedFile) return;

    setUpdatingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", editSelectedFile);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload image");
      }

      const data = await res.json();
      if (data.url) {
        setEditFormData({ ...editFormData, image: data.url });
        toast.success("Image uploaded successfully!");
        setEditSelectedFile(null);
        setEditImagePreview(null);
      } else {
        throw new Error("No URL returned from upload");
      }
    } catch (e: any) {
      console.error("Error uploading file:", e);
      toast.error(e?.message || "Failed to upload image");
    } finally {
      setUpdatingImage(false);
    }
  };

  const handleEditImage = (location: Location) => {
    setEditingLocationId(location.id);
    setEditFormData({
      name: location.name,
      address: location.address,
      image: location.image || "",
      ownerId: location.ownerId || "",
      instagram: location.instagram || "",
      facebook: location.facebook || "",
      tiktok: location.tiktok || "",
      googleMapsUrl: location.googleMapsUrl || "",
    });
    setEditSelectedFile(null);
    setEditImagePreview(null);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocationDetails(location.id);
    setEditFormData({
      name: location.name,
      address: location.address,
      image: location.image || "",
      ownerId: location.ownerId || "",
      instagram: location.instagram || "",
      facebook: location.facebook || "",
      tiktok: location.tiktok || "",
      googleMapsUrl: location.googleMapsUrl || "",
    });
  };

  const handleUpdateLocation = async (locationId: string) => {
    if (!editFormData.name || !editFormData.address) {
      toast.error("Name and address are required");
      return;
    }

    setUpdatingImage(true);
    try {
      const requestBody = {
        name: editFormData.name,
        address: editFormData.address,
        image: editFormData.image || null,
        ownerId: editFormData.ownerId || null,
        instagram: editFormData.instagram || null,
        facebook: editFormData.facebook || null,
        tiktok: editFormData.tiktok || null,
        googleMapsUrl: editFormData.googleMapsUrl || null,
      };
      console.log("Updating location with data:", requestBody);
      const res = await fetch(`/api/locations/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Update location error:", error);
        // Show detailed error message if available
        const errorMessage =
          error.details || error.error || "Failed to update location";
        throw new Error(errorMessage);
      }

      toast.success("Location updated successfully!");
      setEditingLocationDetails(null);
      setEditFormData({
        name: "",
        address: "",
        image: "",
        ownerId: "",
        instagram: "",
        facebook: "",
        tiktok: "",
        googleMapsUrl: "",
      });
      fetchLocations();
    } catch (e: any) {
      console.error("Error updating location:", e);
      toast.error(e?.message || "Failed to update location");
    } finally {
      setUpdatingImage(false);
    }
  };

  const handleUpdateOwner = async (locationId: string) => {
    setUpdatingImage(true);
    try {
      const res = await fetch(`/api/locations/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: editFormData.ownerId || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update owner");
      }

      toast.success("Location owner updated successfully!");
      setEditingOwnerId(null);
      setEditFormData({
        name: "",
        address: "",
        image: "",
        ownerId: "",
        instagram: "",
        facebook: "",
        tiktok: "",
        googleMapsUrl: "",
      });
      fetchLocations();
    } catch (e: any) {
      console.error("Error updating owner:", e);
      toast.error(e?.message || "Failed to update owner");
    } finally {
      setUpdatingImage(false);
    }
  };

  const handleUpdateImage = async (locationId: string) => {
    if (!editFormData.image) {
      toast.error("Please upload an image or provide an image URL");
      return;
    }

    setUpdatingImage(true);
    try {
      const res = await fetch(`/api/locations/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: editFormData.image,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update image");
      }

      toast.success("Location image updated successfully!");
      setEditingLocationId(null);
      setEditFormData({
        name: "",
        address: "",
        image: "",
        ownerId: "",
        instagram: "",
        facebook: "",
        tiktok: "",
        googleMapsUrl: "",
      });
      setEditSelectedFile(null);
      setEditImagePreview(null);
      fetchLocations();
    } catch (e: any) {
      console.error("Error updating image:", e);
      toast.error(e?.message || "Failed to update image");
    } finally {
      setUpdatingImage(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload image");
      }

      const data = await res.json();
      console.log("Upload response:", data); // Debug log
      if (data.url) {
        setFormData({ ...formData, image: data.url });
        toast.success(`Image uploaded successfully! URL: ${data.url}`);
        setSelectedFile(null);
        setImagePreview(null);
        // Show the uploaded image in the URL preview
        setTimeout(() => {
          const imgElement = document.querySelector(
            "#image-url"
          ) as HTMLInputElement;
          if (imgElement) {
            imgElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }, 100);
      } else {
        throw new Error("No URL returned from upload");
      }
    } catch (e: any) {
      console.error("Error uploading file:", e);
      toast.error(e?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      toast.error("Name and address are required");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = formData.image;

      // If a file is selected but not uploaded yet, upload it first
      if (selectedFile && !imageUrl) {
        setUploading(true);
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", selectedFile);

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: uploadFormData,
          });

          if (!uploadRes.ok) {
            const error = await uploadRes.json();
            throw new Error(error.error || "Failed to upload image");
          }

          const uploadData = await uploadRes.json();
          if (uploadData.url) {
            imageUrl = uploadData.url;
          } else {
            throw new Error("No URL returned from upload");
          }
        } catch (uploadError: any) {
          console.error("Error uploading file:", uploadError);
          toast.error(uploadError?.message || "Failed to upload image");
          setSubmitting(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      const payload = {
        name: formData.name,
        address: formData.address,
        image: imageUrl || null,
        ownerId: formData.ownerId || null,
        instagram: formData.instagram || null,
        facebook: formData.facebook || null,
        tiktok: formData.tiktok || null,
        googleMapsUrl: formData.googleMapsUrl || null,
      };
      console.log("Submitting location with:", payload); // Debug log

      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create location");
      }

      const newLocation = await res.json();
      console.log("Location created:", newLocation); // Debug log
      toast.success("Location created successfully!");
      setFormData({
        name: "",
        address: "",
        image: "",
        ownerId: "",
        instagram: "",
        facebook: "",
        tiktok: "",
        googleMapsUrl: "",
      });
      setSelectedFile(null);
      setImagePreview(null);
      setShowAddForm(false);
      fetchLocations();
    } catch (e: any) {
      console.error("Error creating location:", e);
      toast.error(e?.message || "Failed to create location");
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
            <p className="mt-4 text-white/70">Loading locations...</p>
          </div>
        </div>
      </>
    );
  }

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Locations Management
                </h1>
                <p className="mt-2 text-white/70">
                  Manage locations and their courts
                </p>
              </div>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
              >
                <Plus className="mr-2 h-4 w-4" />
                {showAddForm ? "Cancel" : "Add Location"}
              </Button>
            </div>
          </div>

          {/* Add Location Form */}
          {showAddForm && (
            <Card className="mb-6 bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
              <CardHeader>
                <CardTitle className="text-white">Add New Location</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-white/80">Location Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Padel Club Cairo"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address" className="text-white/80">Address *</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Full address of the location"
                      required
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="image" className="text-white/80">Location Image</Label>
                    <p className="text-xs text-white/55 mb-3">
                      Upload an image file (JPEG, PNG, WebP - Max 5MB) or paste
                      an image URL
                    </p>

                    {/* File Upload Section */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="file-upload"
                          className="flex-1 cursor-pointer"
                        >
                          <div className="border-2 border-dashed border-[rgba(212,168,23,0.25)] rounded-lg p-4 hover:border-[#D4A817] transition-colors text-center">
                            <Upload className="h-6 w-6 mx-auto mb-2 text-[#D4A817]/80" />
                            <p className="text-sm text-white/80">
                              {selectedFile
                                ? selectedFile.name
                                : "Click to select an image file"}
                            </p>
                            <p className="text-xs text-white/55 mt-1">
                              JPEG, PNG, or WebP (Max 5MB)
                            </p>
                          </div>
                          <input
                            id="file-upload"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </label>
                        {selectedFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleFileUpload}
                            disabled={uploading}
                            className="whitespace-nowrap"
                          >
                            {uploading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                              </>
                            )}
                          </Button>
                        )}
                        {selectedFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedFile(null);
                              setImagePreview(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Image Preview */}
                      {imagePreview && (
                        <div className="rounded-lg overflow-hidden border-2 border-[rgba(212,168,23,0.2)] bg-white/5">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Or URL Input */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[rgba(212,168,23,0.2)]"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#1A1612] px-2 text-white/55">Or</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Input
                        id="image-url"
                        type="text"
                        value={formData.image}
                        onChange={(e) =>
                          setFormData({ ...formData, image: e.target.value })
                        }
                        placeholder="https://example.com/image.jpg or /uploads/locations/filename.jpg"
                        className="mb-2"
                      />
                      {formData.image && (
                        <div className="mt-2 rounded-lg overflow-hidden border-2 border-[rgba(212,168,23,0.2)] bg-white/5">
                          <img
                            src={formData.image}
                            alt="Location preview"
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML =
                                  '<div class="w-full h-48 flex items-center justify-center text-red-500 text-sm">Failed to load image. Please check the URL.</div>';
                              }
                            }}
                            onLoad={() => {
                              console.log(
                                "Image preview loaded successfully:",
                                formData.image
                              );
                            }}
                          />
                        </div>
                      )}
                      {formData.image && (
                        <p className="text-xs text-white/55 mt-1">
                          Current image URL:{" "}
                          <code className="bg-white/10 px-1 rounded text-[#D4A817]">
                            {formData.image}
                          </code>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Social Media Links */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="instagram" className="text-white/80">
                        Instagram URL (Optional)
                      </Label>
                      <Input
                        id="instagram"
                        type="url"
                        value={formData.instagram}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            instagram: e.target.value,
                          })
                        }
                        placeholder="https://instagram.com/..."
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="facebook" className="text-white/80">Facebook URL (Optional)</Label>
                      <Input
                        id="facebook"
                        type="url"
                        value={formData.facebook}
                        onChange={(e) =>
                          setFormData({ ...formData, facebook: e.target.value })
                        }
                        placeholder="https://facebook.com/..."
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tiktok" className="text-white/80">TikTok URL (Optional)</Label>
                      <Input
                        id="tiktok"
                        type="url"
                        value={formData.tiktok}
                        onChange={(e) =>
                          setFormData({ ...formData, tiktok: e.target.value })
                        }
                        placeholder="https://tiktok.com/@..."
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="googleMapsUrl" className="text-white/80">
                        Google Maps URL (Optional)
                      </Label>
                      <Input
                        id="googleMapsUrl"
                        type="url"
                        value={formData.googleMapsUrl}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            googleMapsUrl: e.target.value,
                          })
                        }
                        placeholder="https://maps.google.com/..."
                        className="mt-2"
                      />
                      <p className="text-xs text-white/55 mt-1">
                        Paste the Google Maps URL for this location
                      </p>
                    </div>
                  </div>

                  {/* Club Owner Assignment - Only for Super Admin */}
                  {(session?.user as any)?.role === "admin" &&
                    (session?.user as any)?.adminType === "super_admin" && (
                      <div>
                        <Label htmlFor="ownerId" className="text-white/80">
                          Assign Club Owner (Optional)
                        </Label>
                        <Select
                          value={formData.ownerId || "none"}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              ownerId: value === "none" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select a club owner (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              No owner (Unassigned)
                            </SelectItem>
                            {clubOwners.map((owner) => (
                              <SelectItem key={owner.id} value={owner.id}>
                                {owner.name || owner.email}
                                {owner.name && ` (${owner.email})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-white/55 mt-1">
                          Assign this location to a club owner to give them full
                          control
                        </p>
                      </div>
                    )}

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                    >
                      {submitting ? "Creating..." : "Create Location"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                      onClick={() => {
                        setShowAddForm(false);
                        setFormData({
                          name: "",
                          address: "",
                          image: "",
                          ownerId: "",
                          instagram: "",
                          facebook: "",
                          tiktok: "",
                          googleMapsUrl: "",
                        });
                        setSelectedFile(null);
                        setImagePreview(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Locations List */}
          {locations.length === 0 ? (
            <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-[#D4A817]/60 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No locations found
                  </h3>
                  <p className="text-white/70">
                    Create your first location to get started.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <Card key={location.id} className="overflow-hidden bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] transition-all">
                  {location.image && (
                    <div className="relative h-48 bg-white/5">
                      <img
                        src={location.image}
                        alt={location.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error(
                            "Image failed to load:",
                            location.image
                          );
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML =
                              '<div class="w-full h-48 flex items-center justify-center text-gray-400 text-sm">Image not found</div>';
                          }
                        }}
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl text-white">
                          {location.name}
                        </CardTitle>
                        <div className="space-y-1">
                          <div className="flex items-start text-sm text-white/70 mt-2">
                            <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0 text-[#D4A817]" />
                            <span>{location.address}</span>
                          </div>
                          {location.owner?.phone && (
                            <div className="flex items-center text-sm text-white/70">
                              <Phone className="h-4 w-4 mr-1 flex-shrink-0 text-[#D4A817]" />
                              <span>{location.owner.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {(session?.user as any)?.role === "admin" &&
                        (session?.user as any)?.adminType === "super_admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingOwnerId(location.id);
                              setEditFormData({
                                name: location.name,
                                address: location.address,
                                image: location.image || "",
                                ownerId: location.ownerId || "",
                                instagram: location.instagram || "",
                                facebook: location.facebook || "",
                                tiktok: location.tiktok || "",
                                googleMapsUrl: location.googleMapsUrl || "",
                              });
                            }}
                            title="Edit Owner"
                            className="ml-2 text-white/80 hover:text-[#D4A817] hover:bg-[rgba(212,168,23,0.1)]"
                          >
                            <User className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                    {location.owner && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-[rgba(212,168,23,0.3)] text-[#D4A817] bg-[rgba(212,168,23,0.08)]">
                          <User className="h-3 w-3 mr-1" />
                          Owner: {location.owner.name || location.owner.email}
                        </Badge>
                      </div>
                    )}
                    {(location.instagram ||
                      location.facebook ||
                      location.tiktok ||
                      location.googleMapsUrl) && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {location.instagram && (
                          <a
                            href={location.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#D4A817] hover:text-[#E6C420] flex items-center gap-1"
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
                            className="text-xs text-[#D4A817] hover:text-[#E6C420] flex items-center gap-1"
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
                            className="text-xs text-[#D4A817] hover:text-[#E6C420] flex items-center gap-1"
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
                            className="text-xs text-[#D4A817] hover:text-[#E6C420] flex items-center gap-1"
                          >
                            <MapPin className="h-3 w-3" />
                            Google Maps
                          </a>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-white/80">
                        Courts: {location.courts.length}
                      </div>
                      {location.courts.length > 0 && (
                        <div className="space-y-1">
                          {location.courts.map((court) => (
                            <div
                              key={court.id}
                              className="text-xs text-white/70 flex justify-between"
                            >
                              <span>
                                {court.name} - {court.type}
                              </span>
                              <span className="text-[#D4A817]">
                                {court.pricePerHour} EGP/hr
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button
                          className="flex-1 bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                          onClick={() =>
                            router.push(
                              `/admin/locations/${location.id}/courts`
                            )
                          }
                        >
                          Manage Courts
                        </Button>
                        {(session?.user as any)?.role === "admin" &&
                          (session?.user as any)?.adminType ===
                            "super_admin" && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="border-[rgba(212,168,23,0.3)] text-white/80 hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                              onClick={() => handleEditLocation(location)}
                              title="Edit Location"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-[rgba(212,168,23,0.3)] text-white/80 hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                          onClick={() => handleEditImage(location)}
                          title="Edit Image"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Image Modal */}
          {editingLocationId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1A1612]/98 border-[rgba(212,168,23,0.2)]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">Update Location Image</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/80 hover:text-[#D4A817] hover:bg-[rgba(212,168,23,0.1)]"
                      onClick={() => {
                        setEditingLocationId(null);
                        setEditFormData({
                          name: "",
                          address: "",
                          image: "",
                          ownerId: "",
                          instagram: "",
                          facebook: "",
                          tiktok: "",
                          googleMapsUrl: "",
                        });
                        setEditSelectedFile(null);
                        setEditImagePreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-white/70 mt-2">
                    {locations.find((l) => l.id === editingLocationId)?.name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Image */}
                  {editFormData.image && (
                    <div>
                      <Label className="text-white/80">Current Image</Label>
                      <div className="mt-2 rounded-lg overflow-hidden border-2 border-[rgba(212,168,23,0.2)] bg-white/5">
                        <img
                          src={editFormData.image}
                          alt="Current location"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML =
                                '<div class="w-full h-48 flex items-center justify-center text-gray-400 text-sm">No image</div>';
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* File Upload Section */}
                  <div>
                    <Label className="text-white/80">Upload New Image</Label>
                    <p className="text-xs text-white/55 mb-3">
                      Upload an image file (JPEG, PNG, WebP - Max 5MB) or paste
                      an image URL
                    </p>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="edit-file-upload"
                          className="flex-1 cursor-pointer"
                        >
                          <div className="border-2 border-dashed border-[rgba(212,168,23,0.25)] rounded-lg p-4 hover:border-[#D4A817] transition-colors text-center">
                            <Upload className="h-6 w-6 mx-auto mb-2 text-[#D4A817]/80" />
                            <p className="text-sm text-white/80">
                              {editSelectedFile
                                ? editSelectedFile.name
                                : "Click to select an image file"}
                            </p>
                            <p className="text-xs text-white/55 mt-1">
                              JPEG, PNG, or WebP (Max 5MB)
                            </p>
                          </div>
                          <input
                            id="edit-file-upload"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleEditFileSelect}
                            className="hidden"
                          />
                        </label>
                        {editSelectedFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleEditFileUpload}
                            disabled={updatingImage}
                            className="whitespace-nowrap"
                          >
                            {updatingImage ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                              </>
                            )}
                          </Button>
                        )}
                        {editSelectedFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditSelectedFile(null);
                              setEditImagePreview(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Image Preview */}
                      {editImagePreview && (
                        <div className="rounded-lg overflow-hidden border-2 border-[rgba(212,168,23,0.2)] bg-white/5">
                          <img
                            src={editImagePreview}
                            alt="Preview"
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Or URL Input */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[rgba(212,168,23,0.2)]"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#1A1612] px-2 text-white/55">Or</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Input
                        id="edit-image-url"
                        type="text"
                        value={editFormData.image}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            image: e.target.value,
                          })
                        }
                        placeholder="https://example.com/image.jpg or /uploads/locations/filename.jpg"
                        className="mb-2"
                      />
                      {editFormData.image && (
                        <div className="mt-2 rounded-lg overflow-hidden border-2 border-[rgba(212,168,23,0.2)] bg-white/5">
                          <img
                            src={editFormData.image}
                            alt="Preview"
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML =
                                  '<div class="w-full h-48 flex items-center justify-center text-red-400 text-sm">Failed to load image. Please check the URL.</div>';
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleUpdateImage(editingLocationId)}
                      disabled={updatingImage || !editFormData.image}
                      className="flex-1 bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                    >
                      {updatingImage ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Image
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                      onClick={() => {
                        setEditingLocationId(null);
                        setEditFormData({
                          name: "",
                          address: "",
                          image: "",
                          ownerId: "",
                          instagram: "",
                          facebook: "",
                          tiktok: "",
                          googleMapsUrl: "",
                        });
                        setEditSelectedFile(null);
                        setEditImagePreview(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Edit Location Modal */}
          {editingLocationDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1A1612]/98 border-[rgba(212,168,23,0.2)]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">Edit Location</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/80 hover:text-[#D4A817] hover:bg-[rgba(212,168,23,0.1)]"
                      onClick={() => {
                        setEditingLocationDetails(null);
                        setEditFormData({
                          name: "",
                          address: "",
                          image: "",
                          ownerId: "",
                          instagram: "",
                          facebook: "",
                          tiktok: "",
                          googleMapsUrl: "",
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-white/70 mt-2">
                    {
                      locations.find((l) => l.id === editingLocationDetails)
                        ?.name
                    }
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name" className="text-white/80">Location Name *</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g., Padel Club Cairo"
                      required
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-address" className="text-white/80">Address *</Label>
                    <Textarea
                      id="edit-address"
                      value={editFormData.address}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          address: e.target.value,
                        })
                      }
                      placeholder="Full address of the location"
                      required
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-instagram" className="text-white/80">
                      Instagram URL (Optional)
                    </Label>
                    <Input
                      id="edit-instagram"
                      type="url"
                      value={editFormData.instagram}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          instagram: e.target.value,
                        })
                      }
                      placeholder="https://instagram.com/..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-facebook" className="text-white/80">
                      Facebook URL (Optional)
                    </Label>
                    <Input
                      id="edit-facebook"
                      type="url"
                      value={editFormData.facebook}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          facebook: e.target.value,
                        })
                      }
                      placeholder="https://facebook.com/..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-tiktok" className="text-white/80">TikTok URL (Optional)</Label>
                    <Input
                      id="edit-tiktok"
                      type="url"
                      value={editFormData.tiktok}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          tiktok: e.target.value,
                        })
                      }
                      placeholder="https://tiktok.com/@..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-googleMapsUrl" className="text-white/80">
                      Google Maps URL (Optional)
                    </Label>
                    <Input
                      id="edit-googleMapsUrl"
                      type="url"
                      value={editFormData.googleMapsUrl}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          googleMapsUrl: e.target.value,
                        })
                      }
                      placeholder="https://maps.google.com/..."
                      className="mt-2"
                    />
                    <p className="text-xs text-white/55 mt-1">
                      Paste the Google Maps URL for this location
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() =>
                        handleUpdateLocation(editingLocationDetails)
                      }
                      disabled={updatingImage}
                      className="flex-1 bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                    >
                      {updatingImage ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Location
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                      onClick={() => {
                        setEditingLocationDetails(null);
                        setEditFormData({
                          name: "",
                          address: "",
                          image: "",
                          ownerId: "",
                          instagram: "",
                          facebook: "",
                          tiktok: "",
                          googleMapsUrl: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Edit Owner Modal */}
          {editingOwnerId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <Card className="w-full max-w-md bg-[#1A1612]/98 border-[rgba(212,168,23,0.2)]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">Assign Club Owner</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/80 hover:text-[#D4A817] hover:bg-[rgba(212,168,23,0.1)]"
                      onClick={() => {
                        setEditingOwnerId(null);
                        setEditFormData({
                          name: "",
                          address: "",
                          image: "",
                          ownerId: "",
                          instagram: "",
                          facebook: "",
                          tiktok: "",
                          googleMapsUrl: "",
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-white/70 mt-2">
                    {locations.find((l) => l.id === editingOwnerId)?.name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white/80">Club Owner</Label>
                    <Select
                      value={editFormData.ownerId || "none"}
                      onValueChange={(value) =>
                        setEditFormData({
                          ...editFormData,
                          ownerId: value === "none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a club owner (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          No owner (Unassigned)
                        </SelectItem>
                        {clubOwners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.name || owner.email}
                            {owner.name && ` (${owner.email})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-white/55 mt-1">
                      Assign this location to a club owner or leave unassigned
                    </p>
                  </div>

                  {/* Current Owner Display */}
                  {locations.find((l) => l.id === editingOwnerId)?.owner && (
                    <div className="p-3 bg-[rgba(212,168,23,0.08)] rounded-lg border border-[rgba(212,168,23,0.12)]">
                      <p className="text-xs text-white/55 mb-1">
                        Current Owner:
                      </p>
                      <p className="text-sm font-medium text-[#D4A817]">
                        {locations.find((l) => l.id === editingOwnerId)?.owner
                          ?.name ||
                          locations.find((l) => l.id === editingOwnerId)?.owner
                            ?.email}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleUpdateOwner(editingOwnerId)}
                      disabled={updatingImage}
                      className="flex-1 bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                    >
                      {updatingImage ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Owner
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                      onClick={() => {
                        setEditingOwnerId(null);
                        setEditFormData({
                          name: "",
                          address: "",
                          image: "",
                          ownerId: "",
                          instagram: "",
                          facebook: "",
                          tiktok: "",
                          googleMapsUrl: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
