import React from 'react'
import { render, screen } from '@testing-library/react'
import Home from '../page'
import { expect, test } from 'vitest'

test('renders Host and Join sections', () => {
  render(<Home />)
  expect(screen.getByText(/create session/i)).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/enter code/i)).toBeInTheDocument()
})
