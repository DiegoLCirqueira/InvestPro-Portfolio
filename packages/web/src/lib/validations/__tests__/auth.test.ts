import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

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
    expect(loginSchema.safeParse({ ...validLogin, email: "nao-email" }).success).toBe(false);
  });

  it("rejeita email vazio", () => {
    expect(loginSchema.safeParse({ ...validLogin, email: "" }).success).toBe(false);
  });

  it("rejeita senha vazia", () => {
    expect(loginSchema.safeParse({ ...validLogin, password: "" }).success).toBe(false);
  });

  it("rejeita senha curta (menos de 6 caracteres)", () => {
    expect(loginSchema.safeParse({ ...validLogin, password: "12345" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("aceita dados válidos", () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });

  it("rejeita nome curto", () => {
    expect(registerSchema.safeParse({ ...validRegister, name: "A" }).success).toBe(false);
  });

  it("rejeita nome vazio", () => {
    expect(registerSchema.safeParse({ ...validRegister, name: "" }).success).toBe(false);
  });

  it("rejeita email inválido", () => {
    expect(registerSchema.safeParse({ ...validRegister, email: "invalido" }).success).toBe(false);
  });

  it("rejeita senha curta", () => {
    expect(registerSchema.safeParse({ ...validRegister, password: "12345" }).success).toBe(false);
  });

  it("rejeita quando as senhas não coincidem", () => {
    expect(
      registerSchema.safeParse({ ...validRegister, confirmPassword: "diferente" }).success,
    ).toBe(false);
  });

  it("rejeita confirmação de senha vazia", () => {
    expect(
      registerSchema.safeParse({ ...validRegister, confirmPassword: "" }).success,
    ).toBe(false);
  });
});