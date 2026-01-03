"""
Common helper functions for Helium tests
"""
import time
from typing import Dict, Any, List, Optional
from pathlib import Path

from helium import (
    go_to,
    click,
    write,
    press,
    wait_until,
    Text,
    Button,
    Link,
    TextField,
    S,
    find_all,
    get_driver,
)
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

import sys
sys.path.append(str(Path(__file__).parent.parent))
from config import (
    BASE_URL, 
    LOGIN_URL, 
    TEST_USER, 
    TEST_PASSWORD,
    TIMEOUT,
    SHORT_TIMEOUT,
    MODULES
)
from utils.browser import wait_for_page_load, wait_for_element, is_element_present


def login(username: str = None, password: str = None) -> bool:
    """
    Perform login flow.
    Returns True if login successful, False otherwise.
    """
    username = username or TEST_USER
    password = password or TEST_PASSWORD
    
    try:
        go_to(LOGIN_URL)
        wait_for_page_load()
        
        # Find and fill email/username field
        email_field = wait_for_element("input[type='email'], input[name='email'], input[id='email'], input[placeholder*='mail']")
        if not email_field:
            # Try text input
            email_field = wait_for_element("input[type='text']")
        
        if email_field:
            email_field.clear()
            email_field.send_keys(username)
        else:
            # Fallback to helium
            write(username, into=TextField(to_left_of=Button("Sign in")))
        
        # Find and fill password field
        password_field = wait_for_element("input[type='password']")
        if password_field:
            password_field.clear()
            password_field.send_keys(password)
        else:
            write(password, into=TextField(below=TextField()))
        
        # Click login button
        time.sleep(0.3)
        login_btn = wait_for_element("button[type='submit']")
        if login_btn:
            login_btn.click()
        else:
            click(Button("Sign in"))
        
        # Wait for redirect
        time.sleep(2)
        wait_for_page_load()
        
        # Check if we're logged in (no longer on login page)
        current_url = get_driver().current_url
        return "/auth/login" not in current_url
        
    except Exception as e:
        print(f"Login failed: {e}")
        return False


def logout() -> bool:
    """
    Perform logout.
    Returns True if logout successful.
    """
    try:
        # Try various logout button selectors
        logout_selectors = [
            "button:has-text('Sign out')",
            "button:has-text('Logout')",
            "button:has-text('Sign Out')",
            "[data-testid='logout']",
        ]
        
        for selector in logout_selectors:
            try:
                if Button("Sign out").exists():
                    click(Button("Sign out"))
                    time.sleep(1)
                    wait_for_page_load()
                    return True
            except:
                continue
        
        # Try clicking by text
        if Text("Sign out").exists():
            click(Text("Sign out"))
            time.sleep(1)
            wait_for_page_load()
            return True
            
        return False
        
    except Exception as e:
        print(f"Logout failed: {e}")
        return False


def navigate_to_module(module_name: str) -> bool:
    """
    Click sidebar to navigate to a module.
    Returns True if navigation successful.
    """
    try:
        # First ensure we're at the main app
        current_url = get_driver().current_url
        if "/auth/" in current_url:
            go_to(BASE_URL)
            wait_for_page_load()
        
        time.sleep(0.5)
        
        # Look for the module in sidebar navigation
        # Try various selector patterns
        driver = get_driver()
        
        # Try clicking by button text
        try:
            if Button(module_name).exists():
                click(Button(module_name))
                time.sleep(0.5)
                wait_for_page_load()
                return True
        except:
            pass
        
        # Try clicking by link text
        try:
            if Link(module_name).exists():
                click(Link(module_name))
                time.sleep(0.5)
                wait_for_page_load()
                return True
        except:
            pass
        
        # Try clicking by text content
        try:
            if Text(module_name).exists():
                click(Text(module_name))
                time.sleep(0.5)
                wait_for_page_load()
                return True
        except:
            pass
        
        # Try XPath with partial text match
        try:
            elements = driver.find_elements(By.XPATH, f"//*[contains(text(), '{module_name}')]")
            for elem in elements:
                if elem.is_displayed():
                    elem.click()
                    time.sleep(0.5)
                    wait_for_page_load()
                    return True
        except:
            pass
        
        return False
        
    except Exception as e:
        print(f"Navigation to {module_name} failed: {e}")
        return False


