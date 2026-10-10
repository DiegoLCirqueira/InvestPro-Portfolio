import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./Layout";
import { ProtectedRoute } from "./ProtectedRoute";
import { HomeRoute } from "./HomeRoute";
import { SessionLoading } from "./SessionLoading";
import { PageLoading } from "./PageLoading";
import { ErrorBoundary } from "./ErrorBoundary";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { NewsSkeleton } from "@/components/skeletons/NewsSkeleton";
import { ExchangeSkeleton } from "@/components/skeletons/ExchangeSkeleton";
import { TransfersSkeleton } from "@/components/skeletons/TransfersSkeleton";
import { MarketSkeleton } from "@/components/skeletons/MarketSkeleton";
import { RiskSkeleton } from "@/components/skeletons/RiskSkeleton";
import { OrdersSkeleton } from "@/components/skeletons/OrdersSkeleton";
import { SavingsBoxSkeleton } from "@/components/skeletons/SavingsBoxSkeleton";

const Landing = lazy(() =>
  import("@/pages/Landing").then((m) => ({ default: m.Landing })),
);
const Dashboard = lazy(() =>
  import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const MarketAnalysis = lazy(() =>
  import("@/pages/MarketAnalysis").then((m) => ({ default: m.MarketAnalysis })),
);
const News = lazy(() =>
  import("@/pages/News").then((m) => ({ default: m.News })),
);
const Recommendations = lazy(() =>
  import("@/pages/Recommendations").then((m) => ({ default: m.Recommendations })),
);
const Diversification = lazy(() =>
  import("@/pages/Diversification").then((m) => ({ default: m.Diversification })),
);
const Exchange = lazy(() =>
  import("@/pages/Exchange").then((m) => ({ default: m.Exchange })),
);
const Transfers = lazy(() =>
  import("@/pages/Transfers").then((m) => ({ default: m.Transfers })),
);
const SavingsBox = lazy(() =>
  import("@/pages/SavingsBox").then((m) => ({ default: m.SavingsBox })),
);
const Orders = lazy(() =>
  import("@/pages/Orders").then((m) => ({ default: m.Orders })),
);
const UserProfile = lazy(() =>
  import("@/pages/UserProfile").then((m) => ({ default: m.UserProfile })),
);
const InvestorProfile = lazy(() =>
  import("@/pages/InvestorProfile").then((m) => ({ default: m.InvestorProfile })),
);
const RiskMetrics = lazy(() =>
  import("@/pages/RiskMetrics").then((m) => ({ default: m.RiskMetrics })),
);
const Login = lazy(() =>
  import("@/pages/Login").then((m) => ({ default: m.Login })),
);
const Register = lazy(() =>
  import("@/pages/Register").then((m) => ({ default: m.Register })),
);
const ForgotPassword = lazy(() =>
  import("@/pages/ForgotPassword").then((m) => ({ default: m.ForgotPassword })),
);
const ResetPassword = lazy(() =>
  import("@/pages/ResetPassword").then((m) => ({ default: m.ResetPassword })),
);
const AdminUsers = lazy(() =>
  import("@/pages/AdminUsers").then((m) => ({ default: m.AdminUsers })),
);
const NotFound = lazy(() =>
  import("@/pages/NotFound").then((m) => ({ default: m.NotFound })),
);

function PageFallback({ skeleton }: { skeleton: React.ReactNode }) {
  return (
    <div className="flex-1 animate-in fade-in duration-300">
      {skeleton}
    </div>
  );
}

// Fallback do Suspense = carregamento (esqueleto da página ou PageLoading): ele aparece toda vez que
// o código da página ainda está baixando. Antes 10 rotas usavam um texto de erro aqui, e numa rede
// lenta o usuário via "Erro ao carregar esta página" sem erro nenhum. Erro de verdade: ErrorBoundary.
function withSuspense(
  Component: React.LazyExoticComponent<React.ComponentType>,
  skeleton: React.ReactNode,
) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback skeleton={skeleton} />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}

export function Router() {
  return (
    <Routes>
      <Route
        element={
          <HomeRoute visitor={withSuspense(Landing, <SessionLoading />)}>
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          </HomeRoute>
        }
      >
        <Route
          path="/"
          element={withSuspense(Dashboard, <DashboardSkeleton />)}
        />
        <Route
          path="/market"
          element={withSuspense(MarketAnalysis, <MarketSkeleton />)}
        />
        <Route
          path="/news"
          element={withSuspense(News, <NewsSkeleton />)}
        />
        <Route
          path="/recommendations"
          element={withSuspense(Recommendations, <PageLoading />)}
        />
        <Route
          path="/diversification"
          element={withSuspense(Diversification, <PageLoading />)}
        />
        <Route
          path="/risk"
          element={withSuspense(RiskMetrics, <RiskSkeleton />)}
        />
        <Route
          path="/exchange"
          element={withSuspense(Exchange, <ExchangeSkeleton />)}
        />
        <Route
          path="/transfers"
          element={withSuspense(Transfers, <TransfersSkeleton />)}
        />
        <Route
          path="/caixinha"
          element={withSuspense(SavingsBox, <SavingsBoxSkeleton />)}
        />
        <Route
          path="/orders"
          element={withSuspense(Orders, <OrdersSkeleton />)}
        />
        <Route
          path="/profile"
          element={withSuspense(UserProfile, <PageLoading />)}
        />
        <Route
          path="/profile/investor-profile"
          element={withSuspense(InvestorProfile, <PageLoading />)}
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              {withSuspense(AdminUsers, <PageLoading />)}
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="/login" element={withSuspense(Login, <PageLoading fullScreen />)} />
      <Route path="/register" element={withSuspense(Register, <PageLoading fullScreen />)} />
      <Route
        path="/forgot-password"
        element={withSuspense(ForgotPassword, <PageLoading fullScreen />)}
      />
      <Route
        path="/reset-password"
        element={withSuspense(ResetPassword, <PageLoading fullScreen />)}
      />
      <Route path="*" element={withSuspense(NotFound, <PageLoading fullScreen />)} />
    </Routes>
  );
}
