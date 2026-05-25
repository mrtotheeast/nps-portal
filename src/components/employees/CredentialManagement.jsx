import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, Bell, Download, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { toast } from "sonner";

const DEFAULT_FORM = { credential_type: 'certification', credential_name: '', issuing_authority: '', credential_number: '', issue_date: '', expiration_date: '', notes: '' };

export default function CredentialManagement({ employeeId, employeeName, employeeEmail }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const queryClient = useQueryClient();
  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ["credentials", employeeId],
    queryFn: () => base44.entities.Credential.filter({ employee_id: employeeId }),
    enabled: !!employeeId,
  });

  const resetForm = () => { setFormData(DEFAULT_FORM); setEditingId(null); };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Credential.create({ ...data, employee_id: employeeId }),
    onSuccess: () => { queryClient.invalidateQueries(["credentials", employeeId]); resetForm(); setShowDialog(false); toast.success("Credential added"); },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Credential.update(editingId, data),
    onSuccess: () => { queryClient.invalidateQueries(["credentials", employeeId]); resetForm(); setShowDialog(false); toast.success("Credential updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Credential.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(["credentials", employeeId]); toast.success("Credential deleted"); },
  });

  const sendReminderMutation = useMutation({
    mutationFn: (credential) => base44.functions.invoke('sendCredentialReminder', { employee_id: employeeId, employee_name: employeeName, employee_email: employeeEmail, credential_name: credential.credential_name, expiration_date: credential.expiration_date }),
    onSuccess: () => toast.success("Reminder sent"),
  });

  const handleSubmit = () => {
    if (!formData.credential_name || !formData.expiration_date) { toast.error("Please fill in all required fields"); return; }
    editingId ? updateMutation.mutate(formData) : createMutation.mutate(formData);
  };

  const getStatus = (exp) => {
    if (!exp) return 'active';
    if (isPast(new Date(exp))) return 'expired';
    return differenceInDays(new Date(exp), new Date()) <= 30 ? 'expiring' : 'active';
  };

  const statusConfig = {
    expired: { icon: <AlertTriangle className="w-4 h-4 text-red-600" />, color: 'bg-red-100 text-red-800' },
    expiring: { icon: <Clock className="w-4 h-4 text-amber-600" />, color: 'bg-amber-100 text-amber-800' },
    active: { icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, color: 'bg-green-100 text-green-800' },
  };

  const expiringCredentials = credentials.filter(c => getStatus(c.expiration_date) !== 'active');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Credentials & Certifications</CardTitle>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Credential</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {expiringCredentials.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50"><AlertTriangle className="h-4 w-4 text-amber-600" /><AlertDescription className="text-amber-800">{expiringCredentials.length} credential(s) expiring soon or expired</AlertDescription></Alert>
        )}
        {isLoading ? <div className="text-center py-4 text-slate-500">Loading credentials...</div> : credentials.length === 0 ? <div className="text-center py-6 text-slate-500">No credentials recorded</div> : (
          <div className="space-y-3">
            {credentials.map((credential) => {
              const status = getStatus(credential.expiration_date);
              const { icon, color } = statusConfig[status];
              return (
                <div key={credential.id} className="p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-slate-600" />
                        <h4 className="font-semibold">{credential.credential_name}</h4>
                        <Badge className={color}><div className="flex items-center gap-1">{icon}{status.charAt(0).toUpperCase() + status.slice(1)}</div></Badge>
                      </div>
                      <p className="text-sm text-slate-600">{credential.issuing_authority}</p>
                    </div>
                    <div className="flex gap-1">
                      {status !== 'active' && <Button size="sm" variant="outline" onClick={() => sendReminderMutation.mutate(credential)} disabled={sendReminderMutation.isPending} className="gap-1"><Bell className="w-3 h-3" />Remind</Button>}
                      <Button size="sm" variant="outline" onClick={() => { setFormData(credential); setEditingId(credential.id); setShowDialog(true); }}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(credential.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 border-t pt-3">
                    {credential.credential_number && <div><p className="font-medium text-slate-900">{credential.credential_number}</p><p>ID Number</p></div>}
                    {credential.issue_date && <div><p className="font-medium text-slate-900">{format(new Date(credential.issue_date), 'MMM d, yyyy')}</p><p>Issued</p></div>}
                    {credential.expiration_date && <div><p className={`font-medium ${status !== 'active' ? 'text-red-600' : 'text-slate-900'}`}>{format(new Date(credential.expiration_date), 'MMM d, yyyy')}</p><p>Expires</p></div>}
                  </div>
                  {credential.notes && <p className="text-xs text-slate-600 mt-2 italic">{credential.notes}</p>}
                  {credential.document_url && <Button size="sm" variant="outline" onClick={() => window.open(credential.document_url, '_blank')} className="mt-2 gap-1 w-full"><Download className="w-3 h-3" />View Document</Button>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'Edit' : 'Add New'} Credential</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Credential Type</Label>
              <Select value={formData.credential_type} onValueChange={val => set("credential_type", val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="license">License</SelectItem><SelectItem value="certification">Certification</SelectItem><SelectItem value="permit">Permit</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Credential Name *</Label><Input value={formData.credential_name} onChange={e => set("credential_name", e.target.value)} placeholder="e.g., Security License" /></div>
            <div><Label>Issuing Authority</Label><Input value={formData.issuing_authority} onChange={e => set("issuing_authority", e.target.value)} placeholder="e.g., State Department" /></div>
            <div><Label>Credential Number</Label><Input value={formData.credential_number} onChange={e => set("credential_number", e.target.value)} placeholder="ID or license number" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Issue Date</Label><Input type="date" value={formData.issue_date} onChange={e => set("issue_date", e.target.value)} /></div>
              <div><Label>Expiration Date *</Label><Input type="date" value={formData.expiration_date} onChange={e => set("expiration_date", e.target.value)} /></div>
            </div>
            <div><Label>Notes</Label><Input value={formData.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional info" /></div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1">{editingId ? 'Update' : 'Add'} Credential</Button>
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}