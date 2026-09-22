import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileFooter } from "@/components/MobileFooter";
import { BottomNav } from "@/components/BottomNav";

export function Layout() {
  return (
    // dvh: no mobile, 100vh inclui a barra do navegador e cortaria o fim da tela.
    <div className="h-screen h-dvh bg-brand-bg flex text-foreground font-sans overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary-solid focus:text-primary-foreground focus:text-sm focus:font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Pular para o conteúdo
      </a>

      <Sidebar />

      {/* min-w-0 (main e wrapper): item flex tem min-width automático; sem isso uma página
          com conteúdo largo alarga o app além da tela. No mobile, o pb reserva o espaço da
          barra inferior (fixa) para nada ficar atrás dela. */}
      <main className="nav:ml-64 flex-1 min-w-0 flex justify-center px-4 md:px-6 lg:px-8 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] nav:pb-[var(--desktop-footer-height)]">
        <div className="w-full min-w-0 max-w-5xl lg:max-w-6xl py-3 md:py-8 lg:py-10 flex flex-col h-full">
          <Header />

          {/* Mobile: fluxo normal (as páginas têm a altura do conteúdo) e o rodapé
              compacto no fim da rolagem. Desktop: o rodapé (Footer) é uma faixa fixa
              fora deste container, então não entra no fluxo nem precisa de espaço aqui. */}
          <div
            id="main-content"
            tabIndex={-1}
            className="flex-1 min-h-0 block nav:flex nav:flex-col overflow-y-auto custom-scrollbar focus:outline-none"
          >
            <Outlet />
            <MobileFooter />
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
