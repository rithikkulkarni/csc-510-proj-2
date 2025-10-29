import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../page';

describe('Home Page', () => {
    test('renders HOST and JOIN cards', () => {
        render(<Home />);

        // Check HOST heading
        expect(screen.getByText('HOST')).toBeInTheDocument();

        // Check JOIN heading
        expect(screen.getByText('JOIN')).toBeInTheDocument();

        // Check HOST button
        expect(screen.getByText('Create Session')).toBeInTheDocument();

        // Check JOIN form input and button
        expect(screen.getByTestId('join-input')).toBeInTheDocument();
        expect(screen.getByTestId('join-button')).toBeInTheDocument();
    });

    test('JOIN form works correctly', () => {
        render(<Home />);

        const input = screen.getByTestId('join-input') as HTMLInputElement;
        const button = screen.getByTestId('join-button');

        // Enter incorrect code
        fireEvent.change(input, { target: { value: 'WXYZ' } });
        fireEvent.click(button);
        expect(screen.getByTestId('join-message')).toHaveTextContent('Invalid code.');

        // Enter correct code
        fireEvent.change(input, { target: { value: 'abcd' } });
        fireEvent.click(button);
        expect(screen.getByTestId('join-message')).toHaveTextContent('Success! Session joined.');
    });
});
