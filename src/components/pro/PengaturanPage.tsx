import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { licenseService } from "@/services/license.service";
import { licenseRepo } from "@/repositories/dexie/license.repo";
import type { License } from "@/types/entities";
import { syncService } from "@/services/sync.service";
import { Tier, HariAktif, Jenjang, PageName } from "@/types/enums";
import { PRO_PRICE } from "@/lib/constants";
import { generateId } from "@/lib/utils";
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
  Calendar,
  UserCheck,
  PenLine,
  Plus,
  School,
  Info,
  Upload,
  LogOut,
} from "lucide-react";
import { schoolRepo } from "@/repositories/dexie/school.repo";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import { academicYearRepo } from "@/repositories/dexie/academic-year.repo";
import type { AcademicYear } from "@/types/entities";
import { Semester } from "@/types/enums";
import { LogoUpload } from "@/components/shared/LogoUpload";
import { useAuth } from "@/contexts/AuthContext";
import { useCloudAuth } from "@/contexts/CloudAuthContext";

const getHariAktif = (): HariAktif => {
  return (localStorage.getItem("bgy_hari_aktif") as HariAktif) || HariAktif.SENIN_SABTU;
};

const getAutoHadir = (): boolean => {
  const stored = localStorage.getItem("bgy_auto_hadir");
  if (stored === null) {
    localStorage.setItem("bgy_auto_hadir", "1");
    return true;
  }
  return stored === "1";
};

