# Helium Selenium Testing Framework

Automated UI testing for Production Scheduler ERP using Helium (Python Selenium wrapper).

## Setup

```bash
# Navigate to test directory
cd tests/helium

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

## Running Tests

```bash
# Run all tests
python run.py

# Run with headless browser
HEADLESS=true python run.py
```

## Test Modules

| Module | Tests | Description |
|--------|-------|-------------|
| Auth | 15 | Login, signup, logout, session |
| Masters | 42 | Machine, Mold, Materials, Line, BOM, Commercial, Others |
| Store & Dispatch | 28 | Purchase, Inward, Outward, Sales |
| Prod Planner | 15 | Calendar, blocks, drag-drop, scheduling |
| Production | 20 | DPR, Mould Loading, Silo, FG Transfer |
| Quality | 15 | Inspections, Standards, Analytics, Weight, First Pieces |
| Maintenance | 12 | Preventive, Breakdown, Report |
| Reports | 8 | Overview cards, filters, charts |
| Approvals | 8 | Pending, Recent, Approve actions |
| Profile | 12 | Profile info, User mgmt, Units, Account |
| Admin | 10 | Users, Permissions, Settings, Audit |
| **Total** | **185** | |

## Output

- **Excel Report**: `reports/helium/results_YYYYMMDD_HHMMSS.xlsx`
- **Screenshots**: `tests/helium/screenshots/` (on failures)

## Configuration

Edit `config.py` to change:
- `BASE_URL` - Application URL (default: http://localhost:3000)
- `TEST_USER` / `TEST_PASSWORD` - Test credentials
- `HEADLESS` - Run without browser window
- `TIMEOUT` - Default wait timeout

## Environment Variables

```bash
export TEST_BASE_URL="http://localhost:3000"
export TEST_USER="testuser@example.com"
export TEST_PASSWORD="testpassword123"
export HEADLESS="false"
```

## Project Structure

```
tests/helium/
├── config.py           # Configuration
├── run.py              # Main test runner
├── requirements.txt    # Dependencies
├── README.md           # This file
├── utils/
│   ├── __init__.py
│   ├── browser.py      # Browser setup/teardown
│   ├── reporter.py     # Excel report generation
│   └── helpers.py      # Common test helpers
├── test_auth.py        # Auth tests
├── test_masters.py     # Masters module tests
├── test_store.py       # Store & Dispatch tests
├── test_prod_planner.py # Production Planner tests
├── test_production.py  # Production module tests
├── test_quality.py     # Quality Control tests
├── test_maintenance.py # Maintenance tests
├── test_reports.py     # Reports tests
├── test_approvals.py   # Approvals tests
├── test_profile.py     # Profile tests
├── test_admin.py       # Admin tests
└── screenshots/        # Failure screenshots
```





