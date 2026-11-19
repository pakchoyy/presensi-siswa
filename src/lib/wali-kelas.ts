// Wali kelas per kelas, disimpan di perangkat ini (kolom ini belum ada di tabel cloud, jadi tidak ikut sinkron).
export interface WaliKelas { nama: string; wa: string }

const key = (kelasId: number) => `bgy_wali_${kelasId}`;

export function getWali(kelasId: number): WaliKelas {
  try {
    const v = JSON.parse(localStorage.getItem(key(kelasId)) || "null");
    if (v && typeof v.nama === "string" && typeof v.wa === "string") return v;
  } catch { /* abaikan */ }
  return { nama: "", wa: "" };
}

export function setWali(kelasId: number, w: WaliKelas) {
  try { localStorage.setItem(key(kelasId), JSON.stringify(w)); } catch { /* abaikan */ }
}

/** Nomor WA ke format wa.me: 08xx / +62 8xx / 62 8xx menjadi 628xx; kosong bila tidak masuk akal. */
export function waNomor(raw: string): string {
  let n = raw.replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return /^62\d{8,13}$/.test(n) ? n : "";
}
