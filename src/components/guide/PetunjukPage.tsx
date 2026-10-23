import { BookOpen, ClipboardCheck, Upload, BarChart3, Database, Calendar, Settings, Crown, QrCode, Link2, Key, LogOut } from "lucide-react";
import { PLUS_PRICE, PRO_PRICE } from "@/lib/constants";

const GUIDES = [
  {
    icon: ClipboardCheck,
    title: "Presensi Harian",
    desc: "Buka <b>Presensi</b> di menu bawah. Pilih tanggal & kelas. Kalau <b>Auto Hadir</b> aktif, semua siswa otomatis <b>Hadir</b> — cukup tap nama siswa yang tidak hadir lalu pilih Sakit/Izin/Alpha/Terlambat. Tersimpan otomatis, bisa offline.",
  },
  {
    icon: Upload,
    title: "Siswa & Import Excel",
    desc: "Buka <b>Siswa</b>. Tambah siswa satu per satu, atau download template Excel lalu upload. Kolom <b>Kelas</b> otomatis membuat kelas baru sesuai batas paket.",
  },
  {
    icon: BarChart3,
    title: "Rekap & Export",
    desc: "Buka <b>Rekap</b>. Pilih kelas, lalu periode <b>Bulanan</b>, <b>Semester</b>, atau <b>Rentang</b> tanggal. Ekspor ke <b>PDF</b> atau <b>Excel</b> untuk laporan.",
  },
  {
    icon: Calendar,
    title: "Kalender",
    desc: "Buka <b>Kalender</b> untuk melihat hari libur. Menandai <b>Hari Libur</b> dan <b>Hari Penting</b> sendiri hanya untuk paket <b>PRO</b>.",
  },
  {
    icon: Settings,
    title: "Pengaturan",
    desc: "Atur <b>Hari Aktif</b> (Senin–Jumat atau Senin–Sabtu), Auto Hadir, logo laporan, Mode QR, dan Mode PJJ dari menu <b>Pengaturan</b>.",
  },
  {
    icon: Crown,
    title: "Paket & Masa Coba",
    desc: `Pengguna baru otomatis <b>coba PRO gratis 30 hari</b>. Setelah itu otomatis menjadi <b>FREE</b> (1 kelas, 10 siswa) — data tetap aman dan bisa dilihat. <b>PLUS</b> ${PLUS_PRICE}: 4 kelas, 25 siswa/kelas. <b>PRO</b> ${PRO_PRICE}: tanpa batas.`,
  },
  {
    icon: QrCode,
    title: "Mode QR (PRO)",
    desc: "Aktifkan di Pengaturan, cetak kartu QR di menu <b>Siswa</b>, lalu tekan tombol <b>Scan</b> di menu bawah untuk menandai siswa Hadir.",
  },
  {
    icon: Link2,
    title: "Mode PJJ / Absen Mandiri (PLUS+)",
    desc: "Di menu <b>Siswa</b>, nyalakan <b>Absen Mandiri</b> per kelas lalu tekan <b>Buat Link Absen</b>. Bagikan link ke siswa supaya mereka absen sendiri dari rumah.",
  },
  {
    icon: Database,
    title: "Backup (PLUS+)",
    desc: "Buka <b>Backup</b> untuk menyimpan file backup dan memulihkannya saat ganti HP. PLUS & PRO juga tersinkron otomatis ke cloud.",
  },
  {
    icon: Key,
    title: "Aktivasi Lisensi",
    desc: "Setelah membeli paket, buka <b>Pengaturan</b> &gt; <b>Aktivasi Lisensi</b> dan masukkan kode atau email pembelian.",
  },
  {
    icon: LogOut,
    title: "Keluar Akun",
    desc: "Keluar akan <b>menghapus data di HP ini</b>. Paket PLUS/PRO yang tersinkron cloud akan memuat data lagi saat masuk dengan email yang sama. Di FREE, data akan hilang permanen.",
  },
];

export function PetunjukPage() {
  return (
    <div className="flex-1 px-[14px] pt-[14px] pb-[130px] lg:pb-4">
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
          <b>Bantu Guru Yuk | Presensi Siswa</b> dirancang sesederhana mungkin. Guru bisa mengisi presensi <b>kurang dari 30 detik per kelas</b>, bisa online maupun offline.
        </div>

        <div className="flex flex-col gap-[10px]">
          {GUIDES.map((g, i) => (
            <div
              key={g.title}
              className="flex gap-3 items-start p-[10px] border border-[var(--border)] rounded-[9px] bg-[var(--input-bg)]"
            >
              <div className="w-[26px] h-[26px] rounded-full flex-shrink-0 flex items-center justify-center text-white text-[0.75rem] font-bold bg-[#0ea5a0]">
                {i + 1}
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
