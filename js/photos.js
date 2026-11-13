// Lift Log: progress photos. They're kept on this phone in IndexedDB (localStorage is far too small for pictures),
// shrunk to at most 1280 px on the long side, and backed up in a file of their own. ES module, no start-up code.
import { today, uid } from "./log.js";

const DB = "liftlog-photos", ST = "photos", MAX = 1280;
let dbp = null;
function db(){
  return dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST, {keyPath: "id"});
    r.onsuccess = () => res(r.result); r.onerror = () => { dbp = null; rej(r.error); };
  }));
}
// Runs fn(store) in a transaction and resolves with its request's result once the transaction is done.
async function run(mode, fn){
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(ST, mode), q = fn(t.objectStore(ST));
    t.oncomplete = () => res(q ? q.result : undefined); t.onerror = t.onabort = () => rej(t.error);
  });
}
// Every photo, newest first: {id, date, ts, blob}.
const listPhotos = async () => ((await run("readonly", s => s.getAll())) || []).sort((a, b) => a.date === b.date ? b.ts - a.ts : a.date < b.date ? 1 : -1);
const deletePhoto = id => run("readwrite", s => s.delete(id));
const putPhoto = p => run("readwrite", s => s.put(p));

// A picture shrunk to fit MAX px, as a JPEG. Falls back to the original if the browser can't draw it.
async function shrink(file){
  try{
    const img = await new Promise((res, rej) => { const i = new Image(), u = URL.createObjectURL(file); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => { URL.revokeObjectURL(u); rej(); }; i.src = u; });
    const k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const out = await new Promise(res => c.toBlob(res, "image/jpeg", .82));
    return out || file;
  }catch(e){ return file; }
}
async function addPhoto(file, date = today()){
  const p = {id: "p" + uid(), date, ts: Date.now(), blob: await shrink(file)};
  await putPhoto(p); return p;
}

// ---------- the photo backup file ----------
const toData = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
async function photoBackupText(){
  const items = await Promise.all((await listPhotos()).map(async p => ({id: p.id, date: p.date, ts: p.ts, data: await toData(p.blob)})));
  return JSON.stringify({app: "Lift Log", photos: 1, exported: new Date().toISOString(), items});
}
const fromData = d => { const [h, b] = d.split(","), bin = atob(b), u = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], {type: h.slice(5).split(";")[0]}); };
// Adds the photos from a backup that aren't on this phone yet. Returns how many were added.
async function restorePhotos(items){
  const have = new Set((await listPhotos()).map(p => p.id)); let n = 0;
  for(const x of Array.isArray(items) ? items : []){
    if(!x || !x.id || have.has(x.id) || !/^\d{4}-\d{2}-\d{2}$/.test(x.date) || !/^data:image\//.test(x.data || "")) continue;
    await putPhoto({id: x.id, date: x.date, ts: x.ts || 0, blob: fromData(x.data)}); have.add(x.id); n++;
  }
  return n;
}
// "14 photos · about 9 MB", for Settings.
async function photoSummary(){
  try{
    const list = await listPhotos(); if(!list.length) return "No photos yet.";
    const mb = list.reduce((a, p) => a + (p.blob ? p.blob.size : 0), 0) / 1048576;
    return `${list.length} photo${list.length === 1 ? "" : "s"} · about ${mb < 1 ? "1" : Math.round(mb)} MB`;
  }catch(e){ return "Photos aren't available in this browser."; }
}

export { listPhotos, addPhoto, deletePhoto, photoBackupText, restorePhotos, photoSummary };
