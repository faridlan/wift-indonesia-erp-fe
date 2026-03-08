import { useState, useMemo } from "react";
import { useLeads } from "@/hooks/api/useLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Target, Search, Users, Clock, Smartphone } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const Leads = () => {
  const { data: leads = [], isLoading } = useLeads();
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");

  const utmSources = useMemo(() => {
    const sources = new Set(leads.map((l) => l.utm_source).filter(Boolean));
    return Array.from(sources);
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const matchSearch =
        (lead as any).profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        (lead as any).products?.name?.toLowerCase().includes(search.toLowerCase()) ||
        lead.utm_campaign?.toLowerCase().includes(search.toLowerCase());
      const matchSource = filterSource === "all" || lead.utm_source === filterSource;
      return matchSearch && matchSource;
    });
  }, [leads, search, filterSource]);

  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const avgTimeSpent = leads.reduce((sum, l) => sum + (l.time_spent_seconds || 0), 0) / (totalLeads || 1);
    const uniqueSales = new Set(leads.map((l) => l.sales_id)).size;
    return { totalLeads, avgTimeSpent: Math.round(avgTimeSpent), uniqueSales };
  }, [leads]);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total Leads</p>
              <p className="text-lg sm:text-xl font-bold">{stats.totalLeads}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Avg Time</p>
              <p className="text-lg sm:text-xl font-bold">{formatTime(stats.avgTimeSpent)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Sales</p>
              <p className="text-lg sm:text-xl font-bold">{stats.uniqueSales}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5" /> Dashboard Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari sales, produk, campaign..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="UTM Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Source</SelectItem>
                {utmSources.map((source) => (
                  <SelectItem key={source} value={source!}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>UTM Source</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Device</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-sm">
                      {lead.created_at ? format(new Date(lead.created_at), "dd MMM yyyy HH:mm", { locale: localeId }) : "-"}
                    </TableCell>
                    <TableCell className="font-medium">{(lead as any).profiles?.full_name || "-"}</TableCell>
                    <TableCell>{(lead as any).products?.name || "-"}</TableCell>
                    <TableCell>
                      {lead.utm_source ? <Badge variant="secondary">{lead.utm_source}</Badge> : "-"}
                    </TableCell>
                    <TableCell className="max-w-32 truncate">{lead.utm_campaign || "-"}</TableCell>
                    <TableCell>{formatTime(lead.time_spent_seconds)}</TableCell>
                    <TableCell className="max-w-24 truncate text-xs">{lead.device_info || "-"}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Tidak ada leads ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((lead) => (
              <Card key={lead.id} className="p-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{(lead as any).profiles?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.created_at ? format(new Date(lead.created_at), "dd MMM yyyy HH:mm", { locale: localeId }) : "-"}
                      </p>
                    </div>
                    {lead.utm_source && <Badge variant="secondary" className="text-xs">{lead.utm_source}</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Produk:</span>
                      <p className="truncate">{(lead as any).products?.name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time:</span>
                      <p>{formatTime(lead.time_spent_seconds)}</p>
                    </div>
                  </div>
                  {lead.utm_campaign && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Campaign:</span>
                      <p className="truncate">{lead.utm_campaign}</p>
                    </div>
                  )}
                  {lead.device_info && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Smartphone className="h-3 w-3" />
                      <span className="truncate">{lead.device_info}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Tidak ada leads ditemukan</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Leads;
