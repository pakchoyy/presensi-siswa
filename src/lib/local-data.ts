import { db } from "@/repositories/dexie/db";

/** Hapus semua data lokal (Dexie + kunci bgy_/presensi_), kecuali mode gelap & tanggal install. */
export async function clearLocalData(): Promise<void> {
  try {
    await Promise.all(db.tables.map((t) => t.clear()));
  } catch (err) {
    console.error("[clearLocalData] gagal hapus data lokal:", err);
  }
  try {
    const keep = new Set(["bgy_presensi_dark", "bgy_install_date"]);
    Object.keys(localStorage)
      .filter((k) => (k.startsWith("bgy_") || k.startsWith("presensi_")) && !keep.has(k))
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch { /* ignore */ }
}
