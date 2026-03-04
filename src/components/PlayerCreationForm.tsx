"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PlayerCreationFormProps {
  onSuccess?: () => void;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
}

export function PlayerCreationForm({ onSuccess }: PlayerCreationFormProps) {
  const [userId, setUserId] = useState<string>("");
  const [name, setName] = useState("");
  const [points, setPoints] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("Port Said");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserResults, setShowUserResults] = useState(false);
  const [selectedUserDisplay, setSelectedUserDisplay] = useState<string>("");
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowUserResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Match confirmation dialog state
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [matchedPlayer, setMatchedPlayer] = useState<{
    name: string;
    points: number;
    similarity: number;
  } | null>(null);
  const [pendingData, setPendingData] = useState<any>(null);

  // Debounced search for users
  useEffect(() => {
    // Don't fetch on initial mount - wait for user to type
    if (searchTerm.trim().length === 0) {
      setAvailableUsers([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchUsers(searchTerm.trim());
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchUsers = async (search: string = "") => {
    setLoadingUsers(true);
    try {
      const url = search
        ? `/api/users/without-players?search=${encodeURIComponent(search)}&limit=20`
        : "/api/users/without-players?limit=20";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.available || []);
        // CRITICAL FIX: Removed usersWithPlayers - no longer needed
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Auto-fill name when user is selected
  const handleUserSelect = (selectedUser: User) => {
    setUserId(selectedUser.id);
    const phoneDisplay = selectedUser.phone ? ` • ${selectedUser.phone}` : "";
    setSelectedUserDisplay(
      `${selectedUser.name || selectedUser.email} (${selectedUser.email}${phoneDisplay})`
    );
    setSearchTerm("");
    setShowUserResults(false);
    if (selectedUser.name) {
      setName(selectedUser.name);
    }
  };

  const handleClearUser = () => {
    setUserId("");
    setSelectedUserDisplay("");
    setSearchTerm("");
    setShowUserResults(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // CRITICAL FIX #5: Make userId required (no standalone players)
    if (!userId) {
      setError("Please select a user. Players must be linked to a user account.");
      return;
    }

    if (!name || !location) {
      setError("Name and location are required");
      return;
    }

    setLoading(true);

    try {
      // First, check for match
      const checkRes = await fetch("/api/players/check-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const checkData = await checkRes.json();

      if (checkData.hasMatch) {
        // Show confirmation dialog
        setMatchedPlayer({
          name: checkData.match.name,
          points: checkData.match.points,
          similarity: checkData.similarity,
        });
        setPendingData({
          name,
          points: points || "0",
          category,
          location,
          userId: userId || undefined,
        });
        setShowMatchDialog(true);
        setLoading(false);
        return;
      }

      // No match, create player normally
      await createPlayer({
        name,
        points: points || "0",
        category,
        location,
        useMatchedPoints: false,
        userId: userId || undefined,
      });
    } catch (err) {
      setError("Failed to create player");
      setLoading(false);
    }
  };

  const createPlayer = async (data: any) => {
    try {
      // userId is already in data if passed, otherwise use state
      const payload = {
        ...data,
        userId: data.userId || userId || undefined,
      };
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to create player");
        return;
      }

      setSuccess("Player created and linked to user successfully!");
      setName("");
      setPoints("");
      setCategory("");
      setLocation("Port Said");
      setUserId("");
      setSelectedUserDisplay("");
      setSearchTerm("");
      setShowUserResults(false);

      if (onSuccess) {
        onSuccess();
      }

      // Reset after 2 seconds
      setTimeout(() => {
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError("Failed to create player");
    } finally {
      setLoading(false);
      setShowMatchDialog(false);
      setMatchedPlayer(null);
    }
  };

  const handleConfirmMatch = async () => {
    setLoading(true);
    await createPlayer({
      ...pendingData,
      useMatchedPoints: true,
      userId: userId || undefined,
    });
  };

  const handleSkipMatch = async () => {
    setLoading(true);
    await createPlayer({
      ...pendingData,
      useMatchedPoints: false,
      userId: userId || undefined,
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-400">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-[rgba(212,168,23,0.1)] border-[rgba(212,168,23,0.3)]">
            <AlertDescription className="text-[#D4A817]">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <div className="relative">
          <label className="block text-sm font-medium mb-1 text-white/90">
            Select User * <span className="text-red-400">Required</span>
          </label>
          {userId ? (
            <div className="flex items-center gap-2 p-2 border border-[rgba(212,168,23,0.2)] rounded-md bg-[rgba(212,168,23,0.06)]">
              <span className="flex-1 text-sm text-white/90">
                {selectedUserDisplay || "User selected"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearUser}
                className="h-6 px-2 text-xs text-[#D4A817] hover:text-[#E6C420] hover:bg-[rgba(212,168,23,0.1)]"
              >
                Clear
              </Button>
            </div>
          ) : (
            <div className="relative" ref={searchRef}>
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowUserResults(true);
                }}
                onFocus={() => {
                  if (searchTerm || availableUsers.length > 0) {
                    setShowUserResults(true);
                  }
                }}
                placeholder="Search user by name or email..."
                className="w-full"
              />
              {showUserResults && (
                <div className="absolute z-50 w-full mt-1 bg-[#1A1612] border border-[rgba(212,168,23,0.2)] rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="p-3 text-sm text-white/60 text-center">
                      Searching...
                    </div>
                  ) : availableUsers.length > 0 ? (
                    <>
                      <div className="px-3 py-2 text-xs font-semibold text-white/60 bg-[rgba(212,168,23,0.08)] border-b border-[rgba(212,168,23,0.12)]">
                        Available Users ({availableUsers.length})
                        {searchTerm && " - Type to search"}
                      </div>
                      {availableUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleUserSelect(user)}
                          className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-[rgba(212,168,23,0.1)] focus:bg-[rgba(212,168,23,0.1)] focus:outline-none border-b border-[rgba(212,168,23,0.06)] last:border-b-0"
                        >
                          <div className="font-medium text-white">
                            {user.name || user.email}
                          </div>
                          <div className="text-xs text-white/60">
                            {user.email}
                            {user.phone && ` • ${user.phone}`}
                          </div>
                        </button>
                      ))}
                      {searchTerm && (
                        <div className="px-3 py-2 text-xs text-white/55 border-t border-[rgba(212,168,23,0.12)] bg-[rgba(212,168,23,0.05)]">
                          Showing top 20 results. Refine search for more.
                        </div>
                      )}
                    </>
                  ) : searchTerm ? (
                    <div className="p-3 text-sm text-white/60 text-center">
                      No users found matching "{searchTerm}"
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
          <p className="text-xs text-white/55 mt-1">
            {userId
              ? "Player will be linked to selected user ✅"
              : searchTerm
              ? "Search for a user to convert to player"
              : "Type to search for users. User selection is required."}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-white/90">
            Player Name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={userId ? "Auto-filled from user" : "Enter player name"}
            required
            disabled={!!userId}
          />
          {userId && (
            <p className="text-xs text-white/55 mt-1">
              Name is auto-filled from selected user
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-white/90">Points</label>
          <Input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="0"
          />
          <p className="text-xs text-white/55 mt-1">
            Leave empty if matching from point system
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-white/90">Category</label>
          <Select
            value={category || "none"}
            onValueChange={(value) => setCategory(value === "none" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="Beginners">Beginners</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
              <SelectItem value="C">C</SelectItem>
              <SelectItem value="D">D</SelectItem>
              <SelectItem value="LOW D">LOW D</SelectItem>
              <SelectItem value="Juniors">Juniors</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-white/90">Location *</label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
        >
          {loading ? "Creating..." : "Create Player"}
        </Button>
      </form>

      {/* Match Confirmation Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent className="bg-[#1A1612] border-[rgba(212,168,23,0.2)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Is this you?</DialogTitle>
            <DialogDescription className="text-white/70">
              We found a similar name in the Port Said point system.
            </DialogDescription>
          </DialogHeader>

          {matchedPlayer && (
            <div className="space-y-4">
              <Alert className="bg-[rgba(212,168,23,0.1)] border-[rgba(212,168,23,0.3)]">
                <AlertDescription>
                  <div className="space-y-2 text-white/90">
                    <p className="font-medium">
                      Found: <strong className="text-[#D4A817]">{matchedPlayer.name}</strong>
                    </p>
                    <p className="text-sm">
                      Points: <strong className="text-[#D4A817]">{matchedPlayer.points}</strong>
                    </p>
                    <p className="text-xs text-white/60">
                      Similarity: {matchedPlayer.similarity}% match
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  onClick={handleConfirmMatch}
                  disabled={loading}
                  className="flex-1 bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
                >
                  Yes, use {matchedPlayer.points} points
                </Button>
                <Button
                  onClick={handleSkipMatch}
                  disabled={loading}
                  variant="outline"
                  className="flex-1 border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                >
                  No, skip
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
