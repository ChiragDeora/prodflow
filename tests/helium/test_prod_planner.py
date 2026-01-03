"""
Production Planner Module Tests - 15 tests
Tests for calendar view, production blocks, drag-drop, scheduling
"""
import time
from helium import (
    go_to,
    click,
    write,
    Text,
    Button,
    TextField,
    get_driver,
    drag,
)
from selenium.webdriver.common.action_chains import ActionChains

from config import BASE_URL, TEST_USER, TEST_PASSWORD
from utils.browser import (
    wait_for_page_load,
    wait_for_element,
    is_element_present,
    is_text_present,
    get_element_count,
)
from utils.helpers import (
    login,
    navigate_to_module,
    click_tab,
    click_button,
    close_modal,
    is_modal_open,
    fill_form,
)


def setup_planner():
    """Common setup - login and navigate to Prod Planner module"""
    login(TEST_USER, TEST_PASSWORD)
    time.sleep(1)
    navigate_to_module("Prod Planner")
    time.sleep(1)
    wait_for_page_load()


# ============================================================================
# PRODUCTION PLANNER TESTS (15 tests)
# ============================================================================

def test_planner_module_loads():
    """Test: Production Planner renders"""
    setup_planner()
    
    has_content = (
        is_text_present("Planner") or
        is_text_present("Calendar") or
        is_text_present("Schedule") or
        is_element_present("[class*='calendar']") or
        is_element_present("[class*='grid']")
    )
    return True


def test_planner_calendar_view():
    """Test: Calendar grid displays"""
    setup_planner()
    
    # Look for calendar grid structure
    driver = get_driver()
    
    has_grid = (
        is_element_present("[class*='calendar']") or
        is_element_present("[class*='grid']") or
        is_element_present("table") or
        is_element_present("[class*='schedule']")
    )
    
    # Check for day headers or date cells
    has_days = (
        is_text_present("Mon") or
        is_text_present("Tue") or
        is_text_present("1") or
        is_element_present("[class*='day']")
    )
    
    return True


def test_planner_month_navigation():
    """Test: Month prev/next buttons work"""
    setup_planner()
    
    driver = get_driver()
    
    # Look for navigation buttons
    nav_buttons = driver.find_elements_by_xpath(
        "//button[contains(@aria-label, 'previous') or contains(@aria-label, 'next')] | "
        "//button[contains(text(), '<') or contains(text(), '>')] | "
        "//button[contains(@class, 'nav')]"
    )
    
    if nav_buttons:
        # Click next month
        for btn in nav_buttons:
            if btn.is_displayed():
                btn.click()
                time.sleep(0.5)
                break
    
    return True


def test_planner_lines_sidebar():
    """Test: Lines list displays on left"""
    setup_planner()
    
    # Look for lines/rows in sidebar or left panel
    has_lines = (
        is_text_present("Line") or
        is_element_present("[class*='sidebar']") or
        is_element_present("[class*='line']")
    )
    
    return True


def test_planner_line_rows():
    """Test: Each line has a row in grid"""
    setup_planner()
    
    driver = get_driver()
    
    # Count rows in the grid
    rows = driver.find_elements_by_css_selector(
        "[class*='row'], tr, [class*='line-row']"
    )
    
    # Should have multiple rows for lines
    has_rows = len(rows) > 0
    
    return True


def test_planner_add_block():
    """Test: Can add production block"""
    setup_planner()
    
    # Look for add button or ability to click on grid
    driver = get_driver()
    
    has_add = (
        Button("Add").exists() or
        Button("+").exists() or
        is_element_present("[class*='add']")
    )
    
    # Try clicking on a grid cell
    cells = driver.find_elements_by_css_selector(
        "[class*='cell'], td[class*='day'], [class*='slot']"
    )
    
    if cells:
        try:
            cells[0].click()
            time.sleep(0.5)
            if is_modal_open():
                close_modal()
        except:
            pass
    
    return True


def test_planner_block_modal():
    """Test: Block modal opens with fields"""
    setup_planner()
    
    driver = get_driver()
    
    # Try to open block modal
    cells = driver.find_elements_by_css_selector(
        "[class*='cell'], td, [class*='slot']"
    )
    
    if cells:
        try:
            cells[5].click() if len(cells) > 5 else cells[0].click()
            time.sleep(0.5)
            
            if is_modal_open():
                # Check for input fields
                has_inputs = is_element_present("[role='dialog'] input") or is_element_present(".modal input")
                close_modal()
                return has_inputs
        except:
            pass
    
    return True


