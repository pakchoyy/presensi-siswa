import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { licenseService } from "@/services/license.service";
import { Tier } from "@/types/enums";
import { PRO_PRICE } from "@/lib/constants";
import {
  Settings,
  ArrowUpCircle,
  Check,
  Crown,
  Mail,
  Key,
  CalendarCheck,
  AlertTriangle,
  Clock,
  Copy,
  MessageCircle,
} from "lucide-react";

export function PengaturanPage() {
  const { teacher, school, refreshTeacher } = useApp();
  const { toast } = useToast();

  const isPRO = teacher?.tier === Tier.PRO;

  const [email, setEmail] = useState(teacher?.email || "");
  const [kode, setKode] = useState("");
  const [activating, setActivating] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<Awaited<
    ReturnType<typeof licenseService.getStatus>
  > | null>(null);

  useEffect(() => {
    if (teacher) {
      licenseService.getStatus(teacher.id).then(setLicenseInfo);
    }
  }, [teacher]);

  const handleActivate = async () => {
    if (!teacher) return;
    setActivating(true);
    const result = await licenseService.activate(email.trim(), kode.trim(), teacher.id);
    setActivating(false);

    if (result.success) {
      toast(result.message);
      setKode("");
      await refreshTeacher();
      const status = await licenseService.getStatus(teacher.id);
      setLicenseInfo(status);
    } else {
      toast(result.message);
    }
  };

  const handleWA = () => {
    const msg = encodeURIComponent(
      "Halo Pak Choyy, saya mau beli lisensi PRO Presensi Siswa\nEmail: " + (teacher?.email || "")
    );
    window.open(`https://wa.me/6289530713597?text=${msg}`, "_blank");
  };

  const handleRenew = async () => {
    if (!teacher || !kode.trim()) {
      toast("Masukkan kode perpanjangan dulu");
      return;
    }
    setRenewing(true);
    const result = await licenseService.renew(teacher.id, teacher.email, kode.trim());
    setRenewing(false);

    if (result.success) {
      toast(result.message);
      setKode("");
      await refreshTeacher();
      const status = await licenseService.getStatus(teacher.id);
      setLicenseInfo(status);
    } else {
      toast(result.message);
    }
  };

  const handleDeactivate = async () => {
    if (!teacher) return;
    await licenseService.deactivate(teacher.id);
    toast("Lisensi PRO dinonaktifkan");
    await refreshTeacher();
    setLicenseInfo(null);
  };

  const copyKode = () => {
    if (kode) {
      navigator.clipboard.writeText(kode);
      toast("📋 Kode disalin!");
    }
  };

  const manfaat = licenseService.getManfaat();

  const isExpiring = licenseInfo?.isExpiring;
  const daysRemaining = licenseInfo?.daysRemaining;

  return (
    <div className="flex-1 px-[14px] pt-[14px] pb-[90px] lg:pb-4">
      {/* Status Tier */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
          <Settings size={15} /> Pengaturan Akun
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-[0.9rem]"
            style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
          >
            {teacher?.nama?.charAt(0)?.toUpperCase() || "G"}
          </div>
          <div>
            <div className="text-[0.85rem] font-bold text-[var(--text)]">{teacher?.nama}</div>
            <div className="text-[0.7rem] text-[var(--text-light)]">{teacher?.email}</div>
          </div>
          <div className="ml-auto">
            {isPRO ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[0.65rem] font-bold bg-[#0ea5a0]/10 text-[#0ea5a0] border border-[#0ea5a0]/20">
                <Crown size={11} /> PRO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[0.65rem] font-bold bg-[var(--input-bg)] text-[var(--text-light)] border border-[var(--border)]">
                FREE
              </span>
            )}
          </div>
        </div>
        <div className="text-[0.72rem] text-[var(--text-light)]">
          Sekolah: {school?.nama || "-"} ({school?.jenjang || "-"})
        </div>
      </div>

      {/* PRO Active */}
      {isPRO && licenseInfo ? (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
          <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
            <Crown size={15} className="text-[#f59e0b]" /> Lisensi PRO Aktif
          </div>

          <div className="mb-3 space-y-1 text-[0.74rem]">
            <div className="flex gap-2">
              <Mail size={13} className="text-[var(--text-light)] flex-shrink-0 mt-[1px]" />
              <span className="text-[var(--text)]">{licenseInfo.email}</span>
            </div>
            <div className="flex gap-2">
              <CalendarCheck size={13} className="text-[var(--text-light)] flex-shrink-0 mt-[1px]" />
              <span className="text-[var(--text)]">
                Berlaku sampai <b>{licenseInfo.berakhir}</b>
              </span>
            </div>
            {daysRemaining !== undefined && (
              <div className="flex gap-2">
                <Clock size={13} className="text-[var(--text-light)] flex-shrink-0 mt-[1px]" />
                <span className={isExpiring ? "text-[#b45309] font-semibold" : "text-[var(--text)]"}>
                  {daysRemaining} hari tersisa
                </span>
              </div>
            )}
          </div>

          {isExpiring && daysRemaining !== undefined && (
            <div className="bg-[#fef3c7] rounded-lg p-3 mb-3 border border-[#fbbf24] flex items-start gap-2">
              <AlertTriangle size={14} className="text-[#b45309] flex-shrink-0 mt-[1px]" />
              <div className="text-[0.7rem] text-[#78350f] flex-1">
                {daysRemaining === 0
                  ? "Lisensi akan habis hari ini! Perpanjang sekarang agar fitur PRO tetap aktif."
                  : `Lisensi akan habis dalam ${daysRemaining} hari. Perpanjang sekarang agar tidak terputus.`}
              </div>
            </div>
          )}

          <div className="border-t border-[var(--border)] pt-3 mb-3">
            <div className="text-[0.72rem] font-bold text-[var(--text)] mb-2">
              Perpanjang Lisensi
            </div>
            <div className="mb-2">
              <label className="block text-[0.65rem] font-bold text-[var(--text-light)] mb-1 uppercase">
                <Key size={11} className="inline mr-1" /> Kode Perpanjangan
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={kode}
                  onChange={(e) => setKode(e.target.value)}
                  placeholder="BGY-PS-XXXX"
                  className="flex-1 px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit] uppercase"
                />
                {kode && (
                  <button
                    onClick={copyKode}
                    className="px-2 py-[9px] rounded-[8px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-light)] cursor-pointer"
                  >
                    <Copy size={14} />
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={handleRenew}
              disabled={renewing || !kode.trim()}
              className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
            >
              <ArrowUpCircle size={15} />
              {renewing ? "Memperpanjang..." : "Perpanjang 1 Tahun"}
            </button>
          </div>

          <div className="bg-[#fee2e2] rounded-lg p-3 mb-3 border border-[#ef4444]/30 flex items-start gap-2">
            <AlertTriangle size={14} className="text-[#dc2626] flex-shrink-0 mt-[1px]" />
            <div className="text-[0.7rem] text-[#7f1d1d]">
              Fitur PRO (cloud sync, multi-device, backup cloud) akan aktif di Fase 4.
              Nonaktifkan lisensi akan menghapus akses fitur PRO.
            </div>
          </div>

          <button
            onClick={handleDeactivate}
            className="w-full py-[9px] rounded-[10px] border-[1.5px] border-[#ef4444] text-[#ef4444] font-bold text-[0.78rem] cursor-pointer bg-transparent"
          >
            Nonaktifkan Lisensi
          </button>
        </div>
      ) : (
        /* FREE / Upgrade */
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
          <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
            <ArrowUpCircle size={15} className="text-[#0ea5a0]" /> Upgrade ke PRO
          </div>

          <div className="text-[0.78rem] text-[var(--text-light)] mb-3">
            Dapatkan akses penuh ke semua fitur premium hanya dengan <b>{PRO_PRICE}</b>
          </div>

          <div className="mb-3">
            {manfaat.map((m, i) => (
              <div key={i} className="flex items-start gap-2 mb-1 text-[0.74rem] text-[var(--text)]">
                <Check size={14} className="text-[#16a34a] flex-shrink-0 mt-[2px]" />
                <span>{m}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--border)] pt-3">
            <div className="text-[0.72rem] font-bold text-[var(--text)] mb-2">
              📥 Dapatkan Kode Lisensi
            </div>
            <div className="mb-3">
              <button
                onClick={handleWA}
                className="w-full flex items-center justify-center gap-[6px] py-[9px] rounded-[10px] text-white font-bold text-[0.78rem] cursor-pointer"
                style={{ background: "#25D366" }}
              >
                <MessageCircle size={14} /> Beli via WhatsApp
              </button>
            </div>

            <div className="mb-2">
              <label className="block text-[0.65rem] font-bold text-[var(--text-light)] mb-1 uppercase">
                <Mail size={11} className="inline mr-1" /> Email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
              />
            </div>
            <div className="mb-3">
              <label className="block text-[0.65rem] font-bold text-[var(--text-light)] mb-1 uppercase">
                <Key size={11} className="inline mr-1" /> Kode Lisensi
              </label>
              <input
                type="text"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="BGY-PS-XXXX"
                className="w-full px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit] uppercase"
              />
            </div>
            <button
              onClick={handleActivate}
              disabled={activating || !kode.trim()}
              className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
            >
              <ArrowUpCircle size={15} />
              {activating ? "Mengaktivasi..." : "Aktivasi Sekarang"}
            </button>
          </div>
        </div>
      )}

      {/* Info Tier */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px]">
        <div className="text-[0.75rem] font-bold text-[var(--text)] mb-2">
          Perbandingan Tier
        </div>
        <div className="grid grid-cols-2 gap-2 text-[0.7rem]">
          <div className="bg-[var(--input-bg)] rounded-lg p-2">
            <div className="font-bold text-[var(--text)] mb-1">FREE</div>
            <div className="text-[var(--text-light)] leading-[1.6]">
              • 1 kelas<br />
              • Presensi offline<br />
              • Rekap & export<br />
              • Backup lokal<br />
              • Kalender bawaan
            </div>
          </div>
          <div className="bg-[rgba(14,165,160,0.06)] rounded-lg p-2 border border-[#0ea5a0]/20">
            <div className="font-bold text-[#0ea5a0] mb-1">PRO</div>
            <div className="text-[var(--text-light)] leading-[1.6]">
              • Unlimited kelas<br />
              • Cloud sync<br />
              • Multi device<br />
              • Kalender editable<br />
              • Logo sekolah<br />
              • {PRO_PRICE}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
