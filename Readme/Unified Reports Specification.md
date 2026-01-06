# UNIFIED REPORTS SECTION - COMPLETE SPECIFICATION

## OVERVIEW

The Reports section has THREE main features:

1. **Report Builder** - Visual tool to create any report with any chart
2. **Smart Query (AI)** - Ask questions in plain English, get data
3. **AI Insights** - Automatic pattern detection and alerts

All three work together to give users complete control over their data.

---

# PART 1: REPORTS SECTION STRUCTURE

## Navigation

Reports section has these pages:

```
/reports
├── /reports (Dashboard - landing page)
├── /reports/builder (Dynamic Report Builder)
├── /reports/smart-query (AI Natural Language Query)
├── /reports/insights (AI-Generated Insights)
├── /reports/saved (Saved Reports List)
└── /reports/templates (Pre-built Report Templates)
```

## Dashboard Landing Page (/reports)

Shows overview of all reporting features:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Reports                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Quick Stats (Today)                                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │  12,450  │ │   2.3%   │ │    45    │ │  ₹2.5L   │                       │
│  │ Prod Qty │ │ Rej Rate │ │Dispatches│ │ GRN Value│                       │
│  │   ↑ 8%   │ │  ↓ 0.5%  │ │  ↑ 12%   │ │  ↑ 15%   │                       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🔧 Tools                                                                   │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐   │
│  │   📊 Report Builder │ │   💬 Smart Query    │ │   💡 AI Insights    │   │
│  │                     │ │                     │ │                     │   │
│  │  Create custom      │ │  Ask questions in   │ │  Auto-detected      │   │
│  │  reports with any   │ │  plain English      │ │  patterns & alerts  │   │
│  │  data and charts    │ │                     │ │                     │   │
│  │                     │ │                     │ │                     │   │
│  │     [Open →]        │ │     [Open →]        │ │   [View 5 New →]    │   │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ⭐ Favorite Reports                                         [View All →]   │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │
│  │ Mold vs Line  │ │ Weekly Trend  │ │ Top Customers │ │ Stock Levels  │   │
│  │ [mini chart]  │ │ [mini chart]  │ │ [mini chart]  │ │ [mini chart]  │   │
│  │ 2 hrs ago     │ │ 1 day ago     │ │ 3 hrs ago     │ │ 5 hrs ago     │   │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🔔 Recent Insights                                          [View All →]   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ⚠️ Rejection rate on RPRo10-C spiked to 15% yesterday (avg: 3%)    │   │
│  │ 📈 Production increased 12% week-over-week                          │   │
│  │ 🔔 PP-HP-HJ333MO stock below minimum threshold                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 2: DYNAMIC REPORT BUILDER

## What It Does

A visual drag-and-drop style tool where users:
1. Select what data to measure (metrics)
2. Select how to group/split data (dimensions)
3. Apply filters (date range, specific items)
4. Choose visualization (chart type)
5. See live preview and export

## The Four Building Blocks

Every report is built from these components:

### Block 1: METRICS (What to Measure)

| Metric ID | Display Name | Category | Calculation | Unit |
|-----------|--------------|----------|-------------|------|
| prod_qty | Production Qty | Production | SUM of ok_prod_qty | pieces |
| prod_kg | Production Weight | Production | SUM of ok_prod_kgs | kg |
| rej_kg | Rejection Weight | Production | SUM of rej_kgs | kg |
| rej_rate | Rejection Rate | Production | rej_kgs / (ok_prod_kgs + rej_kgs) × 100 | % |
| efficiency | Efficiency | Production | ok_prod_qty / target_qty × 100 | % |
| target_qty | Target Qty | Production | SUM of target_qty | pieces |
| actual_qty | Actual Qty | Production | SUM of actual_qty | pieces |
| run_time | Run Time | Production | SUM of run_time | minutes |
| down_time | Down Time | Production | SUM of down_time | minutes |
| uptime_pct | Uptime % | Production | run_time / (run_time + down_time) × 100 | % |
| lumps_kg | Lumps | Production | SUM of lumps_kgs | kg |
| dispatch_qty | Dispatch Qty | Dispatch | SUM of no_of_pcs | boxes |
| dispatch_count | Dispatch Count | Dispatch | COUNT of dispatches | count |
| grn_qty | GRN Qty | Procurement | SUM of grn_qty | kg |
| grn_value | GRN Value | Procurement | SUM of total_price | ₹ |
| issue_qty | Issue Qty | Material Issue | SUM of issue_qty | kg |
| stock_balance | Stock Balance | Stock | Current balance | varies |
| stock_in | Stock In | Stock | SUM of IN movements | varies |
| stock_out | Stock Out | Stock | SUM of OUT movements | varies |
| fg_transfer_qty | FG Transfer Qty | FG Packing | SUM of total_qty | pieces |
| record_count | Record Count | Any | COUNT of records | count |

### Block 2: DIMENSIONS (How to Group/Split)

