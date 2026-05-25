import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useTenantFilter, useTenantMutation } from "@/hooks/useTenantFilter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Building2, Mail, Phone, Edit, Trash2, Map, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

const statusColors = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
  prospect: "bg-blue-100 text-blue-700",
  deleted: "bg-red-100 text-red-700",
};

const emptyForm = {
  name: "",
  status: "active",
  service_type: "unarmed",
  notes: "",
  primary_contact: { full_name: "", title: "", phone: "", email: "" },
  contract_start_date: "",
  contract_end_date: "",
  sites_to_create: [],
  sites_to_assign: [],
};

const emptySite = {
  name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

export default function ClientManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantFilter = useTenantFilter();
  const { addCompanyId } = useTenantMutation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newClientId, setNewClientId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", tenantFilter],
    queryFn: async () => {
      const filtered = await base44.entities.Client.filter(tenantFilter, "-created_date");
      if (filtered.length > 0) return filtered;
      return base44.entities.Client.filter({}, "-created_date");
    },
    enabled: !!tenantFilter.company_id,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", tenantFilter],
    queryFn: async () => {
      const filtered = await base44.entities.Site.filter(tenantFilter);
      if (filtered.length > 0) return filtered;
      return base44.entities.Site.filter({});
    },
    enabled: !!tenantFilter.company_id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: (createdClient) => {
      queryClient.invalidateQueries(["clients"]);
      setShowForm(false);
      setNewClientId(createdClient.id);
      setShowInviteForm(true);
      setInviteEmail(form.primary_contact?.email || "");
      toast.success("Client created — now invite contacts");
    },
    onError: (err) => toast.error(err.message),
  });

  const inviteMutation = useMutation({
    mutationFn: async (email) => {
      // Create or find the ClientContact
      const contact = await base44.entities.ClientContact.create({
        client_id: newClientId,
        full_name: email.split('@')[0],
        email: email,
        is_main_contact: false,
        invite_status: "not_invited",
      });
      // Send invite
      return base44.functions.invoke("sendClientInvite", { contact_id: contact.id, client_id: newClientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["client-contacts"]);
      toast.success("Invitation sent");
      setInviteEmail("");
      setShowInviteForm(false);
      setNewClientId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const sendDirectInvite = async (client) => {
    const email = client.primary_contact?.email;
    if (!email) {
      toast.error("No email address on file for this client");
      return;
    }
    setNewClientId(client.id);
    await inviteMutation.mutateAsync(email);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["clients"]);
      toast.success("Client deleted");
    },
  });

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Company name is required"); return; }
    setSaving(true);
    try {
      const clientData = addCompanyId({ ...form });
      delete clientData.sites_to_create;
      delete clientData.sites_to_assign;
      
      const client = await createMutation.mutateAsync(clientData);
      
      // Create new sites
      for (const site of form.sites_to_create) {
        if (site.name.trim()) {
          const newSite = await base44.entities.Site.create({
            name: site.name,
            address: site.address,
            city: site.city,
            state: site.state,
            zip: site.zip,
            client_id: client.id,
            status: "active",
          });
          
          // Auto-create a default timesheet template for this site
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
      
      // Assign existing sites
      for (const siteId of form.sites_to_assign) {
        const site = sites.find(s => s.id === siteId);
        if (site) {
          await base44.entities.Site.update(siteId, { client_id: client.id });
        }
      }
      
      queryClient.invalidateQueries(["sites"]);
      setForm(emptyForm);
    } finally { setSaving(false); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error("Email is required"); return; }
    await inviteMutation.mutateAsync(inviteEmail);
  };

  const filtered = clients.filter((c) => {
    const statusMatch = statusFilter === "all" || c.status === statusFilter;
    const q = search.toLowerCase();
    const nameMatch = !q || c.name?.toLowerCase().includes(q) ||
      c.primary_contact?.full_name?.toLowerCase().includes(q) ||
      c.primary_contact?.email?.toLowerCase().includes(q);
    return statusMatch && nameMatch;
  });

  const sitesForClient = (clientId) => sites.filter((s) => s.client_id === clientId);

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Client Management"
        subtitle={`${clients.length} clients`}
        action={() => setShowForm(true)}
        actionLabel="Add Client"
      />
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <Button variant="outline" className="gap-2 text-sm" onClick={() => navigate("/ServiceCoverageMap")}>
          <Map className="w-4 h-4" /> View Coverage Map
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Building2} title="No clients found" description="Add your first client to get started" action={() => setShowForm(true)} actionLabel="Add Client" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((client) => {
              const clientSites = sitesForClient(client.id);
              const pc = client.primary_contact || {};
              return (
                <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/ClientDetails?id=${client.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{client.name}</h3>
                      <p className="text-xs text-slate-500 capitalize">{client.service_type} security</p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Badge className={statusColors[client.status] || statusColors.active}>{client.status}</Badge>
                      {client.status === "deleted" && (
                        <Badge className="bg-red-600 text-white text-xs">Deleted</Badge>
                      )}
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => sendDirectInvite(client)}
                          disabled={inviteMutation.isPending}>
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => navigate(`/ClientDetails?id=${client.id}`)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(client.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {pc.full_name && (
                      <div className="space-y-1 mb-3 text-sm">
                        <p className="font-medium text-slate-700">{pc.full_name} {pc.title && <span className="text-slate-400">— {pc.title}</span>}</p>
                        {pc.email && <div className="flex items-center gap-1 text-slate-500"><Mail className="w-3.5 h-3.5" />{pc.email}</div>}
                        {pc.phone && <div className="flex items-center gap-1 text-slate-500"><Phone className="w-3.5 h-3.5" />{pc.phone}</div>}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t">
                      <Building2 className="w-3.5 h-3.5" />
                      {clientSites.length} site{clientSites.length !== 1 ? "s" : ""}
                      {client.contract_start_date && (
                        <span className="ml-auto">Contract: {new Date(client.contract_start_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service Type</Label>
                <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="armed">Armed</SelectItem>
                    <SelectItem value="unarmed">Unarmed</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                    <SelectItem value="spo">SPO</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="patrol">Patrol</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium text-slate-700 mb-3">Primary Contact</p>
              <div className="grid grid-cols-2 gap-3">
                {["full_name", "title", "phone", "email"].map((f) => (
                  <div key={f}>
                    <Label className="capitalize">{f.replace("_", " ")}</Label>
                    <Input
                      value={form.primary_contact[f] || ""}
                      onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, [f]: e.target.value } })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contract Start</Label>
                <Input type="date" value={form.contract_start_date} onChange={(e) => setForm({ ...form, contract_start_date: e.target.value })} />
              </div>
              <div>
                <Label>Contract End</Label>
                <Input type="date" value={form.contract_end_date} onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="border-t pt-3">
              <p className="text-sm font-medium text-slate-700 mb-3">Sites</p>
              
              {/* Assign Existing Sites */}
              <div className="mb-4">
                <Label className="text-xs">Assign Existing Sites</Label>
                <Select onValueChange={(siteId) => {
                  if (!form.sites_to_assign.includes(siteId)) {
                    setForm({ ...form, sites_to_assign: [...form.sites_to_assign, siteId] });
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select a site..." /></SelectTrigger>
                  <SelectContent>
                    {sites.filter(s => !s.client_id).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} — {s.city}, {s.state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.sites_to_assign.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.sites_to_assign.map((siteId) => {
                      const site = sites.find(s => s.id === siteId);
                      return (
                        <Badge key={siteId} variant="outline" className="gap-1">
                          {site?.name}
                          <button onClick={() => setForm({ ...form, sites_to_assign: form.sites_to_assign.filter(id => id !== siteId) })} className="ml-1 text-red-400 hover:text-red-600">×</button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Create New Sites */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Create New Sites</Label>
                  <Button size="sm" variant="outline" className="h-6 text-xs gap-1" 
                    onClick={() => setForm({ ...form, sites_to_create: [...form.sites_to_create, { ...emptySite }] })}>
                    <Plus className="w-3 h-3" /> Add Site
                  </Button>
                </div>
                {form.sites_to_create.map((site, idx) => (
                  <div key={idx} className="border rounded p-3 mb-2 space-y-2 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">Site {idx + 1}</p>
                      <button onClick={() => setForm({ ...form, sites_to_create: form.sites_to_create.filter((_, i) => i !== idx) })} 
                        className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <Label className="text-xs">Site Name *</Label>
                      <Input
                        placeholder="e.g. Corporate HQ, Downtown Branch"
                        value={site.name}
                        onChange={(e) => {
                          const updated = [...form.sites_to_create];
                          updated[idx].name = e.target.value;
                          setForm({ ...form, sites_to_create: updated });
                        }}
                        className="text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Street Address</Label>
                      <Input
                        placeholder="123 Main Street"
                        value={site.address}
                        onChange={(e) => {
                          const updated = [...form.sites_to_create];
                          updated[idx].address = e.target.value;
                          setForm({ ...form, sites_to_create: updated });
                        }}
                        className="text-sm mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">City</Label>
                        <Input
                          placeholder="City"
                          value={site.city}
                          onChange={(e) => {
                            const updated = [...form.sites_to_create];
                            updated[idx].city = e.target.value;
                            setForm({ ...form, sites_to_create: updated });
                          }}
                          className="text-sm mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">State</Label>
                        <Input
                          placeholder="State"
                          value={site.state}
                          maxLength="2"
                          onChange={(e) => {
                            const updated = [...form.sites_to_create];
                            updated[idx].state = e.target.value;
                            setForm({ ...form, sites_to_create: updated });
                          }}
                          className="text-sm mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">ZIP</Label>
                        <Input
                          placeholder="ZIP"
                          value={site.zip}
                          onChange={(e) => {
                            const updated = [...form.sites_to_create];
                            updated[idx].zip = e.target.value;
                            setForm({ ...form, sites_to_create: updated });
                          }}
                          className="text-sm mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1a2b4a]">
              {saving ? "Saving..." : "Create Client"}
            </Button>
          </DialogFooter>
          </DialogContent>
          </Dialog>

          {/* Invite Dialog */}
          <Dialog open={showInviteForm} onOpenChange={(open) => {
          setShowInviteForm(open);
          if (!open) { setNewClientId(null); setInviteEmail(""); }
          }}>
          <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Invite Portal Contacts</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Invite the primary contact and any additional contacts to access the client portal.</p>
          <div className="space-y-3">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="contact@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteForm(false)}>Skip</Button>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending} className="bg-[#1a2b4a] gap-1">
              <Send className="w-4 h-4" />
              {inviteMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
          </DialogContent>
          </Dialog>
          </div>
          );
          }