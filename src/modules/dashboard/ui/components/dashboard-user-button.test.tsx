/**
 * Tests for DashboardUserButton
 *
 * Testing stack:
 * - Framework: Vitest or Jest (the suite uses standard describe/it/expect patterns)
 * - Library: @testing-library/react + @testing-library/user-event
 *
 * These tests mock:
 * - next/navigation: useRouter (to verify push calls)
 * - @/lib/auth-client: useSession + signOut
 *
 * Covered scenarios:
 * - Pending session and missing user -> component returns null
 * - User present with image -> AvatarImage shows, GeneratedAvatar not rendered
 * - User present without image -> GeneratedAvatar shows
 * - Dropdown opens; Billing item visible
 * - Clicking Logout triggers authClient.signOut with fetchOptions.onSuccess, which routes to sign-in
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest"; // Vitest API; if Jest, swap to jest equivalents
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock Next.js App Router
vi.mock("next/navigation", async (orig) => {
  // Provide a simple mock for useRouter that exposes a push spy
  const push = vi.fn();
  return {
    ...(typeof orig === "function" ? await orig() : {}),
    useRouter: () => ({ push }),
  };
});

// Module-scoped reference to retrieve the latest push spy during tests
const getRouterPushMock = (): jest.Mock | ReturnType<typeof vi.fn> => {
  // Re-import the mocked module to access the same spy instance
  const { useRouter } = require("next/navigation");
  const router = useRouter();
  return router.push;
};

// Mock auth client
const mockUseSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/auth-client", async (orig) => {
  return {
    ...(typeof orig === "function" ? await orig() : {}),
    authClient: {
      useSession: () => mockUseSession(),
      signOut: (args: any) => mockSignOut(args),
    },
  };
});

// Import after mocks are set up
import { DashboardUserButton } from "./dashboard-user-button";

type SessionUser = {
  name: string;
  email: string;
  image?: string | null;
};

type SessionData = {
  user?: SessionUser | null;
};

const buildSession = (overrides?: Partial<SessionUser>): SessionData => ({
  user: {
    name: "Jane Doe",
    email: "jane@example.com",
    image: "https://example.com/avatar.png",
    ...overrides,
  },
});

describe("DashboardUserButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null while session is pending", () => {
    mockUseSession.mockReturnValue({ data: undefined, isPending: true });
    const { container } = render(<DashboardUserButton />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when there is no user in the session", () => {
    mockUseSession.mockReturnValue({ data: { user: null }, isPending: false });
    const { container } = render(<DashboardUserButton />);
    expect(container.firstChild).toBeNull();
  });

  it("renders avatar image when user.image is provided and shows name and email", async () => {
    mockUseSession.mockReturnValue({ data: buildSession(), isPending: false });

    render(<DashboardUserButton />);

    // Name and email text present
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();

    // AvatarImage should be present (img element likely rendered)
    // Try selecting by role=img or by src attribute via query
    const img = screen.getByRole("img", { hidden: true });
    expect(img).toBeInTheDocument();
    expect((img as HTMLImageElement).getAttribute("src")).toBe("https://example.com/avatar.png");

    // Ensure GeneratedAvatar is not present; heuristics:
    // If component adds data-testid or has class 'generated-avatar' use that; otherwise check absence of initials path.
    // We check for absence of element with title/alt containing initials-like text.
    expect(screen.queryByText(/JD/)).not.toBeInTheDocument();
  });

  it("renders a GeneratedAvatar when user.image is missing", async () => {
    mockUseSession.mockReturnValue({
      data: buildSession({ image: null }),
      isPending: false,
    });

    render(<DashboardUserButton />);

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();

    // No native <img> for AvatarImage when image is missing
    // There might still be svg/img produced by GeneratedAvatar; the important part is that the AvatarImage-specific img is absent.
    const allImgs = screen.queryAllByRole("img", { hidden: true });
    // If GeneratedAvatar renders an <svg>, there may be zero imgs. Accept either 0 or >0 as unknown,
    // but assert that we cannot find one with the provided src.
    const imgWithSrc = allImgs.find((el) => (el as HTMLImageElement).getAttribute("src") === "https://example.com/avatar.png");
    expect(imgWithSrc).toBeUndefined();

    // Heuristic: GeneratedAvatar likely renders something deterministic; check presence by class from component props
    // The component passes className="size-9 mr-3" to GeneratedAvatar; assert an element with that class exists.
    const generated = document.querySelector(".size-9.mr-3");
    expect(generated).not.toBeNull();
  });

  it("opens dropdown via trigger to reveal Billing item", async () => {
    mockUseSession.mockReturnValue({ data: buildSession(), isPending: false });
    const user = userEvent.setup();

    render(<DashboardUserButton />);

    // The trigger contains the user's name and email; click anywhere within that trigger area.
    const trigger = await screen.findByText("Jane Doe");
    await user.click(trigger);

    // Once open, the content should include 'Billing'
    const billingItem = await screen.findByText("Billing");
    expect(billingItem).toBeInTheDocument();
  });

  it("clicking Logout calls authClient.signOut and on success navigates to /auth/sign-in", async () => {
    mockUseSession.mockReturnValue({ data: buildSession(), isPending: false });

    // Make signOut call the onSuccess callback when provided in fetchOptions
    mockSignOut.mockImplementation((args: any) => {
      const cb = args?.fetchOptions?.onSuccess;
      if (typeof cb === "function") {
        cb();
      }
    });

    const user = userEvent.setup();
    render(<DashboardUserButton />);

    // Open the dropdown
    const trigger = await screen.findByText("Jane Doe");
    await user.click(trigger);

    // Click Logout item
    const logoutItem = await screen.findByText("Logout");
    await user.click(logoutItem);

    // Verify signOut invoked with expected structure
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    const call = mockSignOut.mock.calls[0][0];
    expect(call).toHaveProperty("fetchOptions");
    expect(call.fetchOptions).toHaveProperty("onSuccess");
    expect(typeof call.fetchOptions.onSuccess).toBe("function");

    // Router push called with the sign-in route
    await waitFor(() => {
      const push = getRouterPushMock();
      expect(push).toHaveBeenCalledWith("/auth/sign-in");
    });
  });

  it("does not navigate when signOut does not call onSuccess", async () => {
    mockUseSession.mockReturnValue({ data: buildSession(), isPending: false });
    mockSignOut.mockImplementation((_args: any) => {
      // simulate failure or missing callback invocation
    });

    const user = userEvent.setup();
    render(<DashboardUserButton />);

    const trigger = await screen.findByText("Jane Doe");
    await user.click(trigger);

    const logoutItem = await screen.findByText("Logout");
    await user.click(logoutItem);

    const push = getRouterPushMock();
    await new Promise((r) => setTimeout(r, 50));
    expect(push).not.toHaveBeenCalled();
  });
});