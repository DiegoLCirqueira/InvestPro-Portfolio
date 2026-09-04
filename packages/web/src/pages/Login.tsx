import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { LogIn, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthMarketingPanel } from "@/components/AuthMarketingPanel";
import { useAuthStore } from "@/stores/auth";
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
        toast.error(error.message);
        if (error.code === "INVALID_CREDENTIALS") {
          setError("root", { message: error.message });
        }
      } else {
        toast.error("Não foi possível entrar. Tente novamente.");
      }
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 nav:grid-cols-2 bg-background">
      <AuthMarketingPanel alt="InvestPro — invista com clareza, cresça com confiança" />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <LogIn size={28} className="text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">Entrar</h1>
              <p className="text-muted-foreground text-sm">
                Acesse sua conta InvestPro
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-1 p-8 shadow-2xl">
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
                className="w-full h-11 bg-brand-primary text-brand-bg hover:bg-brand-primary/90 font-semibold"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link
              to="/register"
              className="text-brand-primary hover:underline font-semibold"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
