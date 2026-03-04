"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

type UserTypeStats = {
  player: number;
  clubAdmin: number;
  clubOwner: number;
  moderator: number;
  other: number;
};

type UserTypeBookingChartProps = {
  stats: UserTypeStats;
  loading?: boolean;
};

const COLORS = {
  player: "#22c55e", // Green
  clubAdmin: "#D4A817", // Gold
  clubOwner: "#f59e0b", // Amber
  moderator: "#8b5cf6", // Purple
  other: "#6b7280", // Gray
};

export default function UserTypeBookingChart({
  stats,
  loading = false,
}: UserTypeBookingChartProps) {
  if (loading) {
    return (
      <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-[#D4A817]" />
            Bookings by User Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A817]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-[#D4A817]" />
            Bookings by User Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex flex-col items-center justify-center text-white/60">
            <Users className="h-12 w-12 mb-4 opacity-50 text-[#D4A817]" />
            <p className="text-sm">No booking data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for chart
  const chartData = [
    {
      name: "Players",
      value: stats.player,
      color: COLORS.player,
    },
    {
      name: "Club Admins",
      value: stats.clubAdmin,
      color: COLORS.clubAdmin,
    },
    {
      name: "Club Owners",
      value: stats.clubOwner,
      color: COLORS.clubOwner,
    },
    {
      name: "Moderators",
      value: stats.moderator,
      color: COLORS.moderator,
    },
    {
      name: "Other",
      value: stats.other,
      color: COLORS.other,
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A1612] p-3 border border-[rgba(212,168,23,0.3)] rounded-lg shadow-lg text-white">
          <p className="font-semibold mb-2">{payload[0].payload.name}</p>
          <p className="text-sm" style={{ color: payload[0].payload.color }}>
            Bookings: {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="h-5 w-5 text-[#D4A817]" />
          Bookings by User Type
        </CardTitle>
        <p className="text-sm text-white/60 mt-1">
          Number of confirmed bookings by user role
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" className="opacity-30" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "rgba(255,255,255,0.8)" }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12, fill: "rgba(255,255,255,0.8)" }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(value) => <span className="text-white/80">{value}</span>} />
              <Bar
                dataKey="value"
                name="Number of Bookings"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="text-center p-3 bg-[#1A1612]/80 rounded-lg border border-[rgba(212,168,23,0.2)]">
            <div className="text-2xl font-bold text-green-400">{stats.player}</div>
            <div className="text-xs text-white/60 mt-1">Players</div>
          </div>
          <div className="text-center p-3 bg-[#1A1612]/80 rounded-lg border border-[rgba(212,168,23,0.2)]">
            <div className="text-2xl font-bold text-[#D4A817]">{stats.clubAdmin}</div>
            <div className="text-xs text-white/60 mt-1">Club Admins</div>
          </div>
          <div className="text-center p-3 bg-[#1A1612]/80 rounded-lg border border-[rgba(212,168,23,0.2)]">
            <div className="text-2xl font-bold text-amber-400">{stats.clubOwner}</div>
            <div className="text-xs text-white/60 mt-1">Club Owners</div>
          </div>
          <div className="text-center p-3 bg-[#1A1612]/80 rounded-lg border border-[rgba(212,168,23,0.2)]">
            <div className="text-2xl font-bold text-purple-400">{stats.moderator}</div>
            <div className="text-xs text-white/60 mt-1">Moderators</div>
          </div>
          <div className="text-center p-3 bg-[#1A1612]/80 rounded-lg border border-[rgba(212,168,23,0.2)]">
            <div className="text-2xl font-bold text-white/80">{stats.other}</div>
            <div className="text-xs text-white/60 mt-1">Other</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
