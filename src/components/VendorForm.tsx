import { useState } from 'react';
import { createVendor, updateVendor, validateVendor } from '../services/vendorService';
import { AppError, type Vendor } from '../lib/types';

interface Props {
  vendor?: Vendor; // when provided, the form edits this vendor
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}

/** Form to add or edit a vendor with field-level validation. */
export default function VendorForm({ vendor, onSaved, onCancel }: Props) {
  const [name, setName] = useState(vendor?.name ?? '');
  const [phone, setPhone] = useState(vendor?.phone ?? '');
  const [address, setAddress] = useState(vendor?.address ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const editing = !!vendor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      validateVendor({ name, phone, address });
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'Invalid input.');
      return;
    }

    setSaving(true);
    try {
      if (editing && vendor) {
        await updateVendor(vendor.id, { name, phone, address });
        onSaved?.(vendor.id);
      } else {
        const id = await createVendor({ name, phone, address });
        setName('');
        setPhone('');
        setAddress('');
        onSaved?.(id);
      }
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'Could not save vendor. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="v-name" className="text-sm font-medium text-slate-700">
          Name
        </label>
        <input
          id="v-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="v-phone" className="text-sm font-medium text-slate-700">
          Phone (optional)
        </label>
        <input
          id="v-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="v-address" className="text-sm font-medium text-slate-700">
          Address (optional)
        </label>
        <textarea
          id="v-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="input"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
