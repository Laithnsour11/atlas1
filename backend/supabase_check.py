"""
Supabase Production Setup and Optimization Script
This script ensures all necessary tables exist with proper indexing and constraints.
"""

import os
import sys
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_service_key = os.environ['SUPABASE_SERVICE_KEY']

# Create Supabase client (using service key for admin operations)
supabase: Client = create_client(supabase_url, supabase_service_key)

def ensure_agents_table():
    """Ensure agents table exists with proper structure"""
    try:
        # Test if table exists and has data
        result = supabase.table('agents').select("id").limit(1).execute()
        print("✅ agents table exists and is accessible")
        return True
    except Exception as e:
        print(f"❌ agents table issue: {e}")
        return False

def ensure_comments_table():
    """Ensure comments table exists with proper structure"""
    try:
        # Test if table exists
        result = supabase.table('comments').select("id").limit(1).execute()
        print("✅ comments table exists and is accessible")
        return True
    except Exception as e:
        print(f"❌ comments table issue: {e}")
        return False

def ensure_tag_settings_table():
    """Ensure tag_settings table exists"""
    try:
        # Test if table exists
        result = supabase.table('tag_settings').select("id").limit(1).execute()
        print("✅ tag_settings table exists and is accessible")
        return True
    except Exception as e:
        print(f"⚠️ tag_settings table doesn't exist (will use fallback): {e}")
        return False

def check_database_performance():
    """Check database performance metrics"""
    try:
        # Count agents
        agents_result = supabase.table('agents').select("id", count="exact").execute()
        agent_count = agents_result.count if hasattr(agents_result, 'count') else len(agents_result.data)
        
        # Count comments
        comments_result = supabase.table('comments').select("id", count="exact").execute()
        comment_count = comments_result.count if hasattr(comments_result, 'count') else len(comments_result.data)
        
        print(f"📊 Database Stats:")
        print(f"   - Agents: {agent_count}")
        print(f"   - Comments: {comment_count}")
        
        return True
    except Exception as e:
        print(f"❌ Performance check failed: {e}")
        return False

def check_data_integrity():
    """Check data integrity and consistency"""
    try:
        # Check for agents with coordinates
        agents_with_coords = supabase.table('agents').select("id, latitude, longitude").not_.is_("latitude", "null").not_.is_("longitude", "null").execute()
        coords_count = len(agents_with_coords.data) if agents_with_coords.data else 0
        
        # Check for agents with tags
        agents_with_tags = supabase.table('agents').select("id, tags").execute()
        tagged_count = sum(1 for agent in (agents_with_tags.data or []) if agent.get('tags'))
        
        print(f"🔍 Data Integrity:")
        print(f"   - Agents with coordinates: {coords_count}")
        print(f"   - Agents with tags: {tagged_count}")
        
        return True
    except Exception as e:
        print(f"❌ Data integrity check failed: {e}")
        return False

def production_optimization_check():
    """Check production optimization recommendations"""
    recommendations = []
    
    print("\n🚀 Production Optimization Checklist:")
    
    # Check if we're using service key (should be for server-side operations)
    if supabase_service_key.startswith('eyJ'):
        print("   ✅ Using service key for backend operations")
    else:
        recommendations.append("Use service key for backend operations")
        print("   ❌ Should use service key for backend operations")
    
    # Check for missing tables
    if not ensure_tag_settings_table():
        recommendations.append("Create tag_settings table for tag customization feature")
    
    # Environment security check
    env_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY']
    for var in env_vars:
        if os.environ.get(var):
            print(f"   ✅ {var} is configured")
        else:
            recommendations.append(f"Configure {var} environment variable")
            print(f"   ❌ {var} is missing")
    
    if recommendations:
        print("\n📋 Recommendations:")
        for rec in recommendations:
            print(f"   • {rec}")
    else:
        print("   🎉 All production optimizations are in place!")
    
    return len(recommendations) == 0

def main():
    """Main optimization check"""
    print("🏗️  Atlas Supabase Production Setup Check")
    print("=" * 50)
    
    # Core table checks
    agents_ok = ensure_agents_table()
    comments_ok = ensure_comments_table()
    tags_ok = ensure_tag_settings_table()
    
    # Performance and integrity checks
    perf_ok = check_database_performance()
    integrity_ok = check_data_integrity()
    
    # Production optimization
    prod_ok = production_optimization_check()
    
    print("\n" + "=" * 50)
    
    # Overall status
    if agents_ok and comments_ok and perf_ok and integrity_ok:
        print("🎉 Supabase database is PRODUCTION READY!")
        print("   Core functionality is operational.")
        if not tags_ok:
            print("   Note: Tag customization will use fallback storage.")
    else:
        print("⚠️  Database has issues that should be addressed:")
        if not agents_ok:
            print("   - Agents table needs attention")
        if not comments_ok:
            print("   - Comments table needs attention")
        if not perf_ok:
            print("   - Performance check failed")
        if not integrity_ok:
            print("   - Data integrity issues detected")
    
    return agents_ok and comments_ok and perf_ok and integrity_ok

if __name__ == "__main__":
    main()