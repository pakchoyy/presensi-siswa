import { BookOpen, ClipboardCheck, Upload, BarChart3, Database } from "lucide-react";

const GUIDES = [
  {
    num: "1",
    icon: ClipboardCheck,
    title: "Presensi Harian",
    desc: "Buka menu Presensi — semua siswa otomatis berstatus <b>Hadir</b>. Tap nama siswa yang <b>tidak hadir</b>, lalu pilih Sakit / Izin / Alpha. Data langsung tersimpan otomatis. Tidak perlu tekan tombol simpan!",
  },
  {
    num: "2",
    icon: Upload,
    title: "Import Siswa dari Excel",
    desc: "Download template Excel dari menu Siswa atau Wizard Setup. Isi kolom <b>Nama, NISN, Jenis Kelamin</b> — lalu upload. Sistem akan membaca dan menampilkan pratinjau sebelum disimpan.",
  },
  {
    num: "3",
    icon: BarChart3,
    title: "Rekap & Export Laporan",
    desc: "Buka menu Rekap — pilih <b>Bulanan</b> atau <b>Semester</b>. Lihat tabel ringkasan Hadir/Sakit/Izin/Alpha per siswa. Ekspor langsung ke <b>PDF</b> atau <b>Excel</b> untuk laporan resmi.",
  },
  {
    num: "4",
    icon: Database,
    title: "Backup & Restore Data",
    desc: "Buka menu Backup — klik <b>Buat Backup Lokal</b> untuk menyimpan semua data ke file. Simpan file tersebut di HP atau Google Drive. Jika ganti HP, tinggal <b>Restore</b> dari file backup yang sama.",
  },
];

export function PetunjukPage() {
  return (
    <div className="flex-1 px-[14px] pt-[14px] pb-[90px] lg:pb-4">
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px]">
        <div className="text-[0.85rem] font-bold flex items-center gap-[8px] mb-4">
          <BookOpen size={18} className="text-[#0ea5a0]" /> Petunjuk Penggunaan
        </div>

        <div
          className="text-[0.8rem] text-[var(--text)] leading-[1.9] mb-4 p-[10px] rounded-lg"
          style={{
            background: "rgba(14,165,160,.08)",
            borderLeft: "4px solid #0ea5a0",
          }}
        >
          <b>Bantu Guru Yuk | Presensi Siswa</b> dirancang sesederhana mungkin agar guru bisa
          mengisi presensi <b>kurang dari 30 detik per kelas</b>, bahkan tanpa koneksi internet.
        </div>

        <div className="flex flex-col gap-[10px]">
          {GUIDES.map((g) => (
            <div
              key={g.num}
              className="flex gap-3 items-start p-[10px] border border-[var(--border)] rounded-[9px] bg-[var(--input-bg)]"
            >
              <div className="text-[1.2rem] flex-shrink-0 font-bold text-[#0ea5a0]">
                {g.num}️⃣
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[6px] mb-1">
                  <g.icon size={15} className="text-[#0ea5a0]" />
                  <b className="text-[0.82rem] text-[#0ea5a0]">{g.title}</b>
                </div>
                <div
                  className="text-[0.74rem] text-[var(--text)] leading-[1.7]"
                  dangerouslySetInnerHTML={{ __html: g.desc }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
