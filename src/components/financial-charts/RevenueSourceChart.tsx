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
import { Wallet } from "lucide-react";

type RevenueSource = {
  booking: number;
  manual: number;
  bookingByCategory?: {
    regular: number;
    academy: number;
    tournament: number;
  };
};

type RevenueSourceChartProps = {
  data: RevenueSource;
  loading?: boolean;
};

const COLORS: Record<string, string> = {
  regular: "#22c55e", // green
  academy: "#D4A817", // gold
  tournament: "#f59e0b", // amber/orange
  manual: "#8b5cf6", // purple
};

export default function RevenueSourceChart({
  data,
  loading = false,
}: RevenueSourceChartProps) {
  if (loading) {
    return (
      <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wallet className="h-5 w-5 text-[#D4A817]" />
            Revenue Source Split
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

  // Calculate total including all categories
  const bookingByCategory = data.bookingByCategory || {
    regular: 0,
    academy: 0,
    tournament: 0,
  };
  const total =
    bookingByCategory.regular +
    bookingByCategory.academy +
    bookingByCategory.tournament +
    data.manual;

  if (total === 0) {
    return (
      <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wallet className="h-5 w-5 text-[#D4A817]" />
            Revenue Source Split
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex flex-col items-center justify-center text-white/60">
            <Wallet className="h-12 w-12 mb-4 opacity-50 text-[#D4A817]" />
            <p className="text-sm">No revenue data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build chart data with booking categories and manual income
  const chartData = [
    {
      name: "Regular",
      value: bookingByCategory.regular,
      color: COLORS.regular,
    },
    {
      name: "Academy",
      value: bookingByCategory.academy,
      color: COLORS.academy,
    },
    {
      name: "Tournament",
      value: bookingByCategory.tournament,
      color: COLORS.tournament,
    },
    { name: "Manual Income", value: data.manual, color: COLORS.manual },
  ].filter((item) => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-[#1A1612] p-3 border border-[rgba(212,168,23,0.3)] rounded-lg shadow-lg text-white">
          <p className="font-semibold mb-1">{data.name}</p>
          <p className="text-sm text-white/80">
            {data.value.toLocaleString()} EGP ({percentage}%)
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

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={14}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Wallet className="h-5 w-5 text-[#D4A817]" />
          Revenue Source Split
        </CardTitle>
        <p className="text-sm text-white/60 mt-1">
          Breakdown of income by booking category
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
                    {value} ({entry.payload.value.toLocaleString()} EGP)
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
