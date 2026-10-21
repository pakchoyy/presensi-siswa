import QRCode from "qrcode";
import jsPDF from "jspdf";
import type { Student } from "@/types/entities";

interface CardOptions {
  namaKelas: string;
  namaSekolah?: string;
  logoUrl?: string;
  baseUrl?: string;
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        resolve(typeof result === "string" ? result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function qrPayload(student: Student, baseUrl?: string): string {
  if (baseUrl && student.absenToken) {
    return `${baseUrl}/s/${student.absenToken}`;
  }
  return `PRESENSI:${student.id}`;
}

export async function generateQrCardsPdf(
  students: Student[],
  options: CardOptions
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const cols = 3;
  const rows = 4;
  const cardW = 60;
  const cardH = 72;
  const marginX = (210 - cols * cardW) / (cols + 1);
  const marginY = (297 - rows * cardH) / (rows + 1);
  const qrSize = 36;

  let logoDataUrl: string | null = null;
  if (options.logoUrl) {
    logoDataUrl = options.logoUrl.startsWith("data:")
      ? options.logoUrl
      : await loadImageAsDataUrl(options.logoUrl);
  }

  for (let i = 0; i < students.length; i++) {
    const page = Math.floor(i / (cols * rows));
    const posOnPage = i % (cols * rows);

    if (page > 0 && posOnPage === 0) doc.addPage();

    const col = posOnPage % cols;
    const row = Math.floor(posOnPage / cols);
    const x = marginX + col * (cardW + marginX);
    const y = marginY + row * (cardH + marginY);

    // Card border with teal top strip
    doc.setFillColor(14, 165, 160);
    doc.roundedRect(x, y, cardW, 5, 2, 2, "F");
    doc.setDrawColor(14, 165, 160);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, cardW, cardH, 2, 2);

    // School name on top strip
    if (options.namaSekolah) {
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(options.namaSekolah.toUpperCase(), x + cardW / 2, y + 3.5, { align: "center", maxWidth: cardW - 4 });
    }

    // QR
    const qrData = qrPayload(students[i], options.baseUrl);
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 1,
      errorCorrectionLevel: logoDataUrl ? "H" : "M",
    });
    const qrX = x + (cardW - qrSize) / 2;
    const qrY = y + 8;
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // Logo in center of QR (with white padded background)
    if (logoDataUrl) {
      const logoSize = 10;
      const logoX = qrX + (qrSize - logoSize) / 2;
      const logoY = qrY + (qrSize - logoSize) / 2;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(logoX - 1, logoY - 1, logoSize + 2, logoSize + 2, 1.5, 1.5, "F");
      doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
    }

    // Student name
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    const namaY = qrY + qrSize + 5;
    doc.text(students[i].nama, x + cardW / 2, namaY, { align: "center", maxWidth: cardW - 4 });

    // NISN
    doc.setFont("helvetica", "normal");
    if (students[i].nisn) {
      doc.setFontSize(6.5);
      doc.setTextColor(130, 130, 130);
      doc.text(`NISN: ${students[i].nisn}`, x + cardW / 2, namaY + 4, { align: "center" });
    }

    // Class name at bottom
    doc.setFontSize(6.5);
    doc.setTextColor(14, 165, 160);
    doc.setFont("helvetica", "bold");
    doc.text(options.namaKelas, x + cardW / 2, y + cardH - 3, { align: "center" });
    doc.setFont("helvetica", "normal");
  }

  return doc;
}
