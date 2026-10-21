import QRCode from "qrcode";
import jsPDF from "jspdf";
import type { Student } from "@/types/entities";

interface CardOptions {
  namaKelas: string;
  namaSekolah?: string;
  logoUrl?: string;
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    return await new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    return null;
  }
}

export async function generateQrCardsPdf(
  students: Student[],
  options: CardOptions
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const cols = 3;
  const rows = 4;
  const cardW = 55;
  const cardH = 65;
  const marginX = (210 - cols * cardW) / (cols + 1);
  const marginY = (297 - rows * cardH) / (rows + 1);
  const qrSize = 30;

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

    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 3, 3);

    const qrData = `PRESENSI:${students[i].id}`;
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: logoDataUrl ? "H" : "M",
    });
    const qrX = x + (cardW - qrSize) / 2;
    doc.addImage(qrDataUrl, "PNG", qrX, y + 5, qrSize, qrSize);

    if (logoDataUrl) {
      const logoSize = 8;
      const logoX = qrX + (qrSize - logoSize) / 2;
      const logoY = y + 5 + (qrSize - logoSize) / 2;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(logoX - 0.5, logoY - 0.5, logoSize + 1, logoSize + 1, 1, 1, "F");
      doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
    }

    doc.setFontSize(8);
    doc.setTextColor(100);
    const namaY = y + 5 + qrSize + 5;
    doc.text(students[i].nama, x + cardW / 2, namaY, { align: "center", maxWidth: cardW - 6 });

    if (students[i].nisn) {
      doc.setFontSize(6.5);
      doc.setTextColor(140);
      doc.text(`NISN: ${students[i].nisn}`, x + cardW / 2, namaY + 5, { align: "center" });
    }

    doc.setFontSize(6);
    doc.setTextColor(160);
    doc.text(options.namaKelas, x + cardW / 2, y + cardH - 4, { align: "center" });
  }

  return doc;
}
