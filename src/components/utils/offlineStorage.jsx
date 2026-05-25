const DB_NAME = 'nps_offline_db';
const DB_VERSION = 2;
const STORES = { incidents: 'incidents', patrols: 'patrols', timesheets: 'timesheets', checkIns: 'checkIns', drafts: 'drafts', offlinePhotos: 'offlinePhotos' };

let db = null;

export const initDB = () => new Promise((resolve, reject) => {
  if (db) { resolve(db); return; }
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onerror = () => reject(request.error);
  request.onsuccess = () => { db = request.result; resolve(db); };
  request.onupgradeneeded = (event) => {
    const database = event.target.result;
    Object.values(STORES).forEach(storeName => {
      if (!database.objectStoreNames.contains(storeName)) {
        const store = database.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
        if (storeName === 'offlinePhotos') store.createIndex('offlineIncidentId', 'offlineIncidentId', { unique: false });
      }
    });
  };
});

export const saveOffline = async (storeName, data) => {
  try {
    await initDB();
    const store = db.transaction([storeName], 'readwrite').objectStore(storeName);
    const dataWithMeta = { ...data, timestamp: new Date().toISOString(), synced: false, offlineId: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
    return new Promise((resolve, reject) => { const r = store.add(dataWithMeta); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  } catch (error) {
    const key = `${storeName}_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify(data));
    return key;
  }
};

export const getUnsyncedItems = async (storeName) => {
  try {
    await initDB();
    const store = db.transaction([storeName], 'readonly').objectStore(storeName);
    return new Promise((resolve, reject) => { const r = store.getAll(); r.onsuccess = () => resolve((r.result || []).filter(i => i.synced === false)); r.onerror = () => reject(r.error); });
  } catch { return []; }
};

export const markAsSynced = async (storeName, id) => {
  try {
    await initDB();
    const store = db.transaction([storeName], 'readwrite').objectStore(storeName);
    return new Promise((resolve, reject) => {
      const g = store.get(id);
      g.onsuccess = () => { const data = g.result; if (data) { data.synced = true; const u = store.put(data); u.onsuccess = () => resolve(); u.onerror = () => reject(u.error); } else resolve(); };
      g.onerror = () => reject(g.error);
    });
  } catch {}
};

export const deleteSyncedItems = async (storeName, daysOld = 7) => {
  try {
    await initDB();
    const store = db.transaction([storeName], 'readwrite').objectStore(storeName);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - daysOld);
    return new Promise((resolve, reject) => {
      const r = store.index('synced').openCursor();
      r.onsuccess = (e) => { const c = e.target.result; if (c) { if (c.value.synced && new Date(c.value.timestamp) < cutoff) store.delete(c.primaryKey); c.continue(); } else resolve(); };
      r.onerror = () => reject(r.error);
    });
  } catch {}
};

export const getAllItems = async (storeName) => {
  try {
    await initDB();
    const store = db.transaction([storeName], 'readonly').objectStore(storeName);
    return new Promise((resolve, reject) => { const r = store.getAll(); r.onsuccess = () => resolve(r.result || []); r.onerror = () => reject(r.error); });
  } catch { return []; }
};

export const saveOfflinePhoto = async (offlineIncidentId, file, caption = '') => {
  try {
    await initDB();
    const store = db.transaction([STORES.offlinePhotos], 'readwrite').objectStore(STORES.offlinePhotos);
    const buffer = await file.arrayBuffer();
    return new Promise((resolve, reject) => { const r = store.add({ offlineIncidentId, buffer, type: file.type, name: file.name, caption, synced: false, timestamp: new Date().toISOString() }); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  } catch {}
};

export const getPhotosForOfflineIncident = async (offlineIncidentId) => {
  try {
    await initDB();
    const idx = db.transaction([STORES.offlinePhotos], 'readonly').objectStore(STORES.offlinePhotos).index('offlineIncidentId');
    return new Promise((resolve, reject) => { const r = idx.getAll(offlineIncidentId); r.onsuccess = () => resolve(r.result || []); r.onerror = () => reject(r.error); });
  } catch { return []; }
};

export const deletePhotosForOfflineIncident = async (offlineIncidentId) => {
  try {
    await initDB();
    const store = db.transaction([STORES.offlinePhotos], 'readwrite').objectStore(STORES.offlinePhotos);
    return new Promise((resolve, reject) => {
      const r = store.index('offlineIncidentId').openCursor(offlineIncidentId);
      r.onsuccess = (e) => { const c = e.target.result; if (c) { c.delete(); c.continue(); } else resolve(); };
      r.onerror = () => reject(r.error);
    });
  } catch {}
};

export { STORES };