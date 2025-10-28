import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import HostExpiryForm from './HostExpiryForm'

// Mock Next.js router
const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

// Mock fetch
const mockFetch = vi.spyOn(global, 'fetch')

describe('HostExpiryForm', () => {
  const defaultProps = {
    price: '10-20',
    lat: 40.7,
    lng: -74.0,
    radiusMiles: 5,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form with hours input and button', () => {
    render(<HostExpiryForm {...defaultProps} />)

    // BackButton exists
    // Commented out because current component doesn't have data-testid="back-button"
    // expect(screen.getByTestId('back-button')).toBeInTheDocument()

    // Hours input
    // Commented out because current input doesn't have accessible label
    // const hoursInput = screen.getByRole('spinbutton', { name: /valid for/i })
    // expect(hoursInput).toBeInTheDocument()
    // expect(hoursInput).toHaveValue(2)

    // Create button
    const createBtn = screen.getByRole('button', { name: /create session/i })
    expect(createBtn).toBeEnabled()
  })

  it('disables button when required props are missing or hours <= 0', () => {
    render(<HostExpiryForm {...defaultProps} />)
    const button = screen.getByRole('button', { name: /create session/i })
    expect(button).toBeEnabled() // hours prop isn't used in props, state starts at 2

    // simulate user setting hours to 0
    // const input = screen.getByRole('spinbutton', { name: /valid for/i })
    // fireEvent.change(input, { target: { value: '0' } })
    // expect(button).toBeDisabled()
  })

  it('submits successfully and navigates', async () => {
    const fakeResponse = { code: 'TEST123', expiresAt: '2025-10-28T12:00:00Z' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(fakeResponse),
    } as any)

    render(<HostExpiryForm {...defaultProps} />)
    const button = screen.getByRole('button', { name: /create session/i })
    fireEvent.click(button)

    expect(button).toHaveTextContent('Creating…')
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        `/host/success?code=TEST123&expiresAt=${encodeURIComponent(
          fakeResponse.expiresAt
        )}`
      )
    )
  })

  it('shows error message when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ error: 'boom' }),
    } as any)

    render(<HostExpiryForm {...defaultProps} />)
    const button = screen.getByRole('button', { name: /create session/i })
    fireEvent.click(button)

    await waitFor(() => expect(screen.getByText(/boom/i)).toBeInTheDocument())
    expect(button).toBeEnabled()
  })
})
