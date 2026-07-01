import { useState, useRef } from "react";
import { parseExcel, downloadTemplate, siswaToImportResult, type ImportResult } from "@/services/import.service";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { useToast } from "@/components/shared/Toast";
import type { Student } from "@/types/entities";
import { FileSpreadsheet, Download, Upload, Check, X, RefreshCw } from "lucide-react";
import { inisial } from "@/lib/utils";

interface Props {
  kelasId: number;
  existingCount: number;
  onDone: () => void;
}

interface ComparisonResult {
  baru: { nama: string; nisn?: string }[];
  cocok: { existing: Student; newData: { nama: string; nisn?: string } }[];
  tidakDitemukan: Student[];
}

export function ImportUpdateExcel({ kelasId, existingCount, onDone }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deactivateMissing, setDeactivateMissing] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast("Format file tidak didukung. Gunakan Excel (.xlsx)");
      return;
    }

    setLoading(true);
    const res = await parseExcel(file);
    setResult(res);
    setLoading(false);

    if (!res.success && res.errors.length > 0) {
      toast(res.errors[0]);
      return;
    }

    // Compare with existing students
    const existing = await studentRepo.getByClass(kelasId);
    const baru: ComparisonResult["baru"] = [];
    const cocok: ComparisonResult["cocok"] = [];
    const existingMatched = new Set<number>();

    for (const imp of res.students) {
      let matched = false;

      for (const ex of existing) {
        if (existingMatched.has(ex.id)) continue;

        // Match by NISN first, then by exact name
        if (imp.nisn && ex.nisn && imp.nisn === ex.nisn) {
          cocok.push({ existing: ex, newData: imp });
          existingMatched.add(ex.id);
          matched = true;
          break;
        }
        if (imp.nama.toLowerCase().trim() === ex.nama.toLowerCase().trim()) {
          cocok.push({ existing: ex, newData: imp });
          existingMatched.add(ex.id);
          matched = true;
          break;
        }
      }

      if (!matched) {
        baru.push({ nama: imp.nama, nisn: imp.nisn });
      }
    }

    const tidakDitemukan = existing.filter((ex) => !existingMatched.has(ex.id));

    setComparison({ baru, cocok, tidakDitemukan });
  };

  const handleImport = async () => {
    if (!comparison) return;
    setImporting(true);

    const now = Date.now();

    // Add new students
    if (comparison.baru.length > 0) {
      const newStudents: Student[] = comparison.baru.map((s, i) => ({
        id: now + i + 1000,
        kelasId,
        nama: s.nama,
        nisn: s.nisn,
        urutan: existingCount + i + 1,
        statusAktif: true,
        dibuatPada: now,
        diubahPada: now,
      }));
      await studentRepo.bulkSave(newStudents);
    }

    // Update matched students (update NISN if changed)
    for (const { existing, newData } of comparison.cocok) {
      if (newData.nisn && existing.nisn !== newData.nisn) {
        await studentRepo.save({ ...existing, nisn: newData.nisn, diubahPada: now });
      }
    }

    // Deactivate missing students
    if (deactivateMissing && comparison.tidakDitemukan.length > 0) {
      for (const s of comparison.tidakDitemukan) {
        await studentRepo.softDelete(s.id);
      }
    }

    setImporting(false);
    const total = comparison.baru.length + (deactivateMissing ? comparison.tidakDitemukan.length : 0);
    toast(`✅ ${comparison.baru.length} siswa baru ditambahkan${deactivateMissing ? `, ${comparison.tidakDitemukan.length} dinonaktifkan` : ""}`);
    onDone();
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px]">
      <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
        <RefreshCw size={15} className="text-[#0ea5a0]" /> Import Update Excel (PRO)
      </div>

      <p className="text-[0.72rem] text-[var(--text-light)] mb-3">
        Update daftar siswa dari file Excel terbaru. Siswa baru ditambahkan, data yang cocok diperbarui, dan siswa yang tidak ada di file bisa dinonaktifkan.
      </p>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />

      <div className="flex gap-2 mb-[10px]">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
        >
          <Upload size={15} /> {loading ? "Membaca..." : "Pilih File Excel Baru"}
        </button>
        <button
          onClick={downloadTemplate}
          className="flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
        >
          <Download size={15} /> Template
        </button>
      </div>

      {result && result.errors.length > 0 && (
        <div className="mb-2 p-2 rounded-lg bg-[#fee2e2] text-[#dc2626] text-[0.72rem]">
          {result.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-1"><X size={12} className="mt-[2px] flex-shrink-0" /> {err}</div>
          ))}
        </div>
      )}

      {comparison && (
        <div>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-[#dcfce7] rounded-lg p-2 text-center">
              <div className="text-[1.1rem] font-bold text-[#16a34a]">{comparison.baru.length}</div>
              <div className="text-[0.6rem] text-[var(--text-light)] font-semibold">Siswa Baru</div>
            </div>
            <div className="bg-[#dbeafe] rounded-lg p-2 text-center">
              <div className="text-[1.1rem] font-bold text-[#1d4ed8]">{comparison.cocok.length}</div>
              <div className="text-[0.6rem] text-[var(--text-light)] font-semibold">Data Cocok</div>
            </div>
            <div className="bg-[#fef3c7] rounded-lg p-2 text-center">
              <div className="text-[1.1rem] font-bold text-[#b45309]">{comparison.tidakDitemukan.length}</div>
              <div className="text-[0.6rem] text-[var(--text-light)] font-semibold">Tidak Ada di File</div>
            </div>
          </div>

          {/* Baru */}
          {comparison.baru.length > 0 && (
            <div className="mb-2">
              <div className="text-[0.7rem] font-bold text-[#16a34a] mb-1">🆕 Siswa Baru ({comparison.baru.length})</div>
              <div className="max-h-[100px] overflow-y-auto">
                {comparison.baru.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-[4px] text-[0.72rem] bg-[var(--input-bg)] rounded mb-[2px]">
                    <Check size={12} className="text-[#16a34a]" /> {s.nama}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tidak ditemukan */}
          {comparison.tidakDitemukan.length > 0 && (
            <div className="mb-3">
              <div className="text-[0.7rem] font-bold text-[#b45309] mb-1">⚠️ Tidak ada di file ({comparison.tidakDitemukan.length})</div>
              <div className="max-h-[100px] overflow-y-auto mb-2">
                {comparison.tidakDitemukan.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 px-2 py-[4px] text-[0.72rem] bg-[var(--input-bg)] rounded mb-[2px]">
                    <div className="w-[20px] h-[20px] rounded-full bg-[#dc2626]/10 text-[#dc2626] flex items-center justify-center font-bold text-[0.55rem]">{inisial(s.nama)}</div>
                    {s.nama}
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-[0.7rem] text-[var(--text)] cursor-pointer">
                <input type="checkbox" checked={deactivateMissing} onChange={(e) => setDeactivateMissing(e.target.checked)} />
                Nonaktifkan siswa yang tidak ditemukan di file
              </label>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
          >
            <Check size={15} /> {importing ? "Memproses..." : "Terapkan Perubahan"}
          </button>
        </div>
      )}
    </div>
  );
}
