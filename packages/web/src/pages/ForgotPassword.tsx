import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/components/AuthLayout";
import { useForgotPassword } from "@/hooks/use-password-reset";
import { isRateLimitError, rateLimitMessage } from "@/lib/rate-limit";
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
    } catch (error) {
      toast.error(
        isRateLimitError(error)
          ? rateLimitMessage(error.retryAfterSeconds)
          : "Não foi possível enviar o link agora. Tente novamente.",
      );
    }
  }

  return (
    <AuthLayout
      title="Esqueceu a senha?"
      subtitle="Informe seu email e enviaremos um link para redefinir sua senha"
      footer={
        <>
          Lembrou a senha?{" "}
          <Link
            to="/login"
            className="text-brand-primary hover:underline font-semibold"
          >
            Entrar
          </Link>
        </>
      }
    >
      {submitted ? (
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} className="text-primary" />
          </div>
          <p className="text-sm text-foreground">
            Se esse email estiver cadastrado na InvestPro, enviamos um link de
            redefinição de senha para ele.
          </p>
          <p className="text-xs text-muted-foreground">
            Verifique também a caixa de spam. O link expira em 30 minutos.
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
              className="h-11 bg-surface-2 text-foreground placeholder:text-muted-foreground"
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
            className="w-full h-11 font-semibold"
          >
            {isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              "Enviar link de redefinição"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
