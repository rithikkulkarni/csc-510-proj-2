import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import JoinForm from "../../components/JoinForm";

// Mock supabase client correctly
const singleMock = vi.fn();

vi.mock("../../lib/supabaseClient", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: singleMock, // use the singleMock here
                })),
            })),
        })),
    },
}));

import { supabase } from "../../lib/supabaseClient";

describe("JoinForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the input and button", () => {
        render(<JoinForm />);
        expect(screen.getByPlaceholderText(/Enter Code/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Join/i })).toBeInTheDocument();
    });

    it("filters non-letter characters and forces uppercase", () => {
        render(<JoinForm />);
        const input = screen.getByPlaceholderText(/Enter Code/i) as HTMLInputElement;

        fireEvent.change(input, { target: { value: "abc123!@" } });
        expect(input.value).toBe("ABC");
    });

    it("displays success message when code exists in Supabase", async () => {
        singleMock.mockResolvedValueOnce({ data: { id: 1, code: "ABC" }, error: null });

        render(<JoinForm />);
        const input = screen.getByPlaceholderText(/Enter Code/i);
        const button = screen.getByRole("button", { name: /Join/i });

        fireEvent.change(input, { target: { value: "ABC" } });
        fireEvent.click(button);

        const message = await screen.findByTestId("join-message");
        expect(message).toHaveTextContent("Success! Joined session 1.");
    });

    it("displays invalid code message when code does not exist", async () => {
        singleMock.mockResolvedValueOnce({ data: null, error: null });

        render(<JoinForm />);
        const input = screen.getByPlaceholderText(/Enter Code/i);
        const button = screen.getByRole("button", { name: /Join/i });

        fireEvent.change(input, { target: { value: "XYZ" } });
        fireEvent.click(button);

        const message = await screen.findByTestId("join-message");
        expect(message).toHaveTextContent("Invalid code.");
    });

    it("prevents default form submission", () => {
        const preventDefaultSpy = vi.spyOn(Event.prototype, "preventDefault");

        render(<JoinForm />);
        const form = screen.getByTestId("join-form");
        const input = screen.getByPlaceholderText(/Enter Code/i);

        fireEvent.change(input, { target: { value: "hello" } });
        fireEvent.submit(form);

        expect(preventDefaultSpy).toHaveBeenCalled();
    });
});