| Dimension ID | Display Name | Available For |
|--------------|--------------|---------------|
| date_day | Date (Daily) | All |
| date_week | Date (Weekly) | All |
| date_month | Date (Monthly) | All |
| date_quarter | Date (Quarterly) | All |
| date_year | Date (Yearly) | All |
| mold | Mold | Production, FG Packing |
| machine | Machine | Production |
| line | Production Line | Production |
| shift | Shift (DAY/NIGHT) | Production |
| product_type | Product Type | Production |
| sfg_code | SFG Code | Production, FG Packing |
| fg_code | FG Code | Dispatch, FG Packing |
| customer | Customer | Dispatch |
| supplier | Supplier | Procurement |
| rm_type | RM Type | Procurement, Material Issue, Stock |
| rm_grade | RM Grade | Procurement, Material Issue, Stock |
| pm_category | PM Category | Procurement, Stock |
| location | Stock Location | Stock |
| item_type | Item Type | Stock |
| document_type | Document Type | Stock |
| is_changeover | Changeover (Yes/No) | Production |

### Block 3: FILTERS (What to Include/Exclude)

**Always Available:**
- Date Range
  - Today
  - Yesterday
  - Last 7 days
  - Last 30 days
  - This week
  - Last week
  - This month
  - Last month
  - This quarter
  - This year
  - Last year
  - Custom range (date picker)

**Category-Specific Filters:**

Production Filters:
- Mold (multi-select dropdown with search)
- Machine (multi-select dropdown)
- Production Line (multi-select dropdown)
- Shift (checkboxes: DAY, NIGHT)
- Include Changeover (Yes, No, Both)

Dispatch Filters:
- Customer (multi-select dropdown with search)
- FG Code (multi-select dropdown with search)

Procurement Filters:
- Supplier (multi-select dropdown with search)
- RM Type (multi-select dropdown)
- RM Grade (multi-select dropdown)

Stock Filters:
- Location (checkboxes: STORE, PRODUCTION, FG_STORE)
- Item Type (checkboxes: RM, PM, SFG, FG)
- Specific Item (multi-select dropdown with search)

### Block 4: VISUALIZATION (How to Display)

| Chart Type | Icon | When to Use |
|------------|------|-------------|
| Bar (Vertical) | 📊 | Comparing categories |
| Bar (Horizontal) | 📊 | Long category names, many items |
| Grouped Bar | 📊 | Comparing two dimensions |
| Stacked Bar | 📊 | Part-to-whole across categories |
| Line | 📈 | Trends over time |
| Multi-Line | 📈 | Comparing multiple trends |
| Area | 📈 | Volume over time |
| Stacked Area | 📈 | Composition over time |
| Pie | 🥧 | Simple proportions (less than 7 items) |
| Donut | 🍩 | Proportions with center statistic |
| Scatter | ⚬ | Correlation between two metrics |
| Heatmap | 🟦 | Two dimensions with color intensity |
| Data Table | 📋 | Detailed numbers, many columns |
| KPI Cards | 🔢 | Single big numbers, totals |
| Combo (Bar + Line) | 📊📈 | Two metrics with different scales |

**Chart Options:**
- Show values on chart (yes/no)
- Show legend (yes/no)
- Stacked (for bar/area)
- Horizontal (for bar)
- Sort by value (ascending/descending)
- Top N only (show only top 5, 10, 20)
- Show grid lines (yes/no)
- Smooth lines (for line chart)
- Show trend line (for scatter)
- Color palette selection

---

