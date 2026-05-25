import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function PortalLoginChart() {
  const { data: contacts = [] } = useQuery({
    queryKey: ["client-contacts"],
    queryFn: () => base44.entities.ClientContact.list(),
    staleTime: 600000,
    gcTime: 900000,
  });

  const chartData = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Group logins by day
    const dailyLogins = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyLogins[dateStr] = 0;
    }

    // Count logins per day (approximation based on contacts with last_login_at)
    contacts.forEach((contact) => {
      if (contact.last_login_at) {
        const loginDate = new Date(contact.last_login_at);
        if (loginDate >= thirtyDaysAgo) {
          const dateStr = loginDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (dailyLogins.hasOwnProperty(dateStr)) {
            dailyLogins[dateStr]++;
          }
        }
      }
    });

    return Object.entries(dailyLogins).map(([date, count]) => ({
      date,
      logins: count,
    }));
  }, [contacts]);

  const totalLogins = chartData.reduce((sum, d) => sum + d.logins, 0);
  const avgDaily = Math.round(totalLogins / 30);

  return (
    <Card className="mb-8 shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogIn className="w-5 h-5" />
          Client Portal Logins (Last 30 Days)
        </CardTitle>
        <div className="flex gap-4 mt-2 text-sm">
          <span className="text-slate-600">Total: <span className="font-semibold text-slate-900">{totalLogins}</span></span>
          <span className="text-slate-600">Daily Avg: <span className="font-semibold text-slate-900">{avgDaily}</span></span>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No portal login data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                formatter={(value) => [`${value} logins`, 'Active Logins']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="logins" 
                stroke="#c9a227" 
                strokeWidth={2}
                dot={{ fill: '#c9a227', r: 4 }}
                activeDot={{ r: 6 }}
                name="Active Logins"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}