export function PengaturanPage() {
  const { teacher, school, refreshTeacher, setActivePage } = useApp();
  const { toast } = useToast();
  const { isCloudConnected, cloudUser } = useCloudAuth();

  const isPRO = teacher?.tier === Tier.PRO;

  const [email, setEmail] = useState(teacher?.email || "");
  const [kode, setKode] = useState("");
  const [activating, setActivating] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<Awaited<
    ReturnType<typeof licenseService.getStatus>
  > | null>(null);

  const [hariAktif, setHariAktif] = useState<HariAktif>(getHariAktif());
  const [autoHadir, setAutoHadir] = useState(getAutoHadir());

  const [editSekolah, setEditSekolah] = useState(false);
  const [editNamaSekolah, setEditNamaSekolah] = useState(school?.nama || "");
  const [editJenjang, setEditJenjang] = useState<Jenjang>(school?.jenjang || Jenjang.SD);
  const [savingSekolah, setSavingSekolah] = useState(false);
  
  // Academic year state
  const [activeAy, setActiveAy] = useState<AcademicYear | undefined>();
  const [editingAjaran, setEditingAjaran] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [editMulai, setEditMulai] = useState("");
  const [editSelesai, setEditSelesai] = useState("");
  const [savingAjaran, setSavingAjaran] = useState(false);

  // Login device lain state
  const [loginEmail, setLoginEmail] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!teacher) return;

    licenseService.getStatus(teacher.id).then(async (status) => {
      // If PRO but no local license record, auto-fetch from Convex
      if (!status.aktif && teacher.tier === Tier.PRO) {
        try {
          const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: "licenses:checkEmail",
              args: { email: teacher.email },
              format: "json",
            }),
          });
          const data = await res.json();
          if (data.value?.tanggalBerakhir) {
            const now = Date.now();
            const license: License = {
              id: generateId(),
              guruId: teacher.id,
              emailAktivasi: teacher.email,
              kodeLisensi: "AUTO-RECOVERED",
              tanggalAktivasi: now,
              tanggalBerakhir: data.value.tanggalBerakhir,
              statusLisensi: "Aktif",
            };
            await licenseRepo.save(license);
            setLicenseInfo(await licenseService.getStatus(teacher.id));
            return;
          }
        } catch (_) {
          // Fallback — show what we have
        }
      }
      setLicenseInfo(status);
    });
  }, [teacher]);

  useEffect(() => {
    academicYearRepo.getActive().then((ay) => {
      if (ay) {
        setActiveAy(ay);
        setEditLabel(ay.label);
        setEditMulai(ay.tanggalMulai);
        setEditSelesai(ay.tanggalSelesai);
      }
    });
  }, []);

  const handleActivate = async () => {
    if (!teacher) return;
    setActivating(true);
    const result: any = await licenseService.activate(email.trim(), kode.trim(), teacher.id);
    setActivating(false);

    if (result.success) {
      toast(result.message);
      setKode("");
      await refreshTeacher();
      const status = await licenseService.getStatus(teacher.id);
      setLicenseInfo(status);
      
      // Auto upload existing local data to cloud
      if (result.cloudEmail) {
        setTimeout(async () => {
          try {
            toast("⏳ Mengupload data ke cloud...");
            const uploaded = await syncService.initialUpload(result.cloudEmail);
            if (uploaded > 0) {
              toast(`✅ ${uploaded} data berhasil di-upload ke cloud`);
            } else {
              toast("☁️ Cloud sync aktif (tidak ada data untuk di-upload)");
            }
          } catch (error) {
            console.error("Initial upload failed:", error);
            toast("⚠️ Upload gagal, gunakan Sync Now nanti");
          }
          
          // Reload to show connected status
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }, 1000);
      }
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
      toast("Kode disalin");
    }
  };

  const startEditAjaran = () => {
    if (!activeAy) return;
    setEditLabel(activeAy.label);
    setEditMulai(activeAy.tanggalMulai);
    setEditSelesai(activeAy.tanggalSelesai);
    setEditingAjaran(true);
  };

  const handleSaveAjaran = async () => {
    if (!activeAy || !editMulai || !editSelesai) return;
    setSavingAjaran(true);
    const updated: AcademicYear = {
      ...activeAy,
      label: editLabel,
      tanggalMulai: editMulai,
      tanggalSelesai: editSelesai,
    };
    await academicYearRepo.save(updated);
    setActiveAy(updated);
    setEditingAjaran(false);
    setSavingAjaran(false);
    toast("✅ Periode ajaran berhasil disimpan");
  };

  const handleTambahAjaranBaru = async () => {
    if (!teacher) return;
    if (!activeAy) return;

    // Parse current year label to compute next
    const parts = activeAy.label.split("/");
    const nextStart = parseInt(parts[0]) + 1;
    const nextEnd = parseInt(parts[1] || parts[0]) + 1;
    const nextLabel = `${nextStart}/${nextEnd}`;
    const month = new Date().getMonth() + 1;
    const nextSemester = month >= 7 ? Semester.GANJIL : Semester.GENAP;

    const now = Date.now();
    const newAy: AcademicYear = {
      id: generateId(),
      label: nextLabel,
      tanggalMulai: `${nextStart}-07-01`,
      tanggalSelesai: `${nextEnd}-06-30`,
      semesterAktif: nextSemester,
      guruId: teacher.id,
    };

    await academicYearRepo.save(newAy);
    setActiveAy(newAy);
    setEditLabel(newAy.label);
    setEditMulai(newAy.tanggalMulai);
    setEditSelesai(newAy.tanggalSelesai);
    toast(`✅ Ajaran baru "${nextLabel}" dibuat`);
  };

  const manfaat = licenseService.getManfaat();

  const handleDeviceLogin = async () => {
    if (!teacher) return;
    
    const email = loginEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast("❌ Email tidak valid");
      return;
    }
    
    setConnecting(true);
    
    try {
      // Check if email is PRO via checkEmail query
      const response = await fetch(
        `${import.meta.env.VITE_CONVEX_URL}/api/query`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: "licenses:checkEmail",
            args: { email },
            format: "json",
          }),
        }
      );
      
      const data = await response.json();
      
      if (data.value?.tier !== "PRO") {
        toast("❌ Email tidak ditemukan atau belum PRO");
        setConnecting(false);
        return;
      }
      
      // Set cloud email
      localStorage.setItem("presensi_cloud_email", email);
      
      toast("⏳ Menghubungkan ke cloud...");
      
      // Download data from cloud
      try {
        const downloaded = await syncService.downloadAll(email);
        if (downloaded > 0) {
          toast(`✅ ${downloaded} data berhasil di-download dari cloud`);
        } else {
          toast("☁️ Cloud sync aktif");
        }
      } catch (error) {
        console.error("Download error:", error);
        toast("⚠️ Download gagal, tapi cloud sync tetap aktif");
      }
      
      // Save license record locally with expiry from Convex
      const now = Date.now();
      const expiry = data.value?.tanggalBerakhir || (now + 365 * 24 * 60 * 60 * 1000);
      const existingLicense = await licenseRepo.getActive(teacher.id);
      if (!existingLicense) {
        const license: License = {
          id: generateId(),
          guruId: teacher.id,
          emailAktivasi: email,
          kodeLisensi: "DEVICE-CONNECTED",
          tanggalAktivasi: now,
          tanggalBerakhir: expiry,
          statusLisensi: "Aktif",
        };
        await licenseRepo.save(license);
      }

      // Update local teacher to PRO
      await teacherRepo.update(teacher.id, {
        ...teacher,
        tier: Tier.PRO,
        email,
      });
      
      await refreshTeacher();
      
      setTimeout(() => {
        toast("✅ Device berhasil terhubung!");
        setTimeout(() => window.location.reload(), 1000);
      }, 1500);
    } catch (error) {
      console.error("Device login error:", error);
      toast("❌ Gagal menghubungkan. Coba lagi.");
      setConnecting(false);
    }
  };

  const handleSaveSekolah = async () => {
    if (!school || !editNamaSekolah.trim()) {
      toast("Nama sekolah tidak boleh kosong");
      return;
    }
    
    setSavingSekolah(true);
    
    try {
      await schoolRepo.save({
        ...school,
        nama: editNamaSekolah.trim(),
        jenjang: editJenjang,
        diubahPada: Date.now()
      });
      
      toast("✅ Nama sekolah diperbarui");
      setEditSekolah(false);
      
      // Reload to reflect changes
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast("❌ Gagal menyimpan. Coba lagi.");
    } finally {
      setSavingSekolah(false);
    }
  };

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
        <div className="text-[0.72rem] text-[var(--text-light)] flex items-center gap-2">
          Sekolah: {school?.nama || "-"} ({school?.jenjang || "-"})
          <button
            onClick={() => { setEditSekolah(true); setEditNamaSekolah(school?.nama || ""); setEditJenjang(school?.jenjang || Jenjang.SD); }}
            className="text-[#0ea5a0] bg-transparent border-none cursor-pointer p-0"
          >
            <PenLine size={13} />
          </button>
        </div>
      </div>

      {editSekolah && (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
          <div className="text-[0.78rem] font-bold flex items-center gap-[6px] mb-[10px]">
            <School size={15} /> Edit Sekolah
          </div>
          <div className="mb-3">
            <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase">Nama Sekolah</label>
            <input
              type="text"
              value={editNamaSekolah}
              onChange={(e) => setEditNamaSekolah(e.target.value)}
              className="w-full px-[11px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[9px] text-[0.85rem] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
            />
          </div>
          <div className="mb-3">
            <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase">Jenjang</label>
            <div className="grid grid-cols-3 gap-2">
              {[Jenjang.SD, Jenjang.SMP, Jenjang.SMA].map((j) => (
                <button
                  key={j}
                  onClick={() => setEditJenjang(j)}
                  className={`py-[10px] rounded-[8px] border-[1.5px] text-[0.78rem] font-bold cursor-pointer ${
                    editJenjang === j ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]" : "border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-light)]"
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditSekolah(false)} className="flex-1 py-[10px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.8rem] cursor-pointer">Batal</button>
            <button onClick={handleSaveSekolah} disabled={savingSekolah} className="flex-1 py-[10px] rounded-[10px] text-white font-bold text-[0.8rem] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-opacity" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>{savingSekolah ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </div>
      )}

      {/* Cloud Sync Status (PRO only) - Simplified */}
      {isPRO && isCloudConnected && (
        <div className="bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800 p-[14px] mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-[0.75rem] font-bold text-green-900 dark:text-green-100">
              Data tersinkronisasi otomatis
            </span>
          </div>
          <div className="text-[0.68rem] text-green-700 dark:text-green-300 mb-2">
            Email: <b>{cloudUser?.email}</b>
          </div>
          <div className="text-[0.65rem] text-green-600 dark:text-green-400 mb-3">
            Semua perubahan data otomatis tersimpan ke cloud dan tersinkronisasi antar perangkat.
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="text-[0.7rem] text-red-600 dark:text-red-400 font-semibold bg-transparent border-none cursor-pointer hover:underline p-0"
          >
            Logout (untuk testing)
          </button>
          
          {/* Logout Confirm Modal */}
          {showLogoutConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-end lg:items-center justify-center animate-fade-in" onClick={() => setShowLogoutConfirm(false)}>
              <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px] animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
                <div className="text-[0.85rem] font-bold mb-2 text-center text-[#ef4444]">
                  Logout dari Cloud Sync?
                </div>
                <p className="text-[var(--text-light)] text-[0.75rem] text-center mb-[14px]">
                  Data lokal tetap aman, tapi tidak akan sync otomatis ke perangkat lain.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={async () => {
                      // If PRO from device connection, revert to FREE
                      if (teacher) {
                        const activeLic = await licenseRepo.getActive(teacher.id);
                        if (activeLic?.kodeLisensi === "DEVICE-CONNECTED") {
                          await licenseRepo.expire(activeLic.id);
                          await teacherRepo.updateTier(teacher.id, Tier.FREE);
                        }
                      }
                      localStorage.removeItem('presensi_cloud_email');
                      toast('⚠️ Logout berhasil. Auto-sync dinonaktifkan.');
                      setShowLogoutConfirm(false);
                      setTimeout(() => window.location.reload(), 1000);
                    }}
                    className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] bg-[#ef4444] text-white font-bold text-[0.82rem] cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cloud Sync Reconnect (PRO only, not connected) */}
      {isPRO && !isCloudConnected && (
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 p-[14px] mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-[0.75rem] font-bold text-amber-900 dark:text-amber-100">
              Belum terhubung ke Cloud Sync
            </span>
          </div>
          <div className="text-[0.65rem] text-amber-700 dark:text-amber-300 mb-3">
            Masukkan email PRO untuk menyinkronkan data antar perangkat.
          </div>
          <div className="mb-2">
            <label className="block text-[0.65rem] font-bold text-[var(--text-light)] mb-1 uppercase">
              <Mail size={11} className="inline mr-1" /> Email PRO Anda
            </label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
            />
          </div>
          <button
            onClick={handleDeviceLogin}
            disabled={connecting || !loginEmail.trim()}
            className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] border-[1.5px] border-[#0ea5a0] text-[#0ea5a0] font-bold text-[0.82rem] cursor-pointer disabled:opacity-60 bg-transparent"
          >
            <Upload size={15} />
            {connecting ? "Menghubungkan..." : "Hubungkan Device"}
          </button>
        </div>
      )}

      {/* Logo Sekolah (PRO only) */}
      {isPRO && (
        <LogoUpload editable={true} />
      )}

      {/* Periode Ajaran */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
          <Calendar size={15} /> Periode Ajaran
        </div>
        <div className="text-[0.72rem] text-[var(--text-light)] mb-3">
          Atur tanggal mulai dan selesai tahun ajaran untuk menghitung rekap kehadiran.
        </div>

        {editingAjaran ? (
          <>
            <div className="mb-2">
              <label className="block text-[0.65rem] font-bold text-[var(--text-light)] mb-1 uppercase">Label</label>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="w-full px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
              />
            </div>
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <label className="block text-[0.65rem] font-bold text-[var(--text-light)] mb-1 uppercase">Tanggal Mulai</label>
                <input
                  type="date"
                  value={editMulai}
                  onChange={(e) => setEditMulai(e.target.value)}
                  className="w-full px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[0.65rem] font-bold text-[var(--text-light)] mb-1 uppercase">Tanggal Selesai</label>
                <input
                  type="date"
                  value={editSelesai}
                  onChange={(e) => setEditSelesai(e.target.value)}
                  className="w-full px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveAjaran}
                disabled={savingAjaran}
                className="flex-1 py-[9px] rounded-[10px] bg-[#0ea5a0] text-white font-bold text-[0.78rem] border-none cursor-pointer disabled:opacity-50"
              >
                {savingAjaran ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={() => setEditingAjaran(false)}
                className="flex-1 py-[9px] rounded-[10px] border border-[var(--border)] text-[var(--text)] font-bold text-[0.78rem] cursor-pointer bg-transparent"
              >
                Batal
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1 mb-3 text-[0.74rem]">
              <div className="flex gap-2">
                <span className="text-[var(--text-light)] min-w-[80px]">Label:</span>
                <span className="text-[var(--text)] font-semibold">{activeAy?.label || "-"}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--text-light)] min-w-[80px]">Mulai:</span>
                <span className="text-[var(--text)]">{activeAy?.tanggalMulai || "-"}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--text-light)] min-w-[80px]">Selesai:</span>
                <span className="text-[var(--text)]">{activeAy?.tanggalSelesai || "-"}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--text-light)] min-w-[80px]">Semester:</span>
                <span className="text-[var(--text)] font-semibold">{activeAy?.semesterAktif || "-"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={startEditAjaran}
                className="flex-1 py-[9px] rounded-[10px] border border-[var(--border)] text-[var(--text)] font-bold text-[0.78rem] cursor-pointer bg-transparent flex items-center justify-center gap-1"
              >
                <PenLine size={13} /> Edit
              </button>
              <button
                onClick={handleTambahAjaranBaru}
                className="flex-1 py-[9px] rounded-[10px] bg-[#0ea5a0] text-white font-bold text-[0.78rem] border-none cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus size={13} /> Ajaran Baru
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hari Aktif */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
          <Calendar size={15} /> Hari Aktif
        </div>
        <div className="text-[0.72rem] text-[var(--text-light)] mb-3">
          Hari yang tidak aktif tidak akan muncul di presensi dan ditandai merah di kalender.
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setHariAktif(HariAktif.SENIN_JUMAT); localStorage.setItem("bgy_hari_aktif", HariAktif.SENIN_JUMAT); toast("Hari aktif: Senin - Jumat"); }}
            className={`flex-1 py-[10px] rounded-[10px] text-[0.78rem] font-bold border-[1.5px] cursor-pointer ${
              hariAktif === HariAktif.SENIN_JUMAT
                ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-light)]"
            }`}
          >
            Senin - Jumat
          </button>
          <button
            onClick={() => { setHariAktif(HariAktif.SENIN_SABTU); localStorage.setItem("bgy_hari_aktif", HariAktif.SENIN_SABTU); toast("Hari aktif: Senin - Sabtu"); }}
            className={`flex-1 py-[10px] rounded-[10px] text-[0.78rem] font-bold border-[1.5px] cursor-pointer ${
              hariAktif === HariAktif.SENIN_SABTU
                ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-light)]"
            }`}
          >
            Senin - Sabtu
          </button>
        </div>
        <div className="mt-2 text-[0.65rem] text-[var(--text-light)]">
          {hariAktif === HariAktif.SENIN_JUMAT ? "Sabtu & Minggu: tidak masuk presensi, merah di kalender" : "Minggu: tidak masuk presensi, merah di kalender"}
        </div>
      </div>

      {/* Isi Hadir Otomatis */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
          <UserCheck size={15} /> Presensi Otomatis
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[0.78rem] font-semibold text-[var(--text)]">Isi Hadir Otomatis</div>
            <div className="text-[0.68rem] text-[var(--text-light)]">Semua siswa otomatis "Hadir", guru tinggal edit yang tidak hadir</div>
          </div>
          <button
            onClick={() => {
              const newVal = !autoHadir;
              setAutoHadir(newVal);
              localStorage.setItem("bgy_auto_hadir", newVal ? "1" : "0");
              toast(newVal ? "✅ Isi Hadir Otomatis: ON" : "Isi Hadir Otomatis: OFF");
            }}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none ${
              autoHadir ? "bg-[#0ea5a0]" : "bg-[var(--border)]"
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white transition-transform shadow ${
                autoHadir ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
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

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 mb-3 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
            <Info size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-[1px]" />
            <div className="text-[0.7rem] text-blue-900 dark:text-blue-100">
              <b>Fitur PRO Aktif:</b> Unlimited kelas & siswa, kalender custom, logo laporan, update Excel, cloud sync otomatis, multi-device (max 3), backup cloud harian.
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

          <div className="bg-[rgba(14,165,160,0.06)] rounded-lg p-2 mb-3 text-[0.72rem] text-[var(--text)] flex items-start gap-2">
            <Info size={13} className="text-[#0ea5a0] flex-shrink-0 mt-[2px]" />
            <span>Sudah pernah beli? Masukkan email & kode yang sama untuk aktivasi ulang.</span>
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

          <div className="mb-3">
            <a
              href="https://lynk.id/kreacy/o9g1wgrxg7gl"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-[10px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer no-underline"
              style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
            >
              Beli Disini
            </a>
          </div>
          <div className="mb-3">
            <button
              onClick={handleWA}
              className="w-full flex items-center justify-center gap-[6px] py-[9px] rounded-[10px] text-white font-bold text-[0.78rem] cursor-pointer"
              style={{ background: "#25D366" }}
            >
              <MessageCircle size={14} /> Atau via WhatsApp
            </button>
          </div>

          <div className="border-t border-[var(--border)] pt-3">
            <div className="text-[0.72rem] font-bold text-[var(--text)] mb-2 flex items-center gap-[4px]">
              <Key size={13} /> Dapatkan Kode Lisensi
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
          
          {/* Login Device Lain */}
          <div className="border-t border-[var(--border)] pt-4 mt-4">
            <div className="text-[0.72rem] font-bold text-[var(--text)] mb-2 flex items-center gap-[4px]">
              <Upload size={13} /> Sudah PRO di Device Lain?
            </div>
            <div className="text-[0.68rem] text-[var(--text-light)] mb-3">
              Hubungkan device ini dengan email yang sudah terdaftar PRO untuk sinkronisasi data.
            </div>
            <div className="mb-2">
              <label className="block text-[0.65rem] font-bold text-[var(--text-light)] mb-1 uppercase">
                <Mail size={11} className="inline mr-1" /> Email PRO Anda
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
              />
            </div>
            <button
              onClick={handleDeviceLogin}
              disabled={connecting || !loginEmail.trim()}
              className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] border-[1.5px] border-[#0ea5a0] text-[#0ea5a0] font-bold text-[0.82rem] cursor-pointer disabled:opacity-60 bg-transparent"
            >
              <Upload size={15} />
              {connecting ? "Menghubungkan..." : "Hubungkan Device"}
            </button>
          </div>
        </div>
      )}

      {/* Info Tier */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px]">
        <div className="text-[0.75rem] font-bold text-[var(--text)] mb-2">
          Perbandingan Gratis vs PRO
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[0.7rem] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 px-2 text-left text-[0.62rem] uppercase text-[var(--text-light)] font-semibold">Fitur</th>
                <th className="py-2 px-2 text-center text-[0.62rem] uppercase text-[var(--text-light)] font-semibold">Gratis</th>
                <th className="py-2 px-2 text-center text-[0.62rem] uppercase text-[#0ea5a0] font-bold">PRO</th>
              </tr>
            </thead>
            <tbody>
              {[
                { fitur: "Bisa kelola kelas", free: "1 Kelas", pro: "Semua Kelas" },
                { fitur: "Jumlah siswa per kelas", free: "15 siswa", pro: "Unlimited" },
                { fitur: "Buka di HP & laptop", free: "Tidak", pro: "Bisa" },
                { fitur: "Data aman di internet", free: "Tidak", pro: "Bisa" },
                { fitur: "Atur kalender sendiri", free: "Lihat saja", pro: "Bisa atur" },
                { fitur: "Backup ke internet", free: "Tidak", pro: "Bisa" },
                { fitur: "Logo di laporan", free: "Tidak", pro: "Bisa" },
                { fitur: "Update data Excel", free: "Tidak", pro: "Bisa" },
                { fitur: "Harga", free: "Gratis", pro: PRO_PRICE },
              ].map((row, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 px-2 font-semibold">{row.fitur}</td>
                  <td className="py-2 px-2 text-center text-[var(--text-light)]">{row.free}</td>
                  <td className="py-2 px-2 text-center text-[#0ea5a0] font-bold">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
