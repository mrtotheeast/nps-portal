import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";
import { useTenantFilter, useTenantMutation } from "@/hooks/useTenantFilter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MapPin, Search, Plus, Edit, Trash2, Loader2, Upload, Download,
  Building2, Users, QrCode, Map, CheckSquare, Square, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

const REQUIRED_FIELDS = ["name", "address", "city", "state", "zip"];

const EMPTY_FORM = {
  name: "", address: "", city: "", state: "", zip: "",
  client_id: "", geofence_radius: 300, site_type: "", status: "active", notes: ""
};

function validate(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = "Site Name is required";
  if (!form.address?.trim()) errors.address = "Street Address is required";
  if (!form.city?.trim()) errors.city = "City is required";
  if (!form.state?.trim()) errors.state = "State is required";
  if (!form.zip?.trim()) errors.zip = "ZIP Code is required";
  return errors;
}

export default function SiteManagement() {
  const location = useLocation();
  const autoOpenBulk = location.state?.openBulk;
  const tenantFilter = useTenantFilter();
  const { addCompanyId } = useTenantMutation();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Bulk import state
  const [showBulk, setShowBulk] = useState(autoOpenBulk || false);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkSelected, setBulkSelected] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const fileRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: sitesRaw = [], isLoading } = useQuery({
    queryKey: ["sites", tenantFilter],
    queryFn: async () => {
      const filtered = await base44.entities.Site.filter(tenantFilter, "-created_date");
      if (filtered.length > 0) return filtered;
      // Fallback: sites may not have company_id yet — show all
      return base44.entities.Site.filter({}, "-created_date");
    },
    enabled: !!tenantFilter.company_id,
  });
  const sites = sitesRaw;

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients", tenantFilter],
    queryFn: async () => {
      const filtered = await base44.entities.Client.filter(tenantFilter);
      if (filtered.length > 0) return filtered;
      return base44.entities.Client.filter({});
    },
    enabled: !!tenantFilter.company_id,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        name: data.name.trim(),
        address: data.address.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        zip: data.zip.trim(),
        status: data.status || "active",
        geofence_radius: Number(data.geofence_radius) || 300,
        ...(data.client_id && { client_id: data.client_id }),
        ...(data.site_type && { site_type: data.site_type }),
        ...(data.notes && { notes: data.notes }),
      };
      return editingSite
        ? base44.entities.Site.update(editingSite.id, payload)
        : base44.entities.Site.create(addCompanyId(payload));
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(["sites"]);
      toast.success(editingSite
        ? `Site "${formData.name}" updated successfully`
        : `Site "${formData.name}" saved successfully`
      );
      setShowDialog(false);
      setEditingSite(null);
      setFormData(EMPTY_FORM);
      setErrors({});
    },
    onError: (err) => {
      toast.error(`Save failed: ${err.message || "Unknown error — check required fields"}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Site.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["sites"]);
      toast.success("Site deleted");
      setDeleteConfirm(null);
    },
    onError: (err) => {
      toast.error(`Delete failed: ${err.message}`);
    }
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (rows) => {
      const succeeded = [];
      const failed = [];
      for (const row of rows) {
        // Validate required fields before attempting save
        const missing = ["name","address","city","state","zip"].filter(f => !row[f]?.toString().trim());
        if (missing.length > 0) {
          failed.push({ row, reason: `Missing required fields: ${missing.join(", ")}` });
          continue;
        }
        try {
          const created = await base44.entities.Site.create({
            name: row.name.trim(),
            address: row.address.trim(),
            city: row.city.trim(),
            state: row.state.trim(),
            zip: row.zip.toString().trim(),
            status: "active",
            geofence_radius: Number(row.geofence_radius) || 300,
            ...(row.site_type ? { site_type: row.site_type.trim() } : {}),
            ...(row.notes    ? { notes:     row.notes.trim()     } : {}),
          });
          succeeded.push(created);
        } catch (err) {
          failed.push({ row, reason: err.message || "Unknown error" });
        }
      }
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries(["sites"]);
      if (failed.length === 0) {
        toast.success(`${succeeded.length} site${succeeded.length !== 1 ? "s" : ""} imported successfully`);
      } else if (succeeded.length > 0) {
        toast.warning(
          `${succeeded.length} site${succeeded.length !== 1 ? "s" : ""} imported, ${failed.length} row${failed.length !== 1 ? "s" : ""} skipped — ${failed[0].reason}`,
          { duration: 8000 }
        );
      } else {
        toast.error(`Import failed — all ${failed.length} rows had errors. First error: ${failed[0].reason}`, { duration: 8000 });
      }
      setShowBulk(false);
      setBulkRows([]);
      setBulkSelected([]);
    },
    onError: (err) => {
      toast.error(`Import failed: ${err.message}`);
    }
  });

  const openAdd = () => {
    setEditingSite(null);
    setFormData(EMPTY_FORM);
    setErrors({});
    setShowDialog(true);
  };

  const openEdit = (site) => {
    setEditingSite(site);
    setFormData({
      name: site.name || "",
      address: site.address || "",
      city: site.city || "",
      state: site.state || "",
      zip: site.zip || "",
      client_id: site.client_id || "",
      geofence_radius: site.geofence_radius ?? 300,
      site_type: site.site_type || "",
      status: site.status || "active",
      notes: site.notes || "",
    });
    setErrors({});
    setShowDialog(true);
  };

  const handleSave = () => {
    const errs = validate(formData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    saveMutation.mutate(formData);
  };

  const setField = (field, value) => {
    setFormData(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => { const n = { ...p }; delete n[field]; return n; });
  };

  // CSV Template download
  const downloadTemplate = () => {
    const header = "Site Name,Street Address,City,State,ZIP Code,Geofence Radius,Site Type,Notes";
    const example = "Westside Office Park,123 Main St,Los Angeles,CA,90001,300,Commercial,Night patrol required";
    const blob = new Blob([header + "\n" + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sites_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Robust CSV parser — handles quoted fields containing commas
  const parseCSVLine = (line) => {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { result.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  };

  // Normalize any reasonable column header variant → entity field name
  const normalizeHeader = (h) => {
    const s = h.trim().toLowerCase().replace(/[\s\-_]+/g, "_").replace(/[^a-z0-9_]/g, "");
    const map = {
      site_name: "name", name: "name",
      street_address: "address", address: "address", street: "address", location: "address",
      city: "city",
      state: "state", st: "state",
      zip: "zip", zip_code: "zip", postal_code: "zip", zipcode: "zip",
      geofence_radius: "geofence_radius", geofence: "geofence_radius", radius: "geofence_radius",
      site_type: "site_type", type: "site_type",
      notes: "notes", note: "notes", comments: "notes",
      client: "client_name", client_name: "client_name",
      contact: "contact_name", contact_name: "contact_name",
    };
    return map[s] || s;
  };

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const rawHeaders = parseCSVLine(lines[0]);
    const headers = rawHeaders.map(normalizeHeader);
    return lines.slice(1).map((line, i) => {
      const vals = parseCSVLine(line);
      const row = { _rowIndex: i + 1 };
      headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
      return row;
    }).filter(r => r.name && r.name.trim());
  };

  // Smart address parser: "110 Water St, Baltimore, MD 21202, USA"
  // Returns { street, city, state, zip, _parseFailed }
  const parseFullAddress = (full) => {
    if (!full) return { street: "", city: "", state: "", zip: "", _parseFailed: true };
    // Remove trailing ", USA" / ", United States" case-insensitively
    let addr = full.replace(/,?\s*(USA|United States)\s*$/i, "").trim();
    const parts = addr.split(",").map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) return { street: full, city: "", state: "", zip: "", _parseFailed: true };

    // Last part should be "STATE ZIP" or just "STATE"
    const lastPart = parts[parts.length - 1];
    // Match "MD 21202" or "MD" or "Maryland 21202"
    const stateZipMatch = lastPart.match(/^([A-Za-z]{2,})\s+(\d{5}(?:-\d{4})?)$/) ||
                          lastPart.match(/^([A-Za-z]{2,})$/);

    let state = "", zip = "";
    if (stateZipMatch) {
      state = stateZipMatch[1].toUpperCase().slice(0, 2); // normalize to 2-letter
      zip = stateZipMatch[2] || "";
    }

    // Also check if zip is embedded at end of second-to-last part e.g. "Baltimore MD 21202"
    if (!zip) {
      const zipMatch = lastPart.match(/(\d{5}(?:-\d{4})?)$/);
      if (zipMatch) {
        zip = zipMatch[1];
        state = lastPart.replace(zipMatch[0], "").trim().toUpperCase().slice(0, 2);
      }
    }

    const city = parts.length >= 3 ? parts[parts.length - 2] : "";
    const street = parts.slice(0, parts.length >= 3 ? parts.length - 2 : 1).join(", ");

    const parseFailed = !city || !state;
    return { street: street || full, city, state, zip, _parseFailed: parseFailed };
  };

  // Apply smart address parsing row-by-row where City/State/ZIP are missing
  const applyAddressParsing = (row) => {
    const missingCity  = !row.city?.toString().trim();
    const missingState = !row.state?.toString().trim();
    const missingZip   = !row.zip?.toString().trim();

    // Nothing to do if all fields are present
    if (!missingCity && !missingState && !missingZip) return row;

    // Try to parse from the address field
    const addressSource = row.address?.toString().trim() || "";
    if (!addressSource) return { ...row, _parseFailed: true };

    const parsed = parseFullAddress(addressSource);

    return {
      ...row,
      // Use parsed street as the address (stripped of city/state/zip)
      address: parsed.street || addressSource,
      city:  missingCity  ? parsed.city  : row.city,
      state: missingState ? parsed.state : row.state,
      zip:   missingZip   ? parsed.zip   : row.zip,
      _parseFailed: parsed._parseFailed,
      _parsed: true, // flag to show "auto-parsed" indicator in preview
    };
  };

  // Shared helper to enrich rows with duplicate flag + smart address parsing
  const enrichRows = (rows) =>
    rows.map((r, i) => {
      const withParsed = applyAddressParsing(r);
      return {
        ...withParsed,
        _rowIndex: r._rowIndex ?? i,
        _duplicate: sites.some(s =>
          s.name?.toLowerCase() === withParsed.name?.toLowerCase() &&
          s.address?.toLowerCase() === withParsed.address?.toLowerCase()
        ),
      };
    });

  // Shared AI extraction schema
  const AI_SITE_SCHEMA = {
    type: "object",
    properties: {
      sites: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name:             { type: "string" },
            address:          { type: "string" },
            city:             { type: "string" },
            state:            { type: "string" },
            zip:              { type: "string" },
            site_type:        { type: "string" },
            geofence_radius:  { type: "number" },
            notes:            { type: "string" },
            client_name:      { type: "string" },
            contact_name:     { type: "string" },
          }
        }
      }
    }
  };

  // Parse an Excel/XLS file using SheetJS — returns normalized row objects
  const parseXLSX = (arrayBuffer) => {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("Excel file has no sheets.");
    const sheet = workbook.Sheets[sheetName];
    // Convert to array-of-objects; header:1 gives us raw arrays so we can normalize headers ourselves
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (raw.length < 2) throw new Error("Excel file appears empty — no data rows found.");
    const rawHeaders = raw[0].map(h => String(h));
    const headers = rawHeaders.map(normalizeHeader);
    return raw.slice(1).map((vals, i) => {
      const row = { _rowIndex: i + 1 };
      headers.forEach((h, idx) => { row[h] = vals[idx] !== undefined ? String(vals[idx]).trim() : ""; });
      return row;
    }).filter(r => r.name && r.name.trim());
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkLoading(true);
    const toastId = toast.loading(`Reading "${file.name}"…`);
    try {
      let rows = [];

      if (file.name.match(/\.csv$/i)) {
        const text = await file.text();
        rows = parseCSV(text);
        if (rows.length === 0) {
          toast.error("No valid rows found. Check that your CSV has a header row and the required columns (Site Name, Address, City, State, ZIP).", { id: toastId });
          return;
        }
      } else if (file.name.match(/\.(xlsx|xls)$/i)) {
        const arrayBuffer = await file.arrayBuffer();
        rows = parseXLSX(arrayBuffer);
        if (rows.length === 0) throw new Error("No valid rows found in Excel file. Ensure row 1 contains column headers and at least one data row has a site name.");
      } else if (file.name.match(/\.pdf$/i)) {
        toast.loading(`Uploading PDF and extracting data with AI…`, { id: toastId });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: AI_SITE_SCHEMA });
        if (result.status === "error") throw new Error(result.details || "AI extraction failed");
        rows = result.output?.sites || [];
        if (rows.length === 0) throw new Error("No site data could be extracted from the PDF.");
      } else {
        throw new Error("Unsupported file type. Please upload a CSV, Excel (.xlsx/.xls), or PDF file.");
      }

      const enriched = enrichRows(rows);
      setBulkRows(enriched);
      setBulkSelected(enriched.map((_, i) => i));
      toast.success(`${enriched.length} site(s) parsed — review below and click Import.`, { id: toastId });
    } catch (err) {
      toast.error(`Could not read file: ${err.message}`, { id: toastId });
    } finally {
      setBulkLoading(false);
      e.target.value = "";
    }
  };

  const toggleBulkRow = (idx) => {
    setBulkSelected(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleBulkImport = () => {
    const selected = bulkRows.filter((_, i) => bulkSelected.includes(i));
    if (selected.length === 0) { toast.error("No rows selected for import"); return; }
    toast.loading(`Importing ${selected.length} site${selected.length !== 1 ? "s" : ""}…`, { id: "bulk-import" });
    bulkImportMutation.mutate(selected, {
      onSettled: () => toast.dismiss("bulk-import"),
    });
  };

  const getClientName = (clientId) => {
    const c = clients.find(c => c.id === clientId);
    return c?.name || "";
  };

  const filtered = sites.filter(s => {
    const q = search.toLowerCase();
    const clientName = getClientName(s.client_id).toLowerCase();
    const matchSearch = !search || 
      s.name?.toLowerCase().includes(q) || 
      s.address?.toLowerCase().includes(q) || 
      s.city?.toLowerCase().includes(q) ||
      clientName.includes(q);
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusBadge = (status) => (
    <Badge className={status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
      {status === "active" ? "Active" : "Inactive"}
    </Badge>
  );

  if (isLoading || clientsLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Site Management" subtitle={`${sites.length} total sites`} currentPage="SiteManagement" />

      <div className="max-w-7xl mx-auto px-4 py-6 pb-32">
        {/* Action Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={openAdd} className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white gap-2">
            <Plus className="w-4 h-4" /> Add Site
          </Button>
          <Button onClick={() => setShowBulk(true)} variant="outline" className="gap-2">
            <Upload className="w-4 h-4" /> Bulk Import
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search by site name, address, city, or client name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Site List */}
        {filtered.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(site => (
              <Card key={site.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-slate-900">{site.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {[site.address, site.city, site.state, site.zip].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    </div>
                    {statusBadge(site.status)}
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-600 mb-4">
                    {getClientName(site.client_id) && (
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{getClientName(site.client_id)}</span>
                    )}
                    {site.assigned_officers?.length > 0 && (
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{site.assigned_officers.length} officer(s)</span>
                    )}
                    {site.geofence_radius && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{site.geofence_radius} ft geofence</span>
                    )}
                    {site.site_type && (
                      <Badge variant="outline" className="text-xs">{site.site_type}</Badge>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => openEdit(site)} className="gap-1 text-xs">
                      <Edit className="w-3 h-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setDeleteConfirm(site)}
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No sites added yet</h3>
            <p className="text-slate-500 mb-6">Click <strong>Add Site</strong> or <strong>Bulk Import</strong> to get started.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={openAdd} className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white gap-2"><Plus className="w-4 h-4" />Add Site</Button>
              <Button onClick={() => setShowBulk(true)} variant="outline" className="gap-2"><Upload className="w-4 h-4" />Bulk Import</Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={open => { setShowDialog(open); if (!open) { setErrors({}); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingSite ? "Edit Site" : "Add New Site"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Site Name <span className="text-red-500">*</span></Label>
              <Input value={formData.name} onChange={e => setField("name", e.target.value)} placeholder="e.g. Westside Office Park" className={errors.name ? "border-red-500" : ""} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label>Street Address <span className="text-red-500">*</span></Label>
              <Input value={formData.address} onChange={e => setField("address", e.target.value)} placeholder="123 Main St" className={errors.address ? "border-red-500" : ""} />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City <span className="text-red-500">*</span></Label>
                <Input value={formData.city} onChange={e => setField("city", e.target.value)} placeholder="Los Angeles" className={errors.city ? "border-red-500" : ""} />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>
              <div>
                <Label>State <span className="text-red-500">*</span></Label>
                <Input value={formData.state} onChange={e => setField("state", e.target.value)} placeholder="CA" className={errors.state ? "border-red-500" : ""} />
                {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ZIP Code <span className="text-red-500">*</span></Label>
                <Input value={formData.zip} onChange={e => setField("zip", e.target.value)} placeholder="90001" className={errors.zip ? "border-red-500" : ""} />
                {errors.zip && <p className="text-red-500 text-xs mt-1">{errors.zip}</p>}
              </div>
              <div>
                <Label>Geofence Radius (ft)</Label>
                <Input type="number" value={formData.geofence_radius} onChange={e => setField("geofence_radius", e.target.value)} placeholder="300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Site Type</Label>
                <Select value={formData.site_type} onValueChange={v => setField("site_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {clients.length > 0 && (
              <div>
                <Label>Client</Label>
                <Select value={formData.client_id} onValueChange={v => setField("client_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Assign to client (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <textarea
                value={formData.notes}
                onChange={e => setField("notes", e.target.value)}
                placeholder="Additional notes about this site..."
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold"
            >
              {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : (editingSite ? "Save Changes" : "Save Site")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Site</DialogTitle></DialogHeader>
          <p className="text-slate-600 text-sm">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This will remove the site from all schedules and assignments.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteConfirm?.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={showBulk} onOpenChange={open => { setShowBulk(open); if (!open) { setBulkRows([]); setBulkSelected([]); } }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bulk Import Sites</DialogTitle></DialogHeader>

          {bulkRows.length === 0 ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-600">
                Upload a <strong>CSV</strong> file with site data, or a <strong>PDF</strong> and AI will extract the site information automatically.
              </p>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <div className="flex-1">
                  <p className="font-medium text-sm text-slate-700 mb-1">Expected CSV columns:</p>
                  <p className="text-xs text-slate-500">Site Name, Street Address, City, State, ZIP Code, Geofence Radius, Site Type, Notes</p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 flex-shrink-0">
                  <Download className="w-4 h-4" /> Download Template
                </Button>
              </div>
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-[#c9a227] hover:bg-amber-50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {bulkLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-[#c9a227] animate-spin" />
                    <p className="text-sm text-slate-500">Processing file...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                    <p className="font-medium text-slate-700">Click to upload CSV, Excel, or PDF</p>
                    <p className="text-sm text-slate-500 mt-1">or drag and drop</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".csv,.pdf,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm text-slate-600">
                    <strong>{bulkSelected.length}</strong> of <strong>{bulkRows.length}</strong> sites selected for import
                  </p>
                  {bulkRows.some(r => r._parsed) && (
                    <p className="text-xs text-emerald-700 mt-0.5">
                      ✓ City/State/ZIP auto-parsed from combined address column — shown in green
                    </p>
                  )}
                  {bulkRows.some(r => r._parseFailed) && (
                    <p className="text-xs text-yellow-700 mt-0.5">
                      ⚠ Yellow rows: address parsing incomplete — verify before importing
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setBulkSelected(bulkRows.map((_, i) => i))}>Select All</Button>
                  <Button size="sm" variant="outline" onClick={() => setBulkSelected([])}>Deselect All</Button>
                  <Button size="sm" variant="outline" onClick={() => { setBulkRows([]); setBulkSelected([]); }}>← Re-upload</Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left w-10"></th>
                      <th className="p-3 text-left">Site Name</th>
                      <th className="p-3 text-left">Address</th>
                      <th className="p-3 text-left">City</th>
                      <th className="p-3 text-left">State</th>
                      <th className="p-3 text-left">ZIP</th>
                      <th className="p-3 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, idx) => {
                      const rowBg = row._parseFailed
                        ? "bg-yellow-50"
                        : row._duplicate
                          ? "bg-orange-50"
                          : "hover:bg-slate-50";
                      return (
                        <tr key={idx} className={`border-t ${rowBg}`}>
                          <td className="p-3">
                            <Checkbox checked={bulkSelected.includes(idx)} onCheckedChange={() => toggleBulkRow(idx)} />
                          </td>
                          <td className="p-3 font-medium">
                            {row.name || <span className="text-red-500 italic">missing</span>}
                            {row._duplicate && (
                              <div className="flex items-center gap-1 text-orange-700 text-xs mt-1">
                                <AlertTriangle className="w-3 h-3" />
                                Possible duplicate
                              </div>
                            )}
                          </td>
                          <td className="p-3 max-w-[180px] truncate" title={row.address}>
                            {row.address || <span className="text-red-500 italic">missing</span>}
                          </td>
                          <td className="p-3">
                            {row.city
                              ? <span className={row._parsed && !row._parseFailed ? "text-emerald-700 font-medium" : ""}>{row.city}</span>
                              : <span className="text-red-500 italic">missing</span>}
                          </td>
                          <td className="p-3">
                            {row.state
                              ? <span className={row._parsed && !row._parseFailed ? "text-emerald-700 font-medium" : ""}>{row.state}</span>
                              : <span className="text-red-500 italic">missing</span>}
                          </td>
                          <td className="p-3">
                            {row.zip
                              ? <span className={row._parsed && !row._parseFailed ? "text-emerald-700 font-medium" : ""}>{row.zip}</span>
                              : <span className="text-amber-600 italic text-xs">not found</span>}
                          </td>
                          <td className="p-3">{row.site_type}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulk(false); setBulkRows([]); setBulkSelected([]); }}>Cancel</Button>
            {bulkRows.length > 0 && (
              <Button
                onClick={handleBulkImport}
                disabled={bulkImportMutation.isPending || bulkSelected.length === 0}
                className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold"
              >
                {bulkImportMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : `Import ${bulkSelected.length} Sites`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}