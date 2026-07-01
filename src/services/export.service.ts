import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { School, Teacher, Classroom, Student } from "@/types/entities";
import { STATUS_LABEL } from "@/lib/constants";

interface RekapData {
  student: Student;
  H: number;
  S: number;
  I: number;
  A: number;
}

interface ExportContext {
  school: School | null;
  teacher: Teacher | null;
  classroom: Classroom | null;
  periode: string;
  data: RekapData[];
  total: { H: number; S: number; I: number; A: number };
}

function buildKop(doc: jsPDF, ctx: ExportContext) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Logo sekolah (jika ada - PRO feature)
  let logoY = 20;
  if (ctx.school?.logoUrl) {
    try {
      const logoData = ctx.school.logoUrl;
      if (logoData.startsWith("data:image")) {
        doc.addImage(logoData, "PNG", margin, 14, 18, 18);
      }
    } catch {
      // Skip logo if fails
    }
  }

  // Nama sekolah
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(ctx.school?.nama || "Sekolah", pageW / 2, 22, { align: "center" });

  // Judul laporan
  doc.setFontSize(11);
  doc.text("LAPORAN REKAP PRESENSI SISWA", pageW / 2, 30, { align: "center" });

  // Garis
  doc.setDrawColor(14, 165, 160);
  doc.setLineWidth(0.5);
  doc.line(margin, 35, pageW - margin, 35);

  // Info detail
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Kelas    : ${ctx.classroom?.nama || "-"}`, margin, 43);
  doc.text(`Periode  : ${ctx.periode}`, margin, 49);
  doc.text(`Guru     : ${ctx.teacher?.nama || "-"}`, margin, 55);

  doc.line(margin, 59, pageW - margin, 59);

  logoY = 60;
  return logoY;
}

export async function exportPDF(ctx: ExportContext) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const startY = buildKop(doc, ctx);

  const body = ctx.data.map((d) => [
    d.student.nama,
    String(d.H),
    String(d.S),
    String(d.I),
    String(d.A),
  ]);

  body.push([
    "TOTAL",
    String(ctx.total.H),
    String(ctx.total.S),
    String(ctx.total.I),
    String(ctx.total.A),
  ]);

  autoTable(doc, {
    startY: startY || 60,
    head: [["Nama Siswa", "Hadir", "Sakit", "Izin", "Alpha"]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: [14, 165, 160],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59],
    },
    footStyles: {
      fontStyle: "bold",
      fillColor: [240, 244, 248],
    },
    styles: {
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const filename = `Rekap_Presensi_${ctx.classroom?.nama || "Kelas"}_${ctx.periode.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}

export async function exportExcel(ctx: ExportContext) {
  const wb = XLSX.utils.book_new();

  const header = ["Nama Siswa", "Hadir", "Sakit", "Izin", "Alpha"];
  const rows = ctx.data.map((d) => [
    d.student.nama,
    d.H,
    d.S,
    d.I,
    d.A,
  ]);

  rows.push(["TOTAL", ctx.total.H, ctx.total.S, ctx.total.I, ctx.total.A]);

  const info = [
    [`Sekolah: ${ctx.school?.nama || "-"}`],
    [`Kelas: ${ctx.classroom?.nama || "-"}`],
    [`Periode: ${ctx.periode}`],
    [`Guru: ${ctx.teacher?.nama || "-"}`],
    [],
  ];

  const allRows = [...info, header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws["!cols"] = [{ wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];

  XLSX.utils.book_append_sheet(wb, ws, "Rekap Presensi");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rekap_Presensi_${ctx.classroom?.nama || "Kelas"}_${ctx.periode.replace(/\s+/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
