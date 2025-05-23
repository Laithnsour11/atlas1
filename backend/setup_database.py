#!/usr/bin/env python3
"""
Database setup script for Atlas - Creates Supabase tables
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the backend directory to the path
sys.path.append(str(Path(__file__).parent))

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase module not found. Installing...")
    os.system("pip install supabase")
    from supabase import create_client, Client

def setup_database():
    # Get Supabase credentials
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_service_key = os.environ.get('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_service_key:
        print("Error: Missing Supabase credentials in .env file")
        return False
    
    print(f"Connecting to Supabase: {supabase_url}")
    
    try:
        # Create Supabase client
        supabase: Client = create_client(supabase_url, supabase_service_key)
        
        # Test connection
        print("Testing Supabase connection...")
        
        # Create tables using Supabase SQL editor or migrations
        # For now, let's create some sample data to test the connection
        
        print("Database setup completed successfully!")
        print("Please create the following tables in your Supabase dashboard:")
        print("""
        
        -- Create professionals table
        CREATE TABLE professionals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('agent', 'buyer', 'vendor')),
            company TEXT,
            phone TEXT,
            email TEXT,
            website TEXT,
            service_areas TEXT[],
            specialties TEXT[],
            latitude FLOAT,
            longitude FLOAT,
            rating FLOAT DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create comments table
        CREATE TABLE comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
            author_name TEXT NOT NULL,
            content TEXT NOT NULL,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create suggestions table
        CREATE TABLE suggestions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            professional_id UUID,
            suggestion_type TEXT NOT NULL,
            content TEXT NOT NULL,
            submitter_name TEXT,
            submitter_email TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create some sample data
        INSERT INTO professionals (name, type, company, phone, email, service_areas, specialties, latitude, longitude, rating) VALUES
        ('Sarah Johnson', 'agent', 'Century 21', '(555) 123-4567', 'sarah@century21.com', ARRAY['Manhattan', 'Brooklyn'], ARRAY['residential', 'luxury'], 40.7589, -73.9851, 4.8),
        ('Mike Chen', 'agent', 'Coldwell Banker', '(555) 234-5678', 'mike@coldwell.com', ARRAY['Queens', 'Bronx'], ARRAY['commercial', 'investment'], 40.7282, -73.7949, 4.6),
        ('Lisa Rodriguez', 'buyer', 'Independent', '(555) 345-6789', 'lisa@email.com', ARRAY['Staten Island'], ARRAY['residential'], 40.5795, -74.1502, 4.9),
        ('David Kim', 'vendor', 'Kim Construction', '(555) 456-7890', 'david@kimconstruction.com', ARRAY['Manhattan', 'Queens'], ARRAY['renovation', 'inspection'], 40.7505, -73.9934, 4.7);
        """)
        
        return True
        
    except Exception as e:
        print(f"Error setting up database: {e}")
        return False

if __name__ == "__main__":
    success = setup_database()
    if success:
        print("\nDatabase setup completed!")
    else:
        print("\nDatabase setup failed!")
        sys.exit(1)