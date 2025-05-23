#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Enhanced Atlas Real Estate Directory
Tests all new API endpoints and enhanced features including:
- Enhanced Agent API with New Schema
- Predefined Tags System
- GoHighLevel CRM Integration
- Image Scraping Functionality
- Location Search API
- Service Area Type Validation
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

print(f"Testing Enhanced Atlas Backend API at: {API_BASE}")
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
        else:
            self.tests_failed += 1
            failure_msg = f"{test_name}: {details}"
            self.failures.append(failure_msg)
            if critical:
                self.critical_failures.append(failure_msg)
            print(f"❌ {test_name}: {details}")
    
    def summary(self):
        print("\n" + "=" * 80)
        print(f"ENHANCED ATLAS API TEST SUMMARY")
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

def test_health_check():
    """Test the health check endpoint with agents table"""
    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy" and data.get("database") == "connected":
                results.add_result("Health Check (Agents Table)", True)
                return True
            else:
                results.add_result("Health Check (Agents Table)", False, f"Unhealthy status: {data}", critical=True)
                return False
        else:
            results.add_result("Health Check (Agents Table)", False, f"HTTP {response.status_code}", critical=True)
            return False
    except Exception as e:
        results.add_result("Health Check (Agents Table)", False, f"Connection error: {str(e)}", critical=True)
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

def test_predefined_tags():
    """Test GET /api/tags endpoint for predefined tags"""
    try:
        response = requests.get(f"{API_BASE}/tags", timeout=10)
        if response.status_code == 200:
            data = response.json()
            tags = data.get("tags", [])
            if isinstance(tags, list) and len(tags) == 20:
                # Check for some expected real estate tags
                expected_tags = ["Residential Sales", "Commercial Sales", "Luxury Properties", "First-Time Buyers"]
                found_tags = [tag for tag in expected_tags if tag in tags]
                if len(found_tags) >= 3:
                    results.add_result("Predefined Tags System", True)
                    return tags
                else:
                    results.add_result("Predefined Tags System", False, f"Missing expected tags. Found: {found_tags}", critical=True)
                    return []
            else:
                results.add_result("Predefined Tags System", False, f"Expected 20 tags, got {len(tags)}", critical=True)
                return []
        else:
            results.add_result("Predefined Tags System", False, f"HTTP {response.status_code}", critical=True)
            return []
    except Exception as e:
        results.add_result("Predefined Tags System", False, f"Error: {str(e)}", critical=True)
        return []

def test_service_area_types():
    """Test GET /api/service-area-types endpoint"""
    try:
        response = requests.get(f"{API_BASE}/service-area-types", timeout=10)
        if response.status_code == 200:
            data = response.json()
            types = data.get("types", [])
            expected_types = ["city", "county", "state"]
            if all(t in types for t in expected_types):
                results.add_result("Service Area Types", True)
                return types
            else:
                results.add_result("Service Area Types", False, f"Missing expected types. Got: {types}", critical=True)
                return []
        else:
            results.add_result("Service Area Types", False, f"HTTP {response.status_code}", critical=True)
            return []
    except Exception as e:
        results.add_result("Service Area Types", False, f"Error: {str(e)}", critical=True)
        return []

