"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

type ProfitByLocation = {
  locationId: string;
  locationName: string;
  profit: number;
};

type ProfitByLocationChartProps = {
  data: ProfitByLocation[];
  loading?: boolean;
};

const COLORS = [
  "#D4A817", // gold
  "#E6C420", // gold light
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
];

export default function ProfitByLocationChart({
  data,
  loading = false,
}: ProfitByLocationChartProps) {
  if (loading) {
    return (
      <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MapPin className="h-5 w-5 text-[#D4A817]" />
            Profit by Location
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

  if (!data || data.length === 0) {
    return (
      <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MapPin className="h-5 w-5 text-[#D4A817]" />
            Profit by Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex flex-col items-center justify-center text-white/60">
            <MapPin className="h-12 w-12 mb-4 opacity-50 text-[#D4A817]" />
            <p className="text-sm">No profit data available by location</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for pie chart
  const chartData = data.map((item, index) => ({
    name: item.locationName,
    value: Math.abs(item.profit),
    profit: item.profit,
    color: COLORS[index % COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-[#1A1612] p-3 border border-[rgba(212,168,23,0.3)] rounded-lg shadow-lg text-white">
          <p className="font-semibold mb-1">{data.name}</p>
          <p
            className="text-sm"
            style={{ color: data.payload.profit >= 0 ? "#D4A817" : "#ef4444" }}
          >
            Profit: {data.payload.profit.toLocaleString()} EGP
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label if slice is too small

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <MapPin className="h-5 w-5 text-[#D4A817]" />
          Profit by Location
        </CardTitle>
        <p className="text-sm text-white/60 mt-1">
          Distribution of profit across locations
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={CustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry: any) => (
                  <span style={{ color: entry.color }}>
                    {value} ({entry.payload.profit >= 0 ? "+" : ""}
                    {entry.payload.profit.toLocaleString()} EGP)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
