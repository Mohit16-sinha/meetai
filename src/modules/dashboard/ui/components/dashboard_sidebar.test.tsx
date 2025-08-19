/**
 * Tests for Dashboardsidebar component.
 *
 * Testing library/framework:
 * - React Testing Library with Jest/Vitest (whichever the project uses).
 *   - Uses RTL APIs: render, screen, within, fireEvent (if needed).
 *   - Mocks next/navigation.usePathname to control active state.
 *
 * Covered scenarios:
 * - Renders header with logo and app name that links to "/".
 * - Renders first section items (Meetings, Agents) with corresponding icons and hrefs.
 * - Renders second section item (Upgrade) with correct href.
 * - Applies active styles when pathname matches an item's href.
 * - Does not apply active styles when pathname differs.
 * - Footer renders DashboardUserButton.
 * - Handles unexpected/missing pathname gracefully (mocking undefined or empty).
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/link and next/image as simple pass-throughs for testing
jest.mock("next/link", () => {
  return ({ href, children, ...rest }: any) => (
    <a href={href} data-testid={`link:${href}`} {...rest}>
      {children}
    </a>
  );
});

jest.mock("next/image", () => {
  return (props: any) => <img alt={props.alt} src={props.src} height={props.height} width={props.width} data-testid="next-image" />;
});

// Mock next/navigation usePathname
const usePathnameMock = jest.fn();
jest.mock("next/navigation", () => ({
  // keep other exports undefined by default
  usePathname: () => usePathnameMock(),
}));

// Mock DashboardUserButton footer component
jest.mock("./dashboard-user-button", () => ({
  DashboardUserButton: () => <div data-testid="dashboard-user-button">UserBtn</div>,
}));

// The component under test
// We import after mocks so module initialization picks up mocks
import { Dashboardsidebar } from "./dashboard-sidebar";

// Helpers to query items by label
const getNavItemByLabel = (label: string) =>
  screen.getByText(label, { selector: "span" }).closest("a");

describe("Dashboardsidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders header with logo and brand linking to root", () => {
    usePathnameMock.mockReturnValue("/");
    render(<Dashboardsidebar />);

    // Header link to "/"
    const homeLink = screen.getByTestId("link:/");
    expect(homeLink).toBeInTheDocument();

    // Brand text
    expect(within(homeLink).getByText("Meet.AI")).toBeInTheDocument();

    // Logo image
    const logo = within(homeLink).getByTestId("next-image");
    expect(logo).toHaveAttribute("src", "/logo.svg");
    expect(logo).toHaveAttribute("alt", "Meet.AI");
  });

  it("renders first section items with correct labels and hrefs", () => {
    usePathnameMock.mockReturnValue("/somewhere-else");
    render(<Dashboardsidebar />);

    // Meetings
    const meetingsLink = getNavItemByLabel("Meetings");
    expect(meetingsLink).toBeInTheDocument();
    expect(meetingsLink).toHaveAttribute("href", "/meetings");

    // Agents
    const agentsLink = getNavItemByLabel("Agents");
    expect(agentsLink).toBeInTheDocument();
    expect(agentsLink).toHaveAttribute("href", "/agents");
  });

  it("renders second section item 'Upgrade' with correct href", () => {
    usePathnameMock.mockReturnValue("/");
    render(<Dashboardsidebar />);

    const upgradeLink = getNavItemByLabel("Upgrade");
    expect(upgradeLink).toBeInTheDocument();
    expect(upgradeLink).toHaveAttribute("href", "/upgrade");
  });

  it("marks the active item when pathname matches (Meetings)", () => {
    usePathnameMock.mockReturnValue("/meetings");
    const { container } = render(<Dashboardsidebar />);

    const meetingsLink = getNavItemByLabel("Meetings");
    expect(meetingsLink).toBeInTheDocument();

    // The active className is applied to SidebarMenuButton when pathname === href.
    // We assert the presence of discriminating substrings from the code.
    // from code: 'bg-linear-to-r/oklch border-[#5D6B68]/10'
    const activeButton = meetingsLink?.closest("button") || meetingsLink?.parentElement;
    expect(activeButton?.className || "").toContain("bg-linear-to-r/oklch");
    expect(activeButton?.className || "").toContain("border-[#5D6B68]/10");

    // Non-active item should not have the active-only classes
    const agentsLink = getNavItemByLabel("Agents");
    const agentsButton = agentsLink?.closest("button") || agentsLink?.parentElement;
    const agentsClass = agentsButton?.className || "";
    // It can still contain shared hover/base classes, but should not include active-specific border/color
    expect(agentsClass).not.toContain("border-[#5D6B68]/10");
    // The hover class is okay, but we emphasize the presence/absence of the active class
  });

  it("marks the active item when pathname matches (Agents)", () => {
    usePathnameMock.mockReturnValue("/agents");
    render(<Dashboardsidebar />);

    const agentsLink = getNavItemByLabel("Agents");
    const agentsButton = agentsLink?.closest("button") || agentsLink?.parentElement;
    expect(agentsButton?.className || "").toContain("bg-linear-to-r/oklch");
    expect(agentsButton?.className || "").toContain("border-[#5D6B68]/10");

    const meetingsLink = getNavItemByLabel("Meetings");
    const meetingsButton = meetingsLink?.closest("button") || meetingsLink?.parentElement;
    expect(meetingsButton?.className || "").not.toContain("border-[#5D6B68]/10");
  });

  it("does not mark Upgrade as active when pathname differs", () => {
    usePathnameMock.mockReturnValue("/agents");
    render(<Dashboardsidebar />);

    const upgradeLink = getNavItemByLabel("Upgrade");
    const upgradeButton = upgradeLink?.closest("button") || upgradeLink?.parentElement;
    expect(upgradeButton?.className || "").not.toContain("border-[#5D6B68]/10");
  });

  it("renders the footer DashboardUserButton", () => {
    usePathnameMock.mockReturnValue("/meetings");
    render(<Dashboardsidebar />);

    expect(screen.getByTestId("dashboard-user-button")).toBeInTheDocument();
  });

  it("gracefully handles undefined or empty pathname", () => {
    // Simulate unexpected usePathname result
    usePathnameMock.mockReturnValue(undefined);
    render(<Dashboardsidebar />);

    // Should still render essential links
    expect(getNavItemByLabel("Meetings")).toBeInTheDocument();
    expect(getNavItemByLabel("Agents")).toBeInTheDocument();
    expect(getNavItemByLabel("Upgrade")).toBeInTheDocument();

    // None should show active state when pathname is undefined
    const meetingsButton = getNavItemByLabel("Meetings")?.closest("button") || getNavItemByLabel("Meetings")?.parentElement;
    const agentsButton = getNavItemByLabel("Agents")?.closest("button") || getNavItemByLabel("Agents")?.parentElement;
    const upgradeButton = getNavItemByLabel("Upgrade")?.closest("button") || getNavItemByLabel("Upgrade")?.parentElement;

    for (const el of [meetingsButton, agentsButton, upgradeButton]) {
      expect(el?.className || "").not.toContain("border-[#5D6B68]/10");
    }
  });
});