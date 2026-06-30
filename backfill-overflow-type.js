/*
  One-off migration helper for existing local IndexedDB data.
  Usage (browser console on the app page):
    1) Paste this file or load it
    2) Run: backfillOverflowType().then(console.log).catch(console.error)
*/

async function backfillOverflowType() {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('pomodoro-v1', 2);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });

  const result = await new Promise((resolve, reject) => {
    let scanned = 0;
    let updated = 0;

    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    const req = store.openCursor();

    req.onsuccess = e => {
      const cur = e.target.result;
      if (!cur) return;

      scanned++;
      const rec = cur.value;
      const hasOverflow = (rec.snoozedFor || 0) > 0;
      const hasType = typeof rec.type === 'string' && rec.type.length > 0;
      const missingOverflowType = !rec.overflowType;

      if (hasOverflow && hasType && missingOverflowType) {
        rec.overflowType = `${rec.type}-overflow`;
        cur.update(rec);
        updated++;
      }

      cur.continue();
    };

    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve({ scanned, updated });
    tx.onerror = () => reject(tx.error);
  });

  db.close();
  return result;
}
