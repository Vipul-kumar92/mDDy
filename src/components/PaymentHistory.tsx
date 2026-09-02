import { useState } from 'react';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import IconButton from './IconButton';
import { paiseToRupees, hundredthsToUnits } from '../services/money';
import { generateBillPdf } from '../services/pdfService';
import { downloadPdf } from '../services/downloadService';
import { DAIRY_NAME } from '../lib/firebase';
import type { ClosedCycle, Customer, LineItem } from '../lib/types';

interface Props {
  cycles: ClosedCycle[];
  customer: Customer;
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

/** Past (closed) billing cycles with an expandable breakdown and PDF download. */
export default function PaymentHistory({ cycles, customer }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const download = async (c: ClosedCycle) => {
    try {
      const paidPaise = (c.payments ?? []).reduce((s, p) => s + p.amountPaise, 0) || c.totalPaise;
      const blob = generateBillPdf(
        customer,
        {
          lineItems: c.lineItems,
          grandTotalPaise: c.totalPaise,
          startDate: c.startDate,
          endDate: c.endDate,
        },
        c.entries,
        DAIRY_NAME,
        { paidPaise },
      );
      const filename = `bill-${customer.name}-${c.endDate}.pdf`;
      await downloadPdf(blob, filename);
    } catch {
      // ignore — PDF generation only fails on invalid bills, which closed cycles are not.
    }
  };

  if (cycles.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">🗓️</div>
        <p className="text-sm text-slate-400">No past payments yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {cycles.map((c) => {
        const open = openId === c.id;
        return (
          <div key={c.id} className="card overflow-hidden">
            {/* Summary row */}
            <button
              onClick={() => setOpenId(open ? null : c.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-800">
                  {c.startDate} – {c.endDate}
                </p>
                <p className="text-xs text-slate-500">Paid on {c.paymentDate}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                  ₹{paiseToRupees(c.totalPaise)}
                </span>
                <span className="text-slate-400">
                  {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </div>
            </button>

            {/* Expanded detail */}
            {open && (
              <div className="border-t border-slate-100 px-4 py-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-1.5">Product</th>
                      <th className="py-1.5">Qty</th>
                      <th className="py-1.5 text-right">Rate</th>
                      <th className="py-1.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.lineItems.map((li) => (
                      <tr key={`${li.product}:${li.type ?? ''}`} className="border-b border-slate-100">
                        <td className="py-1.5">{lineLabel(li)}</td>
                        <td className="py-1.5">
                          {hundredthsToUnits(li.totalQtyHundredths)} {unitFor(li.product)}
                        </td>
                        <td className="py-1.5 text-right">₹{paiseToRupees(li.ratePaise)}</td>
                        <td className="py-1.5 text-right">₹{paiseToRupees(li.amountPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold text-slate-800">
                      <td className="py-2" colSpan={3}>
                        Grand Total
                      </td>
                      <td className="py-2 text-right">₹{paiseToRupees(c.totalPaise)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {c.entries.length} {c.entries.length === 1 ? 'entry' : 'entries'} in this cycle
                  </span>
                  <IconButton
                    icon={<Download size={18} />}
                    label="Download PDF"
                    tone="primary"
                    onClick={() => download(c)}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
