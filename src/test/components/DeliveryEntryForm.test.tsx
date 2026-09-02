import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeliveryEntryForm from '../../components/DeliveryEntryForm';

const addEntryMock = vi.fn();

vi.mock('../../services/deliveryService', () => ({
  addEntry: (...args: unknown[]) => addEntryMock(...args),
  updateEntry: vi.fn(),
}));

// The form loads configured rates to prefill defaults.
vi.mock('../../services/rateService', () => ({
  getRates: async () => ({
    milk: { cow: 5000 },
    ghee: { cow: 60000 },
    cream: { cow: 13000 },
    paneer: 40000,
    dahi: 6000,
  }),
}));

describe('DeliveryEntryForm (Requirements 4.6, 4.7, 4.8)', () => {
  beforeEach(() => addEntryMock.mockReset());

  it('shows a quantity validation message on empty quantity (Requirements 4.6)', async () => {
    render(<DeliveryEntryForm customerId="c1" />);
    // Leave quantity empty and submit.
    await userEvent.click(screen.getByRole('button', { name: /save entry/i }));
    expect(await screen.findByText(/quantity is required/i)).toBeInTheDocument();
    expect(addEntryMock).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range quantity (Requirements 4.6)', async () => {
    render(<DeliveryEntryForm customerId="c1" />);
    await userEvent.type(screen.getByLabelText('Quantity'), '0');
    await userEvent.click(screen.getByRole('button', { name: /save entry/i }));
    expect(await screen.findByText(/between 0.01 and 9999.99/i)).toBeInTheDocument();
    expect(addEntryMock).not.toHaveBeenCalled();
  });

  it('calls addEntry with a valid single-item entry', async () => {
    addEntryMock.mockResolvedValue('auto1');
    render(<DeliveryEntryForm customerId="c1" />);
    // Milk is selected by default; rate prefills from config (₹50.00).
    await userEvent.type(screen.getByLabelText('Quantity'), '2.5');
    await userEvent.click(screen.getByRole('button', { name: /save entry/i }));
    await vi.waitFor(() => expect(addEntryMock).toHaveBeenCalled());
    const [customerId, input] = addEntryMock.mock.calls[0];
    expect(customerId).toBe('c1');
    expect(input.slot).toBe('morning');
    expect(input.product).toBe('milk');
    expect(input.type).toBe('cow');
    expect(input.quantity).toBe(250);
    expect(input.rate).toBe(5000);
  });
});
