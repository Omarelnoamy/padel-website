"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

type MonthlyData = {
  month: string;
  monthKey: string;
  income: number;
  expenses: number;
  profit: number;
};

type IncomeExpenseTrendChartProps = {
  data: MonthlyData[];
  loading?: boolean;
};

export default function IncomeExpenseTrendChart({
  data,
  loading = false,
}: IncomeExpenseTrendChartProps) {
  if (loading) {
    return (
      <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="h-5 w-5 text-[#D4A817]" />
            Income vs Expenses Trend
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
            <TrendingUp className="h-5 w-5 text-[#D4A817]" />
            Income vs Expenses Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex flex-col items-center justify-center text-white/60">
            <TrendingUp className="h-12 w-12 mb-4 opacity-50 text-[#D4A817]" />
            <p className="text-sm">
              No trend data available for the selected period
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A1612] p-3 border border-[rgba(212,168,23,0.3)] rounded-lg shadow-lg text-white">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()} EGP
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <TrendingUp className="h-5 w-5 text-[#D4A817]" />
          Income vs Expenses Trend
        </CardTitle>
        <p className="text-sm text-white/60 mt-1">
          Track income and expense trends over time
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.8)" }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12, fill: "rgba(255,255,255,0.8)" }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: "20px" }} formatter={(value) => <span className="text-white/80">{value}</span>} />
              <Line type="monotone" dataKey="income" name="Income" stroke="#D4A817" strokeWidth={3} dot={{ fill: "#D4A817", r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={3} dot={{ fill: "#ef4444", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
