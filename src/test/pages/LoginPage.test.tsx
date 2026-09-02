import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../../pages/LoginPage';
import { AppError } from '../../lib/types';

const loginMock = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: loginMock, logout: vi.fn(), user: null, loading: false }),
}));

function renderPage() {
  return render(<LoginPage />);
}

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    localStorage.clear();
  });

  it('shows an error on invalid credentials (Requirements 1.2)', async () => {
    loginMock.mockRejectedValue(new AppError('INVALID_CREDENTIALS'));
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it('shows a required-fields error (Requirements 1.3)', async () => {
    loginMock.mockRejectedValue(new AppError('REQUIRED_FIELDS'));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/both required/i)).toBeInTheDocument();
  });

  it('locks the form after 5 failed attempts (Requirements 1.4)', async () => {
    loginMock.mockRejectedValue(new AppError('INVALID_CREDENTIALS'));
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    const button = screen.getByRole('button', { name: /sign in/i });
    for (let i = 0; i < 5; i++) {
      await userEvent.click(button);
    }
    await waitFor(() =>
      expect(screen.getByText(/temporarily locked/i)).toBeInTheDocument(),
    );
    expect(button).toBeDisabled();
  });

  it('calls login with entered credentials on success', async () => {
    loginMock.mockResolvedValue(undefined);
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'admin@dairy.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith('admin@dairy.com', 'secret123'),
    );
  });
});
