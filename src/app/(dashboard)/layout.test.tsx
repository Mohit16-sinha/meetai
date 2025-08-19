import React from "react";
import { render, screen } from "@testing-library/react";

// Note on testing framework:
// - Using @testing-library/react for rendering and queries with Jest-style expect()
// - If the project uses Vitest, this file should still work with minimal changes (vi.mock instead of jest.mock)

jest.mock("@/components/ui/sidebar", () => {
  return {
    __esModule: true,
    SidebarProvider: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="sidebar-provider">{children}</div>
    ),
  };
});

jest.mock("@/modules/dashboard/ui/components/dashboard_sidebar", () => {
  return {
    __esModule: true,
    Dashboardsidebar: () => <div data-testid="dashboard-sidebar">Sidebar</div>,
  };
});

// Import after mocks so that mocked modules are used
import Layout from "./layout";

describe("Dashboard layout", () => {
  it("renders without crashing and returns a React element", () => {
    const { container } = render(
      <Layout childern={<div data-testid="dummy-child">Hello</div>} />
    );
    expect(container).toBeTruthy();
  });

  it("wraps content with SidebarProvider", () => {
    render(<Layout childern={<div>content</div>} />);
    expect(screen.getByTestId("sidebar-provider")).toBeInTheDocument();
  });

  it("renders the Dashboardsidebar component", () => {
    render(<Layout childern={<div>content</div>} />);
    expect(screen.getByTestId("dashboard-sidebar")).toBeInTheDocument();
    expect(screen.getByText("Sidebar")).toBeInTheDocument();
  });

  it("renders the main element with expected layout classes", () => {
    const { container } = render(<Layout childern={<div>content</div>} />);
    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    // Validate key classes (do not strictly assert the entire class string to be resilient)
    expect(main).toHaveClass("flex");
    expect(main).toHaveClass("flex-col");
    expect(main).toHaveClass("h-screen");
    expect(main).toHaveClass("w-screen");
    expect(main).toHaveClass("bg-muted");
  });

  it("renders content passed via the 'childern' prop (note spelling)", () => {
    render(<Layout childern={<div data-testid="special-child">Special</div>} />);
    expect(screen.getByTestId("special-child")).toBeInTheDocument();
    expect(screen.getByText("Special")).toBeInTheDocument();
  });

  it("does not render content passed via the standard 'children' prop (edge case due to misspelling)", () => {
    // Casting to any to bypass TS prop checks and replicate a consumer using 'children'
    const BrokenPropsLayout = Layout as any;
    render(
      <BrokenPropsLayout>
        <div data-testid="standard-children">I am children</div>
      </BrokenPropsLayout>
    );
    // The layout uses 'childern', so standard 'children' should not appear
    expect(screen.queryByTestId("standard-children")).not.toBeInTheDocument();
  });

  it("handles empty childern gracefully (renders structure without throwing)", () => {
    const { container } = render(<Layout childern={null as unknown as React.ReactNode} />);
    expect(screen.getByTestId("sidebar-provider")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-sidebar")).toBeInTheDocument();
    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    // Ensure no unexpected text content when childern is null
    expect(main?.textContent).toBe("");
  });

  it("supports complex ReactNode as childern (arrays, fragments)", () => {
    render(
      <Layout
        childern={
          <>
            <span>Part A</span>
            <span>Part B</span>
            {[<span key="1">Part C</span>]}
          </>
        }
      />
    );
    expect(screen.getByText("Part A")).toBeInTheDocument();
    expect(screen.getByText("Part B")).toBeInTheDocument();
    expect(screen.getByText("Part C")).toBeInTheDocument();
  });
});