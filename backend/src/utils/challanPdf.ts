import PDFDocument from "pdfkit";
import { Response } from "express";
import { Challan, ChallanItem, Customer } from "@prisma/client";

type ChallanWithRelations = Challan & {
  customer: Customer;
  items: ChallanItem[];
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#B3411A",
  CONFIRMED: "#2F5D50",
  CANCELLED: "#8A8A8A",
};

// Streams a PDF representation of a challan directly to the HTTP response.
// Kept deliberately simple (single page, no external assets) so it renders
// consistently without needing a headless browser.
export function streamChallanPdf(challan: ChallanWithRelations, res: Response) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${challan.challanNumber}.pdf"`
  );

  doc.pipe(res);

  // Header
  doc
    .fontSize(20)
    .fillColor("#1C2431")
    .text("SALES CHALLAN", { align: "left" })
    .moveDown(0.2);

  doc
    .fontSize(10)
    .fillColor("#666")
    .text("Wholesale / Distribution Operations Portal");

  doc.moveDown(1);

  // Challan number + status + date, in a row
  const topY = doc.y;
  doc.fontSize(11).fillColor("#1C2431");
  doc.text(`Challan No: ${challan.challanNumber}`, 50, topY);
  doc.text(`Date: ${new Date(challan.createdAt).toLocaleDateString()}`, 50, topY + 16);

  const statusColor = STATUS_COLORS[challan.status] || "#1C2431";
  doc
    .fontSize(11)
    .fillColor(statusColor)
    .text(`Status: ${challan.status}`, 350, topY, { align: "right" });

  doc.fillColor("#1C2431");
  doc.moveDown(2);

  // Customer block
  doc.fontSize(12).text("Bill To / Ship To", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10);
  doc.text(challan.customer.name);
  if (challan.customer.businessName) doc.text(challan.customer.businessName);
  doc.text(`Mobile: ${challan.customer.mobile}`);
  if (challan.customer.gstNumber) doc.text(`GST: ${challan.customer.gstNumber}`);
  if (challan.customer.address) doc.text(challan.customer.address);

  doc.moveDown(1.5);

  // Items table
  const tableTop = doc.y;
  const cols = {
    product: 50,
    sku: 230,
    price: 320,
    qty: 400,
    total: 460,
  };

  doc.fontSize(9).fillColor("#666");
  doc.text("PRODUCT", cols.product, tableTop);
  doc.text("SKU", cols.sku, tableTop);
  doc.text("PRICE", cols.price, tableTop);
  doc.text("QTY", cols.qty, tableTop);
  doc.text("TOTAL", cols.total, tableTop);
  doc
    .moveTo(50, tableTop + 14)
    .lineTo(545, tableTop + 14)
    .strokeColor("#E4E1D8")
    .stroke();

  let y = tableTop + 22;
  doc.fillColor("#1C2431").fontSize(10);

  let grandTotal = 0;
  for (const item of challan.items) {
    const unitPrice = Number(item.unitPriceSnapshot);
    const lineTotal = unitPrice * item.quantity;
    grandTotal += lineTotal;

    doc.text(item.productNameSnapshot, cols.product, y, { width: 170 });
    doc.text(item.skuSnapshot, cols.sku, y, { width: 80 });
    doc.text(unitPrice.toFixed(2), cols.price, y);
    doc.text(String(item.quantity), cols.qty, y);
    doc.text(lineTotal.toFixed(2), cols.total, y);

    y += 20;
  }

  doc
    .moveTo(50, y + 4)
    .lineTo(545, y + 4)
    .strokeColor("#E4E1D8")
    .stroke();

  y += 14;
  doc.fontSize(10).text(`Total Quantity: ${challan.totalQuantity}`, cols.product, y);
  doc
    .fontSize(11)
    .fillColor("#1C2431")
    .text(`Grand Total: ${grandTotal.toFixed(2)}`, cols.qty, y, { align: "left" });

  // Footer note
  doc
    .fontSize(8)
    .fillColor("#999")
    .text(
      "Product name, SKU, and price reflect a snapshot taken when this challan was created.",
      50,
      760,
      { width: 495 }
    );

  doc.end();
}
