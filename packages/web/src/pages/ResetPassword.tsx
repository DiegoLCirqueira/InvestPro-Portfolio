import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthMarketingPanel } from "@/components/AuthMarketingPanel";
import { useResetPassword } from "@/hooks/use-password-reset";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@/lib/validations/auth";

// Mensagem única pra token invalido/expirado/ja usado — não diferencia o motivo.
const GENERIC_ERROR_MESSAGE =
  "Não foi possível redefinir sua senha. O link pode ser inválido, ter expirado ou já ter sido usado.";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const { mutate, isPending } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordFormData) {
    if (!token) {
      setStatus("error");
      return;
    }
    try {
      await mutate({ token, password: data.password });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const invalidLink = !token || status === "error";

  return (
    <div className="min-h-screen grid grid-cols-1 nav:grid-cols-2 bg-background">
      <AuthMarketingPanel alt="InvestPro — sua conta, sempre protegida" />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck size={28} className="text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">
                Redefinir senha
              </h1>
              <p className="text-muted-foreground text-sm">
                Escolha uma nova senha para sua conta InvestPro
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-1 p-8 shadow-2xl">
            {status === "success" ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck size={24} className="text-primary" />
                </div>
                <p className="text-sm text-foreground">
                  Sua senha foi redefinida com sucesso.
                </p>
                <Button
                  asChild
                  className="w-full h-11 bg-brand-primary text-brand-bg hover:bg-brand-primary/90 font-semibold"
                >
                  <Link to="/login">Ir para o login</Link>
                </Button>
              </div>
            ) : invalidLink ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                  <ShieldAlert size={24} className="text-destructive" />
                </div>
                <p className="text-sm text-foreground">
                  {GENERIC_ERROR_MESSAGE}
                </p>
                <Link
                  to="/forgot-password"
                  className="inline-block text-sm text-brand-primary hover:underline font-semibold"
                >
                  Solicitar novo link
                </Link>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                noValidate
              >
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-muted-foreground"
                  >
                    Nova senha
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
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
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
                    Confirmar nova senha
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

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 bg-brand-primary text-brand-bg hover:bg-brand-primary/90 font-semibold"
                >
                  {isPending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    "Redefinir senha"
                  )}
                </Button>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Lembrou a senha?{" "}
            <Link
              to="/login"
              className="text-brand-primary hover:underline font-semibold"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
