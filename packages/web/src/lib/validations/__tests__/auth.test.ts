import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
} from "@/lib/validations/auth";

const validLogin = { email: "ana@example.com", password: "senha123" };
const validRegister = {
  name: "Ana Silva",
  email: "ana@example.com",
  password: "senha123",
  confirmPassword: "senha123",
};

describe("loginSchema", () => {
  it("aceita credenciais válidas", () => {
    expect(loginSchema.safeParse(validLogin).success).toBe(true);
  });

  it("rejeita email inválido", () => {
    expect(
      loginSchema.safeParse({ ...validLogin, email: "nao-email" }).success,
    ).toBe(false);
  });

  it("rejeita email vazio", () => {
    expect(loginSchema.safeParse({ ...validLogin, email: "" }).success).toBe(
      false,
    );
  });

  it("rejeita senha vazia", () => {
    expect(loginSchema.safeParse({ ...validLogin, password: "" }).success).toBe(
      false,
    );
  });

  it("não impõe tamanho mínimo no login (a regra de 8 caracteres é do cadastro)", () => {
    expect(
      loginSchema.safeParse({ ...validLogin, password: "12345" }).success,
    ).toBe(true);
  });
});

describe("registerSchema", () => {
  it("aceita dados válidos", () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });

  it("rejeita nome só com espaços", () => {
    const result = registerSchema.safeParse({ ...validRegister, name: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Nome é obrigatório");
  });

  it("rejeita nome curto", () => {
    expect(
      registerSchema.safeParse({ ...validRegister, name: "A" }).success,
    ).toBe(false);
  });

  it("rejeita nome vazio", () => {
    expect(
      registerSchema.safeParse({ ...validRegister, name: "" }).success,
    ).toBe(false);
  });

  it("rejeita email inválido", () => {
    expect(
      registerSchema.safeParse({ ...validRegister, email: "invalido" }).success,
    ).toBe(false);
  });

  it("rejeita senha curta (menos de 8 caracteres)", () => {
    expect(
      registerSchema.safeParse({ ...validRegister, password: "12345" }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ ...validRegister, password: "1234567" })
        .success,
    ).toBe(false);
  });

  it("aceita senha com exatamente 8 caracteres", () => {
    expect(
      registerSchema.safeParse({
        ...validRegister,
        password: "12345678",
        confirmPassword: "12345678",
      }).success,
    ).toBe(true);
  });

  it("rejeita quando as senhas não coincidem", () => {
    expect(
      registerSchema.safeParse({
        ...validRegister,
        confirmPassword: "diferente",
      }).success,
    ).toBe(false);
  });

  it("rejeita confirmação de senha vazia", () => {
    expect(
      registerSchema.safeParse({ ...validRegister, confirmPassword: "" })
        .success,
    ).toBe(false);
  });
});
describe("email com espaços nas pontas (o servidor faz trim, o cliente não pode recusar)", () => {
  const padded = "  ana@example.com ";

  it.each([
    ["login", () => loginSchema.parse({ ...validLogin, email: padded })],
    [
      "cadastro",
      () => registerSchema.parse({ ...validRegister, email: padded }),
    ],
    ["esqueci a senha", () => forgotPasswordSchema.parse({ email: padded })],
  ])("%s aceita e envia o email sem os espaços", (_tela, parse) => {
    expect(parse().email).toBe("ana@example.com");
  });

  it("um email só de espaços continua sendo 'obrigatório'", () => {
    expect(loginSchema.safeParse({ ...validLogin, email: "   " }).success).toBe(
      false,
    );
  });
});
