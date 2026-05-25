import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, MapPin, Users, FileText, ArrowLeft, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function SiteDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const siteId = params.get("id");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const { data: site, isLoading } = useQuery({
    queryKey: ["site", siteId],
    queryFn: () => base44.entities.Site.filter({ id: siteId }),
    select: (data) => data[0],
    enabled: !!siteId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents", siteId],
    queryFn: () => base44.entities.Incident.filter({ site_id: siteId }),
    enabled: !!siteId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["siteDocuments", siteId],
    queryFn: () => base44.entities.SiteDocument.filter({ site_id: siteId }),
    enabled: !!siteId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Site.update(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["site", siteId]);
      setEditing(false);
      toast.success("Site updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleEdit = () => {
    setForm({
      name: site?.name || "",
      address: site?.address || "",
      city: site?.city || "",
      state: site?.state || "",
      zip: site?.zip || "",
      notes: site?.notes || "",
    });
    setEditing(true);
  };

  const assignedOfficers = employees.filter((e) =>
    (site?.assigned_officers || []).includes(e.id)
  );

  if (isLoading) return <LoadingScreen />;
  if (!site) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Site not found.</p>
        <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Go Back</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{site.name}</h1>
              <p className="text-sm text-slate-500">{site.address}, {site.city}, {site.state} {site.zip}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={site.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
              {site.status || "active"}
            </Badge>
            {!editing && (
              <Button onClick={handleEdit} variant="outline" size="sm"><Edit className="w-4 h-4 mr-1" />Edit</Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {editing ? (
          <Card className="mb-6">
            <CardHeader><CardTitle>Edit Site</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["name", "address", "city", "state", "zip"].map((field) => (
                  <div key={field}>
                    <Label className="capitalize">{field}</Label>
                    <Input value={form[field] || ""} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <Label>Notes</Label>
                  <Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending} className="bg-[#1a2b4a]">
                  <Save className="w-4 h-4 mr-1" />Save
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-1" />Cancel</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="officers">Officers ({assignedOfficers.length})</TabsTrigger>
            <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-[#1a2b4a]">{assignedOfficers.length}</div>
                <div className="text-sm text-slate-500">Assigned Officers</div>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-[#1a2b4a]">{incidents.length}</div>
                <div className="text-sm text-slate-500">Total Incidents</div>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-[#1a2b4a]">{documents.length}</div>
                <div className="text-sm text-slate-500">Documents</div>
              </CardContent></Card>
            </div>
            {site.notes && (
              <Card className="mt-4">
                <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                <CardContent><p className="text-slate-600 text-sm">{site.notes}</p></CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="officers">
            <div className="space-y-3">
              {assignedOfficers.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-slate-400"><Users className="w-8 h-8 mx-auto mb-2" />No officers assigned</CardContent></Card>
              ) : assignedOfficers.map((emp) => (
                <Card key={emp.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1a2b4a] text-white flex items-center justify-center font-bold text-sm">
                      {emp.firstName?.[0]}{emp.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                      <p className="text-sm text-slate-500">{emp.positionTitle || emp.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="incidents">
            <div className="space-y-3">
              {incidents.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-slate-400"><FileText className="w-8 h-8 mx-auto mb-2" />No incidents recorded</CardContent></Card>
              ) : incidents.map((inc) => (
                <Card key={inc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{inc.incident_type}</p>
                        <p className="text-sm text-slate-500">{new Date(inc.incident_date).toLocaleDateString()}</p>
                      </div>
                      <Badge className={
                        inc.severity === "critical" ? "bg-red-100 text-red-700" :
                        inc.severity === "high" ? "bg-orange-100 text-orange-700" :
                        inc.severity === "medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-slate-100 text-slate-600"
                      }>{inc.severity}</Badge>
                    </div>
                    {inc.description && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{inc.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-3">
              {documents.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-slate-400"><FileText className="w-8 h-8 mx-auto mb-2" />No documents uploaded</CardContent></Card>
              ) : documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{doc.file_name}</p>
                      <p className="text-sm text-slate-500 capitalize">{doc.document_type} · {doc.uploaded_by_name || doc.uploaded_by}</p>
                    </div>
                    <a href={doc.file_url} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">View</Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}