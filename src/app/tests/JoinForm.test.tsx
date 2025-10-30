import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import JoinForm from '../../components/JoinForm';

describe('JoinForm Component', () => {
  test('renders input and submit button', () => {
    render(<JoinForm />);

    expect(screen.getByTestId('join-input')).toBeInTheDocument();
    expect(screen.getByTestId('join-button')).toBeInTheDocument();
  });

  test('accepts only letters, converts to uppercase, and limits to 4 characters', () => {
    render(<JoinForm />);

    const input = screen.getByTestId('join-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'a1b2c3d4e' } });

    // Only letters, max 4, uppercase
    expect(input.value).toBe('ABCD');
  });

  test('shows success message when correct code is entered', () => {
    render(<JoinForm />);

    const input = screen.getByTestId('join-input') as HTMLInputElement;
    const button = screen.getByTestId('join-button');

    fireEvent.change(input, { target: { value: 'abcd' } });
    fireEvent.click(button);

    expect(screen.getByTestId('join-message')).toHaveTextContent('Success! Session joined.');
  });

  test('shows error message when incorrect code is entered', () => {
    render(<JoinForm />);

    const input = screen.getByTestId('join-input') as HTMLInputElement;
    const button = screen.getByTestId('join-button');

    fireEvent.change(input, { target: { value: 'WXYZ' } });
    fireEvent.click(button);

    expect(screen.getByTestId('join-message')).toHaveTextContent('Invalid code.');
  });

  test('does not submit if input is empty', () => {
    render(<JoinForm />);

    const button = screen.getByTestId('join-button');
    fireEvent.click(button);

    // Message should not exist
    expect(screen.queryByTestId('join-message')).toBeNull();
  });
});
