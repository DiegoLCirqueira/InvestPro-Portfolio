import { PageLoading } from "@/app/PageLoading";

// Tela neutra enquanto a sessão é restaurada pelo cookie de refresh: nem a página inicial nem o
// app, para quem está logado não ver a landing piscar antes do Painel.
export function SessionLoading() {
  return <PageLoading fullScreen />;
}
