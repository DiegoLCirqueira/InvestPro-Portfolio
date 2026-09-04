import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";

export function Layout() {
  return (
    <div className="h-screen bg-brand-bg flex text-foreground font-sans overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand-primary focus:text-black focus:text-sm focus:font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Pular para o conteúdo
      </a>

      <Sidebar />

      <main className="nav:ml-64 flex-1 flex justify-center px-4 md:px-6 lg:px-8 pb-16 nav:pb-0">
        <div className="w-full max-w-5xl lg:max-w-6xl py-6 md:py-8 lg:py-10 flex flex-col h-full justify-between">
          <Header />

          <div
            id="main-content"
            tabIndex={-1}
            className="flex-1 min-h-0 mb-8 flex flex-col overflow-y-auto custom-scrollbar focus:outline-none"
          >
            <Outlet />
          </div>

          <Footer />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
