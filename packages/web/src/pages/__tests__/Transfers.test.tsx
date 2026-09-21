import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Transfers } from "@/pages/Transfers";
import { ApiError } from "@/services/api";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function LocationProbe() {
  const { pathname, hash } = useLocation();
  return <p data-testid="location">{pathname + hash}</p>;
}

async function renderTransfers() {
  render(
    <MemoryRouter initialEntries={["/transfers"]}>
      <Routes>
        <Route path="/transfers" element={<TooltipProvider><Transfers /></TooltipProvider>} />
        <Route path="/profile" element={<p>Tela de perfil</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
  await screen.findByLabelText("Valor da transferência");
}

describe("Transferências: CPF obrigatório", () => {
  beforeEach(() => {
    apiMock.get.mockReset().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    apiMock.post.mockReset().mockRejectedValue(new ApiError(400, "CPF é obrigatório", "CPF_REQUIRED"));
    vi.mocked(toast.error).mockClear();
  });

  it("o 'Completar CPF' do aviso leva ao campo de CPF no Perfil (#cpf)", async () => {
    await renderTransfers();
    fireEvent.change(screen.getByLabelText("Valor da transferência"), { target: { value: "1000" } });

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    const [message, options] = vi.mocked(toast.error).mock.calls[0] as [string, { action: { label: string; onClick: () => void } }];
    expect(message).toMatch(/completar seu CPF/);
    expect(options.action.label).toBe("Completar CPF");

    act(() => options.action.onClick());

    expect(screen.getByTestId("location")).toHaveTextContent("/profile#cpf");
    expect(screen.getByText("Tela de perfil")).toBeInTheDocument();
  });
});
