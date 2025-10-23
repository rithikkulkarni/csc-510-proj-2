import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import JoinForm from "../../components/JoinForm";

// Define a type for a minimal supabase client used in JoinForm
type SupabaseMock = {
    from: (table: string) => {
        select: (columns: string) => {
            eq: (column: string, value: string) => {
                maybeSingle: () => Promise<{ data: any; error: any }>;
            };
        };
    };
};

describe("JoinForm", () => {
    let singleMock: () => Promise<{ data: any; error: any }>;

    beforeEach(() => {
        singleMock = vi.fn();
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

    it("displays success message when code exists", async () => {
        singleMock = vi.fn().mockResolvedValue({ data: { id: 1, code: "ABCD" }, error: null });

        const mockSupabase: SupabaseMock = {
            from: () => ({
                select: () => ({
                    eq: () => ({
                        maybeSingle: singleMock,
                    }),
                }),
            }),
        } as any;

        render(<JoinForm supabase={mockSupabase as any} />);

        const input = screen.getByPlaceholderText(/Enter Code/i);
        const button = screen.getByRole("button", { name: /Join/i });

        fireEvent.change(input, { target: { value: "ABCD" } });
        fireEvent.click(button);

        const message = await screen.findByTestId("join-message");
        expect(message).toHaveTextContent("Success! Joined session 1.");
    });

    it("displays invalid code message when code does not exist", async () => {
        singleMock = vi.fn().mockResolvedValue({ data: null, error: null });

        const mockSupabase: SupabaseMock = {
            from: () => ({
                select: () => ({
                    eq: () => ({
                        maybeSingle: singleMock,
                    }),
                }),
            }),
        } as any;

        render(<JoinForm supabase={mockSupabase as any} />);

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

        fireEvent.change(input, { target: { value: "HELLO" } });
        fireEvent.submit(form);

        expect(preventDefaultSpy).toHaveBeenCalled();
    });
});
