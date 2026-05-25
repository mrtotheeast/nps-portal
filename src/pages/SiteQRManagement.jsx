import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Plus, Download, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function SiteQRManagement() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState("");
  const [location, setLocation] = useState("");

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: qrCodes = [], isLoading: qrLoading } = useQuery({
    queryKey: ["site-qr-codes"],
    queryFn: () => base44.entities.SiteQRCode.list(),
  });

  const createQRMutation = useMutation({
    mutationFn: async () => {
      const checkInUrl = `${window.location.origin}/ScanPatrol?siteId=${selectedSite}&location=${encodeURIComponent(location || "Main Entrance")}`;
      const qrDataUrl = await QRCode.toDataURL(checkInUrl, { width: 400, margin: 2 });
      const user = await base44.auth.me();
      
      const siteName = sites.find(s => s.id === selectedSite)?.name || "Site";
      return base44.entities.SiteQRCode.create({
        site_id: selectedSite,
        qr_code_data: checkInUrl,
        qr_code_url: qrDataUrl,
        created_by: user.email,
        is_active: true
      });
    },
    onSuccess: (data) => {
      const siteName = sites.find(s => s.id === selectedSite)?.name || "Site";
      queryClient.invalidateQueries(["site-qr-codes"]);
      setShowCreateDialog(false);
      setSelectedSite("");
      setLocation("");
      toast.success(`QR Code created for ${siteName}`);
    },
    onError: (err) => {
      toast.error(`Failed to create QR code: ${err.message}`);
    }
  });

  const deleteQRMutation = useMutation({
    mutationFn: (id) => base44.entities.SiteQRCode.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["site-qr-codes"]);
      toast.success("QR code deleted");
    },
  });

  const downloadQR = async (qrCode) => {
    try {
      const site = sites.find(s => s.id === qrCode.site_id);
      const qrDataURL = qrCode.qr_code_url;

      const canvas = document.createElement('canvas');
      const size = 500;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);

      const qrImage = new Image();
      qrImage.onload = () => {
        const qrSize = 350;
        ctx.drawImage(qrImage, (size - qrSize) / 2, 80, qrSize, qrSize);

        ctx.fillStyle = '#1a2b4a';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(site?.name || 'Site QR Code', size / 2, 40);
        
        ctx.font = '16px Arial';
        ctx.fillText(qrCode.qr_code_data?.split('?')[0] || 'Check-In', size / 2, 60);
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('Scan to check in', size / 2, size - 20);

        const link = document.createElement('a');
        link.download = `qr-${site?.name || 'site'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        toast.success('QR code downloaded');
      };
      qrImage.src = qrDataURL;
    } catch (error) {
      toast.error('Failed to download QR code');
      console.error(error);
    }
  };

  if (sitesLoading || qrLoading) return <LoadingScreen />;

  const qrBySite = sites.map(site => ({
    site,
    qrCodes: qrCodes.filter(qr => qr.site_id === site.id)
  }));

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PageHeader
        title="Site QR Codes"
        subtitle="Generate and manage QR codes for site check-ins"
        showBack
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create QR Code
        </Button>

        <div className="space-y-4">
          {qrBySite.map(({ site, qrCodes: siteCodes }) => (
            <Card key={site.id} className="dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-slate-500" />
                    {site.name}
                  </div>
                  <Badge variant="outline">{siteCodes.length} QR codes</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {siteCodes.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No QR codes for this site</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {siteCodes.map((qr) => (
                      <div key={qr.id} className="p-4 border rounded-lg dark:border-slate-700">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">QR Code</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Created: {new Date(qr.created_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={qr.is_active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"}>
                            {qr.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadQR(qr)}
                            className="flex-1 dark:border-slate-600"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteQRMutation.mutate(qr.id)}
                            className="text-red-600 hover:text-red-700 dark:border-slate-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Create New QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Site</Label>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md dark:bg-slate-800 dark:border-slate-600"
              >
                <option value="">Choose a site...</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Location/Label</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Main Entrance, Building A"
                className="mt-2 dark:bg-slate-800 dark:border-slate-600"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="flex-1 dark:border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createQRMutation.mutate()}
                disabled={!selectedSite || createQRMutation.isPending}
                className="flex-1 bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
              >
                Create QR Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}