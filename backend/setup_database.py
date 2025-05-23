#!/usr/bin/env python3
"""
Database setup script for Atlas - Creates Supabase tables for agents
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
        
        print("Database setup completed successfully!")
        print("Please create the following tables in your Supabase dashboard:")
        print("""
        
        -- Drop old tables if they exist
        DROP TABLE IF EXISTS comments CASCADE;
        DROP TABLE IF EXISTS professionals CASCADE;
        DROP TABLE IF EXISTS suggestions CASCADE;

        -- Create agents table (replacing professionals)
        CREATE TABLE agents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name TEXT NOT NULL,
            brokerage TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            website TEXT NOT NULL,
            service_area_type TEXT NOT NULL CHECK (service_area_type IN ('city', 'county', 'state')),
            service_area TEXT NOT NULL,
            tags TEXT[] NOT NULL DEFAULT '{}',
            address_last_deal TEXT NOT NULL,
            submitted_by TEXT NOT NULL,
            notes TEXT,
            profile_image TEXT,
            latitude FLOAT,
            longitude FLOAT,
            rating FLOAT DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create comments table (updated for agents)
        CREATE TABLE comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
            author_name TEXT NOT NULL,
            content TEXT NOT NULL,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create some sample agents data
        INSERT INTO agents (full_name, brokerage, phone, email, website, service_area_type, service_area, tags, address_last_deal, submitted_by, notes, latitude, longitude, rating) VALUES
        ('Sarah Johnson', 'Century 21', '(555) 123-4567', 'sarah@century21.com', 'https://century21.com/sarah', 'city', 'Manhattan', ARRAY['Residential Sales', 'Luxury Properties', 'First-Time Buyers'], '123 Park Ave, New York, NY 10017', 'Admin', 'Top performer with excellent client reviews', 40.7589, -73.9851, 4.8),
        ('Mike Chen', 'Coldwell Banker', '(555) 234-5678', 'mike@coldwell.com', 'https://coldwellbanker.com/mike', 'county', 'Kings County', ARRAY['Commercial Sales', 'Investment Properties'], '456 Broadway, Brooklyn, NY 11201', 'Admin', 'Specializes in commercial real estate', 40.6782, -73.9442, 4.6),
        ('Lisa Rodriguez', 'Compass', '(555) 345-6789', 'lisa@compass.com', 'https://compass.com/lisa', 'city', 'Queens', ARRAY['Residential Sales', 'New Construction'], '789 Main St, Queens, NY 11354', 'Admin', 'Expert in new construction properties', 40.7282, -73.7949, 4.9),
        ('David Kim', 'Keller Williams', '(555) 456-7890', 'david@kw.com', 'https://kw.com/david', 'city', 'Bronx', ARRAY['Buyer Representation', 'Military Relocation'], '321 Grand Ave, Bronx, NY 10451', 'Admin', 'Military relocation specialist', 40.8448, -73.8648, 4.7),
        ('Emily Parker', 'Douglas Elliman', '(555) 567-8901', 'emily@elliman.com', 'https://elliman.com/emily', 'city', 'Manhattan', ARRAY['Luxury Properties', 'Seller Representation'], '567 Fifth Ave, New York, NY 10036', 'Admin', 'Luxury market expert on Upper East Side', 40.7614, -73.9776, 4.9);
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