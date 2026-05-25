import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

export default function DocumentManagement() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.OnboardingDocument?.list?.() || Promise.resolve([]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OnboardingDocument?.delete?.(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
      toast.success("Document deleted");
    },
  });

  const filtered = documents.filter((doc) =>
    !search || doc.title?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Document Management" subtitle="Manage company documents" />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button className="bg-[#1a2b4a]"><Plus className="w-4 h-4 mr-2" />Upload Document</Button>
            </div>
          </CardContent>
        </Card>

        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div>
                        <h3 className="font-semibold">{doc.title}</h3>
                        {doc.description && <p className="text-sm text-slate-600">{doc.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {doc.is_active && <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => deleteMutation.mutate(doc.id)}
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
          <EmptyState icon={FileText} title="No documents found" />
        )}
      </div>
    </div>
  );
}