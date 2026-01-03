"""
Browser utilities for Helium Selenium tests
"""
import os
import time
from datetime import datetime
from pathlib import Path

from helium import (
    start_chrome,
    kill_browser,
    get_driver,
    wait_until,
    S,
    Text,
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, NoSuchElementException

import sys
sys.path.append(str(Path(__file__).parent.parent))
from config import SCREENSHOT_DIR, HEADLESS, BROWSER_WIDTH, BROWSER_HEIGHT, TIMEOUT


def setup_browser():
    """
    Initialize Chrome browser with webdriver-manager.
    Returns the Selenium WebDriver instance.
    """
    chrome_options = Options()
    
    if HEADLESS:
        chrome_options.add_argument("--headless=new")
    
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument(f"--window-size={BROWSER_WIDTH},{BROWSER_HEIGHT}")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-infobars")
    chrome_options.add_argument("--ignore-certificate-errors")
    
    # Use webdriver-manager to handle chromedriver
    service = Service(ChromeDriverManager().install())
    
    # Start Chrome with Helium
    start_chrome(options=chrome_options)
    
    driver = get_driver()
    driver.set_page_load_timeout(60)
    driver.implicitly_wait(5)
    
    return driver


def teardown_browser():
    """
    Close browser safely.
    """
    try:
        kill_browser()
    except Exception as e:
        print(f"Warning: Error closing browser: {e}")


def take_screenshot(name: str, error: str = None) -> str:
    """
    Capture screenshot with timestamp.
    Returns the path to the saved screenshot.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = "".join(c if c.isalnum() or c in "_-" else "_" for c in name)
    filename = f"{safe_name}_{timestamp}.png"
    filepath = SCREENSHOT_DIR / filename
    
    try:
        driver = get_driver()
        driver.save_screenshot(str(filepath))
        
        # If there's an error, save error details in a companion text file
        if error:
            error_file = filepath.with_suffix(".txt")
            with open(error_file, "w") as f:
                f.write(f"Test: {name}\n")
                f.write(f"Timestamp: {timestamp}\n")
                f.write(f"Error:\n{error}\n")
        
        return str(filepath)
    except Exception as e:
        print(f"Failed to take screenshot: {e}")
        return ""


def wait_for_page_load(timeout: int = TIMEOUT):
    """
    Wait until page is fully loaded.
    """
    try:
        driver = get_driver()
        WebDriverWait(driver, timeout).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        # Additional wait for React/Next.js hydration
        time.sleep(0.5)
        return True
    except TimeoutException:
        return False


def wait_for_element(selector: str, timeout: int = TIMEOUT, by: By = By.CSS_SELECTOR):
    """
    Wait for element to be present and visible.
    Returns the element or None if timeout.
    """
    try:
        driver = get_driver()
        element = WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located((by, selector))
        )
        return element
    except TimeoutException:
        return None


def wait_for_element_clickable(selector: str, timeout: int = TIMEOUT, by: By = By.CSS_SELECTOR):
    """
    Wait for element to be clickable.
    Returns the element or None if timeout.
    """
    try:
        driver = get_driver()
        element = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((by, selector))
        )
        return element
    except TimeoutException:
        return None


def is_element_present(selector: str, by: By = By.CSS_SELECTOR) -> bool:
    """
    Check if element exists on the page.
    """
    try:
        driver = get_driver()
        driver.find_element(by, selector)
        return True
    except NoSuchElementException:
        return False


def is_text_present(text: str) -> bool:
    """
    Check if text is visible on the page.
    """
    try:
        return Text(text).exists()
    except:
        return False


def get_element_text(selector: str, by: By = By.CSS_SELECTOR) -> str:
    """
    Get text content of an element.
    """
    try:
        driver = get_driver()
        element = driver.find_element(by, selector)
        return element.text
    except NoSuchElementException:
        return ""


def get_element_count(selector: str, by: By = By.CSS_SELECTOR) -> int:
    """
    Count elements matching selector.
    """
    try:
        driver = get_driver()
        elements = driver.find_elements(by, selector)
        return len(elements)
    except:
        return 0


def scroll_to_element(selector: str, by: By = By.CSS_SELECTOR):
    """
    Scroll element into view.
    """
    try:
        driver = get_driver()
        element = driver.find_element(by, selector)
        driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", element)
        time.sleep(0.3)
        return True
    except:
        return False


def get_current_url() -> str:
    """
    Get current page URL.
    """
    try:
        driver = get_driver()
        return driver.current_url
    except:
        return ""


def refresh_page():
    """
    Refresh the current page.
    """
    try:
        driver = get_driver()
        driver.refresh()
        wait_for_page_load()
        return True
    except:
        return False