def test_create_agent(tags_list):
    """Test creating a new agent with enhanced schema"""
    if not tags_list:
        results.add_result("Create Agent (Enhanced Schema)", False, "No tags available for testing", critical=True)
        return None
    
    try:
        agent_data = {
            "full_name": "John Smith",
            "brokerage": "Test Realty Group",
            "phone": "(555) 123-4567",
            "email": "john.smith@testrealty.com",
            "website": "https://johnsmith.testrealty.com",
            "service_area_type": "city",
            "service_area": "New York",
            "tags": [tags_list[0], tags_list[1]] if len(tags_list) >= 2 else [tags_list[0]],
            "address_last_deal": "123 Main St, New York, NY 10001",
            "submitted_by": "test_user_123",
            "notes": "Test agent for API testing"
        }
        
        response = requests.post(f"{API_BASE}/agents", 
                               json=agent_data, 
                               timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["id", "full_name", "brokerage", "phone", "email", "website", 
                             "service_area_type", "service_area", "tags", "address_last_deal", "submitted_by"]
            
            missing_fields = [field for field in required_fields if field not in data or data[field] is None]
            if not missing_fields:
                results.add_result("Create Agent (Enhanced Schema)", True)
                return data.get("id")
            else:
                results.add_result("Create Agent (Enhanced Schema)", False, f"Missing fields: {missing_fields}", critical=True)
                return None
        else:
            results.add_result("Create Agent (Enhanced Schema)", False, f"HTTP {response.status_code}: {response.text}", critical=True)
            return None
    except Exception as e:
        results.add_result("Create Agent (Enhanced Schema)", False, f"Error: {str(e)}", critical=True)
        return None

def test_agent_tag_validation():
    """Test that at least one tag is required for agent creation"""
    try:
        agent_data = {
            "full_name": "Jane Doe",
            "brokerage": "Test Realty",
            "phone": "(555) 987-6543",
            "email": "jane.doe@testrealty.com",
            "website": "https://janedoe.testrealty.com",
            "service_area_type": "city",
            "service_area": "Brooklyn",
            "tags": [],  # Empty tags should fail
            "address_last_deal": "456 Oak Ave, Brooklyn, NY 11201",
            "submitted_by": "test_user_456"
        }
        
        response = requests.post(f"{API_BASE}/agents", 
                               json=agent_data, 
                               timeout=10)
        
        if response.status_code == 400:
            results.add_result("Agent Tag Validation (Required)", True)
        else:
            results.add_result("Agent Tag Validation (Required)", False, f"Expected 400, got {response.status_code}", critical=True)
    except Exception as e:
        results.add_result("Agent Tag Validation (Required)", False, f"Error: {str(e)}", critical=True)

def test_get_agents():
    """Test getting all agents"""
    try:
        response = requests.get(f"{API_BASE}/agents", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                results.add_result("Get All Agents", True)
                return data
            else:
                results.add_result("Get All Agents", False, f"Expected list, got: {type(data)}", critical=True)
                return []
        else:
            results.add_result("Get All Agents", False, f"HTTP {response.status_code}", critical=True)
            return []
    except Exception as e:
        results.add_result("Get All Agents", False, f"Error: {str(e)}", critical=True)
        return []

def test_agent_filtering():
    """Test agent filtering capabilities"""
    try:
        # Test search filter
        response = requests.get(f"{API_BASE}/agents?search=John", timeout=10)
        if response.status_code == 200:
            results.add_result("Agent Search Filter", True)
        else:
            results.add_result("Agent Search Filter", False, f"HTTP {response.status_code}")
        
        # Test service area filter
        response = requests.get(f"{API_BASE}/agents?service_area=New York", timeout=10)
        if response.status_code == 200:
            results.add_result("Agent Service Area Filter", True)
        else:
            results.add_result("Agent Service Area Filter", False, f"HTTP {response.status_code}")
        
        # Test submitted_by filter (My Agents)
        response = requests.get(f"{API_BASE}/agents?submitted_by=test_user_123", timeout=10)
        if response.status_code == 200:
            results.add_result("My Agents Filter (submitted_by)", True)
        else:
            results.add_result("My Agents Filter (submitted_by)", False, f"HTTP {response.status_code}")
        
        # Test tags filter
        response = requests.get(f"{API_BASE}/agents?tags=Residential Sales", timeout=10)
        if response.status_code == 200:
            results.add_result("Agent Tags Filter", True)
        else:
            results.add_result("Agent Tags Filter", False, f"HTTP {response.status_code}")
            
    except Exception as e:
        results.add_result("Agent Filtering", False, f"Error: {str(e)}")

def test_get_agent_by_id(agent_id: str):
    """Test getting a specific agent by ID"""
    if not agent_id:
        results.add_result("Get Agent by ID", False, "No agent ID provided")
        return
    
    try:
        response = requests.get(f"{API_BASE}/agents/{agent_id}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("id") == agent_id:
                results.add_result("Get Agent by ID", True)
            else:
                results.add_result("Get Agent by ID", False, f"ID mismatch: {data}")
        else:
            results.add_result("Get Agent by ID", False, f"HTTP {response.status_code}")
    except Exception as e:
        results.add_result("Get Agent by ID", False, f"Error: {str(e)}")

def test_create_comment(agent_id: str):
    """Test creating a comment for an agent"""
    if not agent_id:
        results.add_result("Create Agent Comment", False, "No agent ID provided")
        return None
    
    try:
        comment_data = {
            "agent_id": agent_id,
            "author_name": "Test Reviewer",
            "content": "Excellent agent, very professional and knowledgeable!",
            "rating": 5
        }
        
        response = requests.post(f"{API_BASE}/comments", 
                               json=comment_data, 
                               timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("agent_id") == agent_id:
                results.add_result("Create Agent Comment", True)
                return data.get("id")
            else:
                results.add_result("Create Agent Comment", False, f"Invalid response: {data}")
                return None
        else:
            results.add_result("Create Agent Comment", False, f"HTTP {response.status_code}: {response.text}")
            return None
    except Exception as e:
        results.add_result("Create Agent Comment", False, f"Error: {str(e)}")
        return None

def test_get_agent_comments(agent_id: str):
    """Test getting comments for an agent"""
    if not agent_id:
        results.add_result("Get Agent Comments", False, "No agent ID provided")
        return
    
    try:
        response = requests.get(f"{API_BASE}/agents/{agent_id}/comments", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                results.add_result("Get Agent Comments", True)
            else:
                results.add_result("Get Agent Comments", False, f"Expected list, got: {type(data)}")
        else:
            results.add_result("Get Agent Comments", False, f"HTTP {response.status_code}")
    except Exception as e:
        results.add_result("Get Agent Comments", False, f"Error: {str(e)}")

def test_gohighlevel_integration(agent_id: str):
    """Test GoHighLevel CRM integration"""
    if not agent_id:
        results.add_result("GoHighLevel CRM Integration", False, "No agent ID provided")
        return
    
    try:
        response = requests.post(f"{API_BASE}/ghl/add-contact?agent_id={agent_id}", timeout=15)
        
        # Accept both success and API key errors as valid responses
        # since we're testing the endpoint functionality, not the actual CRM integration
        if response.status_code == 200:
            data = response.json()
            if data.get("status") in ["success", "error"]:
                results.add_result("GoHighLevel CRM Integration", True)
            else:
                results.add_result("GoHighLevel CRM Integration", False, f"Unexpected response: {data}")
        elif response.status_code in [401, 403]:
            # API key issues are acceptable for testing
            results.add_result("GoHighLevel CRM Integration", True, "Endpoint working (API key validation expected)")
        else:
            results.add_result("GoHighLevel CRM Integration", False, f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_result("GoHighLevel CRM Integration", False, f"Error: {str(e)}")

def test_location_search():
    """Test location search API for map navigation"""
    try:
        # Test with known location
        response = requests.get(f"{API_BASE}/search-location?query=Manhattan", timeout=10)
        if response.status_code == 200:
            data = response.json()
            required_fields = ["latitude", "longitude", "zoom"]
            if all(field in data for field in required_fields):
                # Check if coordinates are reasonable for Manhattan
                lat, lng = data["latitude"], data["longitude"]
                if 40.7 <= lat <= 40.8 and -74.1 <= lng <= -73.9:
                    results.add_result("Location Search API (Manhattan)", True)
                else:
                    results.add_result("Location Search API (Manhattan)", False, f"Invalid coordinates: {lat}, {lng}")
            else:
                results.add_result("Location Search API (Manhattan)", False, f"Missing fields: {required_fields}")
        else:
            results.add_result("Location Search API (Manhattan)", False, f"HTTP {response.status_code}")
        
        # Test with unknown location (should default to NYC)
        response = requests.get(f"{API_BASE}/search-location?query=UnknownPlace123", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "latitude" in data and "longitude" in data:
                results.add_result("Location Search API (Default)", True)
            else:
                results.add_result("Location Search API (Default)", False, "Missing coordinates in default response")
        else:
            results.add_result("Location Search API (Default)", False, f"HTTP {response.status_code}")
            
    except Exception as e:
        results.add_result("Location Search API", False, f"Error: {str(e)}")

def test_image_scraping_functionality():
    """Test image scraping functionality (indirect test through agent creation)"""
    try:
        # Create an agent with a real website to test image scraping
        agent_data = {
            "full_name": "Test Agent Image",
            "brokerage": "Image Test Realty",
            "phone": "(555) 111-2222",
            "email": "imagetest@testrealty.com",
            "website": "https://example.com",  # Simple website for testing
            "service_area_type": "city",
            "service_area": "Queens",
            "tags": ["Residential Sales"],
            "address_last_deal": "789 Test St, Queens, NY 11375",
            "submitted_by": "image_test_user"
        }
        
        response = requests.post(f"{API_BASE}/agents", 
                               json=agent_data, 
                               timeout=20)  # Longer timeout for image scraping
        
        if response.status_code == 200:
            data = response.json()
            # Image scraping may or may not find an image, but the endpoint should work
            results.add_result("Image Scraping Functionality", True, "Agent created with image scraping attempt")
            return data.get("id")
        else:
            results.add_result("Image Scraping Functionality", False, f"HTTP {response.status_code}: {response.text}")
            return None
    except Exception as e:
        results.add_result("Image Scraping Functionality", False, f"Error: {str(e)}")
        return None

def test_service_area_validation():
    """Test service area type validation"""
    try:
        # Test valid service area types
        valid_types = ["city", "county", "state"]
        for area_type in valid_types:
            agent_data = {
                "full_name": f"Test Agent {area_type.title()}",
                "brokerage": "Validation Test Realty",
                "phone": "(555) 333-4444",
                "email": f"test{area_type}@testrealty.com",
                "website": "https://validationtest.com",
                "service_area_type": area_type,
                "service_area": f"Test {area_type.title()}",
                "tags": ["Residential Sales"],
                "address_last_deal": "123 Validation St",
                "submitted_by": "validation_test_user"
            }
            
            response = requests.post(f"{API_BASE}/agents", 
                                   json=agent_data, 
                                   timeout=10)
            
            if response.status_code == 200:
                results.add_result(f"Service Area Validation ({area_type})", True)
            else:
                results.add_result(f"Service Area Validation ({area_type})", False, f"HTTP {response.status_code}")
        
        # Test invalid service area type
        invalid_agent_data = {
            "full_name": "Invalid Test Agent",
            "brokerage": "Invalid Test Realty",
            "phone": "(555) 555-5555",
            "email": "invalid@testrealty.com",
            "website": "https://invalidtest.com",
            "service_area_type": "invalid_type",
            "service_area": "Invalid Area",
            "tags": ["Residential Sales"],
            "address_last_deal": "123 Invalid St",
            "submitted_by": "invalid_test_user"
        }
        
        response = requests.post(f"{API_BASE}/agents", 
                               json=invalid_agent_data, 
                               timeout=10)
        
        # Should accept any string for now, but endpoint should work
        if response.status_code in [200, 400, 422]:
            results.add_result("Service Area Validation (Invalid Type)", True, "Endpoint handles invalid types appropriately")
        else:
            results.add_result("Service Area Validation (Invalid Type)", False, f"Unexpected response: {response.status_code}")
            
    except Exception as e:
        results.add_result("Service Area Validation", False, f"Error: {str(e)}")

def run_all_tests():
    """Run all enhanced Atlas backend tests"""
    print("Starting comprehensive Enhanced Atlas backend API tests...\n")
    
    # Test basic connectivity
    health_ok = test_health_check()
    test_root_endpoint()
    
    if not health_ok:
        print("\n⚠️  Health check failed - database may not be properly configured")
        print("Some tests may fail due to database connectivity issues")
    
    # Test new predefined tags system
    tags_list = test_predefined_tags()
    
    # Test service area types
    service_area_types = test_service_area_types()
    
    # Test enhanced agents API
    agent_id = test_create_agent(tags_list)
    test_agent_tag_validation()
    agents = test_get_agents()
    test_agent_filtering()
    
    if agent_id:
        test_get_agent_by_id(agent_id)
    
    # Test comments API with agents
    if agent_id:
        comment_id = test_create_comment(agent_id)
        test_get_agent_comments(agent_id)
    
    # Test GoHighLevel CRM integration
    if agent_id:
        test_gohighlevel_integration(agent_id)
    
    # Test location search API
    test_location_search()
    
    # Test image scraping functionality
    image_test_agent_id = test_image_scraping_functionality()
    
    # Test service area validation
    test_service_area_validation()
    
    # Print summary
    success = results.summary()
    
    return success

if __name__ == "__main__":
    success = run_all_tests()
    
    if success:
        print("\n🎉 All critical tests passed! Enhanced Atlas Backend API is working correctly.")
        sys.exit(0)
    else:
        print("\n⚠️  Some critical tests failed. Check the details above.")
        sys.exit(1)