## Report Builder User Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Report Builder                              [Save] [Export ▼] [Share]      │
├────────────────────────────────────┬────────────────────────────────────────┤
│                                    │                                        │
│  ┌─ CONFIGURATION ───────────────┐ │  ┌─ PREVIEW ────────────────────────┐ │
│  │                               │ │  │                                  │ │
│  │  📁 DATA SOURCE               │ │  │                                  │ │
│  │  ┌───────────────────────┐   │ │  │                                  │ │
│  │  │ [Production ▼]        │   │ │  │                                  │ │
│  │  └───────────────────────┘   │ │  │                                  │ │
│  │                               │ │  │                                  │ │
│  │  📊 METRICS                   │ │  │                                  │ │
│  │  ┌───────────────────────┐   │ │  │        CHART RENDERS HERE        │ │
│  │  │ [+ Add Metric]        │   │ │  │                                  │ │
│  │  │ • Production Qty   [×]│   │ │  │                                  │ │
│  │  │ • Rejection Rate   [×]│   │ │  │                                  │ │
│  │  └───────────────────────┘   │ │  │                                  │ │
│  │                               │ │  │                                  │ │
│  │  📋 DIMENSIONS                │ │  │                                  │ │
│  │  ┌───────────────────────┐   │ │  │                                  │ │
│  │  │ X-Axis: [Mold ▼]      │   │ │  │                                  │ │
│  │  │ Group:  [Line ▼]      │   │ │  │                                  │ │
│  │  └───────────────────────┘   │ │  │                                  │ │
│  │                               │ │  │                                  │ │
│  │  🔍 FILTERS                   │ │  └──────────────────────────────────┘ │
│  │  ┌───────────────────────┐   │ │                                        │
│  │  │ Date: [Last 30 days▼] │   │ │  ┌─ DATA TABLE ──────────────────────┐ │
│  │  │ Mold: [All ▼]         │   │ │  │                                  │ │
│  │  │ Shift: ☑DAY ☑NIGHT   │   │ │  │  Mold    │ Line09 │ Line12 │ ... │ │
│  │  │ [+ Add Filter]        │   │ │  │  ────────┼────────┼────────┼─────│ │
│  │  └───────────────────────┘   │ │  │  RPRo10  │  1,500 │  1,200 │     │ │
│  │                               │ │  │  RPRo12  │  2,300 │  2,100 │     │ │
│  │  📉 CHART TYPE                │ │  │  RPRo16  │  1,800 │  1,900 │     │ │
│  │  ┌───────────────────────┐   │ │  │                                  │ │
│  │  │ [Bar][Line][Pie]...   │   │ │  └──────────────────────────────────┘ │
│  │  │                       │   │ │                                        │
│  │  │ ☑ Show values         │   │ │                                        │
│  │  │ ☑ Show legend         │   │ │                                        │
│  │  │ ☐ Stacked             │   │ │                                        │
│  │  └───────────────────────┘   │ │                                        │
│  │                               │ │                                        │
│  │  [Generate Report]            │ │                                        │
│  │                               │ │                                        │
│  └───────────────────────────────┘ │                                        │
│                                    │                                        │
└────────────────────────────────────┴────────────────────────────────────────┘
```

---

## How Query Generation Works

When user clicks "Generate Report", the system:

1. **Identifies Tables**: Based on selected category and metrics
2. **Builds SELECT**: Add dimension columns and metric aggregations
3. **Builds FROM/JOIN**: Connect necessary tables
4. **Builds WHERE**: Apply all filters
5. **Builds GROUP BY**: Group by dimension columns
6. **Builds ORDER BY**: Sort appropriately
7. **Executes Query**: Run on database
8. **Transforms Data**: Convert to chart-friendly format
9. **Renders Chart**: Display visualization

### Query Building Examples

**Example 1: Production Qty by Mold grouped by Line**

User selects:
- Category: Production
- Metric: Production Qty
- Dimension 1: Mold
- Dimension 2: Production Line
- Filter: Last 30 days

System builds:
```
Tables: dpr_production_entries, dpr_data, machines
SELECT: product AS mold, line_id AS line, SUM(ok_prod_qty) AS prod_qty
FROM: dpr_production_entries JOIN dpr_data JOIN machines
WHERE: date >= (today - 30 days) AND stock_status = 'POSTED'
GROUP BY: product, line_id
ORDER BY: prod_qty DESC
```

**Example 2: Rejection Rate Trend by Week**

User selects:
- Category: Production
- Metric: Rejection Rate
- Dimension: Date (Weekly)
- Filter: Last 3 months

System builds:
```
Tables: dpr_production_entries, dpr_data
SELECT: DATE_TRUNC('week', date) AS week, 
        SUM(rej_kgs) * 100.0 / NULLIF(SUM(ok_prod_kgs + rej_kgs), 0) AS rej_rate
FROM: dpr_production_entries JOIN dpr_data
WHERE: date >= (today - 90 days) AND stock_status = 'POSTED'
GROUP BY: DATE_TRUNC('week', date)
ORDER BY: week ASC
```

**Example 3: Dispatch by Customer (Pie Chart)**

User selects:
- Category: Dispatch
- Metric: Dispatch Qty
- Dimension: Customer
- Filter: This month, Top 10

System builds:
```
Tables: dispatch_memo_items, dispatch_memos
SELECT: party_name AS customer, SUM(no_of_pcs) AS dispatch_qty
FROM: dispatch_memo_items JOIN dispatch_memos
WHERE: dc_date >= (first of month) AND stock_status = 'POSTED'
GROUP BY: party_name
ORDER BY: dispatch_qty DESC
LIMIT: 10
```

---

## Data Transformation for Charts

Query results come as rows. Transform to chart format:

**For Bar/Line Charts:**
```
Input rows:
[
  { mold: "RPRo10", line: "Line09", qty: 1500 },
  { mold: "RPRo10", line: "Line12", qty: 1200 },
  { mold: "RPRo12", line: "Line09", qty: 2300 },
  { mold: "RPRo12", line: "Line12", qty: 2100 }
]

Output format:
{
  labels: ["RPRo10", "RPRo12"],
  datasets: [
    { label: "Line09", data: [1500, 2300] },
    { label: "Line12", data: [1200, 2100] }
  ]
}
```

**For Pie Charts:**
```
Input rows:
[
  { customer: "ABC Corp", qty: 450 },
  { customer: "XYZ Ltd", qty: 300 },
  { customer: "Others", qty: 250 }
]

Output format:
{
  labels: ["ABC Corp", "XYZ Ltd", "Others"],
  data: [450, 300, 250]
}
```

**For Scatter Plots:**
```
Input rows:
[
  { mold: "RPRo10", prod_qty: 1500, rej_rate: 2.5 },
  { mold: "RPRo12", prod_qty: 2300, rej_rate: 1.8 }
]