def click_tab(tab_name: str) -> bool:
    """
    Click a tab within a module.
    Returns True if successful.
    """
    try:
        time.sleep(0.3)
        
        # Try various approaches
        driver = get_driver()
        
        # Try button
        try:
            if Button(tab_name).exists():
                click(Button(tab_name))
                time.sleep(0.5)
                return True
        except:
            pass
        
        # Try text
        try:
            if Text(tab_name).exists():
                click(Text(tab_name))
                time.sleep(0.5)
                return True
        except:
            pass
        
        # Try role=tab
        try:
            tab = driver.find_element(By.XPATH, f"//button[@role='tab' and contains(text(), '{tab_name}')]")
            if tab.is_displayed():
                tab.click()
                time.sleep(0.5)
                return True
        except:
            pass
        
        # Try any clickable with text
        try:
            elements = driver.find_elements(By.XPATH, f"//*[contains(text(), '{tab_name}')]")
            for elem in elements:
                if elem.is_displayed() and elem.is_enabled():
                    elem.click()
                    time.sleep(0.5)
                    return True
        except:
            pass
        
        return False
        
    except Exception as e:
        print(f"Click tab {tab_name} failed: {e}")
        return False


def fill_form(field_data: Dict[str, Any]) -> bool:
    """
    Fill form fields from dict.
    Keys are field labels/names, values are what to enter.
    Returns True if all fields filled successfully.
    """
    try:
        driver = get_driver()
        success = True
        
        for field_name, value in field_data.items():
            try:
                # Try by label
                try:
                    label = driver.find_element(By.XPATH, f"//label[contains(text(), '{field_name}')]")
                    field_id = label.get_attribute("for")
                    if field_id:
                        field = driver.find_element(By.ID, field_id)
                        field.clear()
                        field.send_keys(str(value))
                        continue
                except:
                    pass
                
                # Try by placeholder
                try:
                    field = driver.find_element(By.XPATH, f"//input[@placeholder='{field_name}' or contains(@placeholder, '{field_name}')]")
                    field.clear()
                    field.send_keys(str(value))
                    continue
                except:
                    pass
                
                # Try by name attribute
                try:
                    field = driver.find_element(By.NAME, field_name)
                    field.clear()
                    field.send_keys(str(value))
                    continue
                except:
                    pass
                
                # Try Helium TextField
                try:
                    write(str(value), into=TextField(field_name))
                    continue
                except:
                    pass
                
                success = False
                
            except Exception as e:
                print(f"Failed to fill field {field_name}: {e}")
                success = False
        
        return success
        
    except Exception as e:
        print(f"Fill form failed: {e}")
        return False


def click_button(text: str) -> bool:
    """
    Click button by text.
    Returns True if successful.
    """
    try:
        if Button(text).exists():
            click(Button(text))
            time.sleep(0.3)
            return True
        
        # Try with contains
        driver = get_driver()
        buttons = driver.find_elements(By.XPATH, f"//button[contains(text(), '{text}')]")
        for btn in buttons:
            if btn.is_displayed() and btn.is_enabled():
                btn.click()
                time.sleep(0.3)
                return True
        
        return False
        
    except Exception as e:
        print(f"Click button {text} failed: {e}")
        return False


def get_table_rows() -> List[Any]:
    """
    Get all rows from a table on the page.
    Returns list of row elements.
    """
    try:
        driver = get_driver()
        
        # Find table body rows
        rows = driver.find_elements(By.CSS_SELECTOR, "table tbody tr")
        if rows:
            return rows
        
        # Try other table structures
        rows = driver.find_elements(By.CSS_SELECTOR, "[role='rowgroup'] [role='row']")
        if rows:
            return rows
        
        return []
        
    except Exception as e:
        print(f"Get table rows failed: {e}")
        return []


def get_table_row_count() -> int:
    """
    Get count of table rows.
    """
    return len(get_table_rows())


def wait_for_toast(message: str = None, timeout: int = SHORT_TIMEOUT) -> bool:
    """
    Wait for success/error toast notification.
    Returns True if toast appeared.
    """
    try:
        driver = get_driver()
        
        # Common toast selectors
        toast_selectors = [
            "[role='alert']",
            ".toast",
            ".notification",
            "[class*='toast']",
            "[class*='alert']",
        ]
        
        for selector in toast_selectors:
            try:
                WebDriverWait(driver, timeout).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                
                if message:
                    toast = driver.find_element(By.CSS_SELECTOR, selector)
                    if message.lower() in toast.text.lower():
                        return True
                else:
                    return True
            except TimeoutException:
                continue
        
        # Try with text
        if message:
            try:
                wait_until(Text(message).exists, timeout_secs=timeout)
                return True
            except:
                pass
        
        return False
        
    except Exception as e:
        print(f"Wait for toast failed: {e}")
        return False


