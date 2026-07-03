import * as XLSX from "xlsx";
import type { Student } from "@/types/entities";
import { timestamp, generateId } from "@/lib/utils";

export interface ImportResult {
  success: boolean;
  students: { nama: string; nisn?: string; jenisKelamin?: "L" | "P"; kelas?: string }[];
  errors: string[];
  classes: string[];
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
          resolve({ success: false, students: [], errors: ["File Excel kosong"], classes: [] });
          return;
        }
        const sheet = workbook.Sheets[sheetName];
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rows.length === 0) {
          resolve({ success: false, students: [], errors: ["File Excel tidak memiliki data siswa"], classes: [] });
          return;
        }

        const errors: string[] = [];
        const students: ImportResult["students"] = [];
        const namaKeys = ["nama", "nama siswa", "name"];
        const kelasKeys = ["kelas", "class", "kode kelas"];

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

          const kelasKey = kelasKeys.find((k) => k in row);
          const kelas = kelasKey ? String(row[kelasKey]).trim() : undefined;

          // Add warning if kelas empty
          if (!kelas && nama) {
            errors.push(`⚠️ Peringatan baris ${i + 2}: Siswa "${nama}" tidak memiliki kelas (akan masuk ke kelas saat ini)`);
          }

          students.push({ nama, nisn: nisn || undefined, jenisKelamin, kelas });
        }

        const classes = [...new Set(students.map(s => s.kelas).filter(Boolean) as string[])];

        resolve({
          success: errors.length === 0,
          students,
          errors,
          classes,
        });
      } catch (err) {
        resolve({
          success: false,
          students: [],
          errors: ["File tidak dapat dibaca. Pastikan file Excel (.xlsx) valid."],
          classes: [],
        });
      }
    };
    reader.onerror = () => {
      resolve({ success: false, students: [], errors: ["Gagal membaca file"], classes: [] });
    };
    reader.readAsArrayBuffer(file);
  });
}

export function generateTemplateBlob(): Blob {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Petunjuk: Nama dan Kelas WAJIB diisi. Jenis Kelamin dan NISN opsional. Download, isi, lalu upload kembali."],
    ["Nama", "Kelas", "Jenis Kelamin", "NISN"],
    ["Ahmad Fauzi", "7A", "L", ""],
    ["Bunga Citra", "7A", "P", ""],
    ["Dewi Lestari", "7B", "P", "1234567890"],
  ]);
  ws["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
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
  defaultKelasId: number,
  classrooms?: Array<{ id: number; nama: string }>
): Student[] {
  const now = timestamp();
  return result.students.map((s, i) => {
    // Try to find matching classroom by name
    let kelasId = defaultKelasId;
    
    if (s.kelas && classrooms) {
      const matchedClass = classrooms.find(
        c => c.nama.toLowerCase().trim() === s.kelas!.toLowerCase().trim()
      );
      if (matchedClass) {
        kelasId = matchedClass.id;
      }
    }
    
    return {
      id: generateId() + i,
      kelasId,
      nama: s.nama,
      nisn: s.nisn || undefined,
      jenisKelamin: s.jenisKelamin,
      urutan: i + 1,
      statusAktif: true,
      dibuatPada: now,
      diubahPada: now,
    };
  });
}
