# REPORT BUILDER QUICK REFERENCE
## All Metrics, Dimensions, and Combinations

---

## METRICS (What to Measure)

### Production Metrics
| Metric | Description | Calculation |
|--------|-------------|-------------|
| Good Production Qty | Pieces produced that passed quality | Sum of OK quantity |
| Good Production Weight | Weight of good production | Sum of OK weight in kg |
| Rejection Qty | Pieces rejected | Sum of rejection quantity |
| Rejection Weight | Weight of rejected material | Sum of rejection kg |
| Total Production | Good + Rejected | OK qty + Rejection qty |
| Target Qty | Planned production | Sum of target quantity |
| Rejection Rate | Percentage rejected | (Rejection kg / Total kg) × 100 |
| Efficiency | Actual vs Target | (OK qty / Target qty) × 100 |
| Run Time | Machine running time | Sum of run time in minutes |
| Down Time | Machine stopped time | Sum of down time in minutes |
| Available Time | Total time | Run time + Down time |
| Uptime % | Running vs Available | (Run time / Available time) × 100 |
| Actual Cycle Time | Measured cycle | Average of cycle time readings |
| Standard Cycle Time | Expected cycle | From mould standards |
| Cycle Variance | Deviation from standard | ((Actual - Standard) / Standard) × 100 |
| Actual Shot Weight | Measured weight | Average of weight readings |
| Standard Shot Weight | Expected weight | From mould standards |
| Weight Variance | Deviation from standard | ((Actual - Standard) / Standard) × 100 |
| Pieces per Hour | Productivity | OK qty / (Run time / 60) |
| OEE | Overall Equipment Effectiveness | Availability × Performance × Quality |

### Quality Metrics
| Metric | Description | Calculation |
|--------|-------------|-------------|
| Weight OK Count | Readings within spec | Count where status = OK |
| Weight Reject Count | Readings out of spec | Count where status = Reject |
| Weight Deviation | Average deviation | Average of deviation % |
| Thickness OK Count | Readings within spec | Count where status = OK |
| Thickness Reject Count | Readings out of spec | Count where status = Reject |
| QC Hold Qty | Quantity on hold | Sum of hold quantity |
| QC Released Qty | Quantity released | Sum where status = Released |
| First Pass Yield | Good on first try | (Produced - Hold) / Produced × 100 |

### Maintenance Metrics
| Metric | Description | Calculation |
|--------|-------------|-------------|
| Changeover Count | Number of changeovers | Count of changeover records |
| Changeover Time | Total changeover duration | Sum of changeover minutes |
| Avg Changeover Time | Average duration | Total time / Count |
| Breakdown Count | Number of breakdowns | Count of breakdown records |
| Breakdown Time | Total breakdown duration | Sum of breakdown minutes |
| MTBF | Mean Time Between Failures | Run time / Breakdown count |
| MTTR | Mean Time To Repair | Breakdown time / Breakdown count |
| PM Completed | Maintenance done | Count where status = Completed |
| PM Overdue | Maintenance delayed | Count where status = Overdue |
| PM Compliance | On-time percentage | Completed / Scheduled × 100 |

### Dispatch Metrics
| Metric | Description | Calculation |
|--------|-------------|-------------|
| Dispatch Qty | Pieces dispatched | Sum of dispatch quantity |
| Dispatch Boxes | Boxes dispatched | Sum of box count |
| Dispatch Count | Number of dispatches | Count of dispatch records |
| Customer Count | Unique customers | Count distinct customers |

### Stock Metrics
| Metric | Description | Calculation |
|--------|-------------|-------------|
| Current Stock | Present balance | Latest balance |
| Stock In | Material received | Sum of inward quantity |
| Stock Out | Material issued | Sum of outward quantity |
| Days of Stock | Coverage | Balance / Avg daily consumption |

---

## DIMENSIONS (How to Group)

### Time Dimensions
| Dimension | Groups data by | Use when |
|-----------|---------------|----------|
| Daily | Each day | Detailed day-by-day analysis |
| Weekly | Each week | Weekly trend analysis |
| Monthly | Each month | Month-to-month comparison |
| Quarterly | Each quarter | Quarterly review |
| Yearly | Each year | Year-over-year comparison |
| Hour of Day | Each hour | Hourly patterns |
| Day of Week | Mon/Tue/Wed... | Weekday patterns |

### Entity Dimensions
| Dimension | Groups data by | Use when |
|-----------|---------------|----------|
| Production Line | Each line | Comparing line performance |
| Machine | Each machine | Machine-level analysis |
| Mould | Each mould | Mould performance comparison |
| Product (SFG) | Each product | Product-level analysis |
| Shift | Day/Night | Shift comparison |
| Shift Incharge | Each supervisor | Personnel analysis |
| Customer | Each customer | Customer analysis |
| Supplier | Each supplier | Supplier analysis |

### Reason Dimensions
| Dimension | Groups data by | Use when |
|-----------|---------------|----------|
| Downtime Reason | Each reason | Root cause of downtime |
| Rejection Reason | Each reason | Root cause of rejection |
| Breakdown Type | Mechanical/Electrical/etc | Breakdown analysis |

---

## USEFUL COMBINATIONS

### Line Analysis Combinations

| Question | Metric | Primary Group | Secondary Group | Chart |
|----------|--------|---------------|-----------------|-------|
| Line ranking by efficiency | Efficiency | Line | - | Horizontal Bar |
| Line output comparison | Good Qty | Line | - | Bar |
| Line rejection comparison | Rejection Rate | Line | - | Bar |
| Line uptime comparison | Uptime % | Line | - | Bar |
| Line productivity | Pieces/Hour | Line | - | Bar |
| Line trend over time | Efficiency | Monthly | Line | Multi-line |
| Line by shift | Good Qty | Line | Shift | Grouped Bar |
| Line downtime reasons | Down Time | Line | Reason | Stacked Bar |

