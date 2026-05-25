import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Search, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CredentialsManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ["credentials"],
    queryFn: () => base44.entities.Credential.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Credential.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["credentials"]);
      toast.success("Credential deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete credential: ${error.message || "Unknown error"}`);
    },
  });

  const filtered = credentials.filter((cred) => {
    const matchSearch = !search || 
      cred.credential_name?.toLowerCase().includes(search.toLowerCase()) ||
      cred.employee_id?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || cred.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
      <PageHeader title="Credentials Management" subtitle="Manage employee credentials" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search credentials..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
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
                    <div className="flex items-center gap-2">
                      {cred.status === "expiring_soon" && (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => deleteMutation.mutate(cred.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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