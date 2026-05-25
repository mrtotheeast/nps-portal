import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, Eye } from "lucide-react";

export default function ImportEmployeesDialog({ open, onClose, onImport, importing, result }) {
  const [csvText, setCsvText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((header, idx) => { obj[header] = values[idx]; });
      return obj;
    });
  };

  const parseXLSX = async (file) => {
    const XLSX = await import('xlsx');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(firstSheet));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = async (file) => {
    setSelectedFile(file);
    const ext = file.name.split('.').pop().toLowerCase();
    setFileType(ext);
    if (ext === 'csv') { const text = await file.text(); setPreviewData(parseCSV(text)); }
    else if (ext === 'xlsx' || ext === 'xls') { setPreviewData(await parseXLSX(file)); }
  };

  const handleImport = async () => {
    if (csvText) { onImport({ type: 'csv', data: parseCSV(csvText) }); return; }
    if (!selectedFile) return;
    if (fileType === 'pdf') { onImport({ type: 'pdf', file: selectedFile }); }
    else if (fileType === 'xlsx' || fileType === 'xls') { onImport({ type: 'xlsx', data: await parseXLSX(selectedFile) }); }
    else if (fileType === 'csv') { const text = await selectedFile.text(); onImport({ type: 'csv', data: parseCSV(text) }); }
  };

  const handleClose = () => { setCsvText(""); setSelectedFile(null); setFileType(null); setPreviewData(null); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Import Employees - Preview Before Import</DialogTitle></DialogHeader>
        <Tabs defaultValue="file" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="csv">Paste CSV</TabsTrigger>
          </TabsList>
          <TabsContent value="file" className="space-y-4">
            <div>
              <Label>Select File (CSV, XLSX, or PDF)</Label>
              <Input type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={e => { const f = e.target.files[0]; if (f) handleFileSelect(f); }} className="mt-2" />
              {selectedFile && <p className="text-sm text-slate-600 mt-2">Selected: {selectedFile.name} ({fileType?.toUpperCase()})</p>}
            </div>
            {previewData && previewData.length > 0 && (
              <Card className="p-4 max-h-80 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2"><Eye className="w-4 h-4" />Preview ({previewData.length} rows)</h3>
                  <span className="text-sm text-slate-500">Review before importing</span>
                </div>
                <div className="space-y-2">
                  {previewData.slice(0, 10).map((row, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded border text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(row).slice(0, 6).map(([key, value]) => (
                          <div key={key}><span className="font-medium text-xs text-slate-500">{key}:</span><p className="text-slate-900 truncate">{String(value)}</p></div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {previewData.length > 10 && <p className="text-xs text-slate-500 text-center pt-2">... and {previewData.length - 10} more rows</p>}
                </div>
              </Card>
            )}
            <Alert className="bg-blue-50 border-blue-200">
              <FileText className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-700 text-sm">
                <strong>Required columns:</strong> First Name, Last Name, Email, Phone Number, Position<br />
                <strong>Optional:</strong> Employee ID, Base Hourly Rate, Max Hours
              </AlertDescription>
            </Alert>
          </TabsContent>
          <TabsContent value="csv" className="space-y-4">
            <div>
              <Label>Paste CSV Data</Label>
              <textarea value={csvText} onChange={e => setCsvText(e.target.value)} className="w-full h-64 p-3 border rounded-md font-mono text-xs mt-2" placeholder={"First Name,Last Name,Email,Phone Number,Position\nJohn,Doe,john@example.com,1234567890,Officer"} />
            </div>
          </TabsContent>
        </Tabs>

        {result && (
          <Alert className={result.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}>
            {result.success ? (
              <><CheckCircle className="w-4 h-4 text-emerald-600" /><AlertDescription className="text-emerald-700">Successfully imported {result.count} employees!{result.errors?.length > 0 && <div className="mt-2 text-red-700">⚠️ Errors: {result.errors.length}</div>}</AlertDescription></>
            ) : (
              <><AlertCircle className="w-4 h-4 text-red-600" /><AlertDescription className="text-red-700">Import failed: {result.error}</AlertDescription></>
            )}
          </Alert>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={(!csvText && !selectedFile) || importing} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
            {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            {previewData ? `Import ${previewData.length} Employees` : "Import Employees"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}