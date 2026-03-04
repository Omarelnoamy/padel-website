"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import Navbar from "@/components/Navbar";
import { PlayerCreationForm } from "@/components/PlayerCreationForm";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

type Player = {
  id: string;
  name: string;
  points: number;
  rank: number;
  category: string | null;
  location: string;
};

export default function PlayersAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    points: "",
    category: "",
    location: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchPlayers();
    }
  }, [session, status, router]);

  const fetchPlayers = async () => {
    try {
      const res = await fetch("/api/players");
      if (res.ok) {
        const data = await res.json();
        setPlayers(data || []);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (player: Player) => {
    setEditingPlayer(player);
    setEditFormData({
      name: player.name,
      points: player.points.toString(),
      category: player.category || "",
      location: player.location,
    });
    setEditError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditLoading(true);

    if (!editingPlayer) return;

    try {
      const res = await fetch(`/api/players/${editingPlayer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name,
          points: parseInt(editFormData.points) || 0,
          category: editFormData.category || null,
          location: editFormData.location,
        }),
      });

      if (res.ok) {
        setEditingPlayer(null);
        await fetchPlayers(); // Refresh list
      } else {
        const data = await res.json();
        setEditError(data.error || "Failed to update player");
      }
    } catch (error) {
      console.error("Error updating player:", error);
      setEditError("Failed to update player");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = async (playerId: string) => {
    if (!confirm("Are you sure you want to delete this player?")) {
      return;
    }

    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchPlayers(); // Refresh list
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete player");
      }
    } catch (error) {
      console.error("Error deleting player:", error);
      alert("Failed to delete player");
    }
  };

  if (loading || status === "loading") {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] py-8 flex items-center justify-center">
          <div className="text-white/70">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-[#252015] to-[#1C1810] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <h1 className="text-3xl font-bold text-white">Manage Players</h1>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Create Player Form */}
            <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] transition-all">
              <CardHeader>
                <CardTitle className="text-white">Create New Player</CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerCreationForm onSuccess={fetchPlayers} />
              </CardContent>
            </Card>

            {/* Players List */}
            <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)] hover:shadow-[0_12px_30px_rgba(212,168,23,0.2)] transition-all">
              <CardHeader>
                <CardTitle className="text-white">All Players ({players.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {players.length === 0 ? (
                  <div className="text-white/70 text-center py-8">
                    No players yet. Create your first player!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 border border-[rgba(212,168,23,0.12)] rounded-lg hover:bg-[rgba(212,168,23,0.06)] transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-white">{player.name}</div>
                          <div className="text-sm text-white/70">
                            Rank #{player.rank} • <span className="text-[#D4A817]">{player.points} points</span>
                            {player.category && ` • ${player.category}`}
                            {player.location && ` • ${player.location}`}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(player)}
                            className="h-8 w-8 p-0 border-[rgba(212,168,23,0.3)] text-white/80 hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(player.id)}
                            className="h-8 w-8 p-0 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/70"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Player Dialog */}
      <Dialog
        open={editingPlayer !== null}
        onOpenChange={(open) => {
          if (!open) setEditingPlayer(null);
        }}
      >
        <DialogContent className="bg-[#1A1612] border-[rgba(212,168,23,0.2)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Player</DialogTitle>
            <DialogDescription className="text-white/70">
              Update player information. Changing points will recalculate ranks.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded">
                {editError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 text-white/90">
                Player Name *
              </label>
              <Input
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-white/90">Points *</label>
              <Input
                type="number"
                value={editFormData.points}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, points: e.target.value })
                }
                min="0"
                required
              />
              <p className="text-xs text-white/55 mt-1">
                Changing points will automatically recalculate all player ranks.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-white/90">Category</label>
              <Select
                value={editFormData.category || "none"}
                onValueChange={(value) =>
                  setEditFormData({
                    ...editFormData,
                    category: value === "none" ? "" : value,
                  })
                }
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
              <label className="block text-sm font-medium mb-1 text-white/90">
                Location *
              </label>
              <Input
                value={editFormData.location}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, location: e.target.value })
                }
                required
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                className="border-[rgba(212,168,23,0.3)] text-white hover:bg-[rgba(212,168,23,0.1)] hover:border-[#D4A817] hover:text-[#D4A817]"
                onClick={() => setEditingPlayer(null)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="bg-[#D4A817] hover:bg-[#E6C420] text-white shadow-[0_4px_12px_rgba(212,168,23,0.25)]"
              >
                {editLoading ? "Updating..." : "Update Player"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
