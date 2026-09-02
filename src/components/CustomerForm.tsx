import { useState } from 'react';
import { createCustomer, updateCustomer, validateCustomer } from '../services/customerService';
import { AppError, type Customer } from '../lib/types';

interface Props {
  customer?: Customer; // when provided, the form edits this customer
  onCreated?: (id: string) => void;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}

/** Form to add or edit a customer with field-level validation. */
export default function CustomerForm({ customer, onCreated, onSaved, onCancel }: Props) {
  const editing = !!customer;
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      validateCustomer({ name, phone, address });
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'Invalid input.');
      return;
    }

    setSaving(true);
    try {
      if (editing && customer) {
        await updateCustomer(customer.id, { name, phone, address });
        onSaved?.(customer.id);
      } else {
        const id = await createCustomer({ name, phone, address });
        setName('');
        setPhone('');
        setAddress('');
        onCreated?.(id);
        onSaved?.(id);
      }
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'Could not save customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="c-name" className="text-sm font-medium text-slate-700">
          Name
        </label>
        <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </div>

      <div className="space-y-1">
        <label htmlFor="c-phone" className="text-sm font-medium text-slate-700">
          Phone (optional)
        </label>
        <input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
      </div>

      <div className="space-y-1">
        <label htmlFor="c-address" className="text-sm font-medium text-slate-700">
          Address (optional)
        </label>
        <textarea
          id="c-address"
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
