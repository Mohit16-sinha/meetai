/**
 * Tests for GeneratedAvatar component.
 *
 * Framework and library: React Testing Library with Jest/Vitest style assertions.
 * - If using Jest: expect/jest.fn and @testing-library/react.
 * - If using Vitest: expect/vi and @testing-library/react.
 * These tests avoid framework-specific globals where possible.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Under test: We assume the component is exported from src/components/generated-avatar (common convention).
// If the path differs, adjust this import to the correct location.
import { GeneratedAvatar } from "./generated-avatar";

// Mock the dicebear libraries used by the component
// createAvatar returns an object with method toDataUri()
const mockToDataUri = () => "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovLw==";
const createAvatarSpy = (globalThis as any).vi
  ? (globalThis as any).vi.fn()
  : (globalThis as any).jest
  ? (globalThis as any).jest.fn()
  : ((..._args: any[]) => {
      /* no-op fallback */
    });

jestOrViMockModule("@dicebear/core", () => ({
  createAvatar: createAvatarSpy,
}));

// Mock each style/collection export, we only need identity tokens for the createAvatar signature
jestOrViMockModule("@dicebear/collection", () => ({
  botttsNeutral: { name: "botttsNeutral" },
  initials: { name: "initials" },
}));

// Mock the Avatar UI primitives to keep markup simple and deterministic.
// These are likely simple wrappers; we replace them with minimal implementations that retain props.
jestOrViMockModule("@/components/ui/avatar", () => {
  // minimal shims to render children and carry props for assertions
  const Avatar = ({ className, children }: any) => (
    <div data-testid="avatar-root" className={className}>
      {children}
    </div>
  );
  const AvatarImage = ({ src, alt }: any) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  );
  const AvatarFallback = ({ children }: any) => (
    <div data-testid="avatar-fallback">{children}</div>
  );
  return { Avatar, AvatarImage, AvatarFallback };
});

// Utility to support both Jest and Vitest mocking
function jestOrViMockModule(id: string, factory: () => any) {
  if ((globalThis as any).vi?.mock) {
    (globalThis as any).vi.mock(id, factory);
  } else if ((globalThis as any).jest?.mock) {
    (globalThis as any).jest.mock(id, factory as any);
  }
}

const user = userEvent.setup();

describe("GeneratedAvatar", () => {
  beforeEach(() => {
    if ((globalThis as any).vi?.clearAllMocks) {
      (globalThis as any).vi.clearAllMocks();
    } else if ((globalThis as any).jest?.clearAllMocks) {
      (globalThis as any).jest.clearAllMocks();
    }
    // default fake return for createAvatar: object with toDataUri()
    if (typeof createAvatarSpy === "function" && "mockReturnValue" in createAvatarSpy) {
      (createAvatarSpy as any).mockReturnValue({ toDataUri: mockToDataUri });
    }
  });

  it("renders an image using the data URI from createAvatar.toDataUri()", () => {
    render(<GeneratedAvatar seed="alice" variant="botttsNeutral" />);

    const img = screen.getByTestId("avatar-image") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", mockToDataUri());
    expect(img).toHaveAttribute("alt", "Avatar");
  });

  it("renders fallback with the uppercased first character of the seed", () => {
    render(<GeneratedAvatar seed="alice" variant="botttsNeutral" />);

    expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("A");
  });

  it("passes className through to Avatar via cn()", () => {
    render(<GeneratedAvatar seed="bob" className="rounded-full size-6" variant="botttsNeutral" />);

    expect(screen.getByTestId("avatar-root")).toHaveClass("rounded-full");
    expect(screen.getByTestId("avatar-root")).toHaveClass("size-6");
  });

  it("uses botttsNeutral variant when specified, passing the seed to createAvatar", () => {
    render(<GeneratedAvatar seed="charlie" variant="botttsNeutral" />);

    expect(createAvatarSpy).toHaveBeenCalledTimes(1);
    const [styleArg, optionsArg] = (createAvatarSpy as any).mock.calls[0];
    expect(styleArg).toMatchObject({ name: "botttsNeutral" });
    expect(optionsArg).toMatchObject({ seed: "charlie" });
  });

  it("uses initials variant when specified, passing seed and typography options to createAvatar", () => {
    render(<GeneratedAvatar seed="dora" variant="initials" />);

    expect(createAvatarSpy).toHaveBeenCalledTimes(1);
    const [styleArg, optionsArg] = (createAvatarSpy as any).mock.calls[0];
    expect(styleArg).toMatchObject({ name: "initials" });
    expect(optionsArg).toMatchObject({
      seed: "dora",
      fontWeight: 500,
      fontSize: 42,
    });
  });

  it("handles empty seed by producing an empty fallback (no crash) and still calls createAvatar", () => {
    render(<GeneratedAvatar seed="" variant="initials" />);

    // Fallback should be safe; empty string charAt(0) => "" then toUpperCase() => ""
    expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("");
    expect(createAvatarSpy).toHaveBeenCalledTimes(1);
  });

  it("handles non-letter first character in seed gracefully (e.g., '1user' -> '1')", () => {
    render(<GeneratedAvatar seed="1user" variant="botttsNeutral" />);

    expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("1");
  });

  it("re-renders avatar image when seed changes (data URI retrieved again)", async () => {
    // Track distinct URIs for distinct seeds
    const uriMap: Record<string, string> = {};
    if ("mockImplementation" in createAvatarSpy) {
      (createAvatarSpy as any).mockImplementation((_style: any, opts: { seed: string }) => ({
        toDataUri: () => {
          if (!uriMap[opts.seed]) {
            uriMap[opts.seed] = `data:image/svg+xml;base64,${btoa(opts.seed)}`;
          }
          return uriMap[opts.seed];
        },
      }));
    }

    const { rerender } = render(<GeneratedAvatar seed="x" variant="initials" />);
    const img1 = screen.getByTestId("avatar-image") as HTMLImageElement;
    const firstSrc = img1.getAttribute("src")!;
    expect(firstSrc).toBeTruthy();

    rerender(<GeneratedAvatar seed="y" variant="initials" />);
    const img2 = screen.getByTestId("avatar-image") as HTMLImageElement;
    const secondSrc = img2.getAttribute("src")!;
    expect(secondSrc).toBeTruthy();
    expect(secondSrc).not.toEqual(firstSrc);
  });

  it("defaults to initials variant branch when variant !== 'botttsNeutral'", () => {
    // TypeScript enforces the literal union, but at runtime we assert the else branch behavior.
    render(<GeneratedAvatar seed="erin" variant={"initials"} />);

    const [styleArg, optionsArg] = (createAvatarSpy as any).mock.calls[0];
    expect(styleArg).toMatchObject({ name: "initials" });
    expect(optionsArg).toMatchObject({
      seed: "erin",
      fontWeight: 500,
      fontSize: 42,
    });
  });
});