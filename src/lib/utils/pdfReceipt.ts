import { jsPDF } from "jspdf";

export interface ReceiptItem {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface ReceiptData {
  orderId: string;
  storeName: string;
  storeSlug?: string;
  date?: string | Date;
  customerName?: string;
  customerEmail?: string;
  paymentMethod: string;
  branchName?: string;
  items: ReceiptItem[];
  totalAmount: number;
  currency?: string;
}

export function generateAndDownloadReceipt(data: ReceiptData): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const currencySymbol = data.currency || "Q";
  const formattedDate = data.date
    ? new Date(data.date).toLocaleString("es-GT", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString("es-GT");

  const methodLabel =
    data.paymentMethod === "tarjeta"
      ? "Tarjeta de Crédito / Débito (Stripe)"
      : data.paymentMethod === "contra_entrega"
      ? "Pago Contra Entrega en Sucursal"
      : data.paymentMethod;

  // Header Background Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 40, "F");

  // Title & Store Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(data.storeName.toUpperCase(), 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text("COMPROBANTE DE ORDEN / RECIBO DE PAGO", 14, 28);
  doc.text("ID DE RESERVA / COMPRA: " + data.orderId, 14, 34);

  // Meta details box
  doc.setTextColor(15, 23, 42);
  let y = 52;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DE LA TRANSACCIÓN", 14, y);
  y += 6;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 28, 3, 3, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  doc.text(`Fecha y Hora:`, 20, y + 8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formattedDate, 55, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Método de Pago:`, 20, y + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(methodLabel, 55, y + 16);

  if (data.branchName) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Sucursal:`, 20, y + 24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.branchName, 55, y + 24);
  }

  y += 38;

  // Table header
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("DESGLOSE DE PRODUCTOS", 14, y);
  y += 5;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, "F");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("PRODUCTO / ARTÍCULO", 18, y + 5.5);
  doc.text("CANT.", 120, y + 5.5);
  doc.text("P. UNIT.", 145, y + 5.5);
  doc.text("SUBTOTAL", 175, y + 5.5);

  y += 9;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  if (!data.items || data.items.length === 0) {
    doc.text("Orden procesada exitosamente", 18, y + 6);
    doc.text("1", 124, y + 6);
    doc.text(`${currencySymbol}${data.totalAmount.toFixed(2)}`, 145, y + 6);
    doc.text(`${currencySymbol}${data.totalAmount.toFixed(2)}`, 175, y + 6);
    y += 10;
  } else {
    data.items.forEach((item) => {
      // Truncate long names
      const itemName = item.nombre.length > 55 ? item.nombre.substring(0, 52) + "..." : item.nombre;
      doc.text(itemName, 18, y + 5.5);
      doc.text(String(item.cantidad), 124, y + 5.5);
      doc.text(`${currencySymbol}${item.precioUnitario.toFixed(2)}`, 145, y + 5.5);
      doc.text(`${currencySymbol}${item.subtotal.toFixed(2)}`, 175, y + 5.5);

      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 8, 196, y + 8);
      y += 9;
    });
  }

  y += 4;

  // Summary box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(120, y, 76, 20, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTAL PAGADO:", 125, y + 12);
  doc.setTextColor(16, 185, 129); // Emerald-600
  doc.text(`${currencySymbol}${data.totalAmount.toFixed(2)}`, 165, y + 12);

  y += 35;

  // Footer / Thank you
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, 196, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`¡Gracias por comprar en ${data.storeName}!`, 105, y, { align: "center" });
  doc.text(
    "Este documento es un comprobante de transacción digital generado electrónicamente.",
    105,
    y + 5,
    { align: "center" }
  );

  // Trigger download
  const sanitizedId = data.orderId.replace(/[^a-zA-Z0-9_-]/g, "");
  doc.save(`Recibo_${data.storeName}_${sanitizedId || "compra"}.pdf`);
}
