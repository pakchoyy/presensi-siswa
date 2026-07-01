import { AttendanceStatus, Tier, Jenjang, Semester, CalendarEntryType, CalendarSource } from "./enums";

export interface School {
  id: number;
  nama: string;
  jenjang: Jenjang;
  logoUrl?: string;
  alamat?: string;
  dibuatPada: number;
  diubahPada: number;
}

export interface Teacher {
  id: number;
  nama: string;
  email: string;
  sekolahId: number;
  tier: Tier;
  dibuatPada: number;
  diubahPada: number;
}

export interface AcademicYear {
  id: number;
  label: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  semesterAktif: Semester;
  guruId: number;
}

export interface Classroom {
  id: number;
  nama: string;
  tahunAjaranId: number;
  guruId: number;
  statusAktif: boolean;
  dibuatPada: number;
  diubahPada: number;
}

export interface Student {
  id: number;
  kelasId: number;
  nama: string;
  nisn?: string;
  jenisKelamin?: "L" | "P";
  urutan: number;
  statusAktif: boolean;
  dibuatPada: number;
  diubahPada: number;
}

export interface AttendanceSession {
  id: number;
  kelasId: number;
  tanggal: string;
  dibuatPada: number;
  diubahPada: number;
}

export interface AttendanceRecord {
  id: number;
  sesiId: number;
  siswaId: number;
  status: AttendanceStatus;
  catatan?: string;
  diubahPada: number;
}

export interface AcademicCalendarEntry {
  id: number;
  tahunAjaranId: number;
  tanggal: string;
  jenis: CalendarEntryType;
  keterangan?: string;
  sumber: CalendarSource;
}

export interface License {
  id: number;
  guruId: number;
  emailAktivasi: string;
  kodeLisensi: string;
  tanggalAktivasi: number;
  tanggalBerakhir: number;
  statusLisensi: "Aktif" | "Kedaluwarsa" | "Dibatalkan";
}

export interface BackupMeta {
  id: number;
  guruId: number;
  jenis: "Lokal" | "Cloud";
  dibuatPada: number;
  ukuranData?: number;
}
