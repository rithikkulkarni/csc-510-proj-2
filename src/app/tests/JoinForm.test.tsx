import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import JoinForm from "../../components/JoinForm"; // adjust path to match your structure

describe("JoinForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the input and button", () => {
        render(<JoinForm />);
        expect(screen.getByPlaceholderText(/Enter Code/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /join/i })).toBeInTheDocument();
    });

    it("filters non-letter characters and forces uppercase", () => {
        render(<JoinForm />);
        const input = screen.getByPlaceholderText(/Enter Code/i) as HTMLInputElement;

        fireEvent.change(input, { target: { value: "abc123!@" } });
        expect(input.value).toBe("ABC");
    });

    it("calls console.log with the code when submitted", () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => { });
        render(<JoinForm />);
        const input = screen.getByPlaceholderText(/Enter Code/i);
        const button = screen.getByRole("button", { name: /join/i });

        fireEvent.change(input, { target: { value: "xyz" } });
        fireEvent.click(button);

        expect(logSpy).toHaveBeenCalledWith("Join code submitted:", "XYZ");
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