Output format:
{
  datasets: [{
    label: "Molds",
    data: [
      { x: 1500, y: 2.5, label: "RPRo10" },
      { x: 2300, y: 1.8, label: "RPRo12" }
    ]
  }]
}
```

---

## Smart Chart Suggestions

Based on what user selects, suggest the best chart:

| User Selection | Suggested Chart |
|----------------|-----------------|
| 1 metric, 1 categorical dimension | Bar Chart |
| 1 metric, 1 time dimension | Line Chart |
| 1 metric, small number of categories (<7) | Pie Chart |
| 1 metric, 2 categorical dimensions | Grouped Bar |
| 1 metric, 1 categorical + 1 time dimension | Multi-Line |
| 2 metrics, 1 dimension | Combo Chart |
| 2 metrics, no dimension | Scatter Plot |
| Many metrics | Data Table |
| Single value (no dimension) | KPI Card |
| 2 categorical dimensions + 1 metric | Heatmap |

Show suggestion as: "💡 Suggested: Bar Chart" with option to accept or choose different.

---

# PART 3: AI SMART QUERY

## What It Does

User asks a question in plain English, AI generates the SQL query, system runs it and shows results.

Examples:
- "What was total production last week?"
- "Which mold has highest rejection rate?"
- "Show me dispatch to ABC Corp this month"
- "Compare production between DAY and NIGHT shift"

---

## Smart Query User Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Smart Query                                                   [Settings]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Ask anything about your data...                                            │
│  ┌─────────────────────────────────────────────────────────────┐ [Ask]     │
│  │ Which mold performed best on Line 09 last month?            │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  Try: "Total production last week" | "Top 5 customers" |                   │
│       "Rejection rate by mold" | "Low stock items"                         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Results                                              [Export] [Save Query] │
│                                                                             │
│  ┌─ Generated Query (click to expand) ─────────────────────────────────┐   │
│  │ SELECT product, SUM(ok_prod_qty)...                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Mold          │  Production Qty  │  Rejection Rate  │              │   │
│  │  ──────────────┼─────────────────┼─────────────────┼──────────────│   │
│  │  RPRo16-C      │  45,230         │  1.8%            │  Best ⭐     │   │
│  │  RPRo10-C      │  38,450         │  2.2%            │              │   │
│  │  RPRo12-C      │  35,120         │  2.5%            │              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  💡 Insight: RPRo16-C has both highest production and lowest rejection     │
│              rate on Line 09. Consider allocating more capacity to it.     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Saved Queries                                                              │
│  ┌────────────────────────┬─────────────────────┬──────────┬─────────┐     │
│  │ Name                   │ Question            │ Last Run │ Actions │     │
│  ├────────────────────────┼─────────────────────┼──────────┼─────────┤     │
│  │ Weekly Production      │ Total prod by week  │ 2 hrs    │ Run Del │     │
│  │ Customer Analysis      │ Top customers by... │ 1 day    │ Run Del │     │
│  └────────────────────────┴─────────────────────┴──────────┴─────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## AI Provider Configuration

Use either OpenRouter or Hugging Face for AI:

**Option A: OpenRouter (Recommended)**
- API: https://openrouter.ai/api/v1/chat/completions
- Models: claude-3-haiku, llama-3-70b, mistral-7b
- Cost: Pay per token

**Option B: Hugging Face**
- API: https://api-inference.huggingface.co/models/{model}
- Models: Mistral-7B-Instruct, Llama-3-8B-Instruct
- Cost: Free tier available

**Environment Variables:**
```
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=anthropic/claude-3-haiku
```

---

## Database Schema for AI

The AI needs to understand your database. Create a schema description:

```
DATABASE SCHEMA FOR DEORA POLYPLAST ERP

=== PRODUCTION ===

dpr_data: Daily Production Report headers
- id, date, shift (DAY/NIGHT), shift_incharge, stock_status

dpr_production_entries: Production line items
- dpr_id (links to dpr_data), machine_no, product (mold name), cavity
- ok_prod_qty (good pieces), ok_prod_kgs (good weight kg)
- rej_kgs (rejected kg), lumps_kgs, target_qty, actual_qty
- run_time (minutes), down_time (minutes), is_changeover

sfg_bom: SFG Bill of Materials
- item_name (mold name), sfg_code, part_wt
- hp_percent, icp_percent, rcp_percent, mb_percent

=== DISPATCH ===

dispatch_memos: Dispatch headers
- id, dc_no, dc_date, party_name (customer), stock_status

dispatch_memo_items: Dispatch line items
- dispatch_memo_id, item_code, no_of_pcs (boxes)

=== PROCUREMENT ===

store_grn: Goods Receipt Notes
- id, grn_no, grn_date, party_name (supplier), stock_status

store_grn_items: GRN line items
- grn_id, description, grn_qty, rate, total_price

=== STOCK ===

stock_items: All trackable items
- item_code, item_name, item_type (RM/PM/SFG/FG), category, unit_of_measure

stock_balances: Current stock levels
- item_code, location_code (STORE/PRODUCTION/FG_STORE), current_balance

stock_ledger: Stock movement history
- item_code, location_code, quantity, transaction_date, document_type, movement_type (IN/OUT)

=== MATERIAL ISSUE ===

store_mis: Material Issue Slips
- id, issue_no, date, department, stock_status

