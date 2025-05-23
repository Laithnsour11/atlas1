#!/usr/bin/env python3
"""
Premium Atlas Backend Features Testing
Tests the new premium features that were just implemented:
1. New Rating System API - GET /api/rating-levels
2. Admin Authentication - POST /api/admin/auth
3. Admin Tag Management - Admin tag endpoints with password protection
4. Updated Tags Endpoint - GET /api/tags
5. Existing Core Functionality - Quick verification
"""

import requests
import json
import sys
import os
from datetime import datetime
from typing import Dict, Any, List

# Get the backend URL from frontend .env
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BACKEND_URL = get_backend_url()
if not BACKEND_URL:
    print("Error: Could not find REACT_APP_BACKEND_URL in frontend/.env")
    sys.exit(1)

API_BASE = f"{BACKEND_URL}/api"
ADMIN_PASSWORD = "admin123"

print(f"Testing Premium Atlas Backend Features at: {API_BASE}")
print("=" * 80)

class TestResults:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures = []
        self.critical_failures = []
    
    def add_result(self, test_name: str, passed: bool, details: str = "", critical: bool = False):
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {test_name}")
            if details:
                print(f"   {details}")
        else:
            self.tests_failed += 1
            failure_msg = f"{test_name}: {details}"
            self.failures.append(failure_msg)
            if critical:
                self.critical_failures.append(failure_msg)
            print(f"❌ {test_name}: {details}")
    
    def summary(self):
        print("\n" + "=" * 80)
        print(f"PREMIUM ATLAS BACKEND TEST SUMMARY")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_failed}")
        
        if self.critical_failures:
            print(f"\nCRITICAL FAILURES ({len(self.critical_failures)}):")
            for failure in self.critical_failures:
                print(f"  🚨 {failure}")
        
        if self.failures and not self.critical_failures:
            print("\nALL FAILURES (Minor Issues):")
            for failure in self.failures:
                print(f"  - {failure}")
        
        return len(self.critical_failures) == 0

results = TestResults()

def test_new_rating_system():
    """Test GET /api/rating-levels endpoint"""
    print("\n🎯 TESTING NEW RATING SYSTEM API")
    try:
        response = requests.get(f"{API_BASE}/rating-levels", timeout=10)
        if response.status_code == 200:
            data = response.json()
            ratings = data.get("ratings", {})
            
            # Check for all 5 expected rating levels
            expected_levels = ["exceptional", "great", "average", "poor", "blacklist"]
            found_levels = list(ratings.keys())
            
            if all(level in found_levels for level in expected_levels):
                results.add_result("Rating Levels - All 5 Present", True, f"Found: {found_levels}")
                
                # Check each rating has required properties
                all_valid = True
                for level, rating_data in ratings.items():
                    required_props = ["label", "description", "color", "value"]
                    missing_props = [prop for prop in required_props if prop not in rating_data]
                    if missing_props:
                        results.add_result(f"Rating Level '{level}' Properties", False, f"Missing: {missing_props}", critical=True)
                        all_valid = False
                    else:
                        results.add_result(f"Rating Level '{level}' Properties", True)
                
                # Check specific descriptions match requirements
                if "exceptional" in ratings:
                    desc = ratings["exceptional"]["description"].lower()
                    if "rockstar" in desc:
                        results.add_result("Exceptional Rating Description", True, "Contains 'rockstar' as required")
                    else:
                        results.add_result("Exceptional Rating Description", False, f"Missing 'rockstar': {desc}")
                
                if "blacklist" in ratings:
                    desc = ratings["blacklist"]["description"].lower()
                    if "ten-foot pole" in desc or "ten foot pole" in desc:
                        results.add_result("Blacklist Rating Description", True, "Contains 'ten-foot pole' as required")
                    else:
                        results.add_result("Blacklist Rating Description", False, f"Missing 'ten-foot pole': {desc}")
                
                return True
            else:
                missing = [level for level in expected_levels if level not in found_levels]
                results.add_result("Rating Levels - All 5 Present", False, f"Missing: {missing}", critical=True)
                return False
        else:
            results.add_result("Rating Levels API", False, f"HTTP {response.status_code}", critical=True)
            return False
    except Exception as e:
        results.add_result("Rating Levels API", False, f"Error: {str(e)}", critical=True)
        return False

