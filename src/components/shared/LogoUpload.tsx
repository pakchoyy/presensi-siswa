import { useState, useRef } from "react";
import { DEFAULT_LOGO, resolveLogo } from "@/lib/constants";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { schoolRepo } from "@/repositories/dexie/school.repo";
import { Upload, X } from "lucide-react";
import { Tier } from "@/types/enums";
import { canUse } from "@/lib/features";

interface LogoUploadProps {
  editable?: boolean;
}

async function compressLogo(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 256 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", 0.85);
}

export function LogoUpload({ editable = false }: LogoUploadProps) {
  const { school, teacher, tier: appTier } = useApp();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const tier = appTier;
  const canCustomize = canUse("logo_report", tier);
  const isPRO = canCustomize; // backward compat for existing branches below

  const logoUrl = resolveLogo(school?.logoUrl);
  const isCustomLogo = logoUrl !== DEFAULT_LOGO;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi format
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      toast("❌ Format harus PNG, JPG, atau JPEG");
      return;
    }

    // Validasi ukuran (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast("❌ Ukuran maksimal 2MB");
      return;
    }

    setUploading(true);

    try {
      // Logo ikut tersinkron ke cloud: perkecil dulu (maks 256px, WebP) supaya hemat kuota.
      const base64 = await compressLogo(file);
      if (school) {
        await schoolRepo.updateLogo(school.id, base64);
        toast("✅ Logo berhasil diupload");
        // Reload page to show new logo
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      toast("❌ Gagal mengupload logo");
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!school || !isCustomLogo) return;
    
    try {
      await schoolRepo.updateLogo(school.id, DEFAULT_LOGO);
      toast("✅ Logo dihapus, kembali ke default");
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast("❌ Gagal menghapus logo");
    }
  };

  if (!editable) {
    return (
      <div
        className="rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ width: 40, height: 40 }}
      >
        <img
          src={logoUrl}
          alt="Logo Sekolah"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // Editable mode (PRO only)
  if (!isPRO) {
    return (
      <div
        className="rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ width: 40, height: 40 }}
      >
        <img
          src={logoUrl}
          alt="Logo Sekolah"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px]">
      <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
        <Upload size={15} /> Logo Sekolah (PLUS)
      </div>
      
      <div className="flex items-center gap-3 mb-3">
        <div
          className="rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-[var(--border)]"
          style={{ width: 80, height: 80 }}
        >
          <img
            src={logoUrl}
            alt="Logo Sekolah"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 text-[0.7rem] text-[var(--text-light)]">
          {isCustomLogo ? (
            <>
              <div className="text-[var(--text)] font-semibold mb-1">Logo Custom</div>
              <div>Logo ini akan muncul di header & laporan PDF</div>
            </>
          ) : (
            <>
              <div className="text-[var(--text)] font-semibold mb-1">Logo Default</div>
              <div>Upload logo sekolah untuk personalisasi</div>
            </>
          )}
        </div>
      </div>

      <div className="text-[0.68rem] text-[var(--text-light)] mb-2">
        Format: PNG, JPG, JPEG • Max: 2MB
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-[6px] py-[9px] rounded-[10px] text-white font-bold text-[0.78rem] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
        >
          <Upload size={14} />
          {uploading ? "Mengupload..." : "Upload Logo"}
        </button>
        {isCustomLogo && (
          <button
            onClick={handleRemoveLogo}
            className="px-4 py-[9px] rounded-[10px] border-[1.5px] border-[#ef4444] text-[#ef4444] font-bold text-[0.78rem] cursor-pointer bg-transparent flex items-center gap-[6px]"
          >
            <X size={14} />
            Hapus
          </button>
        )}
      </div>
    </div>
  );
}
