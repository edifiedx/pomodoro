let db = null;

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('pomodoro-v1', 2);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('sessions')) {
        const store = d.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        store.createIndex('startTime', 'startTime');
        store.createIndex('type', 'type');
      }
    };
    r.onsuccess = e => res(e.target.result);
    r.onerror   = () => rej(r.error);
  });
}

function dbAdd(rec) {
  if (!db) return Promise.resolve();
  return new Promise((res, rej) => {
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').add(rec);
    tx.oncomplete = res;
    tx.onerror    = () => rej(tx.error);
  });
}

function dbGetAll() {
  if (!db) return Promise.resolve([]);
  return new Promise((res, rej) => {
    const tx = db.transaction('sessions', 'readonly');
    const r  = tx.objectStore('sessions').getAll();
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}

function dbPatchLastSnoozed(snoozedSec) {
  if (!db || snoozedSec <= 0) return;
  const tx  = db.transaction('sessions', 'readwrite');
  const req = tx.objectStore('sessions').openCursor(null, 'prev');
  req.onsuccess = e => {
    const cur = e.target.result;
    if (cur) { const rec = cur.value; rec.snoozedFor = snoozedSec; cur.update(rec); }
  };
}
