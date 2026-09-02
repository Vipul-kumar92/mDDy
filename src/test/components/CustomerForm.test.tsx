import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomerForm from '../../components/CustomerForm';

const createCustomerMock = vi.fn();

// Use the real validateCustomer (pure), but stub the async createCustomer.
vi.mock('../../services/customerService', async () => {
  const actual = await vi.importActual<typeof import('../../services/customerService')>(
    '../../services/customerService',
  );
  return {
    ...actual,
    createCustomer: (input: unknown) => createCustomerMock(input),
  };
});

describe('CustomerForm (Requirements 2.1-2.4)', () => {
  beforeEach(() => createCustomerMock.mockReset());

  it('shows a validation message for an invalid name', async () => {
    render(<CustomerForm />);
    await userEvent.type(screen.getByLabelText('Name'), '   ');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/name must be 1 to 100/i)).toBeInTheDocument();
    expect(createCustomerMock).not.toHaveBeenCalled();
  });

  it('shows a phone validation message', async () => {
    render(<CustomerForm />);
    await userEvent.type(screen.getByLabelText('Name'), 'Ramesh');
    await userEvent.type(screen.getByLabelText('Phone (optional)'), '12');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/phone must be 7 to 15/i)).toBeInTheDocument();
    expect(createCustomerMock).not.toHaveBeenCalled();
  });

  it('calls onCreated on success', async () => {
    createCustomerMock.mockResolvedValue('new-id');
    const onCreated = vi.fn();
    render(<CustomerForm onCreated={onCreated} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Ramesh');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith('new-id'));
  });
});
