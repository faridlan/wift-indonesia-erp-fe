import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;
type Customer = Tables<"customers">;

interface InvoiceData {
  order: Order;
  items: OrderItem[];
  customer: Customer | null;
}

const COMPANY = {
  name: "WIFT INDONESIA",
  tagline: "Solusi Digital Terpercaya",
  address: "Jl. Contoh Alamat No. 123, Jakarta, Indonesia",
  phone: "+62 812-3456-7890",
  email: "info@wiftindonesia.com",
};

const formatCurrency = (value: number) =>
  "Rp " + value.toLocaleString("id-ID");

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export function generateInvoicePDF({ order, items, customer }: InvoiceData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // === Header background ===
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 50, "F");

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.name, margin, 22);

  // Tagline
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.tagline, margin, 30);

  // Company contact (right side)
  doc.setFontSize(8);
  doc.text(COMPANY.address, pageWidth - margin, 18, { align: "right" });
  doc.text(`Tel: ${COMPANY.phone}`, pageWidth - margin, 24, { align: "right" });
  doc.text(COMPANY.email, pageWidth - margin, 30, { align: "right" });

  // INVOICE label
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - margin, 46, { align: "right" });

  // Reset text color
  doc.setTextColor(30, 41, 59);

  // === Invoice info section ===
  let y = 65;
  const col1 = margin;
  const col2 = pageWidth / 2 + 10;

  // Left column - Customer info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Ditagihkan kepada:", col1, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(customer?.name || "-", col1, y + 7);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  if (customer?.address) doc.text(customer.address, col1, y + 14);
  if (customer?.phone) doc.text(`Tel: ${customer.phone}`, col1, y + 20);

  // Right column - Invoice details
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);

  const infoLabels = ["No. Invoice", "Tanggal", "Status Order", "Status Bayar"];
  const infoValues = [
    `INV-${String(order.order_number).padStart(4, "0")}`,
    formatDate(order.created_at),
    (order.status || "pending").toUpperCase(),
    (order.payment_status || "unpaid").toUpperCase(),
  ];

  infoLabels.forEach((label, i) => {
    const ly = y + i * 8;
    doc.setFont("helvetica", "bold");
    doc.text(label, col2, ly);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${infoValues[i]}`, col2 + 35, ly);
  });

  // === Items table ===
  y = y + 38;

  const tableBody = items.map((item, idx) => [
    String(idx + 1),
    item.product_name,
    String(item.quantity),
    formatCurrency(item.price_per_unit),
    formatCurrency(item.quantity * item.price_per_unit),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["No", "Produk", "Qty", "Harga/Unit", "Subtotal"]],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 40, halign: "right" },
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  // === Totals section ===
  const finalY = (doc as any).lastAutoTable?.finalY || y + 40;
  const totalsX = pageWidth - margin - 80;

  let ty = finalY + 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", totalsX, ty);
  doc.text(formatCurrency(order.total_price || 0), pageWidth - margin, ty, { align: "right" });

  ty += 8;
  doc.text("Sudah Dibayar", totalsX, ty);
  doc.text(formatCurrency(order.amount_paid || 0), pageWidth - margin, ty, { align: "right" });

  ty += 4;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(totalsX, ty, pageWidth - margin, ty);

  ty += 8;
  const sisa = (order.total_price || 0) - (order.amount_paid || 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Sisa Tagihan", totalsX, ty);
  doc.text(formatCurrency(Math.max(0, sisa)), pageWidth - margin, ty, { align: "right" });

  // Payment status badge
  ty += 12;
  const payStatus = order.payment_status || "unpaid";
  const badgeColors: Record<string, [number, number, number]> = {
    paid: [34, 197, 94],
    partial: [234, 179, 8],
    unpaid: [239, 68, 68],
  };
  const badgeColor = badgeColors[payStatus] || badgeColors.unpaid;
  doc.setFillColor(...badgeColor);
  const statusText = payStatus.toUpperCase();
  const statusWidth = doc.getTextWidth(statusText) + 12;
  doc.roundedRect(pageWidth - margin - statusWidth, ty - 5, statusWidth, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, pageWidth - margin - statusWidth / 2, ty, { align: "center" });

  // === Footer ===
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.text("Terima kasih atas kepercayaan Anda.", pageWidth / 2, footerY, { align: "center" });
  doc.text(`${COMPANY.name} — ${COMPANY.address}`, pageWidth / 2, footerY + 5, { align: "center" });

  // Save
  const fileName = `Invoice-${order.order_number}.pdf`;
  doc.save(fileName);
}
