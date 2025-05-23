from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from supabase import create_client, Client
import json
import httpx
import asyncio
from bs4 import BeautifulSoup
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_anon_key = os.environ['SUPABASE_ANON_KEY']
supabase_service_key = os.environ['SUPABASE_SERVICE_KEY']

# GoHighLevel configuration
ghl_api_key = os.environ['GOHIGHLEVEL_API_KEY']
ghl_base_url = os.environ['GOHIGHLEVEL_BASE_URL']

# Create Supabase client (using service key for server-side operations)
supabase: Client = create_client(supabase_url, supabase_service_key)

# Create the main app without a prefix
app = FastAPI(title="Atlas API", description="Real Estate Agent Directory")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Default tags (can be customized via admin settings)
DEFAULT_TAGS = [
    "Residential Sales", "Commercial Sales", "Luxury Properties", "Investment Properties",
    "First-Time Buyers", "Military Relocation", "Senior Living", "New Construction",
    "Foreclosures", "Short Sales", "Property Management", "Land Sales",
    "Condominiums", "Townhomes", "Multi-Family", "Vacation Homes",
    "Buyer Representation", "Seller Representation", "Relocation Services", "Staging Services"
]

# Service area types
SERVICE_AREA_TYPES = ["city", "county", "state"]

# New rating system
RATING_LEVELS = {
    "exceptional": {
        "label": "Exceptional",
        "description": "Rockstar agents who go above and beyond consistently on multiple deals",
        "color": "#10B981",  # Green
        "value": 5
    },
    "great": {
        "label": "Great", 
        "description": "Agents who have done a great job on one or multiple deals",
        "color": "#3B82F6",  # Blue
        "value": 4
    },
    "average": {
        "label": "Average",
        "description": "Agents who have done an average job getting deals moved",
        "color": "#F59E0B",  # Yellow
        "value": 3
    },
    "poor": {
        "label": "Poor",
        "description": "Agents who have had issues and probably wouldn't use again",
        "color": "#EF4444",  # Red
        "value": 2
    },
    "blacklist": {
        "label": "Black List",
        "description": "Never would use them again. Keep them away with a ten-foot pole",
        "color": "#1F2937",  # Dark gray
        "value": 1
    }
}

# Admin settings password
ADMIN_PASSWORD = "admin123"

# Define Models
class Agent(BaseModel):
    id: Optional[str] = None
    full_name: str
    brokerage: str
    phone: str
    email: str
    website: str
    service_area_type: str  # city, county, state
    service_area: str  # actual area name
    tags: List[str] = []
    address_last_deal: str
    submitted_by: str
    notes: Optional[str] = None
    profile_image: Optional[str] = None
    rating: Optional[float] = 0.0
    created_at: Optional[datetime] = None

class AgentCreate(BaseModel):
    full_name: str
    brokerage: str
    phone: str
    email: str
    website: str
    service_area_type: str
    service_area: str
    tags: List[str] = []
    address_last_deal: str
    submitted_by: str
    notes: Optional[str] = None

class Comment(BaseModel):
    id: Optional[str] = None
    agent_id: str
    author_name: str
    content: str
    rating: Optional[str] = None  # Now uses rating keys: exceptional, great, average, poor, blacklist
    created_at: Optional[datetime] = None

class CommentCreate(BaseModel):
    agent_id: str
    author_name: str
    content: str
    rating: Optional[str] = None  # Now uses rating keys

class TagSettings(BaseModel):
    tags: List[str]

class AdminAuth(BaseModel):
    password: str

class CustomTag(BaseModel):
    name: str
    order: Optional[int] = None

