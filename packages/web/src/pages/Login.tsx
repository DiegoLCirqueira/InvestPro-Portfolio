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
import { apiErrorMessage, isRateLimitError } from "@/lib/rate-limit";
import { ApiError } from "@/services/api";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";

export function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    try {
      await login(data);
      toast.success("Login realizado com sucesso!");
      navigate("/");
    } catch (error) {
      if (error instanceof ApiError) {
        const message = apiErrorMessage(error);
        toast.error(message);
        if (error.code === "INVALID_CREDENTIALS" || isRateLimitError(error)) {
          setError("root", { message });
        }
      } else {
        toast.error("Não foi possível entrar. Tente novamente.");
      }
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Acompanhe seus investimentos em um só lugar"
      showDemoNotice
      footer={
        <>
          Não tem conta?{" "}
          <Link
            to="/register"
            className="text-brand-primary hover:underline font-semibold"
          >
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
              autoComplete="current-password"
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
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="min-h-11 inline-flex items-center text-xs text-brand-primary hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>
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
            "Entrar"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
