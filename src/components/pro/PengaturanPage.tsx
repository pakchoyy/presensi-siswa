import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { licenseService } from "@/services/license.service";
import { licenseRepo } from "@/repositories/dexie/license.repo";
import type { License } from "@/types/entities";
import { syncService } from "@/services/sync.service";
import { getSyncLog, type SyncLogEntry } from "@/services/sync.service";
import { Tier, Jenjang, PageName } from "@/types/enums";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { showConfirmDialog } from "@/components/shared/ConfirmDialog";
import { MAX_STUDENTS_FREE, PRO_PRICE } from "@/lib/constants";
import { generateId, getActiveDays } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
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
  Download,
  LogOut,
  RefreshCw,
  Smartphone,
  X,
} from "lucide-react";
import { schoolRepo } from "@/repositories/dexie/school.repo";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import { academicYearRepo } from "@/repositories/dexie/academic-year.repo";
import type { AcademicYear } from "@/types/entities";
import { Semester } from "@/types/enums";
import { LogoUpload } from "@/components/shared/LogoUpload";
import { useAuth } from "@/contexts/AuthContext";
import { useCloudAuth } from "@/contexts/CloudAuthContext";

const getHariAktif = (): string => {
  return localStorage.getItem("bgy_hari_aktif") || "Senin-Sabtu";
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
  const { isCloudConnected, cloudUser, setCloudEmail, clearCloudEmail } = useCloudAuth();
  const syncStatus = useSyncStatus();

  const isPRO = teacher?.tier === Tier.PRO;

  const [email, setEmail] = useState("");
  const [kode, setKode] = useState("");
  const [activating, setActivating] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [syncLog, setSyncLog] = useState<SyncLogEntry | null>(() => getSyncLog());
  const thisDeviceId = localStorage.getItem("presensi_device_id");
  const [licenseInfo, setLicenseInfo] = useState<Awaited<
    ReturnType<typeof licenseService.getStatus>
  > | null>(null);

  const [hariAktif, setHariAktif] = useState<string>(getHariAktif());
  const [customDays, setCustomDays] = useState<string>(localStorage.getItem("bgy_hari_aktif_custom") || "1,2,3,4,5,6");
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

  const [showSyncPrompt, setShowSyncPrompt] = useState(false);

  // Auto-fill email from teacher data
  useEffect(() => {
    if (teacher?.email && !loginEmail) {
      setLoginEmail(teacher.email);
    }
    if (teacher?.email && !email) {
      setEmail(teacher.email);
    }
  }, [teacher]);

  // First-time PRO sync reminder
  useEffect(() => {
    const reminded = localStorage.getItem("bgy_pro_sync_reminded");
    if (isPRO && !isCloudConnected && !reminded) {
      const timer = setTimeout(() => setShowSyncPrompt(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isPRO, isCloudConnected]);

  useEffect(() => {
    if (!teacher) return;

    const teacherId = teacher.id;
    const teacherTier = teacher.tier;
    const teacherEmail = teacher.email;

    let cancelled = false;

    const loadLicense = async () => {
      try {
        const status = await licenseService.getStatus(teacherId);
        if (cancelled) return;

        // If PRO but no local license record, auto-fetch from Supabase
        if (!status.aktif && teacherTier === Tier.PRO && teacherEmail) {
          try {
            const { data: licenseData } = await supabase
              .from("licenses")
              .select("email, tanggal_berakhir, status")
              .eq("email", teacherEmail.toLowerCase().trim())
              .eq("status", "digunakan")
              .maybeSingle();

            if (licenseData?.tanggal_berakhir) {
              const now = Date.now();
              const license: License = {
                id: generateId(),
                guruId: teacherId,
                emailAktivasi: teacherEmail,
                kodeLisensi: "AUTO-RECOVERED",
                tanggalAktivasi: now,
                tanggalBerakhir: licenseData.tanggal_berakhir,
                statusLisensi: "Aktif",
              };
              await licenseRepo.save(license);
              if (!cancelled) {
                const updatedStatus = await licenseService.getStatus(teacherId);
                setLicenseInfo(updatedStatus);
              }
              setCloudEmail(teacherEmail.toLowerCase().trim());
              return;
            }
          } catch (err) {
            console.error("Auto-recover license failed:", err);
          }
        }

        if (!cancelled) {
          setLicenseInfo(status);
        }
      } catch (err) {
        console.error("Load license failed:", err);
        if (!cancelled) {
          setLicenseInfo(null);
        }
      }
    };

    loadLicense();

    return () => {
      cancelled = true;
    };
  }, [teacher?.id, teacher?.tier, teacher?.email]);

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

  // Load hari aktif dari teacher object & cloud (PRO)
  useEffect(() => {
    if (teacher?.hariAktifMode) {
      setHariAktif(teacher.hariAktifMode);
      if (teacher.hariAktifCustom) setCustomDays(teacher.hariAktifCustom);
    }
    if (isPRO && teacher?.email) {
      (async () => {
        try {
          const { data } = await supabase
            .from("teacher_settings")
            .select("hari_aktif_mode, hari_aktif_custom")
            .eq("email", teacher.email.toLowerCase().trim())
            .maybeSingle();
          if (data) {
            setHariAktif(data.hari_aktif_mode);
            if (data.hari_aktif_custom) setCustomDays(data.hari_aktif_custom);
            localStorage.setItem("bgy_hari_aktif", data.hari_aktif_mode);
            if (data.hari_aktif_custom) localStorage.setItem("bgy_hari_aktif_custom", data.hari_aktif_custom);
          }
        } catch {}
      })();
    }
  }, [teacher?.id, isPRO]);

  useEffect(() => {
    if (!cloudUser?.id) return;
    const fetchDevices = async () => {
      const { data } = await supabase
        .from("devices")
        .select("id, device_id, device_name, last_active_at")
        .eq("user_id", cloudUser.id);
      setDevices(data || []);
    };
    fetchDevices();
  }, [cloudUser?.id]);

  useEffect(() => {
    const refreshLog = () => setSyncLog(getSyncLog());
    window.addEventListener("sync-log-updated", refreshLog);
    window.addEventListener("data-changed", refreshLog);
    const interval = setInterval(refreshLog, 5000);
    return () => {
      window.removeEventListener("sync-log-updated", refreshLog);
      window.removeEventListener("data-changed", refreshLog);
      clearInterval(interval);
    };
  }, []);

  const saveHariAktifSettings = async (mode: string, days: string) => {
    setHariAktif(mode);
    setCustomDays(days);
    localStorage.setItem("bgy_hari_aktif", mode);
    localStorage.setItem("bgy_hari_aktif_custom", days);
    if (teacher?.id) {
      await teacherRepo.update(teacher.id, { ...teacher, hariAktifMode: mode, hariAktifCustom: days });
      await refreshTeacher();
    }
    if (isPRO && teacher?.email) {
      await supabase.from("teacher_settings").upsert(
        { email: teacher.email.toLowerCase().trim(), hari_aktif_mode: mode, hari_aktif_custom: days, updated_at: Date.now() },
        { onConflict: "email" }
      );
    }
    const label = mode === "Kustom" ? days.split(",").map(Number).sort().map((d) => ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][d]).join(", ") : mode === "Senin-Jumat" ? "Senin - Jumat" : "Senin - Sabtu";
    toast(`Hari aktif: ${label}`);
  };

  const handleActivate = async () => {
    if (!teacher) return;
    if (!email.trim()) { toast("Masukkan email dulu"); setActivating(false); return; }
    setActivating(true);
    const result: any = await licenseService.activate(email.trim(), kode.trim(), teacher.id);
    setActivating(false);

    if (result.success) {
      toast(result.message);
      setKode("");
      await refreshTeacher();
      const status = await licenseService.getStatus(teacher.id);
      setLicenseInfo(status);
      
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

  const handleForceDownload = async () => {
    if (!cloudUser?.email) return;
    const ok = await showConfirmDialog({
      title: "Tarik Data dari Cloud?",
      message: "Semua data lokal akan DITIMPA dengan data dari cloud. Pastikan data di cloud sudah yang terbaru.",
      confirmText: "Ya, Tarik",
      cancelText: "Batal",
      danger: true,
    });
    if (!ok) return;

    setDownloading(true);
    try {
      syncService.resetSyncState();
      const downloaded = await syncService.downloadAll(cloudUser.email);
      localStorage.setItem("presensi_last_sync", Date.now().toString());
      await refreshTeacher();
      window.dispatchEvent(new Event("data-changed"));
      toast(
        downloaded > 0
          ? `✅ ${downloaded} data ditarik dari cloud`
          : "⚠️ Tidak ada data baru di cloud untuk ditarik",
        downloaded > 0 ? "success" : "info"
      );
    } catch (error) {
      toast("❌ Gagal tarik data dari cloud", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleForceUpload = async () => {
    if (!cloudUser?.email) return;
    const ok = await showConfirmDialog({
      title: "Upload Data ke Cloud?",
      message: "Semua data di cloud akan DITIMPA dengan data lokal device ini. Data di device lain akan diganti.",
      confirmText: "Ya, Upload",
      cancelText: "Batal",
      danger: true,
    });
    if (!ok) return;

    setUploading(true);
    try {
      syncService.resetSyncState();
      const uploaded = await syncService.initialUpload(cloudUser.email);
      localStorage.setItem("presensi_last_sync", Date.now().toString());
      await refreshTeacher();
      window.dispatchEvent(new Event("data-changed"));
      toast(
        uploaded > 0
          ? `✅ ${uploaded} data diupload ke cloud`
          : "⚠️ Tidak ada data untuk di-upload (semua sudah pernah di-upload?)",
        uploaded > 0 ? "success" : "info"
      );
    } catch (error) {
      toast("❌ Gagal upload data ke cloud", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!teacher) return;
    await licenseService.deactivate(teacher.id);
    toast("Lisensi PRO dinonaktifkan");
    await refreshTeacher();
    setLicenseInfo(null);
  };

  const handleLogoutFromPro = async () => {
    if (!teacher) return;
    const activeLicense = await licenseRepo.getActive(teacher.id);
    if (activeLicense) {
      await licenseRepo.expire(activeLicense.id);
    }
    await teacherRepo.updateTier(teacher.id, Tier.FREE);
    clearCloudEmail();
    toast("Akun PRO berhasil dikeluarkan dari perangkat ini.");
    setShowLogoutConfirm(false);
    setTimeout(() => window.location.reload(), 700);
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
    
    const emailAddress = (loginEmail || teacher?.email || "").trim().toLowerCase();
    if (!emailAddress || !emailAddress.includes('@')) {
      toast("❌ Email tidak valid");
      return;
    }
    
    setConnecting(true);
    
    try {
      const { data: licenseData } = await supabase
        .from("licenses")
        .select("tanggal_berakhir, status")
        .eq("email", emailAddress)
        .eq("status", "digunakan")
        .maybeSingle();

      if (!licenseData) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tier")
          .eq("email", emailAddress)
          .maybeSingle();

        if (!profile || profile.tier !== "PRO") {
          toast("❌ Email tidak ditemukan atau belum PRO");
          setConnecting(false);
          return;
        }
      }

      // Pastikan profile ada agar CloudAuthContext mendeteksi cloud connected
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", emailAddress)
        .maybeSingle();
      if (existingProfile) {
        await supabase.from("profiles").update({ tier: "PRO", updated_at: new Date().toISOString() }).eq("id", existingProfile.id);
      } else {
        await supabase.from("profiles").insert({ email: emailAddress, tier: "PRO", updated_at: new Date().toISOString() });
      }
      
      localStorage.setItem("presensi_cloud_email", emailAddress);
      
      toast("⏳ Menghubungkan ke cloud...");
      
      try {
        const downloaded = await syncService.downloadAll(emailAddress);
        if (downloaded > 0) {
          toast(`✅ ${downloaded} data berhasil di-download dari cloud`);
        } else {
          toast("☁️ Cloud sync aktif");
        }
      } catch (error) {
        console.error("Download error:", error);
        toast("⚠️ Download gagal, tapi cloud sync tetap aktif");
      }
      
      const now = Date.now();
      const expiry = licenseData?.tanggal_berakhir || (now + 365 * 24 * 60 * 60 * 1000);
      
      if (!teacher?.id) {
        toast("⚠️ Error: Invalid teacher data");
        return;
      }
      
      const existingLicense = await licenseRepo.getActive(teacher.id);
      if (!existingLicense) {
        const license: License = {
          id: generateId(),
          guruId: teacher.id,
          emailAktivasi: emailAddress,
          kodeLisensi: "DEVICE-CONNECTED",
          tanggalAktivasi: now,
          tanggalBerakhir: expiry,
          statusLisensi: "Aktif",
        };
        await licenseRepo.save(license);
      }

      await teacherRepo.update(teacher.id, {
        ...teacher,
        tier: Tier.PRO,
        email: emailAddress,
      });
      
      await refreshTeacher();
      
      setTimeout(() => {
        setConnecting(false);
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

      {/* Cloud Sync — Simplified (PRO only) */}
      {isPRO && isCloudConnected && (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Smartphone size={15} className="text-[#0ea5a0]" />
              <span className="text-[0.8rem] font-bold text-[var(--text)]">
                Cloud Sync — {devices.length} Device
              </span>
            </div>
          </div>
          
          {devices.length > 0 && (
            <div className="mb-3 space-y-1">
              {devices.slice(0, 3).map((device: any) => (
                <div key={device.id} className="text-[0.68rem] text-[var(--text-light)] flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#0ea5a0]"></div>
                  {device.device_name} • {formatRelativeTime(device.last_active_at)}
                  {device.device_id === thisDeviceId && (
                    <span className="ml-auto text-[0.58rem] font-bold bg-[#0ea5a0]/20 text-[#0ea5a0] px-1.5 py-0.5 rounded-full">
                      Device ini
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mb-3 space-y-1 text-[0.68rem]">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[0.62rem] ${
                  syncStatus.status === "realtime"
                    ? "bg-sky-500/20 text-sky-700 dark:text-sky-300"
                    : syncStatus.status === "synced" || syncStatus.status === "syncing"
                    ? "bg-green-500/20 text-green-700 dark:text-green-300"
                    : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                }`}
              >
                {syncStatus.status === "realtime"
                  ? "● Live"
                  : syncStatus.status === "synced"
                  ? "● Tersinkron"
                  : syncStatus.status === "syncing"
                  ? "● Sinkronisasi..."
                  : syncStatus.status === "offline"
                  ? "● Offline"
                  : syncStatus.status === "not-connected"
                  ? "● Belum terhubung"
                  : "● Menunggu sinkron"}
              </span>
              <span className="text-[var(--text-light)]">
                {syncStatus.lastSync > 0 ? `Sync ${formatRelativeTime(syncStatus.lastSync)}` : "Belum pernah sync"}
              </span>
            </div>
            <div className="text-[var(--text-light)]">
              Cloud: {cloudUser?.email}
              {cloudUser?.email === teacher?.email && (
                <span className="ml-1 text-[0.58rem] font-bold bg-green-500/20 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">
                  Email device ini
                </span>
              )}
            </div>
          </div>

          {syncLog && ((syncLog.uploaded || 0) > 0 || (syncLog.downloaded || 0) > 0 || !syncLog.ok) && (
            <div
              className={`mb-3 text-[0.68rem] p-2 rounded-lg border ${
                syncLog.ok
                  ? "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-200"
                  : "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200"
              }`}
            >
              {syncLog.ok
                ? `✅ ${syncLog.action === "upload" ? "Upload" : "Sync"} OK` +
                  (syncLog.uploaded ? ` · ${syncLog.uploaded} ter-upload` : "") +
                  (syncLog.downloaded ? ` · ${syncLog.downloaded} ter-download` : "")
                : `❌ ${syncLog.action === "upload" ? "Upload" : "Sync"} gagal: ${syncLog.error || "error tidak diketahui"}`}
            </div>
          )}

          <div className="text-[0.68rem] text-amber-800 dark:text-amber-200 mb-3 p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            💡 <b>Data beda antar device?</b><br />
            • Punya data di device ini yang belum ada di device lain → <b className="text-sky-600 dark:text-sky-300">Upload Cloud</b><br />
            • Mau ambil data terbaru dari device lain → <b className="text-emerald-600 dark:text-emerald-300">Tarik Cloud</b>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleForceUpload}
              disabled={uploading}
              className="flex items-center justify-center gap-[6px] py-[8px] rounded-[9px] bg-[#0ea5a0] text-white font-bold text-[0.75rem] cursor-pointer disabled:opacity-50"
            >
              <Upload size={13} className={uploading ? "animate-bounce" : ""} />
              {uploading ? "Upload..." : "Upload Cloud"}
            </button>
            <button
              onClick={handleForceDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-[6px] py-[8px] rounded-[9px] border-[1.5px] border-[#3b82f6] text-[#3b82f6] font-bold text-[0.75rem] cursor-pointer disabled:opacity-50 bg-sky-500/10"
            >
              <Download size={13} className={downloading ? "animate-bounce" : ""} />
              {downloading ? "Menarik..." : "Tarik Cloud"}
            </button>
          </div>
        </div>
      )}

      {/* Cloud Sync Setup (PRO only, not connected) */}
      {isPRO && !isCloudConnected && (
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 p-[14px] mb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-[0.75rem] font-bold text-amber-900 dark:text-amber-100">
              Aktifkan Sync Antar Device
            </span>
          </div>
          <div className="text-[0.68rem] text-amber-700 dark:text-amber-300 mb-3">
            Cukup lakukan <b>sekali</b>. Setelah itu data otomatis tersinkronisasi ke cloud.
          </div>
          <div className="mb-2">
            <input
              type="email"
              value={loginEmail || teacher?.email || ""}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
            />
          </div>
          <button
            onClick={handleDeviceLogin}
            disabled={connecting || !(loginEmail || teacher?.email)}
            className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] border-[1.5px] border-[#0ea5a0] text-[#0ea5a0] font-bold text-[0.82rem] cursor-pointer disabled:opacity-60 bg-transparent"
          >
            <Upload size={15} />
            {connecting ? "Menghubungkan..." : "Hubungkan Sekarang"}
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
          Pilih hari yang masuk presensi. Hari tidak aktif akan ditandai merah di kalender.
        </div>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => saveHariAktifSettings("Senin-Jumat", "1,2,3,4,5")}
            className={`flex-1 py-[10px] rounded-[10px] text-[0.78rem] font-bold border-[1.5px] cursor-pointer ${
              hariAktif === "Senin-Jumat"
                ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-light)]"
            }`}
          >
            Senin - Jumat
          </button>
          <button
            onClick={() => saveHariAktifSettings("Senin-Sabtu", "1,2,3,4,5,6")}
            className={`flex-1 py-[10px] rounded-[10px] text-[0.78rem] font-bold border-[1.5px] cursor-pointer ${
              hariAktif === "Senin-Sabtu"
                ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-light)]"
            }`}
          >
            Senin - Sabtu
          </button>
          <button
            onClick={() => saveHariAktifSettings("Kustom", customDays || "1,2,3,4,5,6")}
            className={`flex-1 py-[10px] rounded-[10px] text-[0.78rem] font-bold border-[1.5px] cursor-pointer ${
              hariAktif === "Kustom"
                ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-light)]"
            }`}
          >
            Custom
          </button>
        </div>

        {hariAktif === "Kustom" && (
          <div className="mb-3">
            <div className="grid grid-cols-7 gap-1.5">
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((label, i) => {
                const active = customDays?.split(",").map(Number).includes(i) || false;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      const current = customDays ? customDays.split(",").map(Number) : [];
                      const next = current.includes(i) ? current.filter((d) => d !== i) : [...current, i];
                      const sorted = next.sort((a, b) => a - b);
                      const joined = sorted.join(",");
                      setCustomDays(joined);
                      localStorage.setItem("bgy_hari_aktif_custom", joined);
                    }}
                    className={`py-2 rounded-lg text-[0.72rem] font-bold border-[1.5px] cursor-pointer transition-all ${
                      active
                        ? "border-[#0ea5a0] bg-[#0ea5a0] text-white shadow-sm"
                        : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-light)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-[0.65rem] text-[var(--text-light)]">
          {hariAktif === "Senin-Jumat" && "Sabtu & Minggu: tidak masuk presensi, merah di kalender"}
          {hariAktif === "Senin-Sabtu" && "Minggu: tidak masuk presensi, merah di kalender"}
          {hariAktif === "Kustom" && "Hari yang tidak aktif: tidak masuk presensi, merah di kalender"}
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

      {/* PRO Section */}
      {isPRO ? (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
          <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
            <Crown size={15} className="text-[#f59e0b]" /> Lisensi PRO Aktif
          </div>

          {licenseInfo ? (
            <>
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
            </>
          ) : (
            <div className="text-[0.74rem] text-[var(--text-light)] mb-3">
              Memuat info lisensi...
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

          <div className="bg-gradient-to-br from-[#0ea5a0]/8 to-[#0d7a8a]/12 rounded-xl p-4 mb-3 border-2 border-[#0ea5a0]/20 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(14,165,160,0.06), rgba(13,122,138,0.10))",
            }}>
            <Crown size={24} className="text-[#0ea5a0] mx-auto mb-1" />
            <div className="text-[1rem] font-bold text-[var(--text)] mb-1">
              Akses Penuh Semua Fitur Premium
            </div>
            <div className="text-[0.75rem] text-[var(--text-light)] mb-2">
              Kelola semua kelas, cloud sync, backup otomatis & banyak lagi
            </div>
            <div className="text-[1.6rem] font-black text-[#0ea5a0] leading-tight">
              {PRO_PRICE}
            </div>
            <div className="text-[0.65rem] text-[var(--text-light)] mt-1">
              per tahun
            </div>
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
              disabled={activating || !kode.trim() || !email.trim()}
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
                value={loginEmail || teacher?.email || ""}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
              />
            </div>
            <button
              onClick={handleDeviceLogin}
              disabled={connecting || !(loginEmail || teacher?.email)}
              className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] border-[1.5px] border-[#0ea5a0] text-[#0ea5a0] font-bold text-[0.82rem] cursor-pointer disabled:opacity-60 bg-transparent"
            >
              <Upload size={15} />
              {connecting ? "Menghubungkan..." : "Hubungkan Device"}
            </button>
          </div>
        </div>
      )}

      {/* Perbandingan Gratis vs PRO (khusus FREE) */}
      {!isPRO && (
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
                  { fitur: "Jumlah siswa per kelas", free: `${MAX_STUDENTS_FREE} siswa`, pro: "Unlimited" },
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
      )}

      {/* Keluar dari Akun PRO (PRO only) */}
      {isPRO && (
        <div className="mt-3">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] border-[1.5px] border-[#ef4444] text-[#ef4444] font-bold text-[0.8rem] cursor-pointer bg-transparent"
          >
            <LogOut size={15} /> Keluar dari Akun PRO di Perangkat Ini
          </button>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-end lg:items-center justify-center animate-fade-in" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px] animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
            <div className="text-[0.85rem] font-bold mb-2 text-center text-[#ef4444]">
              Keluar dari Akun PRO?
            </div>
            <p className="text-[var(--text-light)] text-[0.75rem] text-center mb-[14px]">
              Perangkat ini akan kembali ke paket FREE dan berhenti sync. Data lokal tetap aman, lisensi PRO pengguna tidak dinonaktifkan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleLogoutFromPro}
                className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] bg-[#ef4444] text-white font-bold text-[0.82rem] cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First-time PRO sync prompt */}
      {showSyncPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-end lg:items-center justify-center animate-fade-in" onClick={() => setShowSyncPrompt(false)}>
          <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px] animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-[#0ea5a0]/10 flex items-center justify-center">
                <Smartphone size={28} className="text-[#0ea5a0]" />
              </div>
            </div>
            <div className="text-[0.85rem] font-bold mb-2 text-center text-[var(--text)]">
              Selamat Datang di PRO! 🎉
            </div>
            <p className="text-[var(--text-light)] text-[0.75rem] text-center mb-[14px]">
              Aktifkan <b>Sinkronisasi Cloud</b> agar data kamu aman dan bisa diakses dari perangkat lain. Cukup sekali, selanjutnya otomatis!
            </p>
            <div className="bg-[rgba(14,165,160,0.06)] rounded-lg p-3 mb-3 text-[0.7rem] text-[var(--text)]">
              <b>Cara:</b> Buka halaman ini → gulir ke <b>Pengaturan Cloud Sync</b> → masukkan email → klik <b>Hubungkan Sekarang</b>.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowSyncPrompt(false); localStorage.setItem("bgy_pro_sync_reminded", "1"); }}
                className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
              >
                Nanti
              </button>
              <button
                onClick={() => { setShowSyncPrompt(false); localStorage.setItem("bgy_pro_sync_reminded", "1"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer"
                style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
              >
                Oke, Saya Mau!
              </button>
            </div>
            <button
              onClick={() => { setShowSyncPrompt(false); localStorage.setItem("bgy_pro_sync_reminded", "1"); setActivePage(PageName.CLOUD_SETTINGS); }}
              className="w-full text-center text-[0.68rem] text-[#0ea5a0] font-semibold mt-2 bg-transparent border-none cursor-pointer"
            >
              Buka Pengaturan Cloud Sync
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(ts: number): string {
  if (!ts) return "belum pernah";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}
