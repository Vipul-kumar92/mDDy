import { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { deletePurchase } from '../services/purchaseService';
import { hundredthsToUnits, paiseToRupees } from '../services/money';
import ConfirmDialog from './ConfirmDialog';
import IconButton from './IconButton';
import type { PurchaseEntry } from '../lib/types';

interface Props {
  vendorId: string;
  entries: PurchaseEntry[];
  onChanged?: () => void;
  onEdit?: (entry: PurchaseEntry) => void;
}

const PRODUCT_LABEL: Record<string, string> = {
  milk: 'Milk', ghee: 'Ghee', cream: 'Cream', paneer: 'Paneer', dahi: 'Dahi',
};
const PRODUCT_EMOJI: Record<string, string> = {
  milk: '🥛', ghee: '🫙', cream: '🍦', paneer: '🧀', dahi: '🥣',
};

function unitFor(product: string): string {
  return product === 'milk' ? 'L' : 'kg';
}

function amount(e: PurchaseEntry): number {
  return Math.round((e.quantity * e.rate) / 100);
}

/** Vendor purchase entries with edit + delete (icon actions + confirm). */
export default function PurchaseList({ vendorId, entries, onChanged, onEdit }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!pendingId) return;
    await deletePurchase(vendorId, pendingId);
    setPendingId(null);
    onChanged?.();
  };

  if (entries.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">🧺</div>
        <p className="text-sm text-slate-400">No purchases recorded yet.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {entries.map((e) => {
          const name = PRODUCT_LABEL[e.product] ?? e.product;
          const label = e.type ? `${e.type.charAt(0).toUpperCase()}${e.type.slice(1)} ${name}` : name;
          return (
            <li key={e.id} className="card flex items-center gap-3 px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-xl">
                {PRODUCT_EMOJI[e.product] ?? '📦'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">{label}</p>
                <p className="text-xs text-slate-400">
                  {e.date} · {e.slot} · {hundredthsToUnits(e.quantity)} {unitFor(e.product)} × ₹{paiseToRupees(e.rate)}
                </p>
              </div>
              <p className="shrink-0 font-bold text-slate-800">₹{paiseToRupees(amount(e))}</p>
              <div className="flex items-center gap-0.5">
                {onEdit && (
                  <IconButton icon={<Pencil size={17} />} label="Edit" tone="primary" onClick={() => onEdit(e)} />
                )}
                <IconButton icon={<Trash2 size={17} />} label="Delete" tone="danger" onClick={() => setPendingId(e.id)} />
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={pendingId !== null}
        title="Delete purchase?"
        message="This purchase entry will be removed."
        onConfirm={handleDelete}
        onCancel={() => setPendingId(null)}
      />
    </>
  );
}
