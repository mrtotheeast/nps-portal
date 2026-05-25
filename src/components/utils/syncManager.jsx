import { base44 } from "@/api/base44Client";
import { getUnsyncedItems, markAsSynced, STORES, getPhotosForOfflineIncident, deletePhotosForOfflineIncident } from "./offlineStorage";

let isSyncing = false;
let syncInterval = null;

export const startAutoSync = () => {
  if (syncInterval) return;
  if (navigator.onLine) syncAll();
  window.addEventListener('online', handleOnline);
  syncInterval = setInterval(() => { if (navigator.onLine && !isSyncing) syncAll(); }, 30000);
};

export const stopAutoSync = () => {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  window.removeEventListener('online', handleOnline);
};

const handleOnline = () => setTimeout(() => syncAll(), 1000);

export const syncAll = async () => {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;
  try { await syncIncidents(); await syncPatrols(); await syncTimesheets(); await syncCheckIns(); }
  catch (error) { console.error('Sync failed:', error); }
  finally { isSyncing = false; }
};

const syncIncidents = async () => {
  const incidents = await getUnsyncedItems(STORES.incidents);
  for (const incident of incidents) {
    try {
      const { id, timestamp, synced, offlineId, _offlinePhotoPreviews, ...incidentData } = incident;
      const offlinePhotos = await getPhotosForOfflineIncident(offlineId);
      const uploadedMedia = [...(incidentData.multimedia_evidence || [])];
      for (const photo of offlinePhotos) {
        try {
          const file = new File([new Blob([photo.buffer], { type: photo.type })], photo.name, { type: photo.type });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          uploadedMedia.push({ type: photo.type.startsWith('video/') ? 'video' : 'photo', url: file_url, caption: photo.caption || '', uploaded_at: new Date().toISOString() });
        } catch {}
      }
      await base44.entities.Incident.create({ ...incidentData, multimedia_evidence: uploadedMedia });
      await markAsSynced(STORES.incidents, id);
      await deletePhotosForOfflineIncident(offlineId);
      window.dispatchEvent(new CustomEvent('nps:incident-synced', { detail: { offlineId } }));
    } catch (error) { console.error('Failed to sync incident:', error); }
  }
};

const syncPatrols = async () => {
  const patrols = await getUnsyncedItems(STORES.patrols);
  for (const patrol of patrols) {
    try { const { id, timestamp, synced, offlineId, ...data } = patrol; await base44.entities.PatrolSession.create(data); await markAsSynced(STORES.patrols, id); }
    catch (error) { console.error('Failed to sync patrol:', error); }
  }
};

const syncTimesheets = async () => {
  const timesheets = await getUnsyncedItems(STORES.timesheets);
  for (const timesheet of timesheets) {
    try {
      const { id, timestamp, synced, offlineId, ...data } = timesheet;
      if (timesheet.action === 'update' && timesheet.timesheetId) await base44.entities.Timesheet.update(timesheet.timesheetId, data);
      else await base44.entities.Timesheet.create(data);
      await markAsSynced(STORES.timesheets, id);
    } catch (error) { console.error('Failed to sync timesheet:', error); }
  }
};

const syncCheckIns = async () => {
  const checkIns = await getUnsyncedItems(STORES.checkIns);
  for (const checkIn of checkIns) {
    try { const { id, timestamp, synced, offlineId, ...data } = checkIn; await base44.entities.SiteCheckIn.create(data); await markAsSynced(STORES.checkIns, id); }
    catch (error) { console.error('Failed to sync check-in:', error); }
  }
};

export const getSyncStatus = async () => {
  const [i, p, t, c] = await Promise.all([getUnsyncedItems(STORES.incidents), getUnsyncedItems(STORES.patrols), getUnsyncedItems(STORES.timesheets), getUnsyncedItems(STORES.checkIns)]);
  return { total: i.length + p.length + t.length + c.length, incidents: i.length, patrols: p.length, timesheets: t.length, checkIns: c.length, isSyncing };
};