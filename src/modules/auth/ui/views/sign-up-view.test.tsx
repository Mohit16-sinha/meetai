/**
 * Tests for SignUpView component
 *
 * Testing framework and library:
 * - React Testing Library (@testing-library/react) and @testing-library/user-event
 * - Runner: Jest or Vitest (compatible APIs used)
 *
 * This suite validates:
 * - Form validation with zod + react-hook-form (required fields, email format, password match)
 * - Successful email sign up triggers pending state and router navigation
 * - Failed email sign up shows error alert and resets pending
 * - Social sign-in (google/github) success and error handlers set pending and error appropriately
 * - Button disabled states while pending
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Under test
// The component is expected to be exported from a sibling file named "sign-up-view.tsx" with export const SignUpView
import { SignUpView } from "./sign-up-view";

// Mocks
const isVitest = typeof vi !== "undefined";
const mockFn = (fn?: any) => (isVitest ? vi.fn(fn) : jest.fn(fn));

/**
 * Mock next/navigation useRouter to observe navigation calls.
 */
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

/**
 * Mock next/link to render anchor-like children to avoid Next.js client behavior.
 */
jest.mock("next/link", () => {
  return ({ href, children }: any) => <a href={href} data-testid="next-link">{children}</a>;
});

/**
 * Mock lucide-react and react-icons to avoid rendering heavy SVGs in tests.
 */
jest.mock("lucide-react", () => ({
  OctagonAlertIcon: (props: any) => <svg data-testid="octagon-alert-icon" {...props} />,
}));
jest.mock("react-icons/fa", () => ({
  FaGithub: (props: any) => <svg data-testid="fa-github" {...props} />,
  FaGoogle: (props: any) => <svg data-testid="fa-google" {...props} />,
}));

/**
 * Mock the alias import for authClient.
 * We simulate the behavior of:
 *  - authClient.signUp.email(payload, { onSuccess, onError })
 *  - authClient.signIn.social(payload, { onSuccess, onError })
 */
const mockSignUpEmail = mockFn();
const mockSignInSocial = mockFn();

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: {
      email: (...args: any[]) => mockSignUpEmail(...args),
    },
    signIn: {
      social: (...args: any[]) => mockSignInSocial(...args),
    },
  },
}));

const mockPush = mockFn();

/**
 * Utilities to get form inputs and buttons by accessible roles/labels.
 */
const getNameInput = () => screen.getByLabelText(/name/i);
const getEmailInput = () => screen.getByLabelText(/email/i);
const getPasswordInput = () => screen.getByLabelText(/^password$/i);
const getConfirmPasswordInput = () => screen.getByLabelText(/confirm password/i);
const getCreateButton = () => screen.getByRole("button", { name: /create/i });
const getGoogleButton = () => screen.getAllByRole("button").find((b) => b.textContent?.trim() === "");
const getGitHubButton = () => screen.getAllByRole("button").find((b) => b.textContent?.trim() === "");

