import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button, Input, Modal, ResponsiveTable } from "./ui-components";
import { PriorityBadge, StatusBadge } from "./dashboard-ui";

describe("shared UI components", () => {
  it("gives buttons semantic defaults and exposes the loading state", () => {
    render(<Button loading>Saving</Button>);
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("associates input labels, helper text, and validation errors", () => {
    render(<Input label="Email" name="email" required helperText="Work email" error="Enter a valid email." />);
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain("email-help");
    expect(input.getAttribute("aria-describedby")).toContain("email-error");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email.");
  });

  it("uses semantic headers and keeps table contents scrollable", () => {
    render(<ResponsiveTable><thead><tr><th scope="col">Ticket</th></tr></thead><tbody><tr><td>42</td></tr></tbody></ResponsiveTable>);
    expect(screen.getByRole("columnheader", { name: "Ticket" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Scrollable table" })).toBeInTheDocument();
  });

  it("maps ticket badges to the existing API status and priority values", () => {
    render(<><StatusBadge status="WAITING_ON_CUSTOMER" /><PriorityBadge priority="P1" /></>);
    expect(screen.getByText("WAITING ON CUSTOMER")).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
  });

  it("opens as a named dialog and routes Escape to the caller", () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
    const close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open"); });
    HTMLDialogElement.prototype.showModal = showModal;
    HTMLDialogElement.prototype.close = close;
    const onOpenChange = vi.fn();
    render(<Modal open onOpenChange={onOpenChange} title="Delete ticket" description="Confirm removal">Confirm</Modal>);
    const dialog = screen.getByRole("dialog", { name: "Delete ticket" });
    expect(showModal).toHaveBeenCalledOnce();
    expect(dialog).toHaveAttribute("aria-describedby");
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
