import { useState, useRef } from "react";
import { parseExcel, downloadTemplate, siswaToImportResult, type ImportResult } from "@/services/import.service";
import { useToast } from "@/components/shared/Toast";
import { FileSpreadsheet, Download, Upload, Check, X } from "lucide-react";
import { inisial } from "@/lib/utils";

interface Props {
  kelasId: number;
  existingCount: number;
  onImport: (result: ImportResult) => Promise<void>;
  onClose?: () => void;
}

export function ImportExcel({ kelasId, existingCount, onImport, onClose }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast("Format file tidak didukung. Gunakan file Excel (.xlsx)");
      return;
    }

    setLoading(true);
    const res = await parseExcel(file);
    setResult(res);
    setLoading(false);

    if (!res.success && res.errors.length > 0) {
      toast(res.errors[0]);
    }
  };

  const handleImport = async () => {
    if (!result || result.students.length === 0) return;
    setImporting(true);
    await onImport(result);
    setImporting(false);
    toast(`✅ ${result.students.length} siswa berhasil diimport`);
    if (onClose) onClose();
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px]">
      <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
        <FileSpreadsheet size={15} /> Import Excel
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        className="hidden"
      />

      <div className="flex gap-2 mb-[10px]">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
        >
          <Upload size={15} />
          {loading ? "Membaca..." : "Pilih File Excel"}
        </button>
        <button
          onClick={downloadTemplate}
          className="flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
        >
          <Download size={15} />
          Template
        </button>
      </div>

      {result && (
        <div>
          {result.errors.length > 0 && (
            <div className="mb-2 p-2 rounded-lg bg-[#fee2e2] text-[#dc2626] text-[0.72rem]">
              {result.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-1">
                  <X size={12} className="mt-[2px] flex-shrink-0" /> {err}
                </div>
              ))}
            </div>
          )}

          {result.students.length > 0 && (
            <div>
              <div className="text-[0.7rem] font-semibold text-[var(--text-light)] mb-2">
                Ditemukan {result.students.length} siswa
              </div>
              <div className="max-h-[160px] overflow-y-auto mb-2">
                {result.students.slice(0, 20).map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-[8px] px-2 py-[6px] rounded-lg text-[0.78rem] mb-1 bg-[var(--input-bg)]"
                  >
                    <div
                      className="w-[26px] h-[26px] rounded-full text-white flex items-center justify-center font-bold text-[0.65rem] flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
                    >
                      {inisial(s.nama)}
                    </div>
                    <span className="flex-1 truncate font-semibold">{s.nama}</span>
                    {s.nisn && (
                      <span className="text-[0.65rem] text-[var(--text-light)]">NISN: {s.nisn}</span>
                    )}
                  </div>
                ))}
                {result.students.length > 20 && (
                  <div className="text-[0.7rem] text-[var(--text-light)] text-center">
                    ...dan {result.students.length - 20} siswa lainnya
                  </div>
                )}
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
              >
                <Check size={15} />
                {importing ? "Mengimpor..." : "Import Sekarang"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
