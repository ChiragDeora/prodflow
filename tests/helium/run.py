#!/usr/bin/env python3
"""
Main Test Runner for Helium Selenium Tests
Runs all test modules in order and generates Excel report
"""
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Callable

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import BASE_URL, SCREENSHOT_DIR, REPORT_DIR
from utils.browser import setup_browser, teardown_browser, take_screenshot, wait_for_page_load
from utils.reporter import create_report_workbook, add_test_result, save_report, generate_summary

# Import test modules
import test_auth
import test_masters
import test_store
import test_prod_planner
import test_production
import test_quality
import test_maintenance
import test_reports
import test_approvals
import test_profile
import test_admin


def setup_environment():
    """Create necessary directories and initialize environment"""
    print("\n" + "=" * 60)
    print("HELIUM SELENIUM TEST RUNNER")
    print("=" * 60)
    print(f"\nBase URL: {BASE_URL}")
    print(f"Screenshot Dir: {SCREENSHOT_DIR}")
    print(f"Report Dir: {REPORT_DIR}")
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60 + "\n")
    
    # Ensure directories exist
    SCREENSHOT_DIR.mkdir(exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)


def run_single_test(test_func: Callable, module_name: str) -> Dict[str, Any]:
    """
    Run a single test function with timing and error handling.
    Returns a dict with test results.
    """
    test_name = test_func.__name__
    start_time = time.time()
    
    result = {
        "module": module_name,
        "test_name": test_name,
        "status": "PASS",
        "duration": 0,
        "error": None,
        "screenshot": None,
    }
    
    try:
        # Run the test
        test_func()
        result["status"] = "PASS"
        print(f"  ✓ {test_name}")
        
    except AssertionError as e:
        result["status"] = "FAIL"
        result["error"] = str(e)
        result["screenshot"] = capture_failure(test_name, str(e))
        print(f"  ✗ {test_name} - ASSERTION: {str(e)[:50]}")
        
    except Exception as e:
        result["status"] = "FAIL"
        result["error"] = f"{type(e).__name__}: {str(e)}"
        result["screenshot"] = capture_failure(test_name, traceback.format_exc())
        print(f"  ✗ {test_name} - ERROR: {type(e).__name__}")
    
    finally:
        result["duration"] = time.time() - start_time
    
    return result


def capture_failure(test_name: str, error: str) -> str:
    """
    Take screenshot on failure and return path.
    """
    try:
        return take_screenshot(test_name, error)
    except Exception as e:
        print(f"    Warning: Could not capture screenshot: {e}")
        return ""


def run_test_module(module_name: str, test_functions: List[Callable]) -> List[Dict[str, Any]]:
    """
    Execute all tests in a module.
    Returns list of test results.
    """
    print(f"\n{'─' * 40}")
    print(f"MODULE: {module_name} ({len(test_functions)} tests)")
    print('─' * 40)
    
    results = []
    
    for test_func in test_functions:
        result = run_single_test(test_func, module_name)
        results.append(result)
    
    # Module summary
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    print(f"\n  Module Summary: {passed} passed, {failed} failed")
    
    return results


def create_excel_report(results: List[Dict[str, Any]]) -> str:
    """
    Generate Excel report from test results.
    Returns path to saved report.
    """
    print("\n" + "=" * 60)
    print("GENERATING EXCEL REPORT")
    print("=" * 60)
    
    wb = create_report_workbook()
    
    for result in results:
        add_test_result(
            wb,
            module=result["module"],
            test_name=result["test_name"],
            status=result["status"],
            duration=result["duration"],
            error=result.get("error"),
            screenshot=result.get("screenshot"),
        )
    
    report_path = save_report(wb)
    print(f"\nReport saved to: {report_path}")
    
    return report_path


def print_final_summary(results: List[Dict[str, Any]], report_path: str):
    """
    Print final test run summary.
    """
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    skipped = sum(1 for r in results if r["status"] == "SKIP")
    total_duration = sum(r["duration"] for r in results)
    pass_rate = (passed / total * 100) if total > 0 else 0
    
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(f"""
    Total Tests:    {total}
    Passed:         {passed} ✓
    Failed:         {failed} ✗
    Skipped:        {skipped} ○
    Pass Rate:      {pass_rate:.1f}%
    Total Duration: {total_duration:.2f}s
    
    Report: {report_path}
    """)
    print("=" * 60)
    
    # Print failed tests
    if failed > 0:
        print("\nFAILED TESTS:")
        print("-" * 40)
        for r in results:
            if r["status"] == "FAIL":
                print(f"  • {r['module']}: {r['test_name']}")
                if r.get("error"):
                    print(f"    Error: {r['error'][:80]}...")
        print()


def main():
    """
    Main entry point - orchestrates all tests.
    """
    start_time = time.time()
    results = []
    
    # 1. Setup
    setup_environment()
    
    try:
        # 2. Initialize browser
        print("Starting browser...")
        setup_browser()
        print("Browser started successfully!\n")
        
        # 3. Define test modules in order
        test_modules = [
            ("Auth", test_auth.get_all_tests()),
            ("Masters", test_masters.get_all_tests()),
            ("Store & Dispatch", test_store.get_all_tests()),
            ("Prod Planner", test_prod_planner.get_all_tests()),
            ("Production", test_production.get_all_tests()),
            ("Quality", test_quality.get_all_tests()),
            ("Maintenance", test_maintenance.get_all_tests()),
            ("Reports", test_reports.get_all_tests()),
            ("Approvals", test_approvals.get_all_tests()),
            ("Profile", test_profile.get_all_tests()),
            ("Admin", test_admin.get_all_tests()),
        ]
        
        # 4. Run all test modules
        for module_name, test_functions in test_modules:
            module_results = run_test_module(module_name, test_functions)
            results.extend(module_results)
        
        # 5. Generate Excel report
        report_path = create_excel_report(results)
        
        # 6. Print summary
        print_final_summary(results, report_path)
        
    except Exception as e:
        print(f"\n\nCRITICAL ERROR: {e}")
        traceback.print_exc()
        
    finally:
        # 7. Cleanup
        print("\nClosing browser...")
        teardown_browser()
        print("Browser closed.")
    
    # 8. Calculate and print total time
    total_time = time.time() - start_time
    print(f"\nTotal execution time: {total_time:.2f}s")
    
    # 9. Exit with appropriate code
    failed_count = sum(1 for r in results if r["status"] == "FAIL")
    
    if failed_count > 0:
        print(f"\n❌ {failed_count} tests failed. Exiting with code 1.")
        sys.exit(1)
    else:
        print("\n✅ All tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()





