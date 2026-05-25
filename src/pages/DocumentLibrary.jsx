import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search, Download, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";

export default function DocumentLibrary() {
  const [search, setSearch] = useState("");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["document-library"],
    queryFn: () => base44.entities.OnboardingDocument?.list?.() || Promise.resolve([]),
  });

  const filtered = documents.filter((doc) =>
    !search || doc.title?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Document Library" subtitle="Browse company documents and resources" showBack />
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
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-slate-400 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold">{doc.title}</h3>
                      {doc.description && <p className="text-sm text-slate-600 mt-1">{doc.description}</p>}
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="ghost" className="gap-1">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={BookOpen} title="No documents found" />
        )}
      </div>
    </div>
  );
}