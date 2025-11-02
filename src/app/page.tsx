'use client';

import ProductionSchedulerERP from "../components/ProductionSchedulerERP";
import RouteGuard from "../components/auth/RouteGuard";

export default function Home() {
  return (
    <RouteGuard requireAuth={false}>
      <ProductionSchedulerERP />
    </RouteGuard>
  );
}