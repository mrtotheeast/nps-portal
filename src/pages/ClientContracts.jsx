import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ClientContracts() {
  const [selectedClient, setSelectedClient] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.filter({ status: "active" }),
  });

  const generateContractMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateClientContract', { clientId: selectedClient });
      return response.data;
    },
    onSuccess: (data) => { setGeneratedUrl(data.url); }
  });

  if (isLoading) return <LoadingScreen />;

  if (user?.role_type !== 'super_admin') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <Alert variant="destructive"><AlertDescription>Access denied. Super Admin only.</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Client Contract Generator" subtitle="AI-powered contract drafts in Google Docs" showBack />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Generate Contract</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger><SelectValue placeholder="Choose a client..." /></SelectTrigger>
                <SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => generateContractMutation.mutate()} disabled={!selectedClient || generateContractMutation.isLoading} className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
              {generateContractMutation.isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating Contract...</> : <><FileText className="w-4 h-4 mr-2" />Generate Contract in Google Docs</>}
            </Button>
            {generatedUrl && (
              <Alert className="bg-emerald-50 border-emerald-200">
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-emerald-700">Contract generated successfully!</span>
                  <Button variant="outline" size="sm" asChild><a href={generatedUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Open in Google Docs</a></Button>
                </AlertDescription>
              </Alert>
            )}
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900 font-semibold mb-2">What gets generated:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Professional contract header with client details</li>
                <li>• Services section based on client's sites</li>
                <li>• Standard terms and conditions</li>
                <li>• Payment terms and insurance information</li>
                <li>• Signature sections for both parties</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}