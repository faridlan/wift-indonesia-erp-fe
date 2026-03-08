/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COMPANY = {
  name: "WIFT INDONESIA",
  tagline: "Solusi Seragam Kantor Terpercaya",
  address: "Jl. Mangunreja Singaparna Kp. Kebon Kalapa, Kel.Cibalanarik, Kec. Tanjungjaya, Kab. Tasikmalaya",
  phone: "0265-7543224",
};

const formatCurrency = (value: number) => "Rp " + value.toLocaleString("id-ID");

interface ReportRow {
  label: string;
  totalOrders: number;
  totalPcs: number;
  totalRevenue: number;
  sisaTagihan?: number;
  pcsWift?: number;
  pcsLuar?: number;
}

interface ReportPDFOptions {
  title: string;
  subtitle: string;
  rows: ReportRow[];
  salesName?: string;
}

export function generateReportPDF({ title, subtitle, rows, salesName }: ReportPDFOptions) {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 40, "F");

  try {
    doc.addImage("/assets/logo.png", "PNG", margin - 3, 8, 22, 22);
  } catch (e) {
    console.error("Logo not found", e);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.name, margin + 22, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.tagline, margin + 22, 27);

  doc.setFontSize(8);
  doc.text(COMPANY.address, pageWidth - margin, 15, { align: "right", maxWidth: 100 });
  doc.text(`Tel: ${COMPANY.phone}`, pageWidth - margin, 25, { align: "right" });

  // Title
  doc.setTextColor(30, 41, 59);
  let y = 52;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);

  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(subtitle, margin, y);

  if (salesName) {
    y += 6;
    doc.text(`Sales: ${salesName}`, margin, y);
  }

  y += 10;

  // Table
  const hasWorkType = rows.some((r) => (r.pcsWift ?? 0) > 0 || (r.pcsLuar ?? 0) > 0);
  const hasSisaTagihan = rows.some((r) => (r.sisaTagihan ?? 0) !== 0);

  const head: string[] = ["No", "Nama Sales", "Jumlah Order", "Total PCS"];
  if (hasWorkType) {
    head.push("PCS Wift", "PCS Luar");
  }
  head.push("Total Pendapatan");
  if (hasSisaTagihan) {
    head.push("Sisa Tagihan");
  }

  const body = rows.map((r, i) => {
    const row: string[] = [
      String(i + 1),
      r.label,
      String(r.totalOrders),
      r.totalPcs.toLocaleString("id-ID") + " pcs",
    ];
    if (hasWorkType) {
      row.push((r.pcsWift ?? 0).toLocaleString("id-ID") + " pcs");
      row.push((r.pcsLuar ?? 0).toLocaleString("id-ID") + " pcs");
    }
    row.push(formatCurrency(r.totalRevenue));
    if (hasSisaTagihan) {
      row.push(formatCurrency(r.sisaTagihan ?? 0));
    }
    return row;
  });

  // Totals row
  const totOrders = rows.reduce((s, r) => s + r.totalOrders, 0);
  const totPcs = rows.reduce((s, r) => s + r.totalPcs, 0);
  const totRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
  const totSisa = rows.reduce((s, r) => s + (r.sisaTagihan ?? 0), 0);
  const totWift = rows.reduce((s, r) => s + (r.pcsWift ?? 0), 0);
  const totLuar = rows.reduce((s, r) => s + (r.pcsLuar ?? 0), 0);

  const totalRow: string[] = ["", "TOTAL", String(totOrders), totPcs.toLocaleString("id-ID") + " pcs"];
  if (hasWorkType) {
    totalRow.push(totWift.toLocaleString("id-ID") + " pcs");
    totalRow.push(totLuar.toLocaleString("id-ID") + " pcs");
  }
  totalRow.push(formatCurrency(totRevenue));
  if (hasSisaTagihan) {
    totalRow.push(formatCurrency(totSisa));
  }
  body.push(totalRow);

  const colStyles: Record<number, any> = {
    0: { cellWidth: 12, halign: "center" },
    2: { cellWidth: 25, halign: "center" },
    3: { cellWidth: 25, halign: "center" },
  };

  let colIdx = 4;
  if (hasWorkType) {
    colStyles[colIdx] = { cellWidth: 25, halign: "center" };
    colStyles[colIdx + 1] = { cellWidth: 25, halign: "center" };
    colIdx += 2;
  }
  colStyles[colIdx] = { cellWidth: 40, halign: "right" };
  if (hasSisaTagihan) {
    colStyles[colIdx + 1] = { cellWidth: 40, halign: "right" };
  }

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: colStyles,
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didParseCell: (data: any) => {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [226, 232, 240];
      }
    },
  });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`, margin, footerY);
  doc.text(`${COMPANY.name}`, pageWidth - margin, footerY, { align: "right" });

  doc.save(`Laporan-${title.replace(/\s+/g, "_")}.pdf`);
}
