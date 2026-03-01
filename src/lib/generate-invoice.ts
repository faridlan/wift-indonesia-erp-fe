/* eslint-disable @typescript-eslint/no-explicit-any */
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
  tagline: "Solusi Seragam Kantor Terpercaya",
  address:
    "Jl. Mangunreja Singaparna Kp. Kebon Kalapa, Kel.Cibalanarik, Kec. Tanjungjaya, Kab. Tasikmalaya",
  phone: "0265-7543224",
  instagram: "wiftindonesia_official",
  email: "wijayafamily.wft@gmail.com",
  website: "wiftindonesia.com",
};

const formatCurrency = (value: number) => "Rp " + value.toLocaleString("id-ID");

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
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // === 1. HEADER SECTION ===
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 50, "F");

  // Logo Perusahaan - Dibuat lebih ke kiri (margin - 10 agar lebih mepet)
  try {
    doc.addImage("/assets/logo.png", "PNG", margin - 5, 12, 25, 25);
  } catch (e) {
    console.error("Gagal memuat logo perusahaan", e);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  // Teks digeser hanya 25mm dari margin agar tetap di kiri namun tidak tertutup logo
  doc.text(COMPANY.name, margin + 25, 24);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.tagline, margin + 25, 32);

  doc.setFontSize(8);
  const headerRightX = pageWidth - margin;
  // Alamat dibatasi maxWidth agar tidak memanjang ke kiri menimpa nama
  doc.text(COMPANY.address, headerRightX, 18, { align: "right", maxWidth: 70 });
  doc.text(`Tel: ${COMPANY.phone} | ${COMPANY.email}`, headerRightX, 28, {
    align: "right",
  });
  doc.text(`${COMPANY.website} | IG: ${COMPANY.instagram}`, headerRightX, 33, {
    align: "right",
  });

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

  const subtotal = items.reduce((s, i) => s + i.quantity * i.price_per_unit, 0);
  const ppnPct = (order as any).ppn_percentage ?? (order.include_ppn ? 11 : 0);
  const ppnAmount = (order as any).ppn_amount ?? (ppnPct > 0 ? Math.round(subtotal * ppnPct / 100) : 0);

  let ty = finalY + 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", totalsX, ty);
  doc.text(formatCurrency(subtotal), pageWidth - margin, ty, { align: "right" });

  if (ppnPct > 0) {
    ty += 8;
    doc.text(`PPN ${ppnPct}%`, totalsX, ty);
    doc.text(formatCurrency(ppnAmount), pageWidth - margin, ty, { align: "right" });
  }

  ty += 8;
  doc.text("Sudah Dibayar", totalsX, ty);
  doc.text(formatCurrency(order.amount_paid || 0), pageWidth - margin, ty, {
    align: "right",
  });

  ty += 4;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(totalsX, ty, pageWidth - margin, ty);

  ty += 8;
  const sisa = (order.total_price || 0) - (order.amount_paid || 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Sisa Tagihan", totalsX, ty);
  doc.text(formatCurrency(Math.max(0, sisa)), pageWidth - margin, ty, {
    align: "right",
  });

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
  doc.roundedRect(
    pageWidth - margin - statusWidth,
    ty - 5,
    statusWidth,
    8,
    2,
    2,
    "F",
  );
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, pageWidth - margin - statusWidth / 2, ty, {
    align: "center",
  });

  // === Bank Account Section (Left Side) ===
  const bankY = finalY + 10;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Informasi Pembayaran:", margin, bankY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const banks = [
    "BCA: 1234567890 a/n WIFT INDONESIA",
    "Mandiri: 0987654321 a/n WIFT INDONESIA",
    "BNI: 1122334455 a/n WIFT INDONESIA",
    "BRI: 5544332211 a/n WIFT INDONESIA",
  ];

  banks.forEach((bank, i) => {
    doc.text(bank, margin, bankY + 6 + i * 5);
  });

  // Tambahkan keterangan DP jika amount_paid masih 0
  if ((order.amount_paid || 0) === 0) {
    const minDp = Math.ceil((order.total_price || 0) * 0.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(239, 68, 68); // Red-500
    doc.text(
      `* Minimal DP 50%: ${formatCurrency(minDp)}`,
      margin,
      bankY + 6 + banks.length * 5 + 2,
    );
    doc.setTextColor(30, 41, 59); // Reset color
  }

  // === Tanda Tangan Section ===
  const sigY = ty + 20;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Hormat Kami,", pageWidth - margin, sigY, { align: "right" });
  doc.text("Manager WIFT Indonesia", pageWidth - margin, sigY + 5, {
    align: "right",
  });

  try {
    doc.addImage(
      "/assets/ttd-manager.png",
      "PNG",
      pageWidth - margin - 45,
      sigY + 8,
      40,
      20,
    );

    doc.addImage(
      "/assets/stempel-wift.png",
      "PNG",
      pageWidth - margin - 55,
      sigY + 5,
      30,
      30,
    );
  } catch (e) {
    console.error("Gagal memuat gambar tanda tangan/stempel", e);
  }

  doc.setFont("helvetica", "bold");
  doc.text("( Yusri Siti Aisyah., S.Ak )", pageWidth - margin - 25, sigY + 35, {
    align: "center",
  });

  // === Watermark Lunas ===
  if (sisa <= 0 || order.payment_status === "paid") {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.setFontSize(100);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94);
    doc.text("LUNAS", pageWidth / 2, pageHeight / 2 + 20, {
      align: "center",
      angle: 45,
    });
    doc.restoreGraphicsState();
  }

  // === Footer ===
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.text("Terima kasih atas kepercayaan Anda.", pageWidth / 2, footerY, {
    align: "center",
  });
  doc.text(`${COMPANY.name} — ${COMPANY.address}`, pageWidth / 2, footerY + 5, {
    align: "center",
  });

  // Save
  const fileName = `Invoice-${order.order_number}.pdf`;
  doc.save(fileName);
}
