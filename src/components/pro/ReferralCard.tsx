import { useEffect, useState } from "react";
import { Gift, Copy, Share2 } from "lucide-react";
import { licenseService } from "@/services/license.service";
import { useToast } from "@/components/shared/Toast";
import { APP_URL } from "@/lib/constants";

/** Kode ajak teman: pemilik dapat +30 hari tiap pembeli baru yang aktivasi pakai kodenya. */
export function ReferralCard() {
  const { toast } = useToast();
  const [state, setState] = useState<{ code?: string; rewards?: number; max?: number; days?: number; error?: string } | null>(null);

  useEffect(() => {
    licenseService.getReferral().then(setState).catch(() => setState({ error: "Gagal memuat kode" }));
  }, []);

  const link = state?.code ? `${APP_URL}/?ref=${state.code}` : "";
  const pesan = state?.code
    ? `Saya pakai Presensi Yuk buat absen siswa, praktis banget. Coba gratis 30 hari: ${link}\nKalau upgrade, masukkan kode ajak teman *${state.code}* saat aktivasi ya.`
    : "";

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
      <div className="text-[0.85rem] font-bold flex items-center gap-[6px] mb-1">
        <Gift size={15} className="text-[#f59e0b]" /> Ajak teman, dapat +30 hari
      </div>
      <p className="text-[0.72rem] text-[var(--text-light)] mb-3">
        Tiap guru baru yang membeli paket dan memasukkan kode kamu saat aktivasi, masa aktif lisensimu bertambah {state?.days ?? 30} hari
        {state?.max ? ` (maks. ${state.max} kali per semester)` : ""}.
      </p>
      {!state ? (
        <div className="h-10 rounded-lg bg-[var(--input-bg)] animate-pulse" />
      ) : state.error ? (
        <p className="text-[0.72rem] text-[var(--text-light)]">
          {state.error === "Verifikasi email dulu" || state.error === "Sesi tidak valid"
            ? "Verifikasi email lewat Hubungkan ke cloud dulu untuk melihat kode ajak teman."
            : state.error}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 font-mono font-extrabold tracking-[2px] text-[1rem] text-center py-[9px] rounded-lg bg-[var(--input-bg)] border border-dashed border-[var(--border)] text-[var(--text)]">
              {state.code}
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(state.code!).then(() => toast("Kode disalin"))}
              aria-label="Salin kode"
              className="w-11 h-11 flex items-center justify-center rounded-lg border border-[var(--border)] bg-transparent text-[var(--text)] cursor-pointer"
            >
              <Copy size={16} />
            </button>
          </div>
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, "_blank", "noopener")}
            className="w-full flex items-center justify-center gap-[6px] min-h-[44px] rounded-lg border-none text-white font-bold text-[0.82rem] cursor-pointer"
            style={{ background: "#16a34a" }}
          >
            <Share2 size={15} /> Bagikan lewat WhatsApp
          </button>
          <p className="text-[0.68rem] text-[var(--text-light)] mt-2 text-center">
            Bonus didapat semester ini: <b className="text-[var(--text)]">{state.rewards ?? 0}</b> / {state.max}
          </p>
        </>
      )}
    </div>
  );
}
