# Slow Files - Quick Reference

## 🔴 Top 5 Slowest Files (Immediate Action Needed)

1. **src/lib/supabase/supabase-example_for_ref.ts** - 6,163 lines (EXCLUDE FROM COMPILATION)
2. **src/components/modules/production/index.tsx** - 5,165 lines
3. **src/components/modules/prod-planner/index.tsx** - 4,982 lines
4. **src/components/ExcelFileReader.tsx** - 4,605 lines
5. **src/components/ProductionSchedulerERP.tsx** - 4,470 lines

## 🔵 Barrel Export Files (Cause Cascading Recompilations)

1. **src/lib/supabase/index.ts** - Re-exports everything (HIGHEST IMPACT)
2. **src/lib/supabase/api/index.ts** - Re-exports 33 API files
3. **src/lib/supabase/types/index.ts** - Re-exports 13 type files

## 📊 All Large Files (>1000 lines)

| File | Lines | Priority |
|------|-------|----------|
| src/lib/supabase/supabase-example_for_ref.ts | 6,163 | 🔴 Exclude |
| src/components/modules/production/index.tsx | 5,165 | 🔴 Critical |
| src/components/modules/prod-planner/index.tsx | 4,982 | 🔴 Critical |
| src/components/ExcelFileReader.tsx | 4,605 | 🔴 Critical |
| src/components/ProductionSchedulerERP.tsx | 4,470 | 🔴 Critical |
| src/components/admin/EnhancedAdminDashboard.tsx | 2,749 | 🔴 Critical |
| src/components/modules/maintenance-management/LineChecklists.tsx | 1,597 | 🟡 High |
| src/components/modules/production/SiloManagement.tsx | 1,578 | 🟡 High |
| src/components/modules/stock-ledger/index.tsx | 1,406 | 🟡 High |
| src/components/modules/quality-control/index.tsx | 1,313 | 🟡 High |
| src/components/modules/profile/index.tsx | 1,200 | 🟡 High |
| src/components/modules/reports/DailyWeightReport.tsx | 1,098 | 🟡 High |
| src/components/modules/maintenance-management/index.tsx | 1,083 | 🟡 High |
| src/components/modules/reports/FirstPiecesApprovalReport.tsx | 1,064 | 🟡 High |
| src/lib/stock/helpers.ts | 1,032 | 🟡 High |

## 🟠 Files with Wildcard Imports (Slow)

- src/components/modules/production/index.tsx
- src/components/ExcelFileReader.tsx
- src/components/modules/production/SiloManagement.tsx
- src/app/api/dpr/upload-excel/route.ts

## 📝 Quick Fixes

1. **Exclude reference file**: Add to `tsconfig.json` exclude array
2. **Replace wildcard imports**: `import * as XLSX` → `import { read, utils } from 'xlsx'`
3. **Use direct imports**: Replace `from '../lib/supabase'` with `from '../lib/supabase/api/machine'`

See `SLOW_FILES_ANALYSIS.md` for detailed recommendations.

