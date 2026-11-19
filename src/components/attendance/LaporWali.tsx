import { useState } from "react";
import { MessageCircle, Pencil, X } from "lucide-react";
import { useToast } from "@/components/shared/Toast";
import { getWali, setWali, waNomor } from "@/lib/wali-kelas";
import { formatTanggalPanjang } from "@/lib/utils";

interface Props {
  kelasId: number;
  namaKelas: string;
  namaSekolah?: string;
  tanggal: string;
  siswa: { id: number; nama: string }[];
  /** Status efektif siswa hari itu (H/S/I/A/T) atau undefined bila belum diisi. */
  statusDari: (id: number) => string | undefined;
}

const LABEL: Record<string, string> = { H: "Hadir", T: "Terlambat", S: "Sakit", I: "Izin", A: "Alpha" };

/** Kirim ringkasan presensi hari ini ke wali kelas lewat WhatsApp (nomor disimpan di perangkat ini). */
export function LaporWali({ kelasId, namaKelas, namaSekolah, tanggal, siswa, statusDari }: Props) {
  const { toast } = useToast();
  const [wali, setWaliState] = useState(() => getWali(kelasId));
  const [edit, setEdit] = useState(false);
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");

  // Ganti kelas: muat wali kelas itu.
  const [kelasTampil, setKelasTampil] = useState(kelasId);
  if (kelasTampil !== kelasId) { setKelasTampil(kelasId); setWaliState(getWali(kelasId)); }

  const buka = () => { setNama(wali.nama); setWa(wali.wa); setEdit(true); };

  const simpan = () => {
    if (wa.trim() && !waNomor(wa)) { toast("Nomor WhatsApp tidak valid"); return; }
    const w = { nama: nama.trim(), wa: wa.trim() };
    setWali(kelasId, w);
    setWaliState(w);
    setEdit(false);
  };

  const kirim = () => {
    const nomor = waNomor(wali.wa);
    if (!nomor) { buka(); toast("Isi nomor WhatsApp wali kelas dulu"); return; }
    const hitung: Record<string, number> = { H: 0, T: 0, S: 0, I: 0, A: 0 };
    let belum = 0;
    const tidakHadir: string[] = [];
    for (const s of siswa) {
      const st = statusDari(s.id);
      if (!st) { belum++; continue; }
      hitung[st]++;
      if (st !== "H") tidakHadir.push(`- ${s.nama} (${LABEL[st]})`);
    }
    const baris = [
      `Laporan presensi ${namaKelas}${namaSekolah ? ` - ${namaSekolah}` : ""}`,
      formatTanggalPanjang(tanggal),
      "",
      `Hadir ${hitung.H}, Terlambat ${hitung.T}, Sakit ${hitung.S}, Izin ${hitung.I}, Alpha ${hitung.A}` + (belum ? `, Belum diisi ${belum}` : ""),
    ];
    if (tidakHadir.length) baris.push("", "Tidak hadir / terlambat:", ...tidakHadir.slice(0, 40), ...(tidakHadir.length > 40 ? [`... dan ${tidakHadir.length - 40} lainnya`] : []));
    const sapa = wali.nama ? `Yth. ${wali.nama},\n` : "";
    window.open(`https://wa.me/${nomor}?text=${encodeURIComponent(sapa + baris.join("\n"))}`, "_blank");
  };

  return (
    <>
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2">
        <div className="flex-1 min-w-0 text-[0.72rem] text-[var(--text-light)] truncate">
          Wali kelas: <b className="text-[var(--text)]">{wali.nama || "belum diisi"}</b>
        </div>
        <button onClick={buka} aria-label="Atur wali kelas" className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--input-bg)] text-[var(--text-light)] border-none cursor-pointer">
          <Pencil size={14} />
        </button>
        <button onClick={kirim} className="flex items-center gap-1 px-3 py-[7px] rounded-lg bg-[#25D366] text-white font-bold text-[0.72rem] border-none cursor-pointer flex-shrink-0">
          <MessageCircle size={14} /> Kirim laporan
        </button>
      </div>

      {edit && (
        <div className="fixed inset-0 bg-black/60 z-[900] flex items-end lg:items-center justify-center p-2" onClick={() => setEdit(false)}>
          <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] p-4 pb-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-extrabold text-[0.95rem] text-[var(--text)]">Wali kelas {namaKelas}</div>
              <button onClick={() => setEdit(false)} aria-label="Tutup" className="w-8 h-8 rounded-full bg-[var(--input-bg)] text-[var(--text-light)] border-none flex items-center justify-center cursor-pointer"><X size={16} /></button>
            </div>
            <label className="text-[0.72rem] font-semibold text-[var(--text-light)]">Nama wali kelas</label>
            <input value={nama} onChange={(e) => setNama(e.target.value)} maxLength={60} placeholder="Contoh: Bu Fenti" className="w-full mt-1 mb-3 px-3 py-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] text-[0.88rem]" />
            <label className="text-[0.72rem] font-semibold text-[var(--text-light)]">Nomor WhatsApp</label>
            <input value={wa} onChange={(e) => setWa(e.target.value)} inputMode="tel" placeholder="08xxxxxxxxxx" className="w-full mt-1 mb-1 px-3 py-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] text-[0.88rem]" />
            <p className="text-[0.66rem] text-[var(--text-light)] mt-1 mb-3">Tersimpan di HP ini saja. Laporan dikirim lewat WhatsApp dari HP Bapak/Ibu.</p>
            <button onClick={simpan} className="w-full min-h-[44px] rounded-xl text-white font-bold text-[0.88rem] border-none cursor-pointer" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}>Simpan</button>
          </div>
        </div>
      )}
    </>
  );
}