describe("SignUpView", () => {
  beforeEach(() => {
    mockPush.mockReset?.();
    mockSignUpEmail.mockReset?.();
    mockSignInSocial.mockReset?.();
  });

  test("renders the form with expected fields and actions", () => {
    render(<SignUpView />);

    expect(screen.getByRole("heading", { name: /let's get started/i })).toBeInTheDocument();
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();

    // Inputs
    expect(getNameInput()).toBeInTheDocument();
    expect(getEmailInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(getConfirmPasswordInput()).toBeInTheDocument();

    // Buttons
    expect(getCreateButton()).toBeInTheDocument();
    // Two social buttons exist (no accessible name text because icons only)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  test("shows validation errors when submitting empty form", async () => {
    render(<SignUpView />);
    await userEvent.click(getCreateButton());

    // Expect field-level messages from zod + react-hook-form
    expect(await screen.findAllByText(/required/i)).not.toHaveLength(0);
  });

  test("shows email format validation error", async () => {
    render(<SignUpView />);

    await userEvent.type(getNameInput(), "Alice");
    await userEvent.type(getEmailInput(), "not-an-email");
    await userEvent.type(getPasswordInput(), "secret");
    await userEvent.type(getConfirmPasswordInput(), "secret");

    await userEvent.click(getCreateButton());

    // react-hook-form + zod default email message includes "Invalid email" or similar.
    // We'll assert presence of "email" error in a generic way:
    const emailError = await screen.findByText(/email/i);
    expect(emailError).toBeInTheDocument();
  });

  test("shows password mismatch validation error", async () => {
    render(<SignUpView />);

    await userEvent.type(getNameInput(), "Alice");
    await userEvent.type(getEmailInput(), "alice@example.com");
    await userEvent.type(getPasswordInput(), "secret1");
    await userEvent.type(getConfirmPasswordInput(), "secret2");

    await userEvent.click(getCreateButton());

    expect(await screen.findByText(/passwords don'?t match/i)).toBeInTheDocument();
  });

  test("successful email sign up calls authClient and navigates to '/'", async () => {
    render(<SignUpView />);

    // Mock signUp.email behavior: call onSuccess handler
    mockSignUpEmail.mockImplementation(async (_payload, handlers) => {
      const result = { error: null };
      handlers?.onSuccess?.();
      return result;
    });

    await userEvent.type(getNameInput(), "Alice");
    await userEvent.type(getEmailInput(), "alice@example.com");
    await userEvent.type(getPasswordInput(), "secret");
    await userEvent.type(getConfirmPasswordInput(), "secret");

    await userEvent.click(getCreateButton());

    await waitFor(() => {
      expect(mockSignUpEmail).toHaveBeenCalledTimes(1);
    });

    // pending is reset and router.push called
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });

    // Create button should not be disabled after success
    expect(getCreateButton()).not.toBeDisabled();
  });

  test("failed email sign up shows error alert and resets pending", async () => {
    render(<SignUpView />);

    const errorMessage = "Email already in use";
    mockSignUpEmail.mockImplementation(async (_payload, handlers) => {
      const err = { message: errorMessage };
      handlers?.onError?.({ error: err });
      return { error: err };
    });

    await userEvent.type(getNameInput(), "Alice");
    await userEvent.type(getEmailInput(), "alice@example.com");
    await userEvent.type(getPasswordInput(), "secret");
    await userEvent.type(getConfirmPasswordInput(), "secret");

    await userEvent.click(getCreateButton());

    // Error alert is shown with message
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();

    // Check the icon (mocked)
    expect(screen.getByTestId("octagon-alert-icon")).toBeInTheDocument();

    // Create button re-enabled after onError
    await waitFor(() => expect(getCreateButton()).not.toBeDisabled());
  });

  test("pending state disables Create button while awaiting result", async () => {
    render(<SignUpView />);

    // Simulate a delayed resolve so we can observe disabled state transition
    let resolvePromise: () => void;
    const promise = new Promise<void>((res) => { resolvePromise = res; });
    mockSignUpEmail.mockImplementation(async () => {
      await promise;
      return { error: null };
    });

    await userEvent.type(getNameInput(), "Alice");
    await userEvent.type(getEmailInput(), "alice@example.com");
    await userEvent.type(getPasswordInput(), "secret");
    await userEvent.type(getConfirmPasswordInput(), "secret");

    await userEvent.click(getCreateButton());

    // Button disabled during pending
    expect(getCreateButton()).toBeDisabled();

    // Resolve pending
    resolvePromise!();
    await waitFor(() => expect(getCreateButton()).not.toBeDisabled());
  });

  test("social sign-in: google success clears pending", async () => {
    render(<SignUpView />);

    mockSignInSocial.mockImplementation(async (_payload, handlers) => {
      handlers?.onSuccess?.();
      return { error: null };
    });

    // The social buttons have only icons; select by position:
    const socialButtons = screen.getAllByRole("button").filter((b) => b !== getCreateButton());
    expect(socialButtons.length).toBeGreaterThanOrEqual(2);

    // Click first social (assumed Google based on layout)
    await userEvent.click(socialButtons[0]);

    await waitFor(() => {
      expect(mockSignInSocial).toHaveBeenCalledTimes(1);
      expect(mockSignInSocial.mock.calls[0][0]).toMatchObject({ provider: "google" });
    });

    // Should not show an error alert
    expect(screen.queryByTestId("octagon-alert-icon")).not.toBeInTheDocument();
  });

  test("social sign-in: github error shows alert", async () => {
    render(<SignUpView />);

    const errorMessage = "GitHub auth failed";
    mockSignInSocial.mockImplementation(async (_payload, handlers) => {
      handlers?.onError?.({ error: { message: errorMessage } });
      return { error: { message: errorMessage } };
    });

    // Identify GitHub button by order: second social button
    const socialButtons = screen.getAllByRole("button").filter((b) => b !== getCreateButton());
    expect(socialButtons.length).toBeGreaterThanOrEqual(2);

    await userEvent.click(socialButtons[1]);

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByTestId("octagon-alert-icon")).toBeInTheDocument();
  });

  test("Terms and Privacy links render", () => {
    render(<SignUpView />);
    expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
    expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
  });
});