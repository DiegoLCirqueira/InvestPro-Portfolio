import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { filterOptions, findTypeaheadIndex } from "@/components/ui/combobox/combobox-options";

const OPTIONS: ComboboxOption[] = [
  { value: "BTC", label: "BTC", description: "Bitcoin" },
  { value: "ETH", label: "ETH", description: "Ethereum" },
  { value: "PETR4", label: "PETR4", description: "Petrobras PN" },
];

function Harness({
  searchable = false,
  initialValue = "",
  onChange = () => {},
}: {
  searchable?: boolean;
  initialValue?: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <Combobox
      id="field"
      searchable={searchable}
      options={OPTIONS}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      placeholder="Escolha"
    />
  );
}

const getTrigger = () => screen.getByRole("combobox");
const getOptions = () => screen.queryAllByRole("option");

describe("Combobox (modo seleção)", () => {
  it("abre ao clicar, mostra todas as opções e seleciona com o mouse", () => {
    const onChange = vi.fn();
    render(<Harness initialValue="ETH" onChange={onChange} />);

    expect(getTrigger().textContent).toContain("ETH");
    fireEvent.click(getTrigger());
    expect(getTrigger().getAttribute("aria-expanded")).toBe("true");
    expect(getOptions()).toHaveLength(3);
    expect(screen.getByRole("option", { name: /ETH/ }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByRole("option", { name: /PETR4/ }));
    expect(onChange).toHaveBeenCalledWith("PETR4");
    expect(getOptions()).toHaveLength(0);
    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("navega e escolhe só pelo teclado, com aria-activedescendant", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.keyDown(getTrigger(), { key: "ArrowDown" });
    expect(getOptions()).toHaveLength(3);
    const firstId = getOptions()[0].id;
    expect(getTrigger().getAttribute("aria-activedescendant")).toBe(firstId);

    fireEvent.keyDown(getTrigger(), { key: "ArrowDown" });
    expect(getTrigger().getAttribute("aria-activedescendant")).toBe(getOptions()[1].id);

    fireEvent.keyDown(getTrigger(), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("ETH");
    expect(getOptions()).toHaveLength(0);
  });

  it("Escape fecha sem alterar o valor e Espaço escolhe a opção ativa", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(getTrigger());
    fireEvent.keyDown(document.activeElement ?? getTrigger(), { key: "Escape" });
    expect(getOptions()).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(getTrigger(), { key: "ArrowDown" });
    fireEvent.keyDown(getTrigger(), { key: "End" });
    fireEvent.keyDown(getTrigger(), { key: " " });
    expect(onChange).toHaveBeenCalledWith("PETR4");
  });

  it("digitar uma letra pula para a opção que começa com ela", () => {
    render(<Harness />);
    fireEvent.keyDown(getTrigger(), { key: "p" });
    expect(getTrigger().getAttribute("aria-activedescendant")).toBe(getOptions()[2].id);
  });
});

describe("Combobox (modo digitável)", () => {
  it("abre ao focar, filtra ao digitar e devolve o texto como valor", () => {
    const onChange = vi.fn();
    render(<Harness searchable onChange={onChange} />);

    fireEvent.focus(getTrigger());
    expect(getOptions()).toHaveLength(3);

    fireEvent.change(getTrigger(), { target: { value: "eth" } });
    expect(onChange).toHaveBeenLastCalledWith("eth");
    expect(getOptions().map((o) => o.textContent)).toEqual([expect.stringContaining("ETH")]);
  });

  it("reabrir sempre mostra todas as opções, mesmo com um valor já escolhido", () => {
    render(<Harness searchable />);

    fireEvent.focus(getTrigger());
    fireEvent.click(screen.getByRole("option", { name: /BTC/ }));
    expect((getTrigger() as HTMLInputElement).value).toBe("BTC");
    expect(getOptions()).toHaveLength(0);

    fireEvent.click(getTrigger());
    expect(getOptions()).toHaveLength(3);
  });

  it("Enter escolhe a opção ativa; sem correspondência mostra a mensagem de vazio", () => {
    const onChange = vi.fn();
    render(<Harness searchable onChange={onChange} />);

    fireEvent.change(getTrigger(), { target: { value: "pe" } });
    fireEvent.keyDown(getTrigger(), { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("PETR4");

    fireEvent.change(getTrigger(), { target: { value: "zzz" } });
    expect(getOptions()).toHaveLength(0);
    expect(screen.getByText("Nenhuma opção encontrada.")).toBeTruthy();
  });

  it("Tab fecha o menu", () => {
    render(<Harness searchable />);
    fireEvent.focus(getTrigger());
    fireEvent.keyDown(getTrigger(), { key: "Tab" });
    expect(getOptions()).toHaveLength(0);
  });
});

describe("Combobox (regressão: clique na opção filtrada)", () => {
  it("foco repetido no campo com a lista aberta (ex.: voltar para a janela) não troca a lista filtrada pela completa", () => {
    const onChange = vi.fn();
    render(<Harness searchable onChange={onChange} />);

    fireEvent.focus(getTrigger());
    fireEvent.change(getTrigger(), { target: { value: "PETR4" } });
    expect(getOptions().map((o) => o.textContent)).toEqual([expect.stringContaining("PETR4")]);

    // Janela volta a ficar ativa: o navegador reemite focus no campo.
    fireEvent.focus(getTrigger());
    expect(getOptions()).toHaveLength(1);

    fireEvent.click(screen.getByRole("option", { name: /PETR4/ }));
    expect(onChange).toHaveBeenLastCalledWith("PETR4");
  });
});

describe("combobox-options", () => {
  it("filtra por valor, rótulo e descrição ignorando caixa", () => {
    expect(filterOptions(OPTIONS, "bitc").map((o) => o.value)).toEqual(["BTC"]);
    expect(filterOptions(OPTIONS, "  ").length).toBe(3);
  });

  it("typeahead avança a partir da ativa e dá a volta", () => {
    expect(findTypeaheadIndex(OPTIONS, "e", 0)).toBe(1);
    expect(findTypeaheadIndex(OPTIONS, "b", 1)).toBe(0);
    expect(findTypeaheadIndex(OPTIONS, "x", 0)).toBe(-1);
  });
});
