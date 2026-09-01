import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./Layout";
import { ProtectedRoute } from "./ProtectedRoute";
import { ErrorBoundary } from "./ErrorBoundary";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { NewsSkeleton } from "@/components/skeletons/NewsSkeleton";
import { ExchangeSkeleton } from "@/components/skeletons/ExchangeSkeleton";
import { TransfersSkeleton } from "@/components/skeletons/TransfersSkeleton";
import { MarketSkeleton } from "@/components/skeletons/MarketSkeleton";
import { RiskSkeleton } from "@/components/skeletons/RiskSkeleton";
import { OrdersSkeleton } from "@/components/skeletons/OrdersSkeleton";

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
const Orders = lazy(() =>
  import("@/pages/Orders").then((m) => ({ default: m.Orders })),
);
const UserProfile = lazy(() =>
  import("@/pages/UserProfile").then((m) => ({ default: m.UserProfile })),
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

function RouteErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <p className="text-brand-danger text-sm font-bold">
          Erro ao carregar esta página
        </p>
        <a
          href="/"
          className="text-xs text-brand-primary hover:underline"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
}

function PageFallback({ skeleton }: { skeleton: React.ReactNode }) {
  return (
    <div className="flex-1 animate-in fade-in duration-300">
      {skeleton}
    </div>
  );
}

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
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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
          element={withSuspense(Recommendations, <RouteErrorFallback />)}
        />
        <Route
          path="/diversification"
          element={withSuspense(Diversification, <RouteErrorFallback />)}
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
          path="/orders"
          element={withSuspense(Orders, <OrdersSkeleton />)}
        />
        <Route
          path="/profile"
          element={withSuspense(UserProfile, <RouteErrorFallback />)}
        />
      </Route>
      <Route path="/login" element={withSuspense(Login, <RouteErrorFallback />)} />
      <Route path="/register" element={withSuspense(Register, <RouteErrorFallback />)} />
    </Routes>
  );
}
