'use client';

import ProductionSchedulerERP from "../components/ProductionSchedulerERP";
import RouteGuard from "../components/auth/RouteGuard";

export default function Home() {
  return (
    // Protect the main app so it only renders for authenticated users.
    // This prevents the "blank Current User" state from appearing on
    // refresh or hot reload when auth is still loading or missing.
    <RouteGuard requireAuth={true}>
      <ProductionSchedulerERP />
    </RouteGuard>
  );
}