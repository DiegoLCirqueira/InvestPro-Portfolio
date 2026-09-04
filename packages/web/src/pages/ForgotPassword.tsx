import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthMarketingPanel } from "@/components/AuthMarketingPanel";
import { useForgotPassword } from "@/hooks/use-password-reset";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/lib/validations/auth";

export function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const { mutate, isPending } = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    try {
      // Backend responde 200 genérico sempre — não revela se o email existe.
      await mutate(data);
      setSubmitted(true);
    } catch {
      toast.error("Não foi possível enviar o link agora. Tente novamente.");
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 nav:grid-cols-2 bg-background">
      <AuthMarketingPanel alt="InvestPro — invista com clareza, cresça com confiança" />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <KeyRound size={28} className="text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">
                Esqueceu a senha?
              </h1>
              <p className="text-muted-foreground text-sm">
                Informe seu email e enviaremos um link para redefinir sua
                senha
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-1 p-8 shadow-2xl">
            {submitted ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} className="text-primary" />
                </div>
                <p className="text-sm text-foreground">
                  Se esse email estiver cadastrado na InvestPro, enviamos um
                  link de redefinição de senha para ele.
                </p>
                <p className="text-xs text-muted-foreground">
                  Verifique também a caixa de spam. O link expira em 30
                  minutos.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                noValidate
              >
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

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 bg-brand-primary text-brand-bg hover:bg-brand-primary/90 font-semibold"
                >
                  {isPending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    "Enviar link de redefinição"
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