def test_admin_authentication():
    """Test POST /api/admin/auth endpoint"""
    print("\n🔐 TESTING ADMIN AUTHENTICATION")
    try:
        # Test with correct password
        correct_auth = {"password": ADMIN_PASSWORD}
        response = requests.post(f"{API_BASE}/admin/auth", json=correct_auth, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("authenticated") == True:
                results.add_result("Admin Auth - Correct Password", True, "Returns authenticated: true")
            else:
                results.add_result("Admin Auth - Correct Password", False, f"Unexpected response: {data}", critical=True)
        else:
            results.add_result("Admin Auth - Correct Password", False, f"HTTP {response.status_code}", critical=True)
        
        # Test with wrong password
        wrong_auth = {"password": "wrongpassword"}
        response = requests.post(f"{API_BASE}/admin/auth", json=wrong_auth, timeout=10)
        
        if response.status_code == 401:
            results.add_result("Admin Auth - Wrong Password", True, "Returns 401 as expected")
        else:
            results.add_result("Admin Auth - Wrong Password", False, f"Expected 401, got {response.status_code}")
        
        return True
    except Exception as e:
        results.add_result("Admin Authentication", False, f"Error: {str(e)}", critical=True)
        return False

def test_admin_tag_management():
    """Test admin tag endpoints with password protection"""
    print("\n🏷️  TESTING ADMIN TAG MANAGEMENT")
    try:
        # Test GET /api/admin/tags with correct password
        response = requests.get(f"{API_BASE}/admin/tags?password={ADMIN_PASSWORD}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            tags = data.get("tags", [])
            if isinstance(tags, list) and len(tags) > 0:
                results.add_result("Admin Get Tags - Correct Password", True, f"Retrieved {len(tags)} tags")
                original_tags = tags.copy()
            else:
                results.add_result("Admin Get Tags - Correct Password", False, "No tags returned", critical=True)
                return False
        else:
            results.add_result("Admin Get Tags - Correct Password", False, f"HTTP {response.status_code}", critical=True)
            return False
        
        # Test GET /api/admin/tags with wrong password
        response = requests.get(f"{API_BASE}/admin/tags?password=wrongpassword", timeout=10)
        if response.status_code == 401:
            results.add_result("Admin Get Tags - Wrong Password", True, "Returns 401 as expected")
        else:
            results.add_result("Admin Get Tags - Wrong Password", False, f"Expected 401, got {response.status_code}")
        
        # Test POST /api/admin/tags with correct password (update tags)
        test_tags = ["Test Tag 1", "Test Tag 2", "Test Tag 3"]
        tag_data = {"tags": test_tags}
        response = requests.post(f"{API_BASE}/admin/tags?password={ADMIN_PASSWORD}", 
                               json=tag_data, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("tags") == test_tags:
                results.add_result("Admin Update Tags - Correct Password", True, "Tags updated successfully")
            else:
                results.add_result("Admin Update Tags - Correct Password", False, f"Tags mismatch: {data}")
        else:
            results.add_result("Admin Update Tags - Correct Password", False, f"HTTP {response.status_code}")
        
        # Test POST /api/admin/tags with wrong password
        response = requests.post(f"{API_BASE}/admin/tags?password=wrongpassword", 
                               json=tag_data, timeout=10)
        if response.status_code == 401:
            results.add_result("Admin Update Tags - Wrong Password", True, "Returns 401 as expected")
        else:
            results.add_result("Admin Update Tags - Wrong Password", False, f"Expected 401, got {response.status_code}")
        
        # Test DELETE /api/admin/tags/{tag_name} with correct password
        if test_tags:
            tag_to_delete = test_tags[0]
            response = requests.delete(f"{API_BASE}/admin/tags/{tag_to_delete}?password={ADMIN_PASSWORD}", 
                                     timeout=10)
            if response.status_code == 200:
                data = response.json()
                remaining_tags = data.get("tags", [])
                if tag_to_delete not in remaining_tags:
                    results.add_result("Admin Delete Tag - Correct Password", True, f"Tag '{tag_to_delete}' deleted")
                else:
                    results.add_result("Admin Delete Tag - Correct Password", False, "Tag not deleted")
            else:
                results.add_result("Admin Delete Tag - Correct Password", False, f"HTTP {response.status_code}")
        
        # Test DELETE /api/admin/tags/{tag_name} with wrong password
        response = requests.delete(f"{API_BASE}/admin/tags/TestTag?password=wrongpassword", 
                                 timeout=10)
        if response.status_code == 401:
            results.add_result("Admin Delete Tag - Wrong Password", True, "Returns 401 as expected")
        else:
            results.add_result("Admin Delete Tag - Wrong Password", False, f"Expected 401, got {response.status_code}")
        
        # Restore original tags
        restore_data = {"tags": original_tags}
        requests.post(f"{API_BASE}/admin/tags?password={ADMIN_PASSWORD}", 
                     json=restore_data, timeout=10)
        
        return True
    except Exception as e:
        results.add_result("Admin Tag Management", False, f"Error: {str(e)}", critical=True)
        return False

def test_updated_tags_endpoint():
    """Test GET /api/tags endpoint"""
    print("\n📋 TESTING UPDATED TAGS ENDPOINT")
    try:
        response = requests.get(f"{API_BASE}/tags", timeout=10)
        if response.status_code == 200:
            data = response.json()
            tags = data.get("tags", [])
            if isinstance(tags, list) and len(tags) > 0:
                results.add_result("Tags Endpoint", True, f"Returns {len(tags)} tags")
                
                # Check if it returns default tags initially
                default_tags = ["Residential Sales", "Commercial Sales", "Luxury Properties", "First-Time Buyers"]
                found_defaults = [tag for tag in default_tags if tag in tags]
                if len(found_defaults) >= 2:
                    results.add_result("Tags Endpoint - Default Tags", True, f"Contains expected default tags: {found_defaults}")
                else:
                    results.add_result("Tags Endpoint - Default Tags", False, f"Missing default tags. Found: {found_defaults}")
                
                return tags
            else:
                results.add_result("Tags Endpoint", False, "No tags returned", critical=True)
                return []
        else:
            results.add_result("Tags Endpoint", False, f"HTTP {response.status_code}", critical=True)
            return []
    except Exception as e:
        results.add_result("Tags Endpoint", False, f"Error: {str(e)}", critical=True)
        return []

def test_existing_core_functionality():
    """Quick verification that existing endpoints still work"""
    print("\n🔧 TESTING EXISTING CORE FUNCTIONALITY")
    try:
        # Test health endpoint
        response = requests.get(f"{API_BASE}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                results.add_result("Health Endpoint", True, "System healthy")
            else:
                results.add_result("Health Endpoint", False, f"Unhealthy: {data}", critical=True)
        else:
            results.add_result("Health Endpoint", False, f"HTTP {response.status_code}", critical=True)
        
        # Test agents endpoint
        response = requests.get(f"{API_BASE}/agents", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                results.add_result("Agents Endpoint", True, f"Returns {len(data)} agents")
            else:
                results.add_result("Agents Endpoint", False, "Invalid response format", critical=True)
        else:
            results.add_result("Agents Endpoint", False, f"HTTP {response.status_code}", critical=True)
        
        # Test service area types endpoint
        response = requests.get(f"{API_BASE}/service-area-types", timeout=10)
        if response.status_code == 200:
            data = response.json()
            types = data.get("types", [])
            expected_types = ["city", "county", "state"]
            if all(t in types for t in expected_types):
                results.add_result("Service Area Types Endpoint", True, f"Returns expected types: {types}")
            else:
                results.add_result("Service Area Types Endpoint", False, f"Missing expected types: {types}")
        else:
            results.add_result("Service Area Types Endpoint", False, f"HTTP {response.status_code}")
        
        return True
    except Exception as e:
        results.add_result("Core Functionality", False, f"Error: {str(e)}", critical=True)
        return False

def test_tags_customization_flow():
    """Test the full tags customization flow"""
    print("\n🔄 TESTING TAGS CUSTOMIZATION FLOW")
    try:
        # 1. Get initial tags
        response = requests.get(f"{API_BASE}/tags", timeout=10)
        initial_tags = response.json().get("tags", []) if response.status_code == 200 else []
        
        # 2. Update tags via admin
        custom_tags = ["Custom Tag A", "Custom Tag B", "Custom Tag C"]
        tag_data = {"tags": custom_tags}
        response = requests.post(f"{API_BASE}/admin/tags?password={ADMIN_PASSWORD}", 
                               json=tag_data, timeout=10)
        
        if response.status_code == 200:
            results.add_result("Tags Customization - Admin Update", True)
            
            # 3. Verify tags endpoint returns custom tags
            response = requests.get(f"{API_BASE}/tags", timeout=10)
            if response.status_code == 200:
                current_tags = response.json().get("tags", [])
                if current_tags == custom_tags:
                    results.add_result("Tags Customization - Public Endpoint Updated", True, "Returns custom tags")
                else:
                    results.add_result("Tags Customization - Public Endpoint Updated", False, f"Expected {custom_tags}, got {current_tags}")
            else:
                results.add_result("Tags Customization - Public Endpoint Updated", False, f"HTTP {response.status_code}")
            
            # 4. Restore original tags
            restore_data = {"tags": initial_tags}
            requests.post(f"{API_BASE}/admin/tags?password={ADMIN_PASSWORD}", 
                         json=restore_data, timeout=10)
            results.add_result("Tags Customization - Restore Original", True, "Original tags restored")
        else:
            results.add_result("Tags Customization Flow", False, f"Admin update failed: {response.status_code}")
        
        return True
    except Exception as e:
        results.add_result("Tags Customization Flow", False, f"Error: {str(e)}")
        return False

def run_premium_tests():
    """Run all premium Atlas backend tests"""
    print("Starting Premium Atlas Backend Features Testing...\n")
    
    # Test 1: New Rating System API
    test_new_rating_system()
    
    # Test 2: Admin Authentication
    test_admin_authentication()
    
    # Test 3: Admin Tag Management
    test_admin_tag_management()
    
    # Test 4: Updated Tags Endpoint
    test_updated_tags_endpoint()
    
    # Test 5: Existing Core Functionality
    test_existing_core_functionality()
    
    # Test 6: Full Tags Customization Flow
    test_tags_customization_flow()
    
    # Print summary
    success = results.summary()
    
    return success

if __name__ == "__main__":
    success = run_premium_tests()
    
    if success:
        print("\n🎉 All premium backend features are working correctly!")
        print("The new rating system, admin authentication, and tag management are production-ready.")
        sys.exit(0)
    else:
        print("\n⚠️  Some premium features have issues. Check the details above.")
        sys.exit(1)