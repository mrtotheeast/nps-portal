import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";

export default function Credentials() {
  const [search, setSearch] = useState("");

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ["my-credentials"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Credential.filter({ employee_id: user?.id });
    },
  });

  const filtered = credentials.filter((cred) =>
    !search || cred.credential_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700";
      case "expiring_soon":
        return "bg-amber-100 text-amber-700";
      case "expired":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="My Credentials" subtitle="View and manage your credentials" />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search credentials..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {filtered.length > 0 ? (
          <div className="grid gap-4">
            {filtered.map((cred) => (
              <Card key={cred.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{cred.credential_name}</h3>
                        <Badge className={getStatusColor(cred.status)}>{cred.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{cred.credential_type}</p>
                      {cred.expiry_date && (
                        <p className="text-sm text-slate-500 mt-1">
                          Expires: {format(new Date(cred.expiry_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    {cred.status === "expiring_soon" && (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={FileText} title="No credentials found" />
        )}
      </div>
    </div>
  );
}