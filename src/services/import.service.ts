import * as XLSX from "xlsx";
import type { Student } from "@/types/entities";
import { timestamp, generateId } from "@/lib/utils";

export interface ImportResult {
  success: boolean;
  students: { nama: string; nisn?: string; jenisKelamin?: "L" | "P" }[];
  errors: string[];
}

export function parseExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve({ success: false, students: [], errors: ["File Excel kosong"] });
          return;
        }
        const sheet = workbook.Sheets[sheetName];
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rows.length === 0) {
          resolve({ success: false, students: [], errors: ["File Excel tidak memiliki data siswa"] });
          return;
        }

        const errors: string[] = [];
        const students: ImportResult["students"] = [];
        const namaKeys = ["nama", "nama siswa", "name"];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const nama = namaKeys.reduce<string | undefined>((found, key) => {
            if (found) return found;
            const val = row[key];
            if (val && String(val).trim()) return String(val).trim();
            return undefined;
          }, undefined);

          if (!nama) {
            const altNama = Object.values(row).find((v) => String(v).trim()) || "";
            if (altNama) {
              students.push({ nama: String(altNama).trim() });
            } else {
              errors.push(`Baris ${i + 2} tidak memiliki nama siswa`);
            }
            continue;
          }

          const nisnKey = ["nisn", "nis", "no induk"].find((k) => k in row);
          const nisn = nisnKey ? String(row[nisnKey]).trim() : undefined;

          const jkKey = ["jenis kelamin", "jk", "gender", "l/p"].find((k) => k in row);
          let jenisKelamin: "L" | "P" | undefined = undefined;
          if (jkKey) {
            const jkVal = String(row[jkKey]).trim().toUpperCase();
            if (jkVal === "L" || jkVal === "LAKI-LAKI" || jkVal === "M" || jkVal === "MALE") {
              jenisKelamin = "L";
            } else if (jkVal === "P" || jkVal === "PEREMPUAN" || jkVal === "F" || jkVal === "FEMALE") {
              jenisKelamin = "P";
            }
          }

          students.push({ nama, nisn: nisn || undefined, jenisKelamin });
        }

        resolve({
          success: errors.length === 0,
          students,
          errors,
        });
      } catch (err) {
        resolve({
          success: false,
          students: [],
          errors: ["File tidak dapat dibaca. Pastikan file Excel (.xlsx) valid."],
        });
      }
    };
    reader.onerror = () => {
      resolve({ success: false, students: [], errors: ["Gagal membaca file"] });
    };
    reader.readAsArrayBuffer(file);
  });
}

export function generateTemplateBlob(): Blob {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Nama", "NISN", "Jenis Kelamin"],
    ["Ahmad Fauzi", "", "L"],
    ["Bunga Citra", "", "P"],
    ["Dewi Lestari", "1234567890", "P"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Daftar Siswa");
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadTemplate() {
  const blob = generateTemplateBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template_daftar_siswa.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export function siswaToImportResult(
  result: ImportResult,
  kelasId: number
): Student[] {
  const now = timestamp();
  return result.students.map((s, i) => ({
    id: generateId() + i,
    kelasId,
    nama: s.nama,
    nisn: s.nisn || undefined,
    jenisKelamin: s.jenisKelamin,
    urutan: i + 1,
    statusAktif: true,
    dibuatPada: now,
    diubahPada: now,
  }));
}
