import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplyTemplateForm } from "@/components/settings/apply-template-form";
import { InvestmentProfileEditor } from "@/components/settings/investment-profile-editor";

const mockUseFormStatus = vi.hoisted(() => vi.fn());

vi.mock("react-dom", async (importActual) => {
  const actual = await importActual<typeof import("react-dom")>();
  return {
    ...actual,
    useFormStatus: mockUseFormStatus,
  };
});

describe("ApplyTemplateForm", () => {
  beforeEach(() => {
    mockUseFormStatus.mockReturnValue({ pending: false });
  });

  it("posts the selected template id", () => {
    const applyTemplate = vi.fn();
    const { container } = render(
      <ApplyTemplateForm
        templateId="moderate"
        isActive={false}
        applyTemplate={applyTemplate}
      />,
    );

    expect(
      container.querySelector<HTMLInputElement>('input[name="templateId"]')
        ?.value,
    ).toBe("moderate");
    expect(
      screen.getByRole("button", { name: "Usar esta plantilla" }),
    ).toBeEnabled();
  });

  it("labels the active template", () => {
    render(
      <ApplyTemplateForm
        templateId="conservative"
        isActive
        applyTemplate={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Plantilla activa" }),
    ).toBeInTheDocument();
  });

  it("shows a pending label while the form action is running", () => {
    mockUseFormStatus.mockReturnValue({ pending: true });

    render(
      <ApplyTemplateForm
        templateId="aggressive"
        isActive={false}
        applyTemplate={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Aplicando…" })).toBeDisabled();
  });
});

describe("InvestmentProfileEditor", () => {
  beforeEach(() => {
    mockUseFormStatus.mockReturnValue({ pending: false });
  });

  it("keeps the hidden form field in sync with textarea edits", () => {
    const { container } = render(
      <InvestmentProfileEditor
        initialText="Initial profile"
        canEdit
        saveProfile={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Edited profile" },
    });

    expect(
      container.querySelector<HTMLInputElement>('input[name="profileText"]')
        ?.value,
    ).toBe("Edited profile");
  });

  it("can discard local edits back to the latest initial text", () => {
    render(
      <InvestmentProfileEditor
        initialText="Initial profile"
        canEdit
        saveProfile={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Edited profile" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));

    expect(screen.getByRole("textbox")).toHaveValue("Initial profile");
  });

  it("renders read-only mode when the user cannot edit", () => {
    render(
      <InvestmentProfileEditor
        initialText="Initial profile"
        canEdit={false}
        saveProfile={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveAttribute("readonly");
    expect(screen.getByText("Solo lectura")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Guardar perfil" }),
    ).not.toBeInTheDocument();
  });

  it("shows a pending save button label while saving", () => {
    mockUseFormStatus.mockReturnValue({ pending: true });

    render(
      <InvestmentProfileEditor
        initialText="Initial profile"
        canEdit
        saveProfile={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });
});
