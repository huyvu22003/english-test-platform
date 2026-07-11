import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminPageHeader } from "./AdminPageHeader";

describe("AdminPageHeader", () => {
  it("renders eyebrow, title, and subtitle", () => {
    render(<AdminPageHeader eyebrow="Test Section" title="Page Title" subtitle="A subtitle" />);
    expect(screen.getByText("Test Section")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Page Title");
    expect(screen.getByText("A subtitle")).toBeInTheDocument();
  });

  it("renders stats when provided", () => {
    render(
      <AdminPageHeader
        eyebrow="E"
        title="T"
        stats={[
          { label: "Users", value: 42 },
          { label: "Active", value: 10, urgent: true },
        ]}
        statsAriaLabel="Overview"
      />,
    );
    expect(screen.getByLabelText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Active").closest(".admin-stat-card")).toHaveClass("urgent");
  });

  it("renders actions slot", () => {
    render(<AdminPageHeader eyebrow="E" title="T" actions={<button>Click me</button>} />);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("does not render stats section when stats is empty", () => {
    const { container } = render(<AdminPageHeader eyebrow="E" title="T" stats={[]} />);
    expect(container.querySelector(".admin-stat-grid")).toBeNull();
  });
});
