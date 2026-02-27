import jsPDF from "jspdf";
import type { Tables } from "@/integrations/supabase/types";

type Payment = Tables<"payments">;
type Order = Tables<"orders">;
type Customer = Tables<"customers">;

interface KwitansiData {
  payment: Payment;
  order: Order;
  customer: Customer | null;
}

const COMPANY = {
  name: "WIFT INDONESIA",
  tagline: "Solusi Sergam Kantor Terpercaya",
  address: "Jl. Mangunreja Singaparna Kp. Kebon Kalapa, Kel.Cibalanarik, Kec. Tanjungjaya, Kab. Tasikmalaya",
  phone: "0265-7543224",
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

function numberToWords(num: number): string {
  const ones = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  if (num < 12) return ones[num];
  if (num < 20) return ones[num - 10] + " belas";
  if (num < 100) return ones[Math.floor(num / 10)] + " puluh" + (num % 10 ? " " + ones[num % 10] : "");
  if (num < 200) return "seratus" + (num % 100 ? " " + numberToWords(num % 100) : "");
  if (num < 1000) return ones[Math.floor(num / 100)] + " ratus" + (num % 100 ? " " + numberToWords(num % 100) : "");
  if (num < 2000) return "seribu" + (num % 1000 ? " " + numberToWords(num % 1000) : "");
  if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + " ribu" + (num % 1000 ? " " + numberToWords(num % 1000) : "");
  if (num < 1000000000) return numberToWords(Math.floor(num / 1000000)) + " juta" + (num % 1000000 ? " " + numberToWords(num % 1000000) : "");
  return numberToWords(Math.floor(num / 1000000000)) + " miliar" + (num % 1000000000 ? " " + numberToWords(num % 1000000000) : "");
}

function terbilang(num: number): string {
  if (num === 0) return "nol rupiah";
  return numberToWords(num) + " rupiah";
}

export function generateKwitansiPDF({ payment, order, customer }: KwitansiData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // === HEADER ===
  doc.setFillColor(30, 64, 175); // blue-800
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.name, margin, 20);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.tagline, margin, 27);

  doc.setFontSize(8);
  const headerRightX = pageWidth - margin;
  doc.text(COMPANY.address, headerRightX, 16, { align: "right", maxWidth: 80 });
  doc.text(`Tel: ${COMPANY.phone} | ${COMPANY.email}`, headerRightX, 26, { align: "right" });

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("KWITANSI", pageWidth - margin, 42, { align: "right" });

  doc.setTextColor(30, 41, 59);

  // === Body ===
  let y = 60;

  const drawRow = (label: string, value: string, yPos: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`:  ${value}`, margin + 45, yPos);
  };

  drawRow("No. Kwitansi", `KW-${String(order.order_number).padStart(4, "0")}-${payment.id.slice(0, 4).toUpperCase()}`, y);
  y += 10;
  drawRow("Tanggal", formatDate(payment.created_at), y);
  y += 10;
  drawRow("Diterima dari", customer?.name || "-", y);
  y += 10;
  drawRow("Untuk Order", `#${order.order_number}`, y);
  y += 10;
  drawRow("Metode Bayar", (payment.payment_method || "-").toUpperCase(), y);

  // === Amount box ===
  y += 18;
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 3, 3, "FD");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175);
  doc.text("Jumlah Pembayaran:", margin + 8, y + 12);

  doc.setFontSize(18);
  doc.text(formatCurrency(payment.amount), pageWidth - margin - 8, y + 12, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  const terbilangText = terbilang(payment.amount);
  doc.text(`Terbilang: ${terbilangText.charAt(0).toUpperCase() + terbilangText.slice(1)}`, margin + 8, y + 23, { maxWidth: pageWidth - margin * 2 - 16 });

  // === Notes ===
  doc.setTextColor(30, 41, 59);
  y += 42;
  if (payment.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Catatan:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(payment.notes, margin + 25, y);
    y += 10;
  }

  // === Tanda Tangan ===
  const sigY = y + 15;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  // Left: Penerima
  doc.text("Penerima,", margin, sigY);
  doc.text("(...............................)", margin, sigY + 35);

  // Right: Hormat Kami
  doc.text("Hormat Kami,", pageWidth - margin, sigY, { align: "right" });
  doc.text("Manager WIFT Indonesia", pageWidth - margin, sigY + 5, { align: "right" });

  try {
    doc.addImage("/assets/ttd-manager.png", "PNG", pageWidth - margin - 45, sigY + 8, 40, 20);
    doc.addImage("/assets/stempel-wift.png", "PNG", pageWidth - margin - 55, sigY + 5, 30, 30);
  } catch (e) {
    console.error("Gagal memuat gambar tanda tangan/stempel", e);
  }

  doc.setFont("helvetica", "bold");
  doc.text("( Yusri Siti Aisyah., S.Ak )", pageWidth - margin - 25, sigY + 35, { align: "center" });

  // === Footer ===
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.text("Kwitansi ini merupakan bukti pembayaran yang sah.", pageWidth / 2, footerY, { align: "center" });
  doc.text(`${COMPANY.name} — ${COMPANY.website}`, pageWidth / 2, footerY + 5, { align: "center" });

  doc.save(`Kwitansi-${order.order_number}-${payment.id.slice(0, 6)}.pdf`);
}
