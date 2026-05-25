import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import "leaflet/dist/leaflet.css";
import LoadingScreen from "@/components/shared/LoadingScreen";
import ClientLiveMap from "@/components/mapping/ClientLiveMap";
import PageHeader from "@/components/shared/PageHeader";

export default function ClientSiteMap() {
  const [clientRecord, setClientRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      if (u?.email) {
        try {
          const clients = await base44.entities.Client.filter({ contact_email: u.email });
          setClientRecord(clients[0] || null);
        } catch {
          setClientRecord(null);
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="h-screen flex flex-col">
      <PageHeader title="Site Map" subtitle="Live view of your security sites" />
      <div className="flex-1 overflow-hidden">
        <ClientLiveMap clientId={clientRecord?.id} />
      </div>
    </div>
  );
}