import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import JoinForm from "../../components/JoinForm";

describe("JoinForm", () => {
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
        render(<JoinForm />);
        const input = screen.getByPlaceholderText(/Enter Code/i);
        const button = screen.getByRole("button", { name: /Join/i });

        fireEvent.change(input, { target: { value: "ABCD" } });
        fireEvent.click(button);

        const message = await screen.findByTestId("join-message");
        await waitFor(() => {
            expect(message.textContent).toMatch(/Success! Joined session/);
        });
    });

    it("displays invalid code message when code does not exist", async () => {
        render(<JoinForm />);
        const input = screen.getByPlaceholderText(/Enter Code/i);
        const button = screen.getByRole("button", { name: /Join/i });

        fireEvent.change(input, { target: { value: "XXXX" } });
        fireEvent.click(button);

        const message = await screen.findByTestId("join-message");
        await waitFor(() => {
            expect(message.textContent).toBe("Invalid code.");
        });
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
