#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Atlas Real Estate Directory
Tests all API endpoints and database operations
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

print(f"Testing Atlas Backend API at: {API_BASE}")
print("=" * 60)

class TestResults:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures = []
    
    def add_result(self, test_name: str, passed: bool, details: str = ""):
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            self.tests_failed += 1
            self.failures.append(f"{test_name}: {details}")
            print(f"❌ {test_name}: {details}")
    
    def summary(self):
        print("\n" + "=" * 60)
        print(f"TEST SUMMARY")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_failed}")
        
        if self.failures:
            print("\nFAILURES:")
            for failure in self.failures:
                print(f"  - {failure}")
        
        return self.tests_failed == 0

results = TestResults()

def test_health_check():
    """Test the health check endpoint"""
    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                results.add_result("Health Check", True)
                return True
            else:
                results.add_result("Health Check", False, f"Unhealthy status: {data}")
                return False
        else:
            results.add_result("Health Check", False, f"HTTP {response.status_code}")
            return False
    except Exception as e:
        results.add_result("Health Check", False, f"Connection error: {str(e)}")
        return False

def test_root_endpoint():
    """Test the root API endpoint"""
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "Atlas API" in data.get("message", ""):
                results.add_result("Root Endpoint", True)
                return True
            else:
                results.add_result("Root Endpoint", False, f"Unexpected message: {data}")
                return False
        else:
            results.add_result("Root Endpoint", False, f"HTTP {response.status_code}")
            return False
    except Exception as e:
        results.add_result("Root Endpoint", False, f"Error: {str(e)}")
        return False

