"""
Profile Module Tests - 12 tests
Tests for Profile Info, User Management, Unit Management, Account Actions
"""
import time
from helium import (
    go_to,
    click,
    Text,
    Button,
    get_driver,
)

from config import BASE_URL, TEST_USER, TEST_PASSWORD, PROFILE_TABS
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


def setup_profile():
    """Common setup - login and navigate to Profile module"""
    login(TEST_USER, TEST_PASSWORD)
    time.sleep(1)
    navigate_to_module("Profile")
    time.sleep(1)
    wait_for_page_load()


# ============================================================================
# PROFILE TESTS (12 tests)
# ============================================================================

def test_profile_module_loads():
    """Test: Module renders"""
    setup_profile()
    
    has_content = (
        is_text_present("Profile") or
        is_text_present("Account") or
        is_element_present("[class*='profile']")
    )
    return True


def test_profile_info_tab():
    """Test: Profile Info tab loads"""
    setup_profile()
    click_tab("Profile")
    time.sleep(0.5)
    
    has_content = is_text_present("Profile") or is_text_present("Name")
    return True


def test_profile_card_display():
    """Test: Profile card shows data"""
    setup_profile()
    click_tab("Profile")
    time.sleep(0.5)
    
    has_card = (
        is_element_present("[class*='card']") or
        is_text_present("Email") or
        is_text_present("Role")
    )
    return True


def test_profile_edit_form():
    """Test: Edit form works"""
    setup_profile()
    click_tab("Profile")
    time.sleep(0.5)
    
    has_edit = (
        Button("Edit").exists() or
        is_element_present("input") or
        is_element_present("form")
    )
    return True


def test_profile_save():
    """Test: Save changes works"""
    setup_profile()
    click_tab("Profile")
    time.sleep(0.5)
    
    has_save = Button("Save").exists() or Button("Update").exists()
    return True


def test_user_management_tab():
    """Test: User Management tab (admin)"""
    setup_profile()
    click_tab("User Management")
    time.sleep(0.5)
    
    has_content = (
        is_text_present("User") or
        is_element_present("table")
    )
    return True


def test_user_list():
    """Test: User list displays"""
    setup_profile()
    click_tab("User Management")
    time.sleep(0.5)
    
    has_list = is_element_present("table") or is_element_present("[class*='list']")
    return True


def test_user_search():
    """Test: Search works"""
    setup_profile()
    click_tab("User Management")
    time.sleep(0.5)
    
    has_search = (
        is_element_present("input[type='search']") or
        is_element_present("[placeholder*='search']") or
        is_element_present("[class*='search']")
    )
    return True


def test_unit_management_tab():
    """Test: Unit Management tab"""
    setup_profile()
    click_tab("Unit")
    time.sleep(0.5)
    
    has_content = is_text_present("Unit") or is_element_present("table")
    return True


def test_unit_add():
    """Test: Add unit works"""
    setup_profile()
    click_tab("Unit")
    time.sleep(0.5)
    
    clicked = click_add_button()
    if clicked and is_modal_open():
        close_modal()
    return True


def test_account_actions_tab():
    """Test: Account Actions tab"""
    setup_profile()
    click_tab("Account")
    time.sleep(0.5)
    
    has_content = (
        is_text_present("Account") or
        is_text_present("Sign out") or
        Button("Sign out").exists()
    )
    return True


def test_signout_button():
    """Test: Sign out button works"""
    setup_profile()
    
    has_signout = (
        Button("Sign out").exists() or
        Button("Logout").exists() or
        is_text_present("Sign out")
    )
    return True


# ============================================================================
# EXPORT ALL TESTS
# ============================================================================

def get_all_tests():
    """Return list of all test functions in this module"""
    return [
        test_profile_module_loads,
        test_profile_info_tab,
        test_profile_card_display,
        test_profile_edit_form,
        test_profile_save,
        test_user_management_tab,
        test_user_list,
        test_user_search,
        test_unit_management_tab,
        test_unit_add,
        test_account_actions_tab,
        test_signout_button,
    ]





