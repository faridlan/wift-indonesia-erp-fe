import { useMemo, useState } from "react";
import { useOrders } from "@/hooks/api/useOrders";
import { usePayments } from "@/hooks/api/usePayments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { format, subDays, subWeeks, subMonths, subYears, startOfWeek, startOfMonth, startOfYear, startOfDay } from "date-fns";

type Granularity = "year" | "month" | "week" | "day";

const LABEL_FORMAT = {
  year: "yyyy",
  month: "MMM yyyy",
  week: "dd MMM",
  day: "dd MMM",
} as const;

const Reports = () => {
  const { data: payments = [] } = usePayments();
  const { data: orders = [] } = useOrders();
  const [granularity, setGranularity] = useState<Granularity>("month");

  const chartData = useMemo(() => {
    // determine periods based on granularity
    const periods: string[] = [];
    const now = new Date();

    if (granularity === "year") {
      for (let i = 4; i >= 0; i--) {
        const d = subYears(now, i);
        periods.push(format(startOfYear(d), "yyyy-01-01"));
      }
    } else if (granularity === "month") {
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(now, i);
        periods.push(format(startOfMonth(d), "yyyy-MM-01"));
      }
    } else if (granularity === "week") {
      for (let i = 11; i >= 0; i--) {
        const d = subWeeks(now, i);
        periods.push(format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd"));
      }
    } else {
      // day
      for (let i = 29; i >= 0; i--) {
        const d = subDays(now, i);
        periods.push(format(startOfDay(d), "yyyy-MM-dd"));
      }
    }

    const map: Record<string, { revenue: number; orders: number; label: string }> = {};
    for (const p of periods) map[p] = { revenue: 0, orders: 0, label: p };

    const formatKey = (dateStr: string | null | undefined) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return null;
      if (granularity === "year") return format(startOfYear(d), "yyyy-01-01");
      if (granularity === "month") return format(startOfMonth(d), "yyyy-MM-01");
      if (granularity === "week") return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
      return format(startOfDay(d), "yyyy-MM-dd");
    };

    // aggregate payments as revenue
    for (const p of payments) {
      const k = formatKey((p as any).created_at || (p as any).createdAt || (p as any).created_at_at);
      if (!k) continue;
      if (!map[k]) continue;
      map[k].revenue += (p as any).amount || 0;
    }

    // aggregate orders count
    for (const o of orders) {
      const k = formatKey((o as any).created_at || (o as any).createdAt);
      if (!k) continue;
      if (!map[k]) continue;
      map[k].orders += 1;
    }

    const out = periods.map((p) => {
      const row = map[p];
      const labelDate = new Date(p);
      return {
        period: p,
        label: format(labelDate, LABEL_FORMAT[granularity]),
        revenue: row.revenue,
        orders: row.orders,
      };
    });

    return out;
  }, [payments, orders, granularity]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Laporan</h1>
        <p className="text-muted-foreground">Laporan pendapatan dan jumlah order per {granularity}.</p>
      </div>

      <div className="flex items-center gap-4">
        <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="year">Per Tahun</SelectItem>
            <SelectItem value="month">Per Bulan</SelectItem>
            <SelectItem value="week">Per Minggu</SelectItem>
            <SelectItem value="day">Per Hari</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tren Pendapatan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => `Rp ${v.toLocaleString("id-ID")}`} />
                <Tooltip formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, "Pendapatan"]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left">
                  <th className="py-2">Periode</th>
                  <th className="py-2 text-right">Pendapatan</th>
                  <th className="py-2 text-right">Jumlah Order</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((r) => (
                  <tr key={r.period}>
                    <td className="py-2">{r.label}</td>
                    <td className="py-2 text-right">Rp {r.revenue.toLocaleString("id-ID")}</td>
                    <td className="py-2 text-right">{r.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
