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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_anon_key = os.environ['SUPABASE_ANON_KEY']
supabase_service_key = os.environ['SUPABASE_SERVICE_KEY']

# Create Supabase client (using service key for server-side operations)
supabase: Client = create_client(supabase_url, supabase_service_key)

# Create the main app without a prefix
app = FastAPI(title="Atlas API", description="Real Estate Professional Directory")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class Professional(BaseModel):
    id: Optional[str] = None
    name: str
    type: str  # 'agent', 'buyer', 'vendor'
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    service_areas: List[str] = []
    specialties: List[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rating: Optional[float] = 0.0
    created_at: Optional[datetime] = None

class ProfessionalCreate(BaseModel):
    name: str
    type: str
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    service_areas: List[str] = []
    specialties: List[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class Comment(BaseModel):
    id: Optional[str] = None
    professional_id: str
    author_name: str
    content: str
    rating: Optional[int] = None  # 1-5 stars
    created_at: Optional[datetime] = None

class CommentCreate(BaseModel):
    professional_id: str
    author_name: str
    content: str
    rating: Optional[int] = None

class SuggestionCreate(BaseModel):
    professional_id: Optional[str] = None
    suggestion_type: str  # 'edit', 'new_contact', 'error_report'
    content: str
    submitter_name: Optional[str] = None
    submitter_email: Optional[str] = None

# Initialize database tables
async def init_database():
    try:
        # Create professionals table
        professionals_table = """
        CREATE TABLE IF NOT EXISTS professionals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            type TEXT NOT NULL,
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
        """
        
        # Create comments table
        comments_table = """
        CREATE TABLE IF NOT EXISTS comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
            author_name TEXT NOT NULL,
            content TEXT NOT NULL,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
        
        # Create suggestions table
        suggestions_table = """
        CREATE TABLE IF NOT EXISTS suggestions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            professional_id UUID,
            suggestion_type TEXT NOT NULL,
            content TEXT NOT NULL,
            submitter_name TEXT,
            submitter_email TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
        
        # Execute table creation (Note: In a real app, you'd use migrations)
        # For now, we'll create tables via Supabase dashboard
        print("Database initialization would happen here - create tables via Supabase dashboard")
        
    except Exception as e:
        print(f"Database initialization error: {e}")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Atlas API - Real Estate Professional Directory"}

@api_router.get("/health")
async def health_check():
    try:
        # Test Supabase connection
        result = supabase.table('professionals').select("count").execute()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

# Professionals endpoints
@api_router.post("/professionals", response_model=Professional)
async def create_professional(professional: ProfessionalCreate):
    try:
        professional_data = professional.dict()
        result = supabase.table('professionals').insert(professional_data).execute()
        if result.data:
            return Professional(**result.data[0])
        else:
            raise HTTPException(status_code=400, detail="Failed to create professional")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/professionals", response_model=List[Professional])
async def get_professionals(
    search: Optional[str] = Query(None, description="Search by name, company, or area"),
    type: Optional[str] = Query(None, description="Filter by type: agent, buyer, vendor"),
    city: Optional[str] = Query(None, description="Filter by city/area"),
    specialty: Optional[str] = Query(None, description="Filter by specialty"),
    limit: int = Query(100, description="Limit results")
):
    try:
        query = supabase.table('professionals').select("*")
        
        # Apply filters
        if type:
            query = query.eq('type', type)
        
        if search:
            # Search in name, company, and service areas
            search_filter = f"name.ilike.%{search}%,company.ilike.%{search}%"
            query = query.or_(search_filter)
        
        if city:
            query = query.contains('service_areas', [city])
        
        if specialty:
            query = query.contains('specialties', [specialty])
        
        result = query.limit(limit).execute()
        
        professionals = []
        for item in result.data:
            professionals.append(Professional(**item))
        
        return professionals
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Search with geo location - MUST come before {professional_id} route
@api_router.get("/professionals/near")
async def get_professionals_near(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    radius_miles: float = Query(25, description="Search radius in miles"),
    type: Optional[str] = Query(None, description="Filter by type")
):
    try:
        # Simple distance calculation (for production, use PostGIS)
        # For now, we'll return all professionals and filter client-side
        query = supabase.table('professionals').select("*")
        
        if type:
            query = query.eq('type', type)
        
        result = query.execute()
        
        # Filter by distance (simple implementation)
        professionals = []
        for item in result.data:
            if item.get('latitude') and item.get('longitude'):
                # Add distance calculation here if needed
                professionals.append(Professional(**item))
        
        return professionals
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/professionals/{professional_id}", response_model=Professional)
async def get_professional(professional_id: str):
    try:
        result = supabase.table('professionals').select("*").eq('id', professional_id).execute()
        if result.data:
            return Professional(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="Professional not found")
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

@api_router.get("/professionals/{professional_id}/comments", response_model=List[Comment])
async def get_professional_comments(professional_id: str):
    try:
        result = supabase.table('comments').select("*").eq('professional_id', professional_id).order('created_at', desc=True).execute()
        
        comments = []
        for item in result.data:
            comments.append(Comment(**item))
        
        return comments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Suggestions endpoint
@api_router.post("/suggestions")
async def create_suggestion(suggestion: SuggestionCreate):
    try:
        suggestion_data = suggestion.dict()
        result = supabase.table('suggestions').insert(suggestion_data).execute()
        if result.data:
            return {"message": "Suggestion submitted successfully", "id": result.data[0]['id']}
        else:
            raise HTTPException(status_code=400, detail="Failed to submit suggestion")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Search with geo location
@api_router.get("/professionals/near")
async def get_professionals_near(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    radius_miles: float = Query(25, description="Search radius in miles"),
    type: Optional[str] = Query(None, description="Filter by type")
):
    try:
        # Simple distance calculation (for production, use PostGIS)
        # For now, we'll return all professionals and filter client-side
        query = supabase.table('professionals').select("*")
        
        if type:
            query = query.eq('type', type)
        
        result = query.execute()
        
        # Filter by distance (simple implementation)
        professionals = []
        for item in result.data:
            if item.get('latitude') and item.get('longitude'):
                # Add distance calculation here if needed
                professionals.append(Professional(**item))
        
        return professionals
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
