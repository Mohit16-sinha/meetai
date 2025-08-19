/**
 * Tests for src/app/(dashboard)/page.tsx
 *
 * Framework: Jest
 * Libraries: @testing-library/react, React 18
 *
 * These tests validate:
 * - Redirect to "/auth/sign-in" when no session exists
 * - Rendering of HomeView when session exists
 * - Proper propagation of errors from getSession
 * - That headers() is awaited and passed to getSession
 */
import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/navigation redirect and next/headers
// next/navigation's redirect throws to terminate rendering; we mock to track calls without throwing.
jest.mock("next/navigation", () => {
  return {
    // Use a jest.fn() we can inspect
    redirect: jest.fn(),
  };
});

// headers() returns a Promise<Headers> in app router. We'll mock it to return a resolved value.
const mockHeaders: Record<string, string> = {
  "x-test": "1",
};
const headersFactory = () => {
  // Minimal Headers-like object; only that it is passed-through to getSession is validated
  return new Map(Object.entries(mockHeaders));
};
jest.mock("next/headers", () => {
  return {
    headers: jest.fn(async () => headersFactory()),
  };
});

// Mock HomeView to a recognizable marker to assert rendering
jest.mock("@/modules/home/ui/views/home-view", () => {
  return {
    HomeView: () => <div data-testid="home-view">Home View</div>,
  };
});

// Mock auth with api.getSession
const getSessionMock = jest.fn();
jest.mock("@/lib/auth", () => {
  return {
    auth: {
      api: {
        getSession: (...args: any[]) => getSessionMock(...args),
      },
    },
  };
});

// Import after mocks so that the module under test uses our mocks
// The default export is the async Page server component
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - path under test
import Page from "./page";

describe("Dashboard Page (server component)", () => {
  const { redirect } = require("next/navigation");
  const { headers } = require("next/headers");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /auth/sign-in when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    // Call the server component function directly
    await Page();

    // Assert redirect called correctly
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/auth/sign-in");

    // Ensure getSession was called with awaited headers() value
    expect(headers).toHaveBeenCalledTimes(1);
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    const callArg = getSessionMock.mock.calls[0]?.[0];
    expect(callArg).toBeTruthy();
    expect(callArg.headers).toBeTruthy();
  });

  it("renders HomeView when a session exists", async () => {
    // Simulate a minimal session object
    getSessionMock.mockResolvedValueOnce({
      user: { id: "u_1", name: "Jane" },
      expiresAt: Date.now() + 60_000,
    });

    // The Page function returns a React element; render it for verification
    const element = await Page();
    render(element);

    // HomeView mocked marker should be in the document
    expect(screen.getByTestId("home-view")).toBeInTheDocument();

    // Should not redirect when session exists
    expect(redirect).not.toHaveBeenCalled();

    // Ensure getSession called with awaited headers
    const { headers } = require("next/headers");
    expect(headers).toHaveBeenCalledTimes(1);
  });

  it("propagates unexpected errors from getSession (failure case)", async () => {
    const testError = new Error("network down");
    getSessionMock.mockRejectedValueOnce(testError);

    await expect(Page()).rejects.toThrow("network down");

    // Should not redirect on hard error before session result
    expect(redirect).not.toHaveBeenCalled();
  });

  it("awaits headers() and passes the result into getSession", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: { id: "u_2" },
      expiresAt: Date.now() + 60_000,
    });

    const element = await Page();
    render(element);

    // Verify headers() was awaited and its output seen by getSession
    expect(require("next/headers").headers).toHaveBeenCalledTimes(1);

    const callArg = getSessionMock.mock.calls[0]?.[0];
    expect(callArg).toEqual(
      expect.objectContaining({
        headers: expect.any(Object),
      })
    );
  });
});