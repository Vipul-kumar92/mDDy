import { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { deleteEntry } from '../services/deliveryService';
import { hundredthsToUnits, paiseToRupees } from '../services/money';
import ConfirmDialog from './ConfirmDialog';
import IconButton from './IconButton';
import type { DeliveryEntry } from '../lib/types';

interface Props {
  customerId: string;
  entries: DeliveryEntry[];
  onChanged?: () => void;
  onEdit?: (entry: DeliveryEntry) => void;
}

const PRODUCT_LABEL: Record<string, string> = {
  milk: 'Milk',
  ghee: 'Ghee',
  cream: 'Cream',
  paneer: 'Paneer',
  dahi: 'Dahi',
};

const PRODUCT_EMOJI: Record<string, string> = {
  milk: '🥛', ghee: '🫙', cream: '🍦', paneer: '🧀', dahi: '🥣',
};

function unitFor(product: string): string {
  return product === 'milk' ? 'L' : 'kg';
}

function amount(entry: DeliveryEntry): number {
  return Math.round((entry.quantity * entry.rate) / 100);
}

/** Renders current-cycle entries with an icon delete + confirmation. */
export default function EntryList({ customerId, entries, onChanged, onEdit }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!pendingId) return;
    await deleteEntry(customerId, pendingId);
    setPendingId(null);
    onChanged?.();
  };

  if (entries.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">🧺</div>
        <p className="text-sm text-slate-400">No entries in the current cycle yet.</p>
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
        title="Delete entry?"
        message="This delivery entry will be removed from the current cycle."
        onConfirm={handleDelete}
        onCancel={() => setPendingId(null)}
      />
    </>
  );
}
