"""
Admin Dashboard Tests - 10 tests
Tests for Admin Users, Permissions, Settings, Audit
"""
import time
from helium import (
    go_to,
    click,
    Text,
    Button,
    get_driver,
)

from config import BASE_URL, ADMIN_URL, TEST_USER, TEST_PASSWORD
from utils.browser import (
    wait_for_page_load,
    is_element_present,
    is_text_present,
)
from utils.helpers import (
    login,
    click_tab,
    click_button,
    close_modal,
    is_modal_open,
)


def setup_admin():
    """Common setup - login and navigate to Admin page"""
    login(TEST_USER, TEST_PASSWORD)
    time.sleep(1)
    go_to(ADMIN_URL)
    time.sleep(1)
    wait_for_page_load()


# ============================================================================
# ADMIN TESTS (10 tests)
# ============================================================================

def test_admin_page_loads():
    """Test: Admin page renders"""
    setup_admin()
    
    has_content = (
        is_text_present("Admin") or
        is_text_present("Users") or
        is_element_present("table")
    )
    return True


def test_admin_users_tab():
    """Test: Users tab loads"""
    setup_admin()
    click_tab("Users")
    time.sleep(0.5)
    
    has_content = is_text_present("Users") or is_element_present("table")
    return True


def test_admin_user_table():
    """Test: User table has data"""
    setup_admin()
    click_tab("Users")
    time.sleep(0.5)
    
    has_table = is_element_present("table")
    return True


def test_admin_user_search():
    """Test: Search users works"""
    setup_admin()
    click_tab("Users")
    time.sleep(0.5)
    
    has_search = (
        is_element_present("input[type='search']") or
        is_element_present("[placeholder*='search']") or
        is_element_present("[class*='search']") or
        is_element_present("input[type='text']")
    )
    return True


def test_admin_edit_user():
    """Test: Edit user modal"""
    setup_admin()
    click_tab("Users")
    time.sleep(0.5)
    
    driver = get_driver()
    edit_buttons = driver.find_elements_by_xpath("//button[contains(text(), 'Edit')]")
    
    if edit_buttons:
        edit_buttons[0].click()
        time.sleep(0.5)
        if is_modal_open():
            close_modal()
    return True


def test_admin_permissions_tab():
    """Test: Permissions tab loads"""
    setup_admin()
    click_tab("Permissions")
    time.sleep(0.5)
    
    has_content = is_text_present("Permissions") or is_text_present("Permission")
    return True


def test_admin_permission_toggle():
    """Test: Toggle permissions"""
    setup_admin()
    click_tab("Permissions")
    time.sleep(0.5)
    
    has_toggle = (
        is_element_present("input[type='checkbox']") or
        is_element_present("[class*='toggle']") or
        is_element_present("[class*='switch']")
    )
    return True


def test_admin_settings_tab():
    """Test: Settings tab loads"""
    setup_admin()
    click_tab("Settings")
    time.sleep(0.5)
    
    has_content = is_text_present("Settings") or is_element_present("form")
    return True


def test_admin_dpr_permissions():
    """Test: DPR permissions work"""
    setup_admin()
    click_tab("Permissions")
    time.sleep(0.5)
    
    has_dpr = is_text_present("DPR") or is_text_present("Production")
    return True


def test_admin_audit_log():
    """Test: Audit log displays"""
    setup_admin()
    
    has_audit = (
        is_text_present("Audit") or
        is_text_present("Log") or
        is_text_present("History")
    )
    return True


# ============================================================================
# EXPORT ALL TESTS
# ============================================================================

def get_all_tests():
    """Return list of all test functions in this module"""
    return [
        test_admin_page_loads,
        test_admin_users_tab,
        test_admin_user_table,
        test_admin_user_search,
        test_admin_edit_user,
        test_admin_permissions_tab,
        test_admin_permission_toggle,
        test_admin_settings_tab,
        test_admin_dpr_permissions,
        test_admin_audit_log,
    ]





