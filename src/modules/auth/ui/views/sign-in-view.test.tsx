/**
 * Tests for SignInView
 *
 * Framework: React Testing Library with Jest/Vitest matchers.
 * Runner: Aligns with existing project setup (Jest or Vitest).
 *
 * These tests focus on:
 *  - Form validation (zod + react-hook-form)
 *  - Pending state and button disabling
 *  - Success and failure paths for email/password sign-in
 *  - Social sign-in flows (google, github)
 *  - Router navigation via useRouter().push
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"; // If using Jest, replace with jest equivalents
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Try both import paths; adjust based on actual component path in repo.
import { SignInView } from "./sign-in-view"; // if colocated as sign-in-view.tsx
// If component is located elsewhere, update relative path accordingly.
// Example alternative import:
// import { SignInView } from "@/modules/auth/ui/views/sign-in-view";

vi.mock("next/link", async () => {
  // Next.js Link replacement for tests
  const Actual = await vi.importActual<any>("react");
  return {
    __esModule: true,
    default: ({ href, children, ...props }: any) =>
      Actual.createElement("a", { href, ...props }, children),
  };
});

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

// Mock the authClient
const signInEmailMock = vi.fn();
const signInSocialMock = vi.fn();
vi.mock("@/lib/auth-client", () => {
  return {
    authClient: {
      signIn: {
        email: (...args: any[]) => signInEmailMock(...args),
        social: (...args: any[]) => signInSocialMock(...args),
      },
    },
  };
});

// Helper queries
const getEmailInput = () =>
  screen.getByLabelText(/email/i) as HTMLInputElement;
const getPasswordInput = () =>
  screen.getByLabelText(/password/i) as HTMLInputElement;
const getSubmitButton = () => screen.getByRole("button", { name: /sign in/i });
const getGoogleButton = () =>
  screen.getAllByRole("button").find((b) => within(b).queryByText("") || b.innerHTML.includes("google")) ||
  screen.getByRole("button", { name: /google/i }); // fallback if text is accessible
const getGithubButton = () =>
  screen.getAllByRole("button").find((b) => within(b).queryByText("") || b.innerHTML.includes("github")) ||
  screen.getByRole("button", { name: /github/i }); // fallback

describe("SignInView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders key UI elements and initial state", () => {
    render(<SignInView />);

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByText(/login to your account/i)).toBeInTheDocument();

    // Inputs exist and initially empty
    const email = getEmailInput();
    const password = getPasswordInput();
    expect(email).toBeInTheDocument();
    expect(password).toBeInTheDocument();
    expect(email.value).toBe("");
    expect(password.value).toBe("");

    // Submit button enabled initially
    const submit = getSubmitButton();
    expect(submit).toBeEnabled();
  });

  it("shows validation error for invalid email and required password", async () => {
    const user = userEvent.setup();
    render(<SignInView />);

    await user.type(getEmailInput(), "not-an-email");
    await user.clear(getPasswordInput()); // ensure empty

    await user.click(getSubmitButton());

    // zod + react-hook-form messages
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/password is required/i)
    ).toBeInTheDocument();

    // No auth call made
    expect(signInEmailMock).not.toHaveBeenCalled();
  });

  it("submits with valid credentials, calls authClient.signIn.email and navigates on success", async () => {
    const user = userEvent.setup();
    render(<SignInView />);

    // Mock signIn.email behavior: call onSuccess
    signInEmailMock.mockImplementation(async (_payload, opts) => {
      // Simulate async delay
      await Promise.resolve();
      opts?.onSuccess?.();
      return { error: null };
    });

    await user.type(getEmailInput(), "user@example.com");
    await user.type(getPasswordInput(), "password123");

    const submit = getSubmitButton();

    // Click submit and ensure pending disables buttons
    await user.click(submit);
    expect(submit).toBeDisabled();

    // Wait for success to re-enable submit and trigger navigation
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });

    expect(signInEmailMock).toHaveBeenCalledTimes(1);
    expect(signInEmailMock).toHaveBeenCalledWith(
      { email: "user@example.com", password: "password123" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it("surfaces error when email/password sign-in fails", async () => {
    const user = userEvent.setup();
    render(<SignInView />);

    signInEmailMock.mockImplementation(async (_payload, opts) => {
      await Promise.resolve();
      opts?.onError?.({ error: new Error("Invalid credentials") });
      return { error: new Error("Invalid credentials") };
    });

    await user.type(getEmailInput(), "user@example.com");
    await user.type(getPasswordInput(), "wrongpass");
    await user.click(getSubmitButton());

    // Error alert appears
    expect(
      await screen.findByText(/invalid credentials/i)
    ).toBeInTheDocument();

    // Router not called
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("clears previous error on re-submit", async () => {
    const user = userEvent.setup();
    render(<SignInView />);

    // First attempt: fails
    signInEmailMock.mockImplementationOnce(async (_payload, opts) => {
      opts?.onError?.({ error: new Error("Invalid credentials") });
      return { error: new Error("Invalid credentials") };
    });

    await user.type(getEmailInput(), "user@example.com");
    await user.type(getPasswordInput(), "wrongpass");
    await user.click(getSubmitButton());
    expect(
      await screen.findByText(/invalid credentials/i)
    ).toBeInTheDocument();

    // Second attempt: success and should clear error
    signInEmailMock.mockImplementationOnce(async (_payload, opts) => {
      opts?.onSuccess?.();
      return { error: null };
    });

    // Change password and submit again
    await user.clear(getPasswordInput());
    await user.type(getPasswordInput(), "correctpass");
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });

    // Error should be gone
    await waitFor(() => {
      expect(
        screen.queryByText(/invalid credentials/i)
      ).not.toBeInTheDocument();
    });
  });

  it("initiates Google social sign-in and handles success", async () => {
    const user = userEvent.setup();
    render(<SignInView />);

    signInSocialMock.mockImplementation(async (_payload, opts) => {
      await Promise.resolve();
      opts?.onSuccess?.();
      return { error: null };
    });

    // Click Google button
    const googleBtn = screen.getAllByRole("button").find((btn) =>
      btn.className?.includes("outline")
    ) || getGoogleButton();

    // Ensure disabled state toggles
    await user.click(googleBtn as HTMLElement);

    // Called with provider "google" and callbackURL "/"
    expect(signInSocialMock).toHaveBeenCalledWith(
      { provider: "google", callbackURL: "/" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it("initiates GitHub social sign-in and shows error on failure", async () => {
    const user = userEvent.setup();
    render(<SignInView />);

    signInSocialMock.mockImplementation(async (_payload, opts) => {
      await Promise.resolve();
      opts?.onError?.({ error: new Error("OAuth failed") });
      return { error: new Error("OAuth failed") };
    });

    // Click GitHub button (second outline button)
    const outlineButtons = screen.getAllByRole("button").filter((b) =>
      b.className?.includes("outline")
    );
    const githubBtn = outlineButtons[1] ?? getGithubButton();
    await user.click(githubBtn as HTMLElement);

    expect(signInSocialMock).toHaveBeenCalledWith(
      { provider: "github", callbackURL: "/" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );

    // Error alert appears
    expect(await screen.findByText(/oauth failed/i)).toBeInTheDocument();
  });

  it("disables buttons while pending states are active", async () => {
    const user = userEvent.setup();
    render(<SignInView />);

    // Keep email sign-in pending until we check disabled states
    let resolveFn: (() => void) | null = null;
    signInEmailMock.mockImplementation(
      async (_payload, _opts) =>
        await new Promise((resolve) => {
          resolveFn = () => resolve({ error: null });
        })
    );

    await user.type(getEmailInput(), "user@example.com");
    await user.type(getPasswordInput(), "password123");

    const submit = getSubmitButton();
    await user.click(submit);

    // During pending, buttons should be disabled
    expect(submit).toBeDisabled();

    // Social buttons should also be disabled
    const buttons = screen.getAllByRole("button");
    for (const b of buttons) {
      // The Sign In button is disabled, outline social buttons should be disabled too
      if (b !== submit) {
        // Depending on UI, some non-form buttons could be enabled; check at least that outline ones are disabled
        if (b.className?.includes("outline")) {
          expect(b).toBeDisabled();
        }
      }
    }

    // Finish pending
    resolveFn && resolveFn();

    await waitFor(() => {
      expect(submit).toBeEnabled();
    });
  });
});
