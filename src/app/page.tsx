'use client';

import { RouteGuard } from "../components/auth/RouteGuard";
import ProductionSchedulerERP from "../components/ProductionSchedulerERP";

export default function Home() {
  return (
    <RouteGuard requireAuth={true}>
      <ProductionSchedulerERP />
    </RouteGuard>
  );
}