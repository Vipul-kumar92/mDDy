import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BillResult, Customer, DeliveryEntry, LineItem } from '../lib/types';
import { paiseToRupees, hundredthsToUnits } from './money';

const PRODUCT_LABEL: Record<string, string> = {
  milk: 'Milk',
  cream: 'Cream',
  paneer: 'Paneer',
  dahi: 'Dahi',
  ghee: 'Ghee',
};

function lineLabel(item: LineItem): string {
  const base = PRODUCT_LABEL[item.product] ?? item.product;
  const withType = item.type ? `${item.type.charAt(0).toUpperCase()}${item.type.slice(1)} ${base}` : base;
  return item.slot ? `${withType} (${item.slot})` : withType;
}

function unitFor(product: string): string {
  return product === 'milk' ? 'L' : 'kg';
}

function dayRows(entries: DeliveryEntry[]): string[][] {
  return entries.map((e) => {
    const name = PRODUCT_LABEL[e.product] ?? e.product;
    const label = e.type ? `${name} (${e.type})` : name;
    return [e.date, e.slot, `${label} ${hundredthsToUnits(e.quantity)} ${unitFor(e.product)}`];
  });
}

export interface BillPdfOptions {
  paidPaise?: number; // amount collected so far
}

const BRAND: [number, number, number] = [35, 112, 104]; // brand-600

/**
 * Generate a clean invoice-style PDF with paid/balance summary.
 * Throws on invalid input (no billable bill) so callers can surface an error
 * without side effects.
 */
export function generateBillPdf(
  customer: Customer,
  bill: BillResult,
  entries: DeliveryEntry[],
  dairyName: string,
  options: BillPdfOptions = {},
): Blob {
  if (bill.error) {
    throw new Error('Cannot generate a PDF for a bill with no billable entries');
  }

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const marginX = 40;

  // --- Header band ---
  pdf.setFillColor(...BRAND);
  pdf.rect(0, 0, pageW, 84, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text(dairyName, marginX, 44);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text('Invoice', marginX, 64);

  // Invoice meta (right-aligned)
  const period = bill.startDate && bill.endDate ? `${bill.startDate} to ${bill.endDate}` : '-';
  pdf.setFontSize(9);
  pdf.text(`Period: ${period}`, pageW - marginX, 44, { align: 'right' });
  pdf.text(`Date: ${new Date().toISOString().slice(0, 10)}`, pageW - marginX, 58, { align: 'right' });

  // --- Bill to ---
  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Bill to', marginX, 116);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(customer.name, marginX, 132);
  let billToY = 132;
  if (customer.phone) {
    billToY += 15;
    pdf.setTextColor(100, 116, 139);
    pdf.text(customer.phone, marginX, billToY);
  }
  if (customer.address) {
    billToY += 15;
    pdf.setTextColor(100, 116, 139);
    pdf.text(customer.address, marginX, billToY);
  }

  // --- Line-item table ---
  autoTable(pdf, {
    startY: billToY + 24,
    head: [['Product', 'Quantity', 'Rate (Rs)', 'Amount (Rs)']],
    body: bill.lineItems.map((li) => [
      lineLabel(li),
      `${hundredthsToUnits(li.totalQtyHundredths)} ${unitFor(li.product)}`,
      paiseToRupees(li.ratePaise),
      paiseToRupees(li.amountPaise),
    ]),
    theme: 'striped',
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
  });

  const afterItemsY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? billToY + 60;

  // --- Totals summary (Total / Paid / Balance) ---
  const paid = options.paidPaise ?? 0;
  const balance = Math.max(bill.grandTotalPaise - paid, 0);
  const summaryRows: [string, string][] = [
    ['Total', `Rs ${paiseToRupees(bill.grandTotalPaise)}`],
    ['Paid', `Rs ${paiseToRupees(paid)}`],
    ['Balance due', `Rs ${paiseToRupees(balance)}`],
  ];

  autoTable(pdf, {
    startY: afterItemsY + 16,
    body: summaryRows,
    theme: 'plain',
    styles: { fontSize: 11 },
    columnStyles: {
      0: { halign: 'right', cellWidth: 110 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 110 },
    },
    // Push the two-column summary to the right side of the page.
    margin: { left: pageW - marginX - 220, right: marginX },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.textColor = balance > 0 ? [180, 83, 9] : [21, 128, 61];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const afterTotalsY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? afterItemsY + 60;

  // --- Per-day breakdown ---
  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Daily breakdown', marginX, afterTotalsY + 28);

  autoTable(pdf, {
    startY: afterTotalsY + 36,
    head: [['Date', 'Slot', 'Delivered']],
    body: dayRows(entries),
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: marginX, right: marginX },
  });

  // --- Footer ---
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`${dairyName} · Generated by mDDy`, pageW / 2, pageH - 24, { align: 'center' });

  return pdf.output('blob');
}
