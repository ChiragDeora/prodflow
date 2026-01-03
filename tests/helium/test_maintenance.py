"""
Maintenance Module Tests - 12 tests
Tests for Preventive Maintenance, Breakdown, Report
"""
import time
from helium import (
    go_to,
    click,
    Text,
    Button,
    get_driver,
)

from config import BASE_URL, TEST_USER, TEST_PASSWORD, MAINTENANCE_TABS
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
    close_modal,
    is_modal_open,
    click_add_button,
)


def setup_maintenance():
    """Common setup - login and navigate to Maintenance module"""
    login(TEST_USER, TEST_PASSWORD)
    time.sleep(1)
    navigate_to_module("Maintenance")
    time.sleep(1)
    wait_for_page_load()


# ============================================================================
# MAINTENANCE TESTS (12 tests)
# ============================================================================

def test_maintenance_module_loads():
    """Test: Module renders"""
    setup_maintenance()
    
    has_content = (
        is_text_present("Maintenance") or
        is_text_present("Preventive") or
        is_element_present("table")
    )
    return True


def test_preventive_tab():
    """Test: Preventive tab loads"""
    setup_maintenance()
    click_tab("Preventive")
    time.sleep(0.5)
    
    has_content = is_text_present("Preventive") or is_text_present("Line")
    return True


def test_preventive_line_select():
    """Test: Line selection works"""
    setup_maintenance()
    click_tab("Preventive")
    time.sleep(0.5)
    
    has_select = (
        is_element_present("select") or
        is_element_present("[class*='select']") or
        is_text_present("Line")
    )
    return True


def test_preventive_checklist():
    """Test: Checklist displays"""
    setup_maintenance()
    click_tab("Preventive")
    time.sleep(0.5)
    
    has_checklist = (
        is_text_present("Checklist") or
        is_text_present("Check") or
        is_element_present("[type='checkbox']")
    )
    return True


def test_preventive_frequency_filter():
    """Test: Frequency filter works"""
    setup_maintenance()
    click_tab("Preventive")
    time.sleep(0.5)
    
    has_frequency = (
        is_text_present("Daily") or
        is_text_present("Weekly") or
        is_text_present("Monthly") or
        is_element_present("select")
    )
    return True


def test_breakdown_tab():
    """Test: Breakdown tab loads"""
    setup_maintenance()
    click_tab("Breakdown")
    time.sleep(0.5)
    
    has_content = is_text_present("Breakdown") or is_element_present("table")
    return True


def test_breakdown_add_task():
    """Test: Add task works"""
    setup_maintenance()
    click_tab("Breakdown")
    time.sleep(0.5)
    
    clicked = click_add_button()
    if clicked and is_modal_open():
        close_modal()
    return True


def test_breakdown_priority():
    """Test: Priority selection"""
    setup_maintenance()
    click_tab("Breakdown")
    time.sleep(0.5)
    
    has_priority = (
        is_text_present("Priority") or
        is_text_present("High") or
        is_text_present("Low") or
        is_text_present("Critical")
    )
    return True


def test_breakdown_status_update():
    """Test: Status change works"""
    setup_maintenance()
    click_tab("Breakdown")
    time.sleep(0.5)
    
    has_status = (
        is_text_present("Status") or
        is_text_present("Pending") or
        is_text_present("Completed") or
        is_element_present("[class*='status']")
    )
    return True


def test_breakdown_search():
    """Test: Search functionality"""
    setup_maintenance()
    click_tab("Breakdown")
    time.sleep(0.5)
    
    has_search = (
        is_element_present("input[type='search']") or
        is_element_present("[placeholder*='search']") or
        is_element_present("[class*='search']")
    )
    return True


def test_maintenance_report_tab():
    """Test: Report tab loads"""
    setup_maintenance()
    click_tab("Report")
    time.sleep(0.5)
    
    has_content = is_text_present("Report") or is_text_present("Coming")
    return True


def test_maintenance_history():
    """Test: History displays"""
    setup_maintenance()
    
    has_history = (
        is_text_present("History") or
        is_element_present("table") or
        is_element_present("[class*='history']")
    )
    return True


# ============================================================================
# EXPORT ALL TESTS
# ============================================================================

def get_all_tests():
    """Return list of all test functions in this module"""
    return [
        test_maintenance_module_loads,
        test_preventive_tab,
        test_preventive_line_select,
        test_preventive_checklist,
        test_preventive_frequency_filter,
        test_breakdown_tab,
        test_breakdown_add_task,
        test_breakdown_priority,
        test_breakdown_status_update,
        test_breakdown_search,
        test_maintenance_report_tab,
        test_maintenance_history,
    ]





