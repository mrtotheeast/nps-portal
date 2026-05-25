import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, X, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function SiteBulkUploadDialog({ clientId, open, onClose }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        const validated = [];
        const newErrors = [];

        rows.forEach((row, idx) => {
          const name = row.name || row.Name || row.site_name || row["Site Name"] || "";
          const address = row.address || row.Address || row.street || row["Street Address"] || "";
          const city = row.city || row.City || "";
          const state = row.state || row.State || "";
          const zip = row.zip || row.ZIP || row.zip_code || row["ZIP Code"] || "";

          if (!name.trim()) {
            newErrors.push({ row: idx + 2, error: "Missing site name" });
            return;
          }
          if (!address.trim()) {
            newErrors.push({ row: idx + 2, error: "Missing address" });
            return;
          }
          if (!city.trim()) {
            newErrors.push({ row: idx + 2, error: "Missing city" });
            return;
          }
          if (!state.trim() || state.length !== 2) {
            newErrors.push({ row: idx + 2, error: "Invalid state (use 2-letter code)" });
            return;
          }
          if (!zip.trim()) {
            newErrors.push({ row: idx + 2, error: "Missing ZIP code" });
            return;
          }

          validated.push({
            name: name.trim(),
            address: address.trim(),
            city: city.trim(),
            state: state.trim().toUpperCase(),
            zip: zip.trim(),
            site_type: row.site_type || row["Site Type"] || "Commercial",
            notes: row.notes || row.Notes || "",
          });
        });

        setFile(selectedFile);
        setParsedData({ sites: validated, total: rows.length });
        setErrors(newErrors);

        if (newErrors.length === 0) {
          toast.success(`${validated.length} sites ready to import`);
        } else {
          toast.warning(`${newErrors.length} row(s) with errors`);
        }
      } catch (error) {
        toast.error("Failed to parse file. Ensure it's a valid CSV or Excel file.");
        setFile(null);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!parsedData) return;

      setUploading(true);
      const results = { success: 0, failed: 0 };

      for (const site of parsedData.sites) {
        try {
          const newSite = await base44.entities.Site.create({
            name: site.name,
            address: site.address,
            city: site.city,
            state: site.state,
            zip: site.zip,
            client_id: clientId,
            site_type: site.site_type,
            notes: site.notes,
            status: "active",
          });

          // Auto-create default timesheet template
          try {
            await base44.entities.TimesheetTemplate.create({
              site_id: newSite.id,
              name: `${site.name} - Default Shift`,
              clock_in_time: "08:00",
              clock_out_time: "17:00",
              typical_hours: 8,
              days_of_week: [1, 2, 3, 4, 5],
            });
          } catch (e) {
            console.warn("Could not create template for site:", site.name);
          }

          results.success++;
        } catch (error) {
          console.error("Failed to create site:", site.name, error);
          results.failed++;
        }
      }

      setUploading(false);
      return results;
    },
    onSuccess: (results) => {
      toast.success(`Imported ${results.success} sites`);
      if (results.failed > 0) {
        toast.warning(`${results.failed} sites failed`);
      }
      queryClient.invalidateQueries(["sites"]);
      queryClient.invalidateQueries(["client"]);
      handleClose();
    },
    onError: () => {
      toast.error("Upload failed");
      setUploading(false);
    },
  });

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setErrors([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Sites</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file with site information. Required columns: Name, Address, City, State, ZIP
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!parsedData ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => document.getElementById("file-input").click()}>
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium">Upload CSV or Excel file</p>
              <p className="text-xs text-slate-500 mt-1">Drag and drop, or click to select</p>
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">{file?.name}</p>
                  <p className="text-xs text-emerald-700">{parsedData.sites.length} valid sites ready to import</p>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-700 mb-2">Issues found:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600">Row {err.row}: {err.error}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium mb-2">Preview:</p>
                <div className="space-y-1">
                  {parsedData.sites.slice(0, 5).map((site, i) => (
                    <div key={i} className="text-xs p-2 bg-slate-50 rounded flex justify-between">
                      <span className="font-medium">{site.name}</span>
                      <span className="text-slate-500">{site.city}, {site.state}</span>
                    </div>
                  ))}
                  {parsedData.sites.length > 5 && (
                    <p className="text-xs text-slate-500 p-2">... and {parsedData.sites.length - 5} more</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          {parsedData && errors.length === 0 && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => uploadMutation.mutate()}
              disabled={uploading || !parsedData}
            >
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import {parsedData.sites.length} Sites
            </Button>
          )}
          {parsedData && errors.length > 0 && (
            <Button variant="outline" onClick={() => { setFile(null); setParsedData(null); }}>
              Upload Different File
            </Button>
          )}
          {!parsedData && (
            <Button disabled className="opacity-50">
              No file selected
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}