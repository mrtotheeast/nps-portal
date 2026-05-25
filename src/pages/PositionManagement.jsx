import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

export default function PositionManagement() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["positions"],
    queryFn: () => base44.entities.Position?.list?.() || Promise.resolve([]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Position?.delete?.(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["positions"]);
      toast.success("Position deleted");
    },
  });

  const filtered = positions.filter((pos) =>
    !search || pos.title?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Position Management" subtitle={`${positions.length} positions`} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search positions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button className="bg-[#1a2b4a]"><Plus className="w-4 h-4 mr-2" />Add Position</Button>
            </div>
          </CardContent>
        </Card>

        {filtered.length > 0 ? (
          <div className="grid gap-4">
            {filtered.map((pos) => (
              <Card key={pos.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{pos.title}</h3>
                    {pos.description && <p className="text-sm text-slate-600 mt-1">{pos.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => deleteMutation.mutate(pos.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Briefcase} title="No positions found" />
        )}
      </div>
    </div>
  );
}