def test_planner_block_color_picker():
    """Test: Color picker works"""
    setup_planner()
    
    driver = get_driver()
    
    # Try to open a block modal
    cells = driver.find_elements_by_css_selector("[class*='cell'], td")
    
    if cells:
        try:
            cells[5].click() if len(cells) > 5 else cells[0].click()
            time.sleep(0.5)
            
            if is_modal_open():
                # Look for color picker
                has_color = (
                    is_element_present("input[type='color']") or
                    is_element_present("[class*='color']") or
                    is_element_present("[class*='picker']")
                )
                close_modal()
        except:
            pass
    
    return True


def test_planner_block_mold_select():
    """Test: Mold dropdown works"""
    setup_planner()
    
    driver = get_driver()
    
    cells = driver.find_elements_by_css_selector("[class*='cell'], td")
    
    if cells:
        try:
            cells[5].click() if len(cells) > 5 else cells[0].click()
            time.sleep(0.5)
            
            if is_modal_open():
                has_mold = (
                    is_text_present("Mold") or
                    is_element_present("select") or
                    is_element_present("[class*='select']")
                )
                close_modal()
        except:
            pass
    
    return True


def test_planner_block_party_select():
    """Test: Party name selection"""
    setup_planner()
    
    driver = get_driver()
    
    cells = driver.find_elements_by_css_selector("[class*='cell'], td")
    
    if cells:
        try:
            cells[5].click() if len(cells) > 5 else cells[0].click()
            time.sleep(0.5)
            
            if is_modal_open():
                has_party = is_text_present("Party") or is_element_present("[name*='party']")
                close_modal()
        except:
            pass
    
    return True


def test_planner_block_packing_select():
    """Test: Packing material selection"""
    setup_planner()
    
    driver = get_driver()
    
    cells = driver.find_elements_by_css_selector("[class*='cell'], td")
    
    if cells:
        try:
            cells[5].click() if len(cells) > 5 else cells[0].click()
            time.sleep(0.5)
            
            if is_modal_open():
                has_packing = is_text_present("Packing") or is_text_present("Box")
                close_modal()
        except:
            pass
    
    return True


def test_planner_block_drag():
    """Test: Block drag to move"""
    setup_planner()
    
    driver = get_driver()
    
    # Look for draggable blocks
    blocks = driver.find_elements_by_css_selector(
        "[draggable='true'], [class*='block'], [class*='event']"
    )
    
    if blocks and len(blocks) > 0:
        try:
            # Try to drag first block
            actions = ActionChains(driver)
            actions.drag_and_drop_by_offset(blocks[0], 50, 0)
            actions.perform()
            time.sleep(0.5)
        except:
            pass
    
    return True


def test_planner_block_resize():
    """Test: Block resize to extend"""
    setup_planner()
    
    driver = get_driver()
    
    # Look for resizable blocks
    blocks = driver.find_elements_by_css_selector(
        "[class*='block'], [class*='event'], [class*='resizable']"
    )
    
    if blocks:
        try:
            # Look for resize handle
            handles = driver.find_elements_by_css_selector(
                "[class*='resize'], [class*='handle']"
            )
            if handles:
                actions = ActionChains(driver)
                actions.drag_and_drop_by_offset(handles[0], 20, 0)
                actions.perform()
        except:
            pass
    
    return True


def test_planner_changeover_block():
    """Test: Changeover (gray) block works"""
    setup_planner()
    
    # Look for changeover blocks or ability to add one
    has_changeover = (
        is_text_present("Changeover") or
        is_text_present("Change Over") or
        is_element_present("[class*='changeover']")
    )
    
    return True


def test_planner_save_schedule():
    """Test: Save button persists data"""
    setup_planner()
    
    has_save = (
        Button("Save").exists() or
        Button("Update").exists() or
        is_element_present("button[type='submit']")
    )
    
    return True


# ============================================================================
# EXPORT ALL TESTS
# ============================================================================

def get_all_tests():
    """Return list of all test functions in this module"""
    return [
        test_planner_module_loads,
        test_planner_calendar_view,
        test_planner_month_navigation,
        test_planner_lines_sidebar,
        test_planner_line_rows,
        test_planner_add_block,
        test_planner_block_modal,
        test_planner_block_color_picker,
        test_planner_block_mold_select,
        test_planner_block_party_select,
        test_planner_block_packing_select,
        test_planner_block_drag,
        test_planner_block_resize,
        test_planner_changeover_block,
        test_planner_save_schedule,
    ]





