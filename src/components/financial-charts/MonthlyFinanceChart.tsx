"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon } from "lucide-react";

type MonthlyData = {
  month: string;
  monthKey: string;
  income: number;
  expenses: number;
  profit: number;
};

type MonthlyFinanceChartProps = {
  data: MonthlyData[];
  loading?: boolean;
};

export default function MonthlyFinanceChart({
  data,
  loading = false,
}: MonthlyFinanceChartProps) {
  if (loading) {
    return (
      <Card className="bg-[#1A1612]/90 border-[rgba(212,168,23,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChartIcon className="h-5 w-5 text-[#D4A817]" />
            Monthly Financial Overview
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
            <BarChartIcon className="h-5 w-5 text-[#D4A817]" />
            Monthly Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex flex-col items-center justify-center text-white/60">
            <BarChartIcon className="h-12 w-12 mb-4 opacity-50 text-[#D4A817]" />
            <p className="text-sm">
              No financial data available for the selected period
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
          <BarChartIcon className="h-5 w-5 text-[#D4A817]" />
          Monthly Financial Overview
        </CardTitle>
        <p className="text-sm text-white/60 mt-1">
          Income, expenses, and net profit by month
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.8)" }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12, fill: "rgba(255,255,255,0.8)" }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="rect" formatter={(value) => <span className="text-white/80">{value}</span>} />
              <Bar dataKey="income" name="Income" fill="#D4A817" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#E6C420" strokeWidth={3} dot={{ fill: "#E6C420", r: 4 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