store_mis_items: MIS line items
- mis_id, item_code, req_qty, issue_qty
```

---

## AI Prompt for Query Generation

Send this to the AI:

```
You are a SQL query generator for a manufacturing ERP database.

DATABASE SCHEMA:
{schema description from above}

USER QUESTION:
{user's question}

RULES:
1. Generate ONLY a SELECT query
2. NEVER use UPDATE, DELETE, INSERT, DROP, ALTER, CREATE
3. Use exact table and column names from schema
4. Use appropriate JOINs
5. Apply date filters when time periods are mentioned
6. Return ONLY the SQL, no explanations
7. If question cannot be answered, respond: CANNOT_ANSWER: {reason}

SQL:
```

---

## SQL Validation Rules

Before running ANY AI-generated query:

1. Must start with SELECT (case-insensitive)
2. Must NOT contain: UPDATE, DELETE, INSERT, DROP, TRUNCATE, ALTER, CREATE, GRANT
3. Must NOT have multiple statements (no semicolon followed by another command)
4. Must NOT have comments (-- or /* */)
5. Add LIMIT 1000 if no LIMIT exists
6. Set query timeout to 30 seconds maximum

If validation fails, show error and do NOT run the query.

---

## AI Response Enhancement

After getting results, optionally send back to AI for insight:

```
You analyzed this question: "{original question}"

The query returned this data:
{first 10 rows of results}

Provide a brief insight (2-3 sentences) about what this data shows.
Focus on: patterns, anomalies, recommendations, or notable findings.
```

---

# PART 4: AI INSIGHTS DASHBOARD

## What It Does

Automatically analyzes data and shows interesting findings:
- Trends (things going up or down)
- Anomalies (unusual values)
- Alerts (potential problems)
- Comparisons (this vs that)
- Opportunities (things going well)

---

## AI Insights User Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI Insights                                          [Refresh] [Settings]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Filter: [All] [Production] [Stock] [Dispatch] [Alerts Only]               │
│  Last updated: 2 hours ago                                                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │ ⚠️  WARNING                 │  │ 📈  TREND                    │          │
│  │                             │  │                             │          │
│  │ High Rejection Rate         │  │ Production Increasing       │          │
│  │                             │  │                             │          │
│  │ Mold RPRo10-C had 15%      │  │ Overall production up 12%   │          │
│  │ rejection yesterday,        │  │ week-over-week. DAY shift   │          │
│  │ compared to 3% average.     │  │ contributing most growth.   │          │
│  │                             │  │                             │          │
│  │ Machine: IMM-3              │  │ Metric: +8,450 pieces       │          │
│  │ Time: Yesterday NIGHT       │  │ Period: Last 7 days         │          │
│  │                             │  │                             │          │
│  │ [View Details] [Dismiss]    │  │ [View Details] [Dismiss]    │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │ 🔔  ALERT                   │  │ 💡  OPPORTUNITY             │          │
│  │                             │  │                             │          │
│  │ Low Stock Warning           │  │ Best Performer              │          │
│  │                             │  │                             │          │
│  │ PP-HP-HJ333MO is at 250kg, │  │ Mold RPRo16-C has lowest    │          │
│  │ below minimum threshold     │  │ rejection rate at 1.2%     │          │
│  │ of 500kg. May run out in   │  │ while maintaining high      │          │
│  │ 3 days at current usage.    │  │ output. Consider expanding. │          │
│  │                             │  │                             │          │
│  │ [View Stock] [Dismiss]      │  │ [View Report] [Dismiss]     │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │ 📊  COMPARISON              │  │ ⚠️  WARNING                 │          │
│  │                             │  │                             │          │
│  │ Shift Performance Gap       │  │ Customer Drop               │          │
│  │                             │  │                             │          │
│  │ DAY shift produced 18%     │  │ No dispatch to "XYZ Corp"   │          │
│  │ more than NIGHT shift this │  │ in 21 days. Last dispatch   │          │
│  │ week. Investigate NIGHT    │  │ was on Dec 13. Previous     │          │
│  │ shift efficiency.           │  │ average: weekly dispatch.   │          │
│  │                             │  │                             │          │
│  │ [View Report] [Dismiss]     │  │ [View Customer] [Dismiss]   │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Types of Insights to Generate

### Type 1: Trends

What to look for:
- Production increasing or decreasing over weeks
- Rejection rate trends
- Dispatch volume trends
- Stock level trends

Queries to run:
- Production by week for last 8 weeks, calculate week-over-week change
- Rejection rate by week, identify upward/downward trends
- Dispatch by week, identify growth/decline

Trigger: Change greater than 10% week-over-week

### Type 2: Anomalies

What to look for:
- Values significantly different from average
- Spikes or drops in metrics
- Unusual patterns

Queries to run:
- Daily rejection rate, compare to 30-day average
- Daily machine downtime, compare to average
- Individual mold performance vs its own average

Trigger: Value more than 2 standard deviations from mean

### Type 3: Alerts

What to look for:
- Stock below minimum threshold
- No activity for unusual period
- Missing expected data

Queries to run:
- Stock balances below defined minimums
- Customers with no dispatch in X days
- Molds with no production in X days
- Suppliers with no GRN in X days

Trigger: Threshold crossed or inactivity period exceeded

### Type 4: Comparisons

What to look for:
- This period vs last period
- This entity vs others
- Actual vs target

Queries to run:
- This week vs last week production
- DAY shift vs NIGHT shift
- Top mold vs bottom mold
- Actual production vs target

Trigger: Significant difference (>15%)

### Type 5: Opportunities

What to look for:
- Best performers
- Improving trends
- Efficiency gains

Queries to run:
- Mold with lowest rejection rate
- Machine with highest uptime
- Customer with growing orders

Trigger: Performance in top 10% or improving trend

---

## Insight Generation Process

### Step 1: Collect Summary Data

Run these predefined queries daily:

**Production Summary:**
```
- Production qty, rej_kg, efficiency by mold by week (last 8 weeks)
- Production by shift by week
- Production by machine by day (last 7 days)
- Downtime by machine by day
```

**Stock Summary:**
```
- Current balances by item type
- Items below minimum threshold (define thresholds)
- Items with no movement in 30 days
```

**Dispatch Summary:**
```
- Dispatch qty by customer by week (last 8 weeks)
- Days since last dispatch per customer
- Dispatch by product by week
```

### Step 2: Send to AI for Analysis

Prompt:
```
You are a manufacturing analyst. Analyze this data and identify important insights.

PRODUCTION DATA (last 8 weeks):
{production summary}

STOCK DATA:
{stock summary}

DISPATCH DATA:
{dispatch summary}

Find:
1. Significant trends (>10% change)
2. Anomalies (unusual values)
3. Potential alerts (problems)
4. Notable comparisons
5. Opportunities (good performance)

Return as JSON:
{
  "insights": [
    {
      "type": "trend|anomaly|alert|comparison|opportunity",
      "category": "production|stock|dispatch",
      "severity": "info|warning|critical",
      "title": "Short title (5 words max)",
      "summary": "One sentence summary",
      "details": "Detailed explanation with numbers",
      "metric_name": "What was measured",
      "current_value": "Current value with unit",
      "comparison_value": "What it's compared to",
      "change_percent": "Percentage change if applicable"
    }
  ]
}
```

### Step 3: Store and Display

Save insights to database and display on dashboard.

---

## Insight Generation Schedule

- **Daily** at 6:00 AM: Analyze yesterday's data
- **Weekly** on Monday at 7:00 AM: Weekly summary analysis
- **On-Demand**: When user clicks "Refresh"

Insight validity:
- Daily insights: Valid for 24 hours
- Weekly insights: Valid for 7 days
- Alerts: Valid until condition is resolved or dismissed

---

# PART 5: SAVED REPORTS & TEMPLATES

## Saved Reports

Users can save any report they create for reuse.

Save includes:
- Report name
- Description
- Full configuration (metrics, dimensions, filters, chart type)
- Who created it
- When created
- View count

Features:
- Mark as favorite (appears on dashboard)
- Share with others (public/private toggle)
- Duplicate (create copy to modify)
- Schedule (send automatically)

---

## Pre-Built Templates

Provide starter templates users can use immediately:

**Production Templates:**
1. Daily Production Summary - Qty by date, line chart
2. Mold Performance Comparison - Efficiency by mold, bar chart
3. Shift Analysis - Production by shift, grouped bar
4. Rejection Analysis - Rejection rate by mold, bar chart
5. Machine Utilization - Uptime % by machine, horizontal bar
6. Mold vs Line Matrix - Production by mold by line, heatmap
7. Weekly Production Trend - Qty by week, line chart
8. Changeover Impact - Production with/without changeover

**Dispatch Templates:**
1. Customer Distribution - Dispatch by customer, pie chart
2. Dispatch Trend - Weekly dispatch, line chart
3. Top 10 Customers - By volume, bar chart
4. Customer Growth - Week over week change, bar chart

**Stock Templates:**
1. Current Stock Levels - By item type, bar chart
2. Stock Movement - In vs Out by week, line chart
3. Low Stock Alert - Items below threshold, table
4. Inventory Aging - Items with no movement, table

**Procurement Templates:**
1. Supplier Analysis - GRN value by supplier, pie chart
2. Material Receipt Trend - GRN qty by week, line chart
3. Price Tracking - Average rate by material, line chart

---

# PART 6: EXPORT OPTIONS

## Export Formats

**Excel (.xlsx)**
- Data in spreadsheet format
- Formatted headers
- Auto-column width
- Include report title and filters applied
- Chart as separate sheet (if possible)

**PDF**
- Report title and description
- Chart image
- Data table below
- Filters applied
- Generated date and time

**CSV**
- Raw data only
- For import into other tools

**Image (PNG)**
- Chart only
- High resolution
- Transparent or white background option

---

## Sharing Options

**Share Link**
- Generate unique URL
- Anyone with link can view (if public)
- Track view count

**Email**
- Send PDF or Excel as attachment
- Include preview in email body
- Add custom message

**Schedule**
- Send automatically (daily/weekly/monthly)
- To multiple recipients
- Choose format (PDF/Excel)
- Set day and time

---

# PART 7: DATABASE TABLES

## saved_reports

Purpose: Store report configurations

Fields:
- id: UUID, primary key
- name: Text, not null
- description: Text
- category: Text (production, dispatch, stock, procurement)
- config_json: Text or JSONB (full configuration)
- created_by: Text
- created_at: Timestamp
- updated_at: Timestamp
- is_public: Boolean, default false
- is_template: Boolean, default false
- view_count: Integer, default 0
- last_viewed_at: Timestamp

---

## saved_queries (for AI Smart Query)

Purpose: Store AI-generated queries

Fields:
- id: Serial, primary key
- name: Text
- natural_question: Text (original question)
- sql_query: Text (generated SQL)
- created_by: Text
- created_at: Timestamp
- last_run_at: Timestamp
- run_count: Integer, default 0
- is_public: Boolean, default false

---

## ai_insights

Purpose: Store generated insights

Fields:
- id: Serial, primary key
- insight_type: Text (trend, anomaly, alert, comparison, opportunity)
- category: Text (production, stock, dispatch)
- severity: Text (info, warning, critical)
- title: Text
- summary: Text
- details: Text
- metric_name: Text
- current_value: Text
- comparison_value: Text
- change_percent: Decimal
- generated_at: Timestamp
- valid_until: Timestamp
- is_dismissed: Boolean, default false
- dismissed_by: Text
- dismissed_at: Timestamp

---

## report_favorites

Purpose: Track user favorites

Fields:
- id: Serial, primary key
- report_id: UUID, foreign key to saved_reports
- user_id: Text
- created_at: Timestamp

Unique constraint: report_id + user_id

---

## report_schedules

Purpose: Scheduled report delivery

Fields:
- id: Serial, primary key
- report_id: UUID, foreign key to saved_reports
- frequency: Text (daily, weekly, monthly)
- day_of_week: Integer (0-6 for weekly)
- day_of_month: Integer (1-31 for monthly)
- time_of_day: Time
- recipients: Text (comma-separated emails)
- format: Text (pdf, excel)
- is_active: Boolean, default true
- last_sent_at: Timestamp
- next_send_at: Timestamp
- created_by: Text
- created_at: Timestamp

---

# PART 8: API ENDPOINTS

## Report Builder APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/reports/generate | POST | Generate report from config |
| /api/reports/metrics/{category} | GET | Get available metrics |
| /api/reports/dimensions/{category} | GET | Get available dimensions |
| /api/reports/filters/{category} | GET | Get filter options |
| /api/reports/save | POST | Save report |
| /api/reports/saved | GET | List saved reports |
| /api/reports/saved/{id} | GET | Get saved report |
| /api/reports/saved/{id} | PUT | Update saved report |
| /api/reports/saved/{id} | DELETE | Delete saved report |
| /api/reports/templates | GET | List templates |
| /api/reports/favorites | GET | List favorites |
| /api/reports/favorites/{id} | POST | Add favorite |
| /api/reports/favorites/{id} | DELETE | Remove favorite |

## Smart Query APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/ai/generate-query | POST | Convert question to SQL |
| /api/ai/run-query | POST | Execute validated SQL |
| /api/ai/save-query | POST | Save query |
| /api/ai/saved-queries | GET | List saved queries |
| /api/ai/saved-queries/{id} | DELETE | Delete saved query |

## Insights APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/ai/insights | GET | Get current insights |
| /api/ai/insights/generate | POST | Regenerate insights |
| /api/ai/insights/{id}/dismiss | POST | Dismiss insight |

## Export APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/reports/export/excel | POST | Export to Excel |
| /api/reports/export/pdf | POST | Export to PDF |
| /api/reports/export/csv | POST | Export to CSV |
| /api/reports/export/image | POST | Export chart as image |

---

# PART 9: FILE STRUCTURE

```
/src/lib/reports/
  ├── metrics.js (metric definitions)
  ├── dimensions.js (dimension definitions)
  ├── query-builder.js (build SQL from config)
  ├── data-transformer.js (transform for charts)
  ├── chart-config.js (chart configurations)
  ├── export-excel.js
  ├── export-pdf.js
  ├── export-csv.js
  └── templates.js (pre-built templates)

/src/lib/ai/
  ├── config.js (AI provider config)
  ├── client.js (API client for OpenRouter/HuggingFace)
  ├── query-generator.js (question to SQL)
  ├── query-validator.js (SQL safety check)
  ├── insight-generator.js (generate insights)
  └── schema-context.js (database schema for AI)

/src/app/reports/
  ├── page.js (dashboard)
  ├── builder/page.js (report builder)
  ├── smart-query/page.js (AI query)
  ├── insights/page.js (AI insights)
  ├── saved/page.js (saved reports list)
  ├── saved/[id]/page.js (view saved report)
  └── templates/page.js (templates)

/src/app/api/reports/
  ├── generate/route.js
  ├── save/route.js
  ├── saved/route.js
  ├── saved/[id]/route.js
  ├── templates/route.js
  ├── metrics/[category]/route.js
  ├── dimensions/[category]/route.js
  ├── filters/[category]/route.js
  ├── favorites/route.js
  ├── favorites/[id]/route.js
  └── export/
      ├── excel/route.js
      ├── pdf/route.js
      ├── csv/route.js
      └── image/route.js

/src/app/api/ai/
  ├── generate-query/route.js
  ├── run-query/route.js
  ├── save-query/route.js
  ├── saved-queries/route.js
  ├── saved-queries/[id]/route.js
  ├── insights/route.js
  ├── insights/generate/route.js
  └── insights/[id]/dismiss/route.js

/src/components/reports/
  ├── ReportBuilder.js
  ├── MetricSelector.js
  ├── DimensionSelector.js
  ├── FilterPanel.js
  ├── DateRangePicker.js
  ├── ChartTypeSelector.js
  ├── ChartPreview.js
  ├── DataTable.js
  ├── KpiCard.js
  ├── SaveReportDialog.js
  ├── ReportCard.js
  ├── QueryInput.js
  ├── QueryResults.js
  ├── InsightCard.js
  └── InsightsDashboard.js
```

---

# PART 10: CONFIGURATION

## Environment Variables

```
# AI Provider
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key
OPENROUTER_MODEL=anthropic/claude-3-haiku

# Or for HuggingFace
# AI_PROVIDER=huggingface
# HUGGINGFACE_API_KEY=your-key
# HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.2

# AI Settings
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.1
AI_QUERY_TIMEOUT=30000

# Report Settings
REPORT_MAX_ROWS=1000
REPORT_EXPORT_TIMEOUT=60000
```

---

## Stock Thresholds (for Alerts)

Configure minimum stock levels for alerts:

Can be stored in database or config file:
```
{
  "PP-HP": { "min": 500, "unit": "kg" },
  "PP-ICP": { "min": 300, "unit": "kg" },
  "PP-RCP": { "min": 200, "unit": "kg" },
  "MB-BLACK": { "min": 50, "unit": "kg" },
  "REGRIND": { "min": 100, "unit": "kg" }
}
```

---

# PART 11: SECURITY

## Query Safety

1. AI-generated SQL must pass validation before execution
2. Only SELECT queries allowed
3. Row limit enforced (1000 max)
4. Query timeout enforced (30 seconds max)
5. No access to system tables

## API Key Protection

1. AI API keys stored in environment variables only
2. Never exposed to frontend
3. All AI calls go through backend

## Rate Limiting

1. Smart Query: 50 queries per user per day
2. Insight refresh: 5 times per day
3. Export: 20 exports per user per day

## Audit Logging

Log all AI queries:
- User ID
- Question asked
- SQL generated
- Execution time
- Row count returned
- Timestamp

---

# PART 12: TESTING CHECKLIST

## Report Builder

- [ ] Can select each category (production, dispatch, stock, procurement)
- [ ] Metrics update correctly per category
- [ ] Dimensions update correctly per category
- [ ] Can add multiple metrics
- [ ] Can select primary and secondary dimensions
- [ ] Date range presets work
- [ ] Custom date range works
- [ ] Category filters populate correctly
- [ ] Multi-select filters work
- [ ] Each chart type renders correctly
- [ ] Grouped bar works with secondary dimension
- [ ] Data table shows correctly
- [ ] Export to Excel works
- [ ] Export to CSV works
- [ ] Export to PDF works
- [ ] Save report works
- [ ] Load saved report works
- [ ] Favorite toggle works

## Smart Query

- [ ] Simple questions generate valid SQL
- [ ] Complex questions with joins work
- [ ] Date-related questions work
- [ ] Dangerous SQL is blocked
- [ ] Results display in table
- [ ] Save query works
- [ ] Run saved query works
- [ ] AI insight enhancement works

## AI Insights

- [ ] Insights generate without error
- [ ] Trends detected correctly
- [ ] Anomalies flagged correctly
- [ ] Alerts appear for low stock
- [ ] Dismiss works
- [ ] Refresh regenerates
- [ ] Filter by category works
- [ ] Old insights expire

## Example Reports to Test

- [ ] Production qty by mold - bar chart
- [ ] Production by mold by line - grouped bar
- [ ] Production trend by week - line chart
- [ ] Rejection rate by mold - bar chart
- [ ] DAY vs NIGHT shift - grouped bar
- [ ] Dispatch by customer - pie chart
- [ ] Top 10 customers - bar chart
- [ ] Stock levels by location - bar chart
- [ ] Stock movement over time - line chart
- [ ] Mold on Line 09 vs Line 12 - grouped bar (the specific request)

---

# PART 13: IMPLEMENTATION ORDER

## Week 1: Core Report Builder

1. Create metrics and dimensions definitions
2. Build query generator for each category
3. Create basic UI layout
4. Implement bar and line charts
5. Add data table view

## Week 2: All Visualizations + Filters

1. Add all chart types
2. Implement data transformers
3. Add all filter types
4. Add dynamic filter loading
5. Add chart options

## Week 3: Save, Export, AI Query

1. Save report functionality
2. Saved reports page
3. Export to Excel/CSV
4. AI query generation
5. Query validation and execution
6. Save query functionality

## Week 4: AI Insights + Polish

1. Insight data collection queries
2. AI insight generation
3. Insights dashboard
4. Scheduled generation
5. Templates
6. Dashboard page
7. Testing and fixes

---

END OF UNIFIED REPORTS SPECIFICATION