class GoHighLevelContact(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: str
    website: Optional[str] = None
    companyName: Optional[str] = None
    source: str = "Atlas Directory"

# Image scraping functions
async def scrape_agent_image(full_name: str, website: str, service_area: str) -> Optional[str]:
    """Try to scrape agent profile image from website or search"""
    try:
        # First try the website
        if website:
            image_url = await scrape_from_website(website, full_name)
            if image_url:
                return image_url
        
        # Then try Google search
        search_query = f"{full_name} realtor {service_area}"
        image_url = await search_agent_image(search_query)
        return image_url
    except Exception as e:
        print(f"Error scraping image for {full_name}: {e}")
        return None

async def scrape_from_website(website: str, agent_name: str) -> Optional[str]:
    """Scrape agent image from their website"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(website)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Look for images with agent name in alt text or nearby text
                images = soup.find_all('img')
                for img in images:
                    alt_text = img.get('alt', '').lower()
                    src = img.get('src', '')
                    
                    # Check if agent name appears in alt text
                    name_parts = agent_name.lower().split()
                    if any(part in alt_text for part in name_parts) and src:
                        # Convert relative URLs to absolute
                        if src.startswith('//'):
                            return f"https:{src}"
                        elif src.startswith('/'):
                            from urllib.parse import urljoin
                            return urljoin(website, src)
                        elif src.startswith('http'):
                            return src
    except Exception as e:
        print(f"Error scraping website {website}: {e}")
    return None

async def search_agent_image(search_query: str) -> Optional[str]:
    """Search for agent image online (mock implementation)"""
    # Note: In production, you might use Google Custom Search API or similar
    # For now, we'll return None as we don't want to make unauthorized API calls
    return None

# GoHighLevel integration
async def create_ghl_contact(contact_data: GoHighLevelContact) -> dict:
    """Create contact in GoHighLevel CRM"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {ghl_api_key}",
                "Content-Type": "application/json"
            }
            
            response = await client.post(
                f"{ghl_base_url}contacts/",
                json=contact_data.dict(),
                headers=headers,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                return {"status": "success", "data": response.json()}
            else:
                return {"status": "error", "message": f"GHL API error: {response.status_code}"}
                
    except Exception as e:
        return {"status": "error", "message": f"Failed to create GHL contact: {str(e)}"}

# Initialize database tables
async def init_database():
    try:
        print("Database initialization - create tables via Supabase dashboard if needed")
    except Exception as e:
        print(f"Database initialization error: {e}")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Atlas API - Real Estate Agent Directory"}

@api_router.get("/health")
async def health_check():
    try:
        # Test Supabase connection
        result = supabase.table('agents').select("count").execute()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@api_router.get("/tags")
async def get_predefined_tags():
    """Get list of predefined tags for agents"""
    return {"tags": DEFAULT_TAGS}

@api_router.get("/service-area-types")
async def get_service_area_types():
    """Get available service area types"""
    return {"types": SERVICE_AREA_TYPES}

# Agents endpoints
@api_router.post("/agents", response_model=Agent)
async def create_agent(agent: AgentCreate):
    try:
        # Validate that at least one tag is selected
        if not agent.tags or len(agent.tags) == 0:
            raise HTTPException(status_code=400, detail="At least one tag must be selected")
        
        agent_data = agent.dict()
        
        # Try to scrape profile image
        profile_image = await scrape_agent_image(
            agent.full_name, 
            agent.website, 
            agent.service_area
        )
        if profile_image:
            agent_data['profile_image'] = profile_image
        
        result = supabase.table('agents').insert(agent_data).execute()
        if result.data:
            return Agent(**result.data[0])
        else:
            raise HTTPException(status_code=400, detail="Failed to create agent")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/agents", response_model=List[Agent])
async def get_agents(
    search: Optional[str] = Query(None, description="Search by name, brokerage, or area"),
    service_area: Optional[str] = Query(None, description="Filter by service area"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    submitted_by: Optional[str] = Query(None, description="Filter by submitted_by for 'My Agents' view"),
    limit: int = Query(100, description="Limit results")
):
    try:
        query = supabase.table('agents').select("*")
        
        # Apply filters
        if search:
            # Search in name, brokerage, and service area
            search_filter = f"full_name.ilike.%{search}%,brokerage.ilike.%{search}%,service_area.ilike.%{search}%"
            query = query.or_(search_filter)
        
        if service_area:
            query = query.ilike('service_area', f'%{service_area}%')
        
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',')]
            for tag in tag_list:
                query = query.contains('tags', [tag])
        
        if submitted_by:
            query = query.eq('submitted_by', submitted_by)
        
        result = query.limit(limit).execute()
        
        agents = []
        for item in result.data:
            agents.append(Agent(**item))
        
        return agents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/agents/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str):
    try:
        result = supabase.table('agents').select("*").eq('id', agent_id).execute()
        if result.data:
            return Agent(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="Agent not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Comments endpoints
@api_router.post("/comments", response_model=Comment)
async def create_comment(comment: CommentCreate):
    try:
        comment_data = comment.dict()
        result = supabase.table('comments').insert(comment_data).execute()
        if result.data:
            return Comment(**result.data[0])
        else:
            raise HTTPException(status_code=400, detail="Failed to create comment")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/agents/{agent_id}/comments", response_model=List[Comment])
async def get_agent_comments(agent_id: str):
    try:
        result = supabase.table('comments').select("*").eq('agent_id', agent_id).order('created_at', desc=True).execute()
        
        comments = []
        for item in result.data:
            comments.append(Comment(**item))
        
        return comments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GoHighLevel integration endpoint
@api_router.post("/ghl/add-contact")
async def add_to_gohighlevel(agent_id: str):
    try:
        # Get agent details
        agent_result = supabase.table('agents').select("*").eq('id', agent_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = Agent(**agent_result.data[0])
        
        # Split full name
        name_parts = agent.full_name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        # Create GHL contact
        contact_data = GoHighLevelContact(
            firstName=first_name,
            lastName=last_name,
            email=agent.email,
            phone=agent.phone,
            website=agent.website,
            companyName=agent.brokerage
        )
        
        result = await create_ghl_contact(contact_data)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Search location on map endpoint
@api_router.get("/search-location")
async def search_location(query: str):
    """Search for location coordinates using a geocoding service"""
    try:
        # Enhanced location mapping for better search results
        location_map = {
            # NYC Boroughs
            "manhattan": {"latitude": 40.7831, "longitude": -73.9712, "zoom": 12},
            "brooklyn": {"latitude": 40.6782, "longitude": -73.9442, "zoom": 12},
            "queens": {"latitude": 40.7282, "longitude": -73.7949, "zoom": 12},
            "bronx": {"latitude": 40.8448, "longitude": -73.8648, "zoom": 12},
            "staten island": {"latitude": 40.5795, "longitude": -74.1502, "zoom": 12},
            
            # NYC Areas
            "new york": {"latitude": 40.7128, "longitude": -74.0060, "zoom": 10},
            "new york city": {"latitude": 40.7128, "longitude": -74.0060, "zoom": 10},
            "nyc": {"latitude": 40.7128, "longitude": -74.0060, "zoom": 10},
            
            # Neighborhoods
            "upper east side": {"latitude": 40.7740, "longitude": -73.9566, "zoom": 14},
            "upper west side": {"latitude": 40.7870, "longitude": -73.9754, "zoom": 14},
            "soho": {"latitude": 40.7233, "longitude": -74.0030, "zoom": 14},
            "tribeca": {"latitude": 40.7195, "longitude": -74.0089, "zoom": 14},
            "chelsea": {"latitude": 40.7465, "longitude": -74.0014, "zoom": 14},
            "midtown": {"latitude": 40.7549, "longitude": -73.9840, "zoom": 13},
            "financial district": {"latitude": 40.7074, "longitude": -74.0113, "zoom": 14},
            
            # Other areas
            "long island": {"latitude": 40.7891, "longitude": -73.1350, "zoom": 9},
            "westchester": {"latitude": 41.1220, "longitude": -73.7949, "zoom": 10},
            "new jersey": {"latitude": 40.0583, "longitude": -74.4057, "zoom": 8},
            "connecticut": {"latitude": 41.5978, "longitude": -72.7554, "zoom": 8},
        }
        
        query_lower = query.lower().strip()
        
        # Direct match
        if query_lower in location_map:
            return location_map[query_lower]
        
        # Partial match
        for location, coords in location_map.items():
            if location in query_lower or query_lower in location:
                return coords
        
        # Default to NYC if not found
        return {"latitude": 40.7128, "longitude": -74.0060, "zoom": 10}
        
    except Exception as e:
        print(f"Location search error: {e}")
        # Fallback to NYC
        return {"latitude": 40.7128, "longitude": -74.0060, "zoom": 10}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_database()
    logger.info("Atlas API started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Atlas API shutting down")
