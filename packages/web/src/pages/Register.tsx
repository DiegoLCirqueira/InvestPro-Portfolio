import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth";
import { ApiError } from "@/services/api";
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth";

export function Register() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterFormData) {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        fullName: data.name,
      });
      toast.success("Conta criada com sucesso!");
      navigate("/");
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
        if (error.code === "EMAIL_TAKEN") {
          setError("email", { message: error.message });
        } else {
          setError("root", { message: error.message });
        }
      } else {
        toast.error("Não foi possível criar a conta. Tente novamente.");
      }
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <UserPlus size={28} className="text-brand-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">Criar Conta</h1>
            <p className="text-gray-400 text-sm">
              Comece a investir com a InvestPro
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-[#0b1220] p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-300"
              >
                Nome Completo
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                autoComplete="name"
                aria-invalid={!!errors.name}
                {...register("name")}
                className="h-11 bg-[#0f1318] border-gray-700 text-white placeholder:text-gray-600"
              />
              {errors.name && (
                <p className="text-xs text-brand-danger mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-300"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
                className="h-11 bg-[#0f1318] border-gray-700 text-white placeholder:text-gray-600"
              />
              {errors.email && (
                <p className="text-xs text-brand-danger mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-300"
              >
                Senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                  className="h-11 bg-[#0f1318] border-gray-700 text-white placeholder:text-gray-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-brand-danger mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-gray-300"
              >
                Confirmar Senha
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                  className="h-11 bg-[#0f1318] border-gray-700 text-white placeholder:text-gray-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={
                    showConfirmPassword ? "Ocultar senha" : "Mostrar senha"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-brand-danger mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {errors.root && (
              <p className="text-xs text-brand-danger mt-1">
                {errors.root.message}
              </p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-brand-primary text-brand-bg hover:bg-brand-primary/90 font-semibold"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                "Criar conta"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400">
          Já tem conta?{" "}
          <Link
            to="/login"
            className="text-brand-primary hover:underline font-semibold"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
