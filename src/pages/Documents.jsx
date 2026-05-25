import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";

export default function Documents() {
  const [search, setSearch] = useState("");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["my-documents"],
    queryFn: () => base44.entities.OnboardingDocument?.list?.() || Promise.resolve([]),
  });

  const filtered = documents.filter((doc) =>
    !search || doc.title?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Documents" subtitle="Your important documents" />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <div>
                      <h3 className="font-semibold">{doc.title}</h3>
                      {doc.description && <p className="text-sm text-slate-600">{doc.description}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={FileText} title="No documents available" />
        )}
      </div>
    </div>
  );
}