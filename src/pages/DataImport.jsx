import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText, Users, MapPin, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

function ImportCard({ title, icon: ImportIcon, description, onImport, loading, result, error, validationErrors }) {
  const Icon = ImportIcon;
  const [file, setFile] = useState(null);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-5 h-5 text-slate-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">{description}</p>
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".csv,.xlsx,.pdf"
            className="hidden"
            id={`file-${title}`}
            onChange={(e) => setFile(e.target.files[0])}
          />
          <label htmlFor={`file-${title}`} className="cursor-pointer">
            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {file ? file.name : "Click to upload CSV, Excel, or PDF"}
            </p>
          </label>
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
            <p className="text-sm font-medium text-red-700">Import Error</p>
            <p className="text-sm text-red-600">{error}</p>
            <div className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
              {validationErrors && validationErrors.length > 0 && (
                <>
                  <p className="font-medium">Issues found:</p>
                  {validationErrors.map((err, i) => <p key={i}>• {err}</p>)}
                </>
              )}
            </div>
          </div>
        )}
        {result && (
          <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg">
            <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-emerald-700 font-medium">{result.message}</p>
              {result.validationErrors && result.validationErrors.length > 0 && (
                <div className="text-xs text-emerald-600 mt-2 space-y-1">
                  <p className="font-medium">Note: {result.skipped} rows skipped:</p>
                  {result.validationErrors.map((err, i) => <p key={i}>• {err}</p>)}
                </div>
              )}
            </div>
          </div>
        )}
        <Button
          onClick={() => file && onImport(file)}
          disabled={!file || loading}
          className="w-full bg-[#1a2b4a]"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Import {title}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DataImport() {
  const [empResult, setEmpResult] = useState(null);
  const [empError, setEmpError] = useState(null);
  const [siteResult, setSiteResult] = useState(null);
  const [siteError, setSiteError] = useState(null);

  const importEmployeesMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("importEmployeesFromFile", { file_url });
      return res.data;
    },
    onSuccess: (data) => {
      setEmpError(null);
      setEmpResult(data);
      toast.success(`Successfully imported ${data?.count || 0} employees`);
    },
    onError: (error) => {
      setEmpResult(null);
      setEmpError(error.message || "Failed to import employees");
      toast.error(`Import failed: ${error.message || "Unknown error"}`);
    },
  });

  const importSitesMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("importSites", { file_url });
      return res.data;
    },
    onSuccess: (data) => {
      setSiteError(null);
      setSiteResult(data);
      toast.success(`Successfully imported ${data?.count || 0} sites`);
    },
    onError: (error) => {
      setSiteResult(null);
      setSiteError(error.message || "Failed to import sites");
      toast.error(`Import failed: ${error.message || "Unknown error"}`);
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Data Import" subtitle="Bulk import employees, sites, and other records" showBack currentPage="DataImport" />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="employees">
          <TabsList className="mb-6">
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="sites">Sites</TabsTrigger>
          </TabsList>
          <TabsContent value="employees">
            <ImportCard
              title="Employees"
              icon={Users}
              description="Upload a CSV or Excel file with employee data. Required columns: First Name, Last Name, Email."
              onImport={(file) => importEmployeesMutation.mutate(file)}
              loading={importEmployeesMutation.isPending}
              result={empResult}
              error={empError}
              validationErrors={empResult?.validationErrors}
            />
          </TabsContent>
          <TabsContent value="sites">
            <ImportCard
              title="Sites"
              icon={MapPin}
              description="Upload a CSV or Excel file with site data. Required columns: name, address."
              onImport={(file) => importSitesMutation.mutate(file)}
              loading={importSitesMutation.isPending}
              result={siteResult}
              error={siteError}
              validationErrors={siteResult?.validationErrors}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}