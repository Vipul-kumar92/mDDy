import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RateConfigPage from '../../pages/RateConfigPage';
import { AppError } from '../../lib/types';

const getRatesMock = vi.fn();
const setRateMock = vi.fn();

vi.mock('../../services/rateService', () => ({
  getRates: () => getRatesMock(),
  setRate: (...args: unknown[]) => setRateMock(...args),
}));

const emptyRates = { milk: {}, ghee: {}, cream: {} };

describe('RateConfigPage (Requirements 3.5, 3.6)', () => {
  beforeEach(() => {
    getRatesMock.mockReset();
    setRateMock.mockReset();
  });

  it('shows "Not set" for products without a rate', async () => {
    getRatesMock.mockResolvedValue(emptyRates);
    render(<RateConfigPage />);
    expect(await screen.findAllByText(/not set/i)).not.toHaveLength(0);
  });

  it('shows a validation message when setRate rejects', async () => {
    getRatesMock.mockResolvedValue(emptyRates);
    setRateMock.mockRejectedValue(new AppError('INVALID_RATE', 'Rate must be between 0.01 and 9999.99'));
    render(<RateConfigPage />);
    const input = await screen.findByLabelText(/Paneer rate/i);
    await userEvent.type(input, '0');
    await userEvent.click(screen.getByRole('button', { name: /save all/i }));
    expect(await screen.findByText(/between 0.01 and 9999.99/i)).toBeInTheDocument();
  });

  it('shows the current rate when set', async () => {
    getRatesMock.mockResolvedValue({ milk: { cow: 5550 }, ghee: {}, cream: {}, paneer: 40000 });
    render(<RateConfigPage />);
    expect(await screen.findByText(/₹55\.50/)).toBeInTheDocument();
    expect(screen.getByText(/₹400\.00/)).toBeInTheDocument();
  });
});
