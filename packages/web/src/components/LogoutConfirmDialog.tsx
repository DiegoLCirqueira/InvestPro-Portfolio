import * as React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth";

interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Pede confirmação antes de encerrar a sessão; só sai da conta ao confirmar. */
export function LogoutConfirmDialog({
  open,
  onOpenChange,
}: LogoutConfirmDialogProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleConfirm = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate("/login");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !isLoggingOut && onOpenChange(next)}
    >
      <DialogContent
        hideCloseButton
        className="flex w-[calc(100%-2rem)] max-w-sm flex-col items-center gap-3 text-center"
      >
        <LogOut size={32} className="text-destructive" aria-hidden="true" />
        <DialogTitle className="text-foreground font-semibold text-lg">
          Tem certeza que quer sair?
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Você precisará entrar novamente com seu e-mail e senha para acessar
          sua conta.
        </DialogDescription>
        <DialogFooter className="mt-2 w-full gap-2 sm:space-x-0">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="flex-1"
              disabled={isLoggingOut}
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleConfirm}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Saindo..." : "Sair"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
