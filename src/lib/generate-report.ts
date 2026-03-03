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
}

interface ReportPDFOptions {
  title: string;
  subtitle: string;
  rows: ReportRow[];
  salesName?: string;
}

export function generateReportPDF({ title, subtitle, rows, salesName }: ReportPDFOptions) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 40, "F");

  try {
    doc.addImage("/assets/logo.png", "PNG", margin - 5, 8, 22, 22);
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
  doc.text(COMPANY.address, pageWidth - margin, 15, { align: "right", maxWidth: 80 });
  doc.text(`Tel: ${COMPANY.phone}`, pageWidth - margin, 25, { align: "right" });

  // Title
  doc.setTextColor(30, 41, 59);
  let y = 55;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);

  y += 8;
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
  const body = rows.map((r, i) => [
    String(i + 1),
    r.label,
    String(r.totalOrders),
    r.totalPcs.toLocaleString("id-ID") + " pcs",
    formatCurrency(r.totalRevenue),
  ]);

  // Totals row
  const totOrders = rows.reduce((s, r) => s + r.totalOrders, 0);
  const totPcs = rows.reduce((s, r) => s + r.totalPcs, 0);
  const totRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
  body.push(["", "TOTAL", String(totOrders), totPcs.toLocaleString("id-ID") + " pcs", formatCurrency(totRevenue)]);

  autoTable(doc, {
    startY: y,
    head: [["No", "Nama Sales", "Jumlah Order", "Total PCS", "Total Pendapatan"]],
    body,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: 40, halign: "right" },
    },
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
