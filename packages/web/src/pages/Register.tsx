import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/components/AuthLayout";
import { useAuthStore } from "@/stores/auth";
import { apiErrorMessage } from "@/lib/rate-limit";
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
        const message = apiErrorMessage(error);
        toast.error(message);
        setError(error.code === "EMAIL_TAKEN" ? "email" : "root", { message });
      } else {
        toast.error("Não foi possível criar a conta. Tente novamente.");
      }
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Monte sua carteira em poucos minutos"
      showDemoNotice
      footer={
        <>
          Já tem conta?{" "}
          <Link
            to="/login"
            className="text-brand-primary hover:underline font-semibold"
          >
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label
            htmlFor="name"
            className="block text-sm font-semibold text-muted-foreground"
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
            className="h-11 bg-surface-2 border-input text-foreground placeholder:text-muted-foreground"
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-muted-foreground"
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
            className="h-11 bg-surface-2 border-input text-foreground placeholder:text-muted-foreground"
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-muted-foreground"
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
              className="h-11 bg-surface-2 border-input text-foreground placeholder:text-muted-foreground pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-0 top-0 h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-semibold text-muted-foreground"
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
              className="h-11 bg-surface-2 border-input text-foreground placeholder:text-muted-foreground pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-0 top-0 h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
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
            <p className="text-xs text-destructive mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {errors.root && (
          <p className="text-xs text-destructive mt-1">
            {errors.root.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 font-semibold"
        >
          {isSubmitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
