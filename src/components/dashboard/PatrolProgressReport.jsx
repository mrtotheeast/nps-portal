import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function PatrolProgressReport() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: sites = [] } = useQuery({ queryKey: ["sites"], queryFn: () => base44.entities.Site.list(), staleTime: 600000, gcTime: 900000 });

  const { data: sessions = [] } = useQuery({
    queryKey: ["patrol-sessions-today"],
    queryFn: async () => {
      const all = await base44.entities.PatrolSession.list("-start_time", 200);
      return all.filter(s => s.start_time?.startsWith(today));
    },
    staleTime: 120000,
    gcTime: 300000,
  });

  const siteStats = useMemo(() => {
    return sites
      .filter(s => s.status === "active")
      .map(site => {
        const required = site.checkpoints?.length || 0;
        const siteSessions = sessions.filter(s => s.site_id === site.id);
        const completedSessions = siteSessions.filter(s => s.status === "completed");
        const activeSessions = siteSessions.filter(s => s.status === "active");
        const totalScanned = siteSessions.reduce((sum, s) => sum + (s.scanned_checkpoints || 0), 0);
        const totalRequired = siteSessions.reduce((sum, s) => sum + (s.total_checkpoints || required || 0), 0);
        const pct = totalRequired > 0 ? Math.round((totalScanned / totalRequired) * 100) : 0;
        return { site, required, totalScanned, totalRequired, pct, completedCount: completedSessions.length, activeCount: activeSessions.length, sessionsToday: siteSessions.length };
      })
      .filter(s => s.sessionsToday > 0 || s.required > 0)
      .sort((a, b) => a.pct - b.pct);
  }, [sites, sessions]);

  if (siteStats.length === 0) return null;

  return (
    <Card className="mb-6 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#1a2b4a]" />Today's Patrol Progress by Site</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {siteStats.map(({ site, required, totalScanned, totalRequired, pct, completedCount, activeCount, sessionsToday }) => (
            <div key={site.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-900">{site.name}</p>
                  <p className="text-xs text-slate-500">{required} checkpoint{required !== 1 ? "s" : ""} required</p>
                </div>
                <div className="flex gap-2 items-center">
                  {activeCount > 0 && <Badge className="bg-emerald-100 text-emerald-700 border-0 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />{activeCount} Active</Badge>}
                  {completedCount > 0 && <Badge className="bg-blue-100 text-blue-700 border-0">{completedCount} Done</Badge>}
                  {sessionsToday === 0 && <Badge className="bg-slate-100 text-slate-500 border-0">No patrols today</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={pct} className="flex-1 h-2" />
                <span className={`text-sm font-bold w-12 text-right ${pct >= 100 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>{pct}%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{totalScanned} / {totalRequired || required} scans completed across {sessionsToday} patrol{sessionsToday !== 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}