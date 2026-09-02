import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import IconButton from './IconButton';
import { computeBill } from '../services/billingService';
import { generateBillPdf } from '../services/pdfService';
import { downloadPdf } from '../services/downloadService';
import { paiseToRupees, hundredthsToUnits } from '../services/money';
import { DAIRY_NAME } from '../lib/firebase';
import type { Customer, DeliveryEntry, LineItem } from '../lib/types';

interface Props {
  customer: Customer;
  entries: DeliveryEntry[];
}

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
  return item.slot ? `${withType} · ${item.slot}` : withType;
}

function unitFor(product: string): string {
  return product === 'milk' ? 'L' : 'kg';
}

/** Live bill summary with PDF download (Requirements 5, 6). */
export default function BillSummary({ customer, entries }: Props) {
  const bill = useMemo(() => computeBill(entries), [entries]);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setError('');
    setDownloading(true);
    try {
      const blob = generateBillPdf(customer, bill, entries, DAIRY_NAME, {
        paidPaise: customer.paidPaise ?? 0,
      });
      const filename = `bill-${customer.name}-${bill.endDate || 'current'}.pdf`;
      await downloadPdf(blob, filename);
    } catch {
      setError('Could not generate the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (bill.error?.code === 'NO_ENTRIES') {
    return (
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-800">Bill</h2>
        <p className="mt-2 text-sm text-slate-400">No billable entries in the current cycle.</p>
      </div>
    );
  }

  if (bill.error?.code === 'MISSING_RATE') {
    const { product, type } = bill.error;
    return (
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-800">Bill</h2>
        <p role="alert" className="mt-2 text-sm text-red-600">
          No rate set for {PRODUCT_LABEL[product] ?? product}
          {type ? ` (${type})` : ''}. Set the rate to generate the bill.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Bill</h2>
        <IconButton
          icon={<Download size={18} />}
          label={downloading ? 'Generating…' : 'Download PDF'}
          tone="primary"
          onClick={handleDownload}
          disabled={downloading}
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="py-2">Product</th>
            <th className="py-2">Qty</th>
            <th className="py-2 text-right">Rate</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.lineItems.map((li) => (
            <tr key={`${li.product}:${li.type ?? ''}`} className="border-b border-slate-100">
              <td className="py-2">{lineLabel(li)}</td>
              <td className="py-2">
                {hundredthsToUnits(li.totalQtyHundredths)} {unitFor(li.product)}
              </td>
              <td className="py-2 text-right">₹{paiseToRupees(li.ratePaise)}</td>
              <td className="py-2 text-right">₹{paiseToRupees(li.amountPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
        <span className="text-sm font-semibold text-brand-800">Grand Total</span>
        <span className="text-lg font-extrabold text-brand-700">₹{paiseToRupees(bill.grandTotalPaise)}</span>
      </div>
    </div>
  );
}
