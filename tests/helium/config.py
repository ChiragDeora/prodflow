"""
Configuration for Helium Selenium Tests
"""
import os
from pathlib import Path

# Base URLs
BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:3000")
LOGIN_URL = f"{BASE_URL}/auth/login"
SIGNUP_URL = f"{BASE_URL}/auth/signup"
ADMIN_URL = f"{BASE_URL}/admin"

# Test Credentials
TEST_USER = os.getenv("TEST_USER", "testuser@example.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "testpassword123")
ADMIN_USER = os.getenv("ADMIN_USER", "admin@example.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "adminpassword123")

# Timeouts (in seconds)
TIMEOUT = 30
SHORT_TIMEOUT = 5
PAGE_LOAD_TIMEOUT = 60

# Directories
BASE_DIR = Path(__file__).parent
SCREENSHOT_DIR = BASE_DIR / "screenshots"
REPORT_DIR = BASE_DIR.parent.parent / "reports" / "helium"

# Ensure directories exist
SCREENSHOT_DIR.mkdir(exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)

# Browser Settings
HEADLESS = os.getenv("HEADLESS", "false").lower() == "true"
BROWSER_WIDTH = 1920
BROWSER_HEIGHT = 1080

# Module Navigation Names (as they appear in sidebar)
MODULES = {
    "masters": "Masters",
    "store": "Store & Dispatch", 
    "prod_planner": "Prod Planner",
    "production": "Production",
    "quality": "Quality",
    "maintenance": "Maintenance",
    "reports": "Reports",
    "approvals": "Approvals",
    "profile": "Profile",
}

# Tab names within modules
MASTER_TABS = [
    "Machine Master",
    "Mold Master", 
    "Raw Materials",
    "Packing Materials",
    "Line Master",
    "BOM Master",
    "Commercial Master",
    "Others",
]

STORE_TABS = ["Purchase", "Inward", "Outward", "Sales"]
PRODUCTION_TABS = ["DPR", "Mould Loading", "Silo Management", "FG Transfer"]
QUALITY_TABS = ["Inspections", "Standards", "Analytics", "Daily Weight", "First Pieces"]
MAINTENANCE_TABS = ["Preventive", "Breakdown", "Report"]
PROFILE_TABS = ["Profile Info", "User Management", "Unit Management", "Account Actions"]





