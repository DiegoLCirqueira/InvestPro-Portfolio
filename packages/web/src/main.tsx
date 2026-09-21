import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// As fontes entram por aqui (e não por @import no CSS) para o Vite processar os url() do fontsource:
// no @import do Tailwind eles ficam relativos ("./files/...") e o build não gera esses arquivos.
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./index.css";
import App from "./App";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InsufficientBalanceDialog } from "@/components/InsufficientBalanceDialog";
import { ErrorBoundary } from "@/app/ErrorBoundary";

if (localStorage.getItem("investpro-theme") === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <TooltipProvider>
          <App />
          <Toaster />
          <InsufficientBalanceDialog />
        </TooltipProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
