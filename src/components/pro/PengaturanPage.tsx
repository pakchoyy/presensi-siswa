import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { licenseService } from "@/services/license.service";
import { licenseRepo } from "@/repositories/dexie/license.repo";
import type { License } from "@/types/entities";
import { syncService } from "@/services/sync.service";
import { getSyncLog, type SyncLogEntry } from "@/services/sync.service";
import { Tier, Jenjang, PageName } from "@/types/enums";
import { showConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PRO_PRICE, PLUS_PRICE } from "@/lib/constants";
import { canUse, LIMITS, tierLabel, trialDaysRemaining } from "@/lib/features";
import { saveLogoutBackup } from "@/services/backup.service";
import { LICENSE_DURATION_DAYS } from "@/lib/constants";
import { UpgradePrompt } from "@/components/pro/UpgradePrompt";
import { generateId, getActiveDays } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { OtpVerify } from "@/components/auth/OtpVerify";
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
  QrCode,
  Video,
  Lock,
  Gift,
  ChevronRight,
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
  const { teacher, school, refreshTeacher, setActivePage, tier: appTier, realTier } = useApp();
  const { toast } = useToast();
  const { isCloudConnected, cloudUser, setCloudEmail, clearCloudEmail } = useCloudAuth();

  const tier = appTier;
  const isPaid = realTier === Tier.PRO || realTier === Tier.PLUS;
  const trialLeft = realTier === Tier.FREE ? trialDaysRemaining() : 0;
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const canQrMode = canUse("qr_mode", tier);
  const canPjjMode = canUse("pjj_mode", tier);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

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
  const [qrMode, setQrMode] = useState(localStorage.getItem("bgy_qr_mode") === "1");
  useEffect(() => {
    const sync = () => setQrMode(localStorage.getItem("bgy_qr_mode") === "1");
    window.addEventListener("bgy-qr-mode", sync);
    return () => window.removeEventListener("bgy-qr-mode", sync);
  }, []);
  const [pjjMode, setPjjMode] = useState(localStorage.getItem("bgy_pjj_mode") === "1");
  const [qrPicker, setQrPicker] = useState(localStorage.getItem("bgy_qr_picker") === "1");
  const qrOn = qrMode && canQrMode;
  const pjjOn = pjjMode && canPjjMode;

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
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEmergencyTools, setShowEmergencyTools] = useState(false);

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
    if (isPaid && !isCloudConnected && !reminded && localStorage.getItem("bgy_demo_mode") !== "1") {
      const timer = setTimeout(() => setShowSyncPrompt(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isPaid, isCloudConnected]);

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
        if (!status.aktif && teacherTier && teacherTier !== Tier.FREE && teacherEmail) {
          try {
            const lookup = await licenseService.lookupByEmail(teacherEmail.toLowerCase().trim());
            const licenseData = lookup.found ? { tanggal_berakhir: lookup.tanggalBerakhir, tier: lookup.tier } : null;

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
                tier: licenseData.tier === Tier.PLUS ? Tier.PLUS : Tier.PRO,
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
    if (isPaid && teacher?.email) {
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
  }, [teacher?.id, isPaid]);

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
    if (isPaid && teacher?.email) {
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
      "Halo Pak Choyy, saya mau tanya paket Presensi Yuk\nEmail: " + (teacher?.email || "")
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
      if (downloaded > 0) {
        toast(`✅ ${downloaded} data dimuat — menyegarkan tampilan…`, "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast("⚠️ Tidak ada data baru di cloud untuk ditarik", "info");
      }
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

  const doLogout = async () => {
    setLoggingOut(true);
    try {
      // Kirim perubahan terakhir dulu kalau terhubung cloud.
      if (isCloudConnected && cloudUser?.email) {
        await syncService.incrementalSync(cloudUser.email);
      }
      // Selalu simpan backup (file Download + salinan di HP) sebelum data dihapus — jangan bergantung pada status cloud.
      if (localStorage.getItem("bgy_demo_mode") !== "1") {
        await saveLogoutBackup();
        toast("✅ File backup disimpan di folder Download");
        await new Promise((r) => setTimeout(r, 1200));
      }
      await logout();
    } catch (err) {
      console.error("Logout gagal:", err);
      toast("❌ Gagal keluar. Data tidak dihapus, coba lagi.");
      setLoggingOut(false);
    }
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
    if (!teacher) {
      toast("❌ Data guru belum dimuat. Muat ulang halaman lalu coba lagi.");
      return;
    }
    
    const emailAddress = (loginEmail || teacher?.email || "").trim().toLowerCase();
    if (!emailAddress || !emailAddress.includes('@')) {
      toast("❌ Email tidak valid");
      return;
    }
    
    setOtpEmail(emailAddress);
  };

  // Dipanggil setelah email terverifikasi (OTP) dan perangkat lolos batas di server.
  const finishDeviceLogin = async (result: { tier: Tier; tanggalBerakhir: number | null }, emailAddress: string) => {
    if (!teacher) return;
    setOtpEmail(null);
    setConnecting(true);
    const foundTier = result.tier === Tier.PLUS ? Tier.PLUS : Tier.PRO;
    const licenseData = { tanggal_berakhir: result.tanggalBerakhir };
    try {
      localStorage.setItem("presensi_cloud_email", emailAddress);
      
      try {
        const downloaded = await syncService.downloadAll(emailAddress);
        if (downloaded > 0) {
          toast(`✅ ${downloaded} data dimuat — menyegarkan tampilan…`);
        } else {
          // Cloud masih kosong: data yang sudah ada di HP ini jadi data awal akun.
          const uploaded = await syncService.initialUpload(emailAddress);
          toast(uploaded > 0 ? `✅ ${uploaded} data di HP ini disimpan ke cloud` : "⚠️ Terhubung, tapi belum ada data terkirim ke cloud");
        }
      } catch (error) {
        console.error("Download error:", error);
        toast("⚠️ Gagal mengambil data cloud, coba lagi");
      }
      
      const now = Date.now();
      const expiry = licenseData?.tanggal_berakhir || (now + LICENSE_DURATION_DAYS * 24 * 60 * 60 * 1000);
      
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
          tier: foundTier,
        };
        await licenseRepo.save(license);
      }

      await teacherRepo.update(teacher.id, {
        ...teacher,
        tier: foundTier,
        email: emailAddress,
      });
      
      await refreshTeacher();
      
      setConnecting(false);
      setTimeout(() => window.location.reload(), 1500);
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
    <div className="flex-1 px-[14px] pt-[14px] pb-[calc(100px+var(--ticker-h,0px))] lg:pb-4">
      <div className="text-[0.66rem] font-extrabold tracking-[0.08em] uppercase text-[var(--text-light)] mt-1 mb-2 px-1">Akun & Paket</div>
      {/* Status Tier */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] border-l-4 border-l-[#0ea5a0] p-[14px] mb-3">
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
            {isPaid ? (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[0.65rem] font-bold ${tier === Tier.PRO ? "bg-[#f59e0b]/10 text-[#b45309] border border-[#f59e0b]/30" : "bg-[#0ea5a0]/10 text-[#0ea5a0] border border-[#0ea5a0]/20"}`}>
                <Crown size={11} /> {tierLabel(tier)}
              </span>
            ) : trialLeft > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[0.65rem] font-bold bg-[#f59e0b]/10 text-[#b45309] border border-[#f59e0b]/30">
                PRO · Trial
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
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] border-l-4 border-l-[#0ea5a0] p-[14px] mb-3">
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

      {/* Paket & Lisensi */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] border-l-4 border-l-[#0ea5a0] p-[14px] mb-3">
        <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
          <Crown size={15} className={tier === Tier.PRO ? "text-[#f59e0b]" : "text-[#0ea5a0]"} /> Paket & Lisensi
        </div>

        {isPaid ? (
          licenseInfo ? (
            <div className="mb-3 space-y-1 text-[0.74rem]">
              <div className="flex gap-2">
                <CalendarCheck size={13} className="text-[var(--text-light)] flex-shrink-0 mt-[1px]" />
                <span className="text-[var(--text)]">
                  {tierLabel(tier)} berlaku sampai <b>{licenseInfo.berakhir}</b>
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
              {isExpiring && (
                <div className="bg-[#fef3c7] rounded-lg p-2 mt-2 border border-[#fbbf24] flex items-start gap-2 text-[0.7rem] text-[#78350f]">
                  <AlertTriangle size={14} className="text-[#b45309] flex-shrink-0 mt-[1px]" />
                  Lisensi hampir habis. Masukkan kode baru di bawah supaya fitur tidak terputus.
                </div>
              )}
            </div>
          ) : (
            <div className="text-[0.74rem] text-[var(--text-light)] mb-3">Memuat info lisensi...</div>
          )
        ) : (
          <div className="mb-3 text-[0.74rem] text-[var(--text)]">
            {trialLeft > 0
              ? <>Kamu sedang <b>coba PRO gratis</b> — tersisa <b>{trialLeft} hari</b>. Setelah itu otomatis jadi FREE ({LIMITS[Tier.FREE].kelas} kelas, {LIMITS[Tier.FREE].siswaPerKelas} siswa), data tetap aman.</>
              : <>Kamu memakai <b>FREE</b> ({LIMITS[Tier.FREE].kelas} kelas, {LIMITS[Tier.FREE].siswaPerKelas} siswa). Pilih PLUS atau PRO untuk kelas &amp; siswa lebih banyak.</>}
          </div>
        )}

        {realTier !== Tier.PRO && (
          <button
            onClick={() => setActivePage(PageName.UPGRADE)}
            className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer mb-3 border-none"
            style={{ background: tier === Tier.PLUS ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
          >
            <ArrowUpCircle size={15} />
            {tier === Tier.PLUS ? `Upgrade ke PRO — ${PRO_PRICE}` : `Lihat paket — mulai ${PLUS_PRICE}`}
          </button>
        )}

        <div className="border-t border-[var(--border)] pt-3">
          <div className="text-[0.72rem] font-bold text-[var(--text)] mb-1 flex items-center gap-[4px]">
            <Key size={13} /> {isPaid ? "Perpanjang lisensi" : "Aktivasi Lisensi"}
          </div>
          <div className="text-[0.66rem] text-[var(--text-light)] mb-2">
            Masukkan kode yang kamu terima setelah membeli (BGY-PS-PLUS-… atau BGY-PS-PRO-…).
          </div>
          {!isPaid && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email saat membeli"
              className="w-full mb-2 px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
            />
          )}
          <input
            type="text"
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder="BGY-PS-PRO-XXXXXXXX"
            className="w-full mb-2 px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit] uppercase"
          />
          <button
            onClick={isPaid ? handleRenew : handleActivate}
            disabled={(isPaid ? renewing : activating) || !kode.trim() || (!isPaid && !email.trim())}
            className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] border-[1.5px] border-[#0ea5a0] text-[#0ea5a0] font-bold text-[0.82rem] cursor-pointer disabled:opacity-50 bg-transparent"
          >
            <Key size={14} />
            {isPaid
              ? (renewing ? "Memperpanjang..." : "Perpanjang 1 Semester")
              : (activating ? "Mengaktifkan..." : "Aktivasi Lisensi")}
          </button>
        </div>

        {!isCloudConnected && (
          <div className="border-t border-[var(--border)] pt-3 mt-3">
            <button
              onClick={() => setShowConnect(!showConnect)}
              className="w-full flex items-center justify-between text-[0.72rem] font-bold text-[var(--text)] bg-transparent border-none cursor-pointer p-0"
            >
              <span className="flex items-center gap-[4px]"><Upload size={13} /> Sudah berlangganan di HP lain? Ambil data dari cloud</span>
              <span className="text-[var(--text-light)]">{showConnect ? "▲" : "▼"}</span>
            </button>
            {showConnect && (
              <div className="mt-2">
                <input
                  type="email"
                  value={loginEmail || teacher?.email || ""}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Email yang terdaftar PLUS/PRO"
                  className="w-full mb-2 px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
                />
                <button
                  onClick={handleDeviceLogin}
                  disabled={connecting || !(loginEmail || teacher?.email)}
                  className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-60 border-none"
                  style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
                >
                  <Download size={15} />
                  {connecting ? "Menghubungkan..." : "Hubungkan & ambil data"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-[0.66rem] font-extrabold tracking-[0.08em] uppercase text-[var(--text-light)] mt-5 mb-2 px-1">Sekolah & Tahun Ajaran</div>
      {/* Periode Ajaran */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] border-l-4 border-l-[#f59e0b] p-[14px] mb-3">
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
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] border-l-4 border-l-[#f59e0b] p-[14px] mb-3">
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

      {/* Logo Sekolah (PLUS & PRO) */}
      {canUse("logo_report", tier) && (
        <LogoUpload editable={true} />
      )}

      <div className="text-[0.66rem] font-extrabold tracking-[0.08em] uppercase text-[var(--text-light)] mt-5 mb-2 px-1">Cara Presensi</div>
      {/* Mode Presensi (QR + PJJ + Auto Hadir) */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] border-l-4 border-l-[#3b82f6] p-[14px] mb-3">
        <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[12px]">
          <UserCheck size={15} /> Mode Presensi
        </div>

        {/* Mode QR */}
        <div className="flex items-center justify-between py-[6px]">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <QrCode size={14} className="text-[#0ea5a0] mt-[2px] flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[0.78rem] font-semibold text-[var(--text)]">Mode QR</div>
              <div className="text-[0.68rem] text-[var(--text-light)]">Scan kartu QR siswa dari halaman Presensi</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!canQrMode ? (
              <button
                onClick={() => setUpgradeReason("Mode QR hanya tersedia di paket PRO.")}
                className="flex items-center gap-1 text-[0.62rem] px-[8px] py-[4px] rounded-full font-bold bg-[#f59e0b]/15 text-[#b45309] border border-[#f59e0b]/30 cursor-pointer"
              >
                <Lock size={11} /> PRO
              </button>
            ) : (
            <button
              onClick={() => {
                if (!canQrMode) {
                  setUpgradeReason("Mode QR cuma tersedia untuk tier PRO.");
                  return;
                }
                const newVal = !qrMode;
                setQrMode(newVal);
                localStorage.setItem("bgy_qr_mode", newVal ? "1" : "0");
                window.dispatchEvent(new Event("bgy-qr-mode"));
                if (newVal) {
                  localStorage.removeItem("bgy_qr_hint_seen");
                  if (pjjMode) {
                    setPjjMode(false);
                    localStorage.setItem("bgy_pjj_mode", "0");
                  }
                  if (autoHadir) {
                    setAutoHadir(false);
                    localStorage.setItem("bgy_auto_hadir", "0");
                  }
                }
                window.dispatchEvent(new Event("storage"));
                toast(newVal ? "✅ Mode QR: ON — Auto Hadir dimatikan, bisa dinyalakan lagi" : "Mode QR: OFF");
              }}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none ${
                !canQrMode ? "opacity-40 bg-[var(--border)]" : (qrMode ? "bg-[#0ea5a0]" : "bg-[var(--border)]")
              }`}
            >
              <span
                className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white transition-transform shadow ${
                  qrMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            )}
          </div>
        </div>

        {/* Sub-opsi QR: Pilih Status Saat Scan */}
        {qrOn && (
          <div className="flex items-center justify-between py-[6px] pl-6 border-l-[2px] border-[#0ea5a0]/30 ml-[6px]">
            <div className="flex-1 min-w-0 pr-2">
              <div className="text-[0.74rem] font-semibold text-[var(--text)]">Pilih Status Saat Scan</div>
              <div className="text-[0.65rem] text-[var(--text-light)]">OFF: auto Hadir • ON: muncul Hadir/Sakit/Izin/Alpha/Terlambat</div>
            </div>
            <button
              onClick={() => {
                const newVal = !qrPicker;
                setQrPicker(newVal);
                localStorage.setItem("bgy_qr_picker", newVal ? "1" : "0");
                window.dispatchEvent(new Event("storage"));
                toast(newVal ? "✅ Pilih Status: ON" : "Pilih Status: OFF (auto Hadir)");
              }}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none flex-shrink-0 ${
                qrPicker ? "bg-[#0ea5a0]" : "bg-[var(--border)]"
              }`}
            >
              <span
                className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white transition-transform shadow ${
                  qrPicker ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}

        <div className="h-px bg-[var(--border)] my-1" />

        {/* Mode PJJ */}
        <div className="flex items-center justify-between py-[6px]">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Video size={14} className="text-[#8b5cf6] mt-[2px] flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[0.78rem] font-semibold text-[var(--text)]">Mode PJJ</div>
              <div className="text-[0.68rem] text-[var(--text-light)]">Siswa absen sendiri lewat link (kelas online)</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!canPjjMode ? (
              <button
                onClick={() => setUpgradeReason("Mode PJJ tersedia di paket PLUS dan PRO.")}
                className="flex items-center gap-1 text-[0.62rem] px-[8px] py-[4px] rounded-full font-bold bg-[#0ea5a0]/15 text-[#0ea5a0] border border-[#0ea5a0]/30 cursor-pointer"
              >
                <Lock size={11} /> PLUS
              </button>
            ) : (
          <button
            onClick={() => {
              if (!canPjjMode) {
                setUpgradeReason("Mode PJJ tersedia untuk tier PLUS atau PRO.");
                return;
              }
              const newVal = !pjjMode;
              setPjjMode(newVal);
              localStorage.setItem("bgy_pjj_mode", newVal ? "1" : "0");
              if (newVal) {
                localStorage.removeItem("bgy_pjj_hint_seen");
                if (qrMode) {
                  setQrMode(false);
                  localStorage.setItem("bgy_qr_mode", "0");
                  window.dispatchEvent(new Event("bgy-qr-mode"));
                }
              }
              window.dispatchEvent(new Event("storage"));
              toast(newVal ? "✅ Mode PJJ: ON — kirim link ke siswa" : "Mode PJJ: OFF");
            }}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none ${
              !canPjjMode ? "opacity-40 bg-[var(--border)]" : (pjjMode ? "bg-[#8b5cf6]" : "bg-[var(--border)]")
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white transition-transform shadow ${
                pjjMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
            )}
          </div>
        </div>

        <div className="h-px bg-[var(--border)] my-1" />

        {/* Isi Hadir Otomatis */}
        <div className="flex items-center justify-between py-[6px]">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Check size={14} className="text-[#16a34a] mt-[2px] flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[0.78rem] font-semibold text-[var(--text)]">Isi Hadir Otomatis</div>
              <div className="text-[0.68rem] text-[var(--text-light)]">Semua siswa auto "Hadir", edit yang tidak hadir</div>
            </div>
          </div>
          <button
            onClick={() => {
              const newVal = !autoHadir;
              setAutoHadir(newVal);
              localStorage.setItem("bgy_auto_hadir", newVal ? "1" : "0");
              toast(newVal ? "✅ Isi Hadir Otomatis: ON" : "Isi Hadir Otomatis: OFF");
            }}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none flex-shrink-0 ${
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

        {qrOn && (
          <div className="text-[0.65rem] text-[var(--text-light)] mt-2 pt-2 border-t border-[var(--border)]">
            💡 Cetak kartu QR di menu Siswa, lalu scan dari tombol di halaman Presensi
          </div>
        )}
        {pjjOn && (
          <div className="text-[0.65rem] text-[var(--text-light)] mt-2 pt-2 border-t border-[var(--border)]">
            💡 Aktifkan "Absen Mandiri" per kelas di menu Siswa, lalu bagikan link ke siswa
          </div>
        )}
      </div>

      {canUse("cloud_sync", realTier) && isCloudConnected && (
        <div className="text-[0.66rem] font-extrabold tracking-[0.08em] uppercase text-[var(--text-light)] mt-5 mb-2 px-1">Data & Cloud</div>
      )}
      {/* Cloud Sync (PLUS & PRO) */}
      {canUse("cloud_sync", realTier) && isCloudConnected && (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] border-l-4 border-l-[#22c55e] p-[14px] mb-3">
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
            <div className="text-[var(--text-light)]">Terhubung sebagai: {cloudUser?.email}</div>
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
                ? `✅ ${syncLog.action === "upload" ? "Upload" : syncLog.action === "download" ? "Tarik" : "Sync"} OK` +
                  (syncLog.uploaded ? ` · ${syncLog.uploaded} ter-upload` : "") +
                  (syncLog.downloaded ? ` · ${syncLog.downloaded} ter-download` : "") +
                  formatSyncDetail(syncLog.detail)
                : `❌ ${syncLog.action === "upload" ? "Upload" : syncLog.action === "download" ? "Tarik" : "Sync"} gagal: ${syncLog.error || "error tidak diketahui"}`}
            </div>
          )}

          {syncLog?.ok ? (
            <div className="text-[0.68rem] text-blue-800 dark:text-blue-200 mb-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              ✨ <b>Sync Otomatis Aktif</b><br />
              Data otomatis tersinkronisasi antar device saat kamu edit atau buka app (maksimal 5 menit delay).
            </div>
          ) : (
            <div className="text-[0.68rem] text-[#991b1b] mb-3 p-2 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
              ⚠️ <b>Belum ada sinkron yang berhasil.</b> Data masih di HP ini — jangan keluar dulu.
            </div>
          )}

          {/* Tombol darurat tersembunyi */}
          <button
            onClick={() => setShowEmergencyTools(!showEmergencyTools)}
            className="w-full text-[0.68rem] text-gray-500 dark:text-gray-400 py-2 mb-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/30"
          >
            {showEmergencyTools ? "▼" : "▶"} Alat Sinkronisasi Darurat (hanya jika ada masalah)
          </button>

          {showEmergencyTools && (
            <div className="mb-3">
              <div className="text-[0.68rem] text-red-800 dark:text-red-200 mb-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-800">
                ⚠️ <b>PERINGATAN:</b> Gunakan hanya jika data benar-benar berbeda antar device!<br />
                • <b>Upload Cloud</b> = kirim data device ini ke cloud (overwrite jika lebih baru)<br />
                • <b>Tarik Cloud</b> = ambil data cloud ke device ini (merge dengan lokal)
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
        </div>
      )}

      {realTier === Tier.PRO && (
        <div className="text-[0.66rem] font-extrabold tracking-[0.08em] uppercase text-[var(--text-light)] mt-5 mb-2 px-1">Lainnya</div>
      )}
      {realTier === Tier.PRO && (
        <button
          onClick={() => setActivePage(PageName.AFFILIATE)}
          className="w-full flex items-center gap-3 bg-[var(--card-bg)] rounded-xl border border-[#f59e0b]/40 p-[14px] mb-3 text-left cursor-pointer"
        >
          <Gift size={18} className="text-[#f59e0b] flex-shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[0.85rem] font-bold text-[var(--text)]">Program Affiliate</span>
            <span className="block text-[0.7rem] text-[var(--text-light)]">Bagikan kodemu, dapat komisi + bonus masa aktif</span>
          </span>
          <ChevronRight size={16} className="text-[var(--text-light)]" />
        </button>
      )}

      {/* Keluar */}
      <div className="mt-3">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] border-[1.5px] border-[#ef4444] text-[#ef4444] font-bold text-[0.8rem] cursor-pointer bg-transparent"
        >
          <LogOut size={15} /> Keluar dari akun
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-end lg:items-center justify-center animate-fade-in" onClick={() => !loggingOut && setShowLogoutConfirm(false)}>
          <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px] animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
            <div className="text-[0.9rem] font-bold mb-2 text-center text-[var(--text)]">
              Keluar dari akun?
            </div>
            <p className="text-[var(--text-light)] text-[0.75rem] text-center mb-[14px]">
              Semua data di HP ini akan dihapus. Sebelum keluar, data disinkronkan (kalau terhubung cloud) dan file backup disimpan ke folder <b>Download</b>, bisa dipulihkan dari layar awal.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => doLogout()}
                disabled={loggingOut}
                className="w-full py-[10px] rounded-[10px] bg-[#ef4444] text-white font-bold text-[0.82rem] cursor-pointer border-none disabled:opacity-60"
              >
                {loggingOut ? "Mengeluarkan..." : "Keluar"}
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="w-full py-[10px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First-time sync reminder: kartu kecil di atas navbar, tidak menutupi layar */}
      {otpEmail && (
        <OtpVerify
          email={otpEmail}
          title="Hubungkan ke cloud"
          onConnected={(r, e) => finishDeviceLogin(r, e)}
          onClose={() => setOtpEmail(null)}
        />
      )}

      {showSyncPrompt && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[84px] lg:bottom-6 w-[calc(100%-24px)] max-w-[420px] z-[350] animate-slide-up">
          <div className="bg-[var(--card-bg)] border border-[#0ea5a0]/40 rounded-2xl p-3 flex items-start gap-3" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="w-9 h-9 rounded-full bg-[#0ea5a0]/10 flex items-center justify-center flex-shrink-0">
              <Smartphone size={18} className="text-[#0ea5a0]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.8rem] font-bold text-[var(--text)]">Paket kamu sudah aktif 🎉</div>
              <p className="text-[0.7rem] text-[var(--text-light)] leading-snug mt-[2px]">Hubungkan email di kartu <b>Paket &amp; Lisensi</b> supaya data aman di cloud.</p>
              <button
                onClick={() => { setShowSyncPrompt(false); localStorage.setItem("bgy_pro_sync_reminded", "1"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="mt-2 py-[7px] px-[12px] rounded-[9px] text-white font-bold text-[0.74rem] border-none cursor-pointer"
                style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
              >
                Hubungkan sekarang
              </button>
            </div>
            <button
              onClick={() => { setShowSyncPrompt(false); localStorage.setItem("bgy_pro_sync_reminded", "1"); }}
              className="text-[var(--text-light)] text-[1.1rem] leading-none bg-transparent border-none cursor-pointer px-1"
              aria-label="Tutup"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {upgradeReason && (
        <UpgradePrompt reason={upgradeReason} currentTier={tier} onClose={() => setUpgradeReason(null)} onGoToUpgrade={() => { setUpgradeReason(null); setActivePage(PageName.UPGRADE); }} />
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

const SYNC_DETAIL_LABEL: Record<string, string> = {
  schools: "sekolah",
  teachers: "guru",
  academicYears: "tahun ajaran",
  classrooms: "kelas",
  students: "siswa",
  attendanceSessions: "sesi",
  attendanceRecords: "catatan",
  calendarEntries: "kalender",
};

function formatSyncDetail(detail?: Record<string, number>): string {
  if (!detail || Object.keys(detail).length === 0) return "";
  const parts = Object.entries(detail).map(([key, val]) => `${val} ${SYNC_DETAIL_LABEL[key] || key}`);
  return ` (${parts.join(" · ")})`;
}