def test_create_professional():
    """Test creating a new professional"""
    try:
        professional_data = {
            "name": "Test Professional",
            "type": "agent",
            "company": "Test Company",
            "phone": "(555) 999-0000",
            "email": "test@example.com",
            "website": "https://test.com",
            "service_areas": ["Test City"],
            "specialties": ["testing"],
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        response = requests.post(f"{API_BASE}/professionals", 
                               json=professional_data, 
                               timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("name") == "Test Professional" and data.get("id"):
                results.add_result("Create Professional", True)
                return data.get("id")
            else:
                results.add_result("Create Professional", False, f"Invalid response: {data}")
                return None
        else:
            results.add_result("Create Professional", False, f"HTTP {response.status_code}: {response.text}")
            return None
    except Exception as e:
        results.add_result("Create Professional", False, f"Error: {str(e)}")
        return None

def test_get_professionals():
    """Test getting all professionals"""
    try:
        response = requests.get(f"{API_BASE}/professionals", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                results.add_result("Get All Professionals", True)
                return data
            else:
                results.add_result("Get All Professionals", False, f"Expected list, got: {type(data)}")
                return []
        else:
            results.add_result("Get All Professionals", False, f"HTTP {response.status_code}")
            return []
    except Exception as e:
        results.add_result("Get All Professionals", False, f"Error: {str(e)}")
        return []

def test_get_professional_by_id(professional_id: str):
    """Test getting a specific professional by ID"""
    if not professional_id:
        results.add_result("Get Professional by ID", False, "No professional ID provided")
        return
    
    try:
        response = requests.get(f"{API_BASE}/professionals/{professional_id}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("id") == professional_id:
                results.add_result("Get Professional by ID", True)
            else:
                results.add_result("Get Professional by ID", False, f"ID mismatch: {data}")
        else:
            results.add_result("Get Professional by ID", False, f"HTTP {response.status_code}")
    except Exception as e:
        results.add_result("Get Professional by ID", False, f"Error: {str(e)}")

def test_search_professionals():
    """Test search functionality"""
    try:
        # Test search by name
        response = requests.get(f"{API_BASE}/professionals?search=Test", timeout=10)
        if response.status_code == 200:
            data = response.json()
            results.add_result("Search Professionals by Name", True)
        else:
            results.add_result("Search Professionals by Name", False, f"HTTP {response.status_code}")
        
        # Test filter by type
        response = requests.get(f"{API_BASE}/professionals?type=agent", timeout=10)
        if response.status_code == 200:
            data = response.json()
            results.add_result("Filter Professionals by Type", True)
        else:
            results.add_result("Filter Professionals by Type", False, f"HTTP {response.status_code}")
            
    except Exception as e:
        results.add_result("Search Professionals", False, f"Error: {str(e)}")

def test_create_comment(professional_id: str):
    """Test creating a comment"""
    if not professional_id:
        results.add_result("Create Comment", False, "No professional ID provided")
        return None
    
    try:
        comment_data = {
            "professional_id": professional_id,
            "author_name": "Test Reviewer",
            "content": "This is a test comment",
            "rating": 5
        }
        
        response = requests.post(f"{API_BASE}/comments", 
                               json=comment_data, 
                               timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("professional_id") == professional_id:
                results.add_result("Create Comment", True)
                return data.get("id")
            else:
                results.add_result("Create Comment", False, f"Invalid response: {data}")
                return None
        else:
            results.add_result("Create Comment", False, f"HTTP {response.status_code}: {response.text}")
            return None
    except Exception as e:
        results.add_result("Create Comment", False, f"Error: {str(e)}")
        return None

def test_get_professional_comments(professional_id: str):
    """Test getting comments for a professional"""
    if not professional_id:
        results.add_result("Get Professional Comments", False, "No professional ID provided")
        return
    
    try:
        response = requests.get(f"{API_BASE}/professionals/{professional_id}/comments", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                results.add_result("Get Professional Comments", True)
            else:
                results.add_result("Get Professional Comments", False, f"Expected list, got: {type(data)}")
        else:
            results.add_result("Get Professional Comments", False, f"HTTP {response.status_code}")
    except Exception as e:
        results.add_result("Get Professional Comments", False, f"Error: {str(e)}")

def test_create_suggestion():
    """Test creating a suggestion"""
    try:
        suggestion_data = {
            "suggestion_type": "new_contact",
            "content": "This is a test suggestion",
            "submitter_name": "Test User",
            "submitter_email": "testuser@example.com"
        }
        
        response = requests.post(f"{API_BASE}/suggestions", 
                               json=suggestion_data, 
                               timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "id" in data:
                results.add_result("Create Suggestion", True)
            else:
                results.add_result("Create Suggestion", False, f"Invalid response: {data}")
        else:
            results.add_result("Create Suggestion", False, f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_result("Create Suggestion", False, f"Error: {str(e)}")

def test_geo_search():
    """Test geo-location search"""
    try:
        # Test with NYC coordinates
        response = requests.get(f"{API_BASE}/professionals/near?latitude=40.7128&longitude=-74.0060&radius_miles=25", 
                              timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                results.add_result("Geo-location Search", True)
            else:
                results.add_result("Geo-location Search", False, f"Expected list, got: {type(data)}")
        else:
            results.add_result("Geo-location Search", False, f"HTTP {response.status_code}")
    except Exception as e:
        results.add_result("Geo-location Search", False, f"Error: {str(e)}")

def test_error_handling():
    """Test error handling for invalid requests"""
    try:
        # Test invalid professional ID
        response = requests.get(f"{API_BASE}/professionals/invalid-id", timeout=10)
        if response.status_code == 404 or response.status_code == 422:
            results.add_result("Error Handling - Invalid ID", True)
        else:
            results.add_result("Error Handling - Invalid ID", False, f"Expected 404/422, got {response.status_code}")
        
        # Test invalid comment data
        response = requests.post(f"{API_BASE}/comments", json={}, timeout=10)
        if response.status_code >= 400:
            results.add_result("Error Handling - Invalid Comment", True)
        else:
            results.add_result("Error Handling - Invalid Comment", False, f"Expected error, got {response.status_code}")
            
    except Exception as e:
        results.add_result("Error Handling", False, f"Error: {str(e)}")

def run_all_tests():
    """Run all backend tests"""
    print("Starting comprehensive backend API tests...\n")
    
    # Test basic connectivity
    health_ok = test_health_check()
    test_root_endpoint()
    
    if not health_ok:
        print("\n⚠️  Health check failed - database may not be properly configured")
        print("Some tests may fail due to database connectivity issues")
    
    # Test professionals API
    professional_id = test_create_professional()
    professionals = test_get_professionals()
    
    if professional_id:
        test_get_professional_by_id(professional_id)
    
    test_search_professionals()
    
    # Test comments API
    if professional_id:
        comment_id = test_create_comment(professional_id)
        test_get_professional_comments(professional_id)
    
    # Test suggestions API
    test_create_suggestion()
    
    # Test geo-location search
    test_geo_search()
    
    # Test error handling
    test_error_handling()
    
    # Print summary
    success = results.summary()
    
    return success

if __name__ == "__main__":
    success = run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend API is working correctly.")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Check the details above.")
        sys.exit(1)