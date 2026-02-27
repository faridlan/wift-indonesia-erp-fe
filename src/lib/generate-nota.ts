import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;
type Customer = Tables<"customers">;

interface NotaData {
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

export function generateNotaPDF({ order, items, customer }: NotaData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // === HEADER ===
  doc.setFillColor(22, 163, 74); // green-600
  doc.rect(0, 0, pageWidth, 50, "F");

  // / Logo Perusahaan - Dibuat lebih ke kiri (margin - 10 agar lebih mepet)
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

  // NOTA PENJUALAN label
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("NOTA PENJUALAN", pageWidth - margin, 46, { align: "right" });

  doc.setTextColor(30, 41, 59);

  // === Info section ===
  let y = 65;
  const col1 = margin;
  const col2 = pageWidth / 2 + 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Pembeli:", col1, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(customer?.name || "-", col1, y + 7);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  if (customer?.address) doc.text(customer.address, col1, y + 14);
  if (customer?.phone) doc.text(`Tel: ${customer.phone}`, col1, y + 20);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);

  const infoLabels = ["No. Nota", "Tanggal", "Status"];
  const infoValues = [
    `NOTA-${String(order.order_number).padStart(4, "0")}`,
    formatDate(order.created_at),
    "LUNAS",
  ];

  infoLabels.forEach((label, i) => {
    const ly = y + i * 8;
    doc.setFont("helvetica", "bold");
    doc.text(label, col2, ly);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${infoValues[i]}`, col2 + 30, ly);
  });

  // === Items table ===
  y = y + 35;

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
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: {
      fillColor: [22, 163, 74],
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
    alternateRowStyles: { fillColor: [240, 253, 244] },
  });

  // === Total ===
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || y + 40;
  const totalsX = pageWidth - margin - 80;

  const ty = finalY + 12;
  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(0.5);
  doc.line(totalsX, ty - 7, pageWidth - margin, ty - 7);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", totalsX, ty);
  doc.text(formatCurrency(order.total_price || 0), pageWidth - margin, ty, {
    align: "right",
  });

  // LUNAS watermark
  doc.saveGraphicsState();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
  doc.setFontSize(100);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text("LUNAS", pageWidth / 2, pageHeight / 2 + 20, {
    align: "center",
    angle: 45,
  });
  doc.restoreGraphicsState();

  // === Tanda Tangan ===
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

  // === Footer ===
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const footerY = pageHeight - 20;
  doc.text("Terima kasih atas kepercayaan Anda.", pageWidth / 2, footerY, {
    align: "center",
  });
  doc.text(`${COMPANY.name} — ${COMPANY.address}`, pageWidth / 2, footerY + 5, {
    align: "center",
  });

  doc.save(`Nota-${order.order_number}.pdf`);
}