### Mould Analysis Combinations

| Question | Metric | Primary Group | Secondary Group | Chart |
|----------|--------|---------------|-----------------|-------|
| Mould ranking | Good Qty | Mould | - | Horizontal Bar |
| Mould rejection ranking | Rejection Rate | Mould | - | Bar |
| Mould on line efficiency | Efficiency | Mould | Line | Heatmap |
| Mould on line rejection | Rejection Rate | Mould | Line | Heatmap |
| Mould cycle time | Cycle Time | Mould | - | Bar + Standard line |
| Mould weight | Shot Weight | Mould | - | Bar + Standard line |
| Mould trend | Efficiency | Monthly | Mould | Multi-line |
| Cycle time trend | Cycle Time | Daily | Mould | Line |
| Weight trend | Shot Weight | Daily | Mould | Line |

### Overall Analysis Combinations

| Question | Metric | Primary Group | Secondary Group | Chart |
|----------|--------|---------------|-----------------|-------|
| Monthly production trend | Good Qty | Monthly | - | Bar |
| Monthly rejection trend | Rejection Rate | Monthly | - | Line |
| Monthly efficiency trend | Efficiency | Monthly | - | Line |
| Downtime Pareto | Down Time | Reason | - | Pareto |
| Rejection Pareto | Rejection Kg | Reason | - | Pareto |
| Production vs Dispatch | Good Qty, Dispatch Qty | Monthly | - | Grouped Bar |
| By product | Good Qty | Product | - | Bar |
| OEE breakdown | OEE components | Line | - | Stacked Bar |

### Quality Combinations

| Question | Metric | Primary Group | Secondary Group | Chart |
|----------|--------|---------------|-----------------|-------|
| Weight status by line | Weight OK/Reject Count | Line | Status | Stacked Bar |
| Weight deviation by mould | Weight Deviation | Mould | - | Bar |
| Weight trend | Avg Weight | Daily | Mould | Line |
| QC hold by reason | Hold Qty | Reason | - | Pie |
| First pass yield | FPY | Line | - | Bar |

### Maintenance Combinations

| Question | Metric | Primary Group | Secondary Group | Chart |
|----------|--------|---------------|-----------------|-------|
| Changeover by line | Changeover Time | Line | - | Bar |
| Changeover trend | Avg Changeover | Monthly | - | Line |
| Breakdown by type | Breakdown Time | Type | - | Pareto |
| Breakdown by line | Breakdown Count | Line | - | Bar |
| MTBF by line | MTBF | Line | - | Bar |
| PM compliance | PM % | Line | - | Bar |

---

## FILTER OPTIONS

### Date Range Presets
- Today
- Yesterday
- Last 7 Days
- Last 30 Days
- This Week
- Last Week
- This Month
- Last Month
- This Quarter
- Last Quarter
- This Year
- Last Year
- Last 90 Days
- Custom Range (pick start and end date)

### Entity Filters
- Select specific lines (multi-select)
- Select specific moulds (multi-select)
- Select specific products (multi-select)
- Select specific customers (multi-select)
- Select specific suppliers (multi-select)

### Other Filters
- Shift: Day only, Night only, or Both
- Include/Exclude changeover entries
- Include/Exclude trial runs

---

## CHART TYPE RECOMMENDATIONS

| Scenario | Recommended Chart |
|----------|------------------|
| Ranking/Comparison of categories | Bar (Horizontal for many items) |
| Trend over time | Line |
| Part of whole | Pie or Donut |
| Two dimensions comparison | Grouped Bar |
| Two dimensions with intensity | Heatmap |
| Part of whole over time | Stacked Bar or Area |
| Root cause analysis | Pareto |
| Single key number | KPI Card |
| Detailed data with many columns | Data Table |
| Correlation between metrics | Scatter |
| Actual vs Target comparison | Bar with reference line |
| Multiple metrics over time | Combo (Bar + Line) |

---

## COMMON TEMPLATES TO PRE-BUILD

### Daily Use
1. Today's Production Summary - KPI cards with today's totals
2. Line Status - All lines with current day metrics
3. Shift Handover Report - Outgoing shift summary

### Weekly Use
4. Weekly Line Ranking - Lines sorted by efficiency
5. Weekly Mould Performance - Moulds sorted by output
6. Weekly Rejection Analysis - Pareto of rejection reasons

### Monthly Use
7. Monthly Dashboard - MTM comparison of all key metrics
8. Monthly Trend Report - Last 12 months line chart
9. Monthly Mould-Line Matrix - Heatmap for planning

### Analysis
10. Downtime Pareto - Root cause of downtime
11. Rejection Pareto - Root cause of rejection
12. Production vs Dispatch Gap - Surplus/deficit by product

### Planning
13. Mould Placement Recommendation - Best line for each mould
14. FG Stock Status - Current stock with days coverage
15. Maintenance Due - Moulds needing PM

---

## INSIGHTS TO GENERATE AUTOMATICALLY

### Daily Alerts
- Lines with efficiency below 80%
- Lines with rejection above 3%
- Moulds with cycle time deviation above 10%
- Moulds with weight deviation above 5%
- FG products with less than 3 days stock

### Weekly Insights
- Best performing line this week
- Most improved line compared to last week
- Mould with increasing rejection trend
- Top 3 downtime reasons

### Monthly Insights
- MTM comparison summary
- Lines that improved vs declined
- Moulds that improved vs declined
- Predicted maintenance needs

---

END OF QUICK REFERENCE
