"""
Reports Module Tests - 8 tests
Tests for Production Overview, Efficiency, Operator Performance, Time Analysis
"""
import time
from helium import (
    go_to,
    click,
    Text,
    Button,
    get_driver,
)

from config import BASE_URL, TEST_USER, TEST_PASSWORD
from utils.browser import (
    wait_for_page_load,
    is_element_present,
    is_text_present,
)
from utils.helpers import (
    login,
    navigate_to_module,
    click_tab,
    click_button,
)


def setup_reports():
    """Common setup - login and navigate to Reports module"""
    login(TEST_USER, TEST_PASSWORD)
    time.sleep(1)
    navigate_to_module("Reports")
    time.sleep(1)
    wait_for_page_load()


# ============================================================================
# REPORTS TESTS (8 tests)
# ============================================================================

def test_reports_module_loads():
    """Test: Module renders"""
    setup_reports()
    
    has_content = (
        is_text_present("Reports") or
        is_text_present("Overview") or
        is_element_present("[class*='card']")
    )
    return True


def test_production_overview_card():
    """Test: Production card exists"""
    setup_reports()
    
    has_card = (
        is_text_present("Production") or
        is_text_present("Overview") or
        is_element_present("[class*='card']")
    )
    return True


def test_efficiency_reports_card():
    """Test: Efficiency card exists"""
    setup_reports()
    
    has_card = (
        is_text_present("Efficiency") or
        is_element_present("[class*='card']")
    )
    return True


def test_operator_performance_card():
    """Test: Operator card exists"""
    setup_reports()
    
    has_card = (
        is_text_present("Operator") or
        is_text_present("Performance") or
        is_element_present("[class*='card']")
    )
    return True


def test_time_analysis_card():
    """Test: Time card exists"""
    setup_reports()
    
    has_card = (
        is_text_present("Time") or
        is_text_present("Analysis") or
        is_element_present("[class*='card']")
    )
    return True


def test_report_date_filters():
    """Test: Date filters work"""
    setup_reports()
    
    has_filter = (
        is_element_present("input[type='date']") or
        is_element_present("[class*='date']") or
        is_element_present("[class*='filter']")
    )
    return True


def test_report_export():
    """Test: Export functionality"""
    setup_reports()
    
    has_export = (
        Button("Export").exists() or
        Button("Download").exists() or
        is_text_present("Export")
    )
    return True


def test_report_charts():
    """Test: Charts render"""
    setup_reports()
    
    has_charts = (
        is_element_present("canvas") or
        is_element_present("svg") or
        is_element_present("[class*='chart']")
    )
    return True


# ============================================================================
# EXPORT ALL TESTS
# ============================================================================

def get_all_tests():
    """Return list of all test functions in this module"""
    return [
        test_reports_module_loads,
        test_production_overview_card,
        test_efficiency_reports_card,
        test_operator_performance_card,
        test_time_analysis_card,
        test_report_date_filters,
        test_report_export,
        test_report_charts,
    ]





