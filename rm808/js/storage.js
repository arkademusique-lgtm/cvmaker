// Tiny IndexedDB wrapper (kits, samples, projects) with localStorage fallback for small things.
const DB = 'rm808-studio', VER = 1, STORES = ['kits', 'samples', 'projects'];
let dbp;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => STORES.forEach((s) => r.result.objectStoreNames.contains(s) || r.result.createObjectStore(s, { keyPath: 'id' }));
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction(store, mode); const s = t.objectStore(store); const r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); });
}
export const put = (store, obj) => tx(store, 'readwrite', (s) => s.put(obj)).catch((e) => console.warn(e));
export const del = (store, id) => tx(store, 'readwrite', (s) => s.delete(id)).catch((e) => console.warn(e));
export const get = (store, id) => tx(store, 'readonly', (s) => s.get(id)).catch(() => null);
export const all = (store) => tx(store, 'readonly', (s) => s.getAll()).catch(() => []);

export const ls = {
  get(k, d) { try { const v = localStorage.getItem('rm808.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('rm808.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};