def close_modal() -> bool:
    """
    Close any open modal.
    Returns True if modal was closed.
    """
    try:
        driver = get_driver()
        
        # Try clicking X button
        close_selectors = [
            "button[aria-label='Close']",
            "button.close",
            "[class*='modal'] button:has(svg)",
            "[role='dialog'] button:first-child",
        ]
        
        for selector in close_selectors:
            try:
                close_btn = driver.find_element(By.CSS_SELECTOR, selector)
                if close_btn.is_displayed():
                    close_btn.click()
                    time.sleep(0.3)
                    return True
            except:
                continue
        
        # Try clicking Cancel button
        if Button("Cancel").exists():
            click(Button("Cancel"))
            time.sleep(0.3)
            return True
        
        # Try pressing Escape
        try:
            press(Keys.ESCAPE)
            time.sleep(0.3)
            return True
        except:
            pass
        
        return False
        
    except Exception as e:
        print(f"Close modal failed: {e}")
        return False


def is_modal_open() -> bool:
    """
    Check if a modal is currently open.
    """
    try:
        driver = get_driver()
        
        modal_selectors = [
            "[role='dialog']",
            ".modal.show",
            "[class*='modal'][class*='open']",
            "[class*='Modal']",
        ]
        
        for selector in modal_selectors:
            try:
                modal = driver.find_element(By.CSS_SELECTOR, selector)
                if modal.is_displayed():
                    return True
            except:
                continue
        
        return False
        
    except:
        return False


def click_add_button() -> bool:
    """
    Click the Add/New button (common in master forms).
    """
    add_texts = ["Add", "New", "Add New", "+ Add", "Create"]
    
    for text in add_texts:
        if click_button(text):
            return True
    
    return False


def click_save_button() -> bool:
    """
    Click the Save/Submit button.
    """
    save_texts = ["Save", "Submit", "Create", "Add", "Update"]
    
    for text in save_texts:
        if click_button(text):
            return True
    
    return False


def select_dropdown_option(dropdown_label: str, option_text: str) -> bool:
    """
    Select an option from a dropdown.
    """
    try:
        driver = get_driver()
        
        # Find the dropdown
        try:
            # By label
            label = driver.find_element(By.XPATH, f"//label[contains(text(), '{dropdown_label}')]")
            dropdown = label.find_element(By.XPATH, "following-sibling::select | ../select | ../div//select")
        except:
            # By direct select
            dropdown = driver.find_element(By.XPATH, f"//select[contains(@name, '{dropdown_label}')]")
        
        if dropdown:
            from selenium.webdriver.support.ui import Select
            select = Select(dropdown)
            select.select_by_visible_text(option_text)
            return True
        
        return False
        
    except Exception as e:
        print(f"Select dropdown failed: {e}")
        return False


def get_input_value(field_name: str) -> str:
    """
    Get current value of an input field.
    """
    try:
        driver = get_driver()
        
        # Try by name
        try:
            field = driver.find_element(By.NAME, field_name)
            return field.get_attribute("value") or ""
        except:
            pass
        
        # Try by id
        try:
            field = driver.find_element(By.ID, field_name)
            return field.get_attribute("value") or ""
        except:
            pass
        
        # Try by placeholder
        try:
            field = driver.find_element(By.XPATH, f"//input[@placeholder='{field_name}']")
            return field.get_attribute("value") or ""
        except:
            pass
        
        return ""
        
    except:
        return ""


def has_validation_error() -> bool:
    """
    Check if there are validation errors on the page.
    """
    try:
        driver = get_driver()
        
        error_selectors = [
            ".error",
            "[class*='error']",
            "[class*='invalid']",
            ".text-red-500",
            ".text-danger",
            "[aria-invalid='true']",
        ]
        
        for selector in error_selectors:
            try:
                errors = driver.find_elements(By.CSS_SELECTOR, selector)
                for error in errors:
                    if error.is_displayed() and error.text.strip():
                        return True
            except:
                continue
        
        return False
        
    except:
        return False


def get_page_title() -> str:
    """
    Get the page title or main heading.
    """
    try:
        driver = get_driver()
        
        # Try h1
        try:
            h1 = driver.find_element(By.TAG_NAME, "h1")
            if h1.text:
                return h1.text
        except:
            pass
        
        # Try document title
        return driver.title
        
    except:
        return ""





