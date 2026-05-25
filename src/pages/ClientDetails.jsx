import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Edit, Save, X, Plus, Building2, Mail, Phone, FileText, Trash2, Send, RotateCw, History } from "lucide-react";
import ClientDeletedBanner from "@/components/clients/ClientDeletedBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import LoadingScreen from "@/components/shared/LoadingScreen";
import ContractStatusTracker from "@/components/clients/ContractStatusTracker";
import ClientSitesSummary from "@/components/clients/ClientSitesSummary";
import ContactInviteManager from "@/components/clients/ContactInviteManager";
import ContactPermissionsManager from "@/components/clients/ContactPermissionsManager";

export default function ClientDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userRole = user?.role_type || user?.role || "employee";
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get("id");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [newSites, setNewSites] = useState([]);
  const [sitesToDelete, setSitesToDelete] = useState([]);
  const [additionalContacts, setAdditionalContacts] = useState([]);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }),
    select: (data) => data[0],
    enabled: !!clientId,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", clientId],
    queryFn: () => base44.entities.Site.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["client-contacts", clientId],
    queryFn: () => base44.entities.ClientContact.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["clientIncidents", clientId],
    queryFn: async () => {
      if (!sites.length) return [];
      const siteIds = sites.map((s) => s.id);
      const all = await Promise.all(siteIds.map((sid) => base44.entities.Incident.filter({ site_id: sid })));
      return all.flat();
    },
    enabled: sites.length > 0,
  });

  const { data: renewalHistory = [] } = useQuery({
    queryKey: ["renewalHistory", clientId],
    queryFn: () => base44.entities.ContractRenewal.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const sendInviteMutation = useMutation({
    mutationFn: (contactId) => base44.functions.invoke("sendClientInvite", { contact_id: contactId, client_id: clientId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["client-contacts", clientId]);
      toast.success("Invite sent");
    },
    onError: (err) => toast.error(err.message),
  });

  const [renewalForm, setRenewalForm] = useState({ newDate: "", years: 1, notes: "" });
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);

  const renewalMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("processContractRenewal", { 
      client_id: clientId, 
      ...data 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(["client", clientId]);
      queryClient.invalidateQueries(["renewalHistory", clientId]);
      setShowRenewalDialog(false);
      setRenewalForm({ newDate: "", years: 1, notes: "" });
      toast.success("Contract renewed successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const clientData = { ...data };
      delete clientData.sites_to_create;
      await base44.entities.Client.update(clientId, clientData);
      
      // Update existing contacts
      for (const contact of additionalContacts) {
        if (contact.id) {
          await base44.entities.ClientContact.update(contact.id, {
            full_name: contact.full_name,
            email: contact.email,
            phone: contact.phone,
            title: contact.title,
          });
        }
      }
      
      // Create new sites
      for (const site of newSites) {
        if (site.name.trim()) {
          const newSite = await base44.entities.Site.create({
            name: site.name,
            address: site.address,
            city: site.city,
            state: site.state,
            zip: site.zip,
            client_id: clientId,
            status: "active",
          });
          
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
            console.warn("Could not create template:", e);
          }
        }
      }
      
      // Delete sites
      for (const siteId of sitesToDelete) {
        await base44.entities.Site.delete(siteId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["client", clientId]);
      queryClient.invalidateQueries(["client-contacts", clientId]);
      queryClient.invalidateQueries(["sites", clientId]);
      setEditing(false);
      setNewSites([]);
      setSitesToDelete([]);
      setAdditionalContacts([]);
      toast.success("Client updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleEdit = () => {
    setForm({
      name: client?.name || "",
      notes: client?.notes || "",
      status: client?.status || "active",
      service_type: client?.service_type || "unarmed",
      contract_start_date: client?.contract_start_date || "",
      contract_end_date: client?.contract_end_date || "",
      primary_contact: {
        full_name: client?.primary_contact?.full_name || "",
        title: client?.primary_contact?.title || "",
        email: client?.primary_contact?.email || "",
        phone: client?.primary_contact?.phone || "",
      },
    });
    setAdditionalContacts(contacts.map(c => ({ id: c.id, full_name: c.full_name, email: c.email, phone: c.phone, title: c.title })));
    setNewSites([]);
    setSitesToDelete([]);
    setEditing(true);
  };

  const primaryContact = client?.primary_contact || {};
  const isDeleted = client?.status === "deleted";

  if (isLoading) return <LoadingScreen />;
  if (!client) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Client not found.</p>
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
              <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
              <p className="text-sm text-slate-500">{client.service_type} · {sites.length} site{sites.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={
              client.status === "active" ? "bg-emerald-100 text-emerald-700" :
              client.status === "deleted" ? "bg-red-100 text-red-700" :
              client.status === "prospect" ? "bg-blue-100 text-blue-700" :
              "bg-slate-100 text-slate-500"
            }>{client.status}</Badge>
            {!editing && !isDeleted && <Button onClick={handleEdit} variant="outline" size="sm"><Edit className="w-4 h-4 mr-1" />Edit</Button>}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {isDeleted && (
          <ClientDeletedBanner client={client} clientId={clientId} userRole={userRole} />
        )}
        {!editing && !isDeleted && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <ContractStatusTracker client={client} />
            <ClientSitesSummary clientId={clientId} />
          </div>
        )}

        {editing && !isDeleted && (
          <Card className="mb-6">
            <CardHeader><CardTitle>Edit Client</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Company Name *</Label>
                  <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Service Type</Label>
                  <select value={form.service_type || "unarmed"} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="armed">Armed</option>
                    <option value="unarmed">Unarmed</option>
                    <option value="both">Both</option>
                    <option value="spo">SPO</option>
                    <option value="event">Event</option>
                    <option value="patrol">Patrol</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contract Start</Label>
                  <Input type="date" value={form.contract_start_date || ""} onChange={(e) => setForm({ ...form, contract_start_date: e.target.value })} />
                </div>
                <div>
                  <Label>Contract End</Label>
                  <Input type="date" value={form.contract_end_date || ""} onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              {/* Primary Contact */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Primary Contact</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={form.primary_contact?.full_name || ""} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, full_name: e.target.value } })} />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input value={form.primary_contact?.title || ""} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, title: e.target.value } })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.primary_contact?.email || ""} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, email: e.target.value } })} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.primary_contact?.phone || ""} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, phone: e.target.value } })} />
                  </div>
                </div>
              </div>

              {/* Additional Contacts */}
              {additionalContacts.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Additional Contacts</h4>
                  <div className="space-y-3">
                    {additionalContacts.map((contact, idx) => (
                      <div key={contact.id || idx} className="p-3 bg-slate-50 rounded-lg border space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Full Name</Label>
                            <Input value={contact.full_name} onChange={(e) => {
                              const updated = [...additionalContacts];
                              updated[idx].full_name = e.target.value;
                              setAdditionalContacts(updated);
                            }} className="text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Title</Label>
                            <Input value={contact.title || ""} onChange={(e) => {
                              const updated = [...additionalContacts];
                              updated[idx].title = e.target.value;
                              setAdditionalContacts(updated);
                            }} className="text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Email</Label>
                            <Input type="email" value={contact.email} onChange={(e) => {
                              const updated = [...additionalContacts];
                              updated[idx].email = e.target.value;
                              setAdditionalContacts(updated);
                            }} className="text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Phone</Label>
                            <Input value={contact.phone || ""} onChange={(e) => {
                              const updated = [...additionalContacts];
                              updated[idx].phone = e.target.value;
                              setAdditionalContacts(updated);
                            }} className="text-sm" />
                          </div>
                        </div>
                        <Button size="sm" variant="destructive" className="w-full h-7 text-xs"
                          onClick={async () => {
                            if (contact.id) {
                              await base44.entities.ClientContact.delete(contact.id);
                              queryClient.invalidateQueries(["client-contacts", clientId]);
                            }
                            setAdditionalContacts(additionalContacts.filter((_, i) => i !== idx));
                          }}>
                          Remove Contact
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Additional Contact */}
              <div className="border-t pt-4">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => setAdditionalContacts([...additionalContacts, { full_name: "", email: "", phone: "", title: "" }])}
                >
                  <Plus className="w-3 h-3" /> Add Contact
                </Button>
              </div>

              {/* Delete Existing Sites */}
              {sites.length > 0 && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-semibold mb-2 block">Delete Sites</Label>
                  <div className="space-y-2">
                    {sites.filter(s => !sitesToDelete.includes(s.id)).map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.city}, {s.state}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setSitesToDelete([...sitesToDelete, s.id])}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {sitesToDelete.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {sitesToDelete.length} site(s) marked for deletion
                    </div>
                  )}
                </div>
              )}

              {/* Add New Sites */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Add New Sites</Label>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs gap-1"
                    onClick={() => setNewSites([...newSites, { name: "", address: "", city: "", state: "", zip: "" }])}
                  >
                    <Plus className="w-3 h-3" /> Add Site
                  </Button>
                </div>
                {newSites.map((site, idx) => (
                  <div key={idx} className="border rounded p-3 mb-2 space-y-2 bg-slate-50">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-slate-600">New Site {idx + 1}</p>
                      <button 
                        onClick={() => setNewSites(newSites.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Input
                      placeholder="Site name"
                      value={site.name}
                      onChange={(e) => {
                        const updated = [...newSites];
                        updated[idx].name = e.target.value;
                        setNewSites(updated);
                      }}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Street address"
                      value={site.address}
                      onChange={(e) => {
                        const updated = [...newSites];
                        updated[idx].address = e.target.value;
                        setNewSites(updated);
                      }}
                      className="text-sm"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="City"
                        value={site.city}
                        onChange={(e) => {
                          const updated = [...newSites];
                          updated[idx].city = e.target.value;
                          setNewSites(updated);
                        }}
                        className="text-sm"
                      />
                      <Input
                        placeholder="State"
                        value={site.state}
                        maxLength="2"
                        onChange={(e) => {
                          const updated = [...newSites];
                          updated[idx].state = e.target.value;
                          setNewSites(updated);
                        }}
                        className="text-sm"
                      />
                      <Input
                        placeholder="ZIP"
                        value={site.zip}
                        onChange={(e) => {
                          const updated = [...newSites];
                          updated[idx].zip = e.target.value;
                          setNewSites(updated);
                        }}
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending} className="bg-[#1a2b4a]">
                  <Save className="w-4 h-4 mr-1" />Save
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-1" />Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="contacts">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="contacts">Portal Contacts</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="sites">Sites ({sites.length})</TabsTrigger>
            <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
            <TabsTrigger value="renewals" className="flex items-center gap-1">
              <History className="w-4 h-4" />
              Renewal History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts">
            <Card>
              <CardHeader><CardTitle>Portal Contact Invitations</CardTitle></CardHeader>
              <CardContent>
                {contacts.length > 0 ? (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{contact.full_name}</p>
                          <p className="text-xs text-slate-500">{contact.email}</p>
                          {contact.title && <p className="text-xs text-slate-600 mt-1">{contact.title}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            contact.invite_status === "active" ? "bg-emerald-100 text-emerald-700" :
                            contact.invite_status === "invited" ? "bg-blue-100 text-blue-700" :
                            "bg-slate-100 text-slate-600"
                          }>{contact.invite_status || "not_invited"}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => sendInviteMutation.mutate(contact.id)}
                            disabled={sendInviteMutation.isPending}
                          >
                            <Send className="w-3 h-3" />
                            {contact.invite_status === "invited" ? "Resend" : "Send Invite"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No portal contacts added yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardHeader><CardTitle>Portal Permissions</CardTitle></CardHeader>
              <CardContent>
                {contacts.length > 0 ? (
                  <div className="space-y-6">
                    {contacts.map((contact) => (
                      <ContactPermissionsManager
                        key={contact.id}
                        contact={contact}
                        clientId={clientId}
                        isMainContact={contact.is_main_contact}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No contacts to manage</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sites">
            <div className="space-y-3">
              {sites.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-slate-400"><Building2 className="w-8 h-8 mx-auto mb-2" />No sites assigned</CardContent></Card>
              ) : sites.map((s) => (
                <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/SiteDetails?id=${s.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-slate-500">{s.address}, {s.city}, {s.state} {s.zip}</p>
                      </div>
                      <Badge className={s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                        {s.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t">
                      <span>Geofence: <span className="font-semibold text-slate-700">{s.geofence_radius || 300} ft</span></span>
                      <span>({Math.round((s.geofence_radius || 300) * 0.3048)} m)</span>
                      {s.site_type && <span className="capitalize ml-auto">{s.site_type}</span>}
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
                         "bg-yellow-100 text-yellow-700"
                       }>{inc.severity}</Badge>
                     </div>
                     {inc.description && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{inc.description}</p>}
                   </CardContent>
                 </Card>
               ))}
             </div>
           </TabsContent>

           <TabsContent value="renewals">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Renewal History
                </CardTitle>
                <Button 
                  onClick={() => setShowRenewalDialog(true)} 
                  className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] gap-1"
                  size="sm"
                >
                  <RotateCw className="w-4 h-4" />
                  New Renewal
                </Button>
              </CardHeader>
              <CardContent>
                {renewalHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No renewals recorded yet</p>
                ) : (
                  <div className="space-y-3">
                    {renewalHistory.map((renewal) => (
                      <div key={renewal.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">Renewed on {new Date(renewal.renewal_date).toLocaleDateString()}</p>
                            <p className="text-xs text-slate-600">by {renewal.processed_by}</p>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700">{renewal.renewal_term_years} year(s)</Badge>
                        </div>
                        <div className="text-xs text-slate-600 space-y-1">
                          <p>Previous expiry: {new Date(renewal.old_expiration_date).toLocaleDateString()}</p>
                          <p className="font-semibold text-slate-700">New expiry: {new Date(renewal.new_expiration_date).toLocaleDateString()}</p>
                          {renewal.notes && <p className="italic">{renewal.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Renewal Dialog */}
        <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Contract Renewal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>New Expiration Date *</Label>
                <Input 
                  type="date" 
                  value={renewalForm.newDate} 
                  onChange={(e) => setRenewalForm({ ...renewalForm, newDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Renewal Term (Years)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={renewalForm.years} 
                  onChange={(e) => setRenewalForm({ ...renewalForm, years: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input 
                  placeholder="Optional notes about this renewal"
                  value={renewalForm.notes} 
                  onChange={(e) => setRenewalForm({ ...renewalForm, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRenewalDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => renewalMutation.mutate({ 
                  new_expiration_date: renewalForm.newDate, 
                  renewal_term_years: renewalForm.years,
                  notes: renewalForm.notes
                })}
                disabled={!renewalForm.newDate || renewalMutation.isPending}
                className="bg-[#1a2b4a]"
              >
                {renewalMutation.isPending ? "Processing..." : "Complete Renewal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}