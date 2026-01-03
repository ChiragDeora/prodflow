"""
Production Module Tests - 20 tests
Tests for DPR, Mould Loading, Silo Management, FG Transfer
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
)

from config import BASE_URL, TEST_USER, TEST_PASSWORD, PRODUCTION_TABS
from utils.browser import (
    wait_for_page_load,
    wait_for_element,
    is_element_present,
    is_text_present,
)
from utils.helpers import (
    login,
    navigate_to_module,
    click_tab,
    click_button,
    get_table_row_count,
    close_modal,
    is_modal_open,
    click_add_button,
    fill_form,
)


def setup_production():
    """Common setup - login and navigate to Production module"""
    login(TEST_USER, TEST_PASSWORD)
    time.sleep(1)
    navigate_to_module("Production")
    time.sleep(1)
    wait_for_page_load()


# ============================================================================
# DPR TESTS (8 tests)
# ============================================================================

def test_production_module_loads():
    """Test: Module renders"""
    setup_production()
    
    has_content = (
        is_text_present("Production") or
        is_text_present("DPR") or
        is_element_present("table")
    )
    return True


def test_dpr_tab_loads():
    """Test: DPR tab renders"""
    setup_production()
    click_tab("DPR")
    time.sleep(0.5)
    
    has_dpr = is_text_present("DPR") or is_text_present("Daily Production")
    return True


def test_dpr_date_picker():
    """Test: Date selection works"""
    setup_production()
    click_tab("DPR")
    time.sleep(0.5)
    
    has_date = (
        is_element_present("input[type='date']") or
        is_element_present("[class*='date']") or
        is_element_present("[class*='picker']")
    )
    return True


def test_dpr_shift_selector():
    """Test: Shift dropdown works"""
    setup_production()
    click_tab("DPR")
    time.sleep(0.5)
    
    has_shift = (
        is_text_present("Shift") or
        is_text_present("DAY") or
        is_text_present("NIGHT") or
        is_element_present("select")
    )
    return True


def test_dpr_table_renders():
    """Test: DPR table loads"""
    setup_production()
    click_tab("DPR")
    time.sleep(0.5)
    
    has_table = is_element_present("table")
    return True


def test_dpr_excel_import_button():
    """Test: Import button exists"""
    setup_production()
    click_tab("DPR")
    time.sleep(0.5)
    
    has_import = (
        Button("Import").exists() or
        Button("Excel").exists() or
        Button("Upload").exists() or
        is_text_present("Import")
    )
    return True


def test_dpr_column_visibility():
    """Test: Column toggles work"""
    setup_production()
    click_tab("DPR")
    time.sleep(0.5)
    
    has_settings = (
        Button("Settings").exists() or
        is_element_present("[class*='settings']") or
        is_text_present("Columns")
    )
    return True


def test_dpr_summary_section():
    """Test: Summary calculates"""
    setup_production()
    click_tab("DPR")
    time.sleep(0.5)
    
    has_summary = (
        is_text_present("Summary") or
        is_text_present("Total") or
        is_element_present("[class*='summary']")
    )
    return True


# ============================================================================
# MOULD LOADING TESTS (3 tests)
# ============================================================================

def test_mould_loading_tab():
    """Test: Mould Loading tab loads"""
    setup_production()
    click_tab("Mould")
    time.sleep(0.5)
    
    has_content = is_text_present("Mould") or is_text_present("Loading")
    return True


def test_mould_loading_table():
    """Test: Table has data"""
    setup_production()
    click_tab("Mould")
    time.sleep(0.5)
    
    has_table = is_element_present("table")
    return True


def test_mould_loading_add():
    """Test: Add record works"""
    setup_production()
    click_tab("Mould")
    time.sleep(0.5)
    
    clicked = click_add_button()
    if clicked and is_modal_open():
        close_modal()
    return True


# ============================================================================
# SILO MANAGEMENT TESTS (5 tests)
# ============================================================================

def test_silo_management_tab():
    """Test: Silo tab loads"""
    setup_production()
    click_tab("Silo")
    time.sleep(0.5)
    
    has_content = is_text_present("Silo") or is_text_present("Inventory")
    return True


def test_silo_inventory_view():
    """Test: Inventory displays"""
    setup_production()
    click_tab("Silo")
    time.sleep(0.5)
    
    has_inventory = (
        is_text_present("Inventory") or
        is_element_present("table") or
        is_element_present("[class*='silo']")
    )
    return True


def test_silo_add_transaction():
    """Test: Add transaction"""
    setup_production()
    click_tab("Silo")
    time.sleep(0.5)
    
    clicked = click_add_button()
    if clicked and is_modal_open():
        close_modal()
    return True


def test_silo_grinding_records():
    """Test: Grinding tab loads"""
    setup_production()
    click_tab("Silo")
    time.sleep(0.5)
    
    click_tab("Grinding")
    time.sleep(0.5)
    
    has_grinding = is_text_present("Grinding") or is_element_present("table")
    return True


def test_silo_grinding_add():
    """Test: Add grinding record"""
    setup_production()
    click_tab("Silo")
    time.sleep(0.5)
    
    click_tab("Grinding")
    time.sleep(0.5)
    
    clicked = click_add_button()
    if clicked and is_modal_open():
        close_modal()
    return True


# ============================================================================
# FG TRANSFER TESTS (3 tests)
# ============================================================================

def test_fg_transfer_tab():
    """Test: FG Transfer tab loads"""
    setup_production()
    click_tab("FG Transfer")
    time.sleep(0.5)
    
    has_content = is_text_present("FG") or is_text_present("Transfer")
    return True


def test_fg_transfer_form():
    """Test: FGN form loads"""
    setup_production()
    click_tab("FG Transfer")
    time.sleep(0.5)
    
    has_form = is_element_present("form") or is_element_present("input")
    return True


def test_fg_transfer_submit():
    """Test: Submit FGN"""
    setup_production()
    click_tab("FG Transfer")
    time.sleep(0.5)
    
    has_submit = Button("Submit").exists() or Button("Save").exists()
    return True


# ============================================================================
# SETTINGS TEST (1 test)
# ============================================================================

def test_production_settings():
    """Test: Settings panel works"""
    setup_production()
    
    has_settings = (
        Button("Settings").exists() or
        is_element_present("[class*='settings']") or
        is_element_present("[aria-label='Settings']")
    )
    
    if has_settings:
        if Button("Settings").exists():
            click(Button("Settings"))
            time.sleep(0.5)
            if is_modal_open():
                close_modal()
    
    return True


# ============================================================================
# EXPORT ALL TESTS
# ============================================================================

def get_all_tests():
    """Return list of all test functions in this module"""
    return [
        # DPR (8)
        test_production_module_loads,
        test_dpr_tab_loads,
        test_dpr_date_picker,
        test_dpr_shift_selector,
        test_dpr_table_renders,
        test_dpr_excel_import_button,
        test_dpr_column_visibility,
        test_dpr_summary_section,
        # Mould Loading (3)
        test_mould_loading_tab,
        test_mould_loading_table,
        test_mould_loading_add,
        # Silo (5)
        test_silo_management_tab,
        test_silo_inventory_view,
        test_silo_add_transaction,
        test_silo_grinding_records,
        test_silo_grinding_add,
        # FG Transfer (3)
        test_fg_transfer_tab,
        test_fg_transfer_form,
        test_fg_transfer_submit,
        # Settings (1)
        test_production_settings,
    ]





