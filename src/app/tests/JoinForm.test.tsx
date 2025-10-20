import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JoinForm from './JoinForm';

// Mock fetch to hit the API route
global.fetch = vi.fn((url) => {
  const code = url.split('/').pop();
  if (code === 'VALID') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ code: 'VALID', status: 'open', created_at: new Date(), length_hours: 1 })
    });
  } else if (code === 'EXPD') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ code: 'EXPD', status: 'closed', created_at: new Date(Date.now() - 2 * 3600 * 1000), length_hours: 1 })
    });
  } else {
    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: 'Session not found' })
    });
  }
}) as any;

describe('JoinForm Component', () => {
  test('filters input to uppercase letters only', () => {
    render(<JoinForm />);
    const input = screen.getByPlaceholderText(/enter code/i);
    fireEvent.change(input, { target: { value: 'a1b2c3' } });
    expect(input).toHaveValue('ABC');
  });

  test('shows error for short code', async () => {
    render(<JoinForm />);
    const input = screen.getByPlaceholderText(/enter code/i);
    const button = screen.getByRole('button', { name: /join/i });

    fireEvent.change(input, { target: { value: 'AB' } });
    fireEvent.click(button);

    expect(await screen.findByText(/must be 4 letters/i)).toBeInTheDocument();
  });

  test('displays session info for valid session', async () => {
    render(<JoinForm />);
    const input = screen.getByPlaceholderText(/enter code/i);
    const button = screen.getByRole('button', { name: /join/i });

    fireEvent.change(input, { target: { value: 'VALID' } });
    fireEvent.click(button);

    await waitFor(() => screen.getByText(/code: VALID/i));
    expect(screen.getByText(/status: open/i)).toBeInTheDocument();
  });

  test('shows closed error for expired session', async () => {
    render(<JoinForm />);
    const input = screen.getByPlaceholderText(/enter code/i);
    const button = screen.getByRole('button', { name: /join/i });

    fireEvent.change(input, { target: { value: 'EXPD' } });
    fireEvent.click(button);

    await waitFor(() => screen.getByText(/already closed/i));
  });

  test('shows error for non-existent session', async () => {
    render(<JoinForm />);
    const input = screen.getByPlaceholderText(/enter code/i);
    const button = screen.getByRole('button', { name: /join/i });

    fireEvent.change(input, { target: { value: 'NONE' } });
    fireEvent.click(button);

    await waitFor(() => screen.getByText(/not found or expired/i));
  });
});
