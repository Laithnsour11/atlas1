import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl';
import { Search, MapPin, Phone, Mail, Globe, Star, MessageCircle, Plus, Filter, List, Users, Building2, X, Send, ExternalLink, UserPlus, Eye } from 'lucide-react';
import './App.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_PUBLIC_KEY;

function App() {
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [predefinedTags, setPredefinedTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ author_name: '', content: '', rating: 5 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(''); // For "My Agents" feature
  const [showMyAgents, setShowMyAgents] = useState(false);
  const [newAgent, setNewAgent] = useState({
    full_name: '',
    brokerage: '',
    phone: '',
    email: '',
    website: '',
    service_area_type: 'city',
    service_area: '',
    tags: [],
    address_last_deal: '',
    submitted_by: '',
    notes: ''
  });
  const [viewMode, setViewMode] = useState('both'); // 'list', 'map', 'both'
  const [viewport, setViewport] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    zoom: 10
  });

  // Fetch agents and tags
  useEffect(() => {
    fetchAgents();
    fetchPredefinedTags();
    
    // Hide suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter agents based on tags and viewport (not search)
  useEffect(() => {
    let filtered = agents;

    // Only filter by tags and "My Agents" - NOT by search term
    if (selectedTags.length > 0) {
      filtered = filtered.filter(a => 
        selectedTags.some(tag => a.tags?.includes(tag))
      );
    }

    if (showMyAgents && currentUser) {
      filtered = filtered.filter(a => a.submitted_by === currentUser);
    }

    // Filter by viewport (agents visible in current map area)
    if (viewport.latitude && viewport.longitude) {
      const viewportBounds = getViewportBounds();
      filtered = filtered.filter(agent => {
        const agentHash = agent.id ? agent.id.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0) : 0;
        const lat = agent.latitude || (40.7128 + ((agentHash % 100) - 50) * 0.001);
        const lng = agent.longitude || (-74.0060 + ((agentHash % 100) - 50) * 0.001);
        
        return lat >= viewportBounds.south && 
               lat <= viewportBounds.north && 
               lng >= viewportBounds.west && 
               lng <= viewportBounds.east;
      });
    }

    setFilteredAgents(filtered);
  }, [selectedTags, agents, showMyAgents, currentUser, viewport]);

  // Get viewport bounds for filtering agents
  const getViewportBounds = () => {
    const latOffset = 0.1 / Math.pow(2, viewport.zoom - 10); // Adjust based on zoom
    const lngOffset = 0.1 / Math.pow(2, viewport.zoom - 10);
    
    return {
      north: viewport.latitude + latOffset,
      south: viewport.latitude - latOffset,
      east: viewport.longitude + lngOffset,
      west: viewport.longitude - lngOffset
    };
  };

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/agents`);
      setAgents(response.data);
      setFilteredAgents(response.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPredefinedTags = async () => {
    try {
      const response = await axios.get(`${API}/tags`);
      setPredefinedTags(response.data.tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchComments = async (agentId) => {
    try {
      const response = await axios.get(`${API}/agents/${agentId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
    fetchComments(agent.id);
  };

  const handleAddComment = async () => {
    if (!newComment.author_name || !newComment.content) return;

    try {
      await axios.post(`${API}/comments`, {
        ...newComment,
        agent_id: selectedAgent.id
      });
      
      setNewComment({ author_name: '', content: '', rating: 5 });
      fetchComments(selectedAgent.id);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAddAgent = async () => {
    try {
      if (newAgent.tags.length === 0) {
        alert('Please select at least one tag.');
        return;
      }

      const agentData = {
        ...newAgent,
        tags: newAgent.tags
      };

      await axios.post(`${API}/agents`, agentData);
      setShowAddForm(false);
      setNewAgent({
        full_name: '',
        brokerage: '',
        phone: '',
        email: '',
        website: '',
        service_area_type: 'city',
        service_area: '',
        tags: [],
        address_last_deal: '',
        submitted_by: '',
        notes: ''
      });
      fetchAgents();
    } catch (error) {
      console.error('Error adding agent:', error);
      alert('Error adding agent. Please check all required fields.');
    }
  };

  const handleReachOut = async (agent) => {
    try {
      const response = await axios.post(`${API}/ghl/add-contact`, null, {
        params: { agent_id: agent.id }
      });
      
      if (response.data.status === 'success') {
        alert('Agent successfully added to your GoHighLevel CRM!');
      } else {
        alert('Failed to add agent to GoHighLevel: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error adding to GoHighLevel:', error);
      alert('Error connecting to GoHighLevel. Please try again.');
    }
  };

  const handleSearchLocation = async (query) => {
    try {
      const response = await axios.get(`${API}/search-location?query=${encodeURIComponent(query)}`);
      if (response.data && response.data.latitude && response.data.longitude) {
        setViewport({
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          zoom: response.data.zoom || 12
        });
      }
    } catch (error) {
      console.error('Error searching location:', error);
    }
  };

  // Address autocomplete functionality
  const handleSearchInput = async (value) => {
    setSearchTerm(value);
    
    if (value.length > 2) {
      try {
        // Use Mapbox Geocoding API for address suggestions
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&country=US&types=address,place,locality,neighborhood,district&limit=5`
        );
        const data = await response.json();
        
        if (data.features) {
          const suggestions = data.features.map(feature => ({
            id: feature.id,
            place_name: feature.place_name,
            center: feature.center, // [longitude, latitude]
            place_type: feature.place_type
          }));
          setSearchSuggestions(suggestions);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        setSearchSuggestions([]);
      }
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setSearchTerm(suggestion.place_name);
    setShowSuggestions(false);
    setSearchSuggestions([]);
    
    // Navigate to selected location
    setViewport({
      latitude: suggestion.center[1], // Mapbox returns [lng, lat]
      longitude: suggestion.center[0],
      zoom: 14
    });
  };

  const handleCommitSearch = () => {
    if (searchTerm.trim()) {
      setShowSuggestions(false);
      handleSearchLocation(searchTerm);
    }
  };

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const AgentCard = ({ agent }) => (
    <div 
      className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-200 p-4 cursor-pointer border-l-4 border-blue-500 mb-3"
      onClick={() => handleAgentClick(agent)}
    >
      <div className="flex items-start gap-3">
        {/* Profile Image */}
        <div className="flex-shrink-0">
          {agent.profile_image ? (
            <img 
              src={agent.profile_image} 
              alt={agent.full_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          )}
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-md font-semibold text-slate-800 truncate">{agent.full_name}</h3>
              <p className="text-sm text-slate-600 truncate">{agent.brokerage}</p>
            </div>
            <div className="flex items-center">
              {renderStars(Math.floor(agent.rating || 0))}
              <span className="ml-1 text-xs text-slate-600">({agent.rating || 0})</span>
            </div>
          </div>
          
          {/* Contact Info */}
          <div className="space-y-1 mb-2">
            <div className="flex items-center text-xs text-slate-600">
              <Phone className="w-3 h-3 mr-1" />
              {agent.phone}
            </div>
            <div className="flex items-center text-xs text-slate-600">
              <MapPin className="w-3 h-3 mr-1" />
              {agent.service_area}
            </div>
          </div>

          {/* Tags */}
          {agent.tags && agent.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.tags.slice(0, 2).map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                  {tag}
                </span>
              ))}
              {agent.tags.length > 2 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  +{agent.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Create heat map data for comments
  const createHeatmapData = () => {
    const features = filteredAgents
      .filter(agent => agent.latitude && agent.longitude)
      .map(agent => ({
        type: 'Feature',
        properties: {
          weight: comments.filter(c => c.agent_id === agent.id).length || 1
        },
        geometry: {
          type: 'Point',
          coordinates: [agent.longitude, agent.latitude]
        }
      }));

    return {
      type: 'FeatureCollection',
      features
    };
  };

  // Create coverage area visualization (non-overlapping blue areas)
  const createCoverageHeatmap = () => {
    const agentLocations = new Map(); // Track locations to prevent overlap
    const features = [];
    
    filteredAgents.forEach((agent, index) => {
      // Generate consistent coordinates for each agent
      const agentHash = agent.id ? agent.id.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0) : index;
      const lat = agent.latitude || (40.7128 + ((agentHash % 100) - 50) * 0.001);
      const lng = agent.longitude || (-74.0060 + ((agentHash % 100) - 50) * 0.001);
      
      // Create location key for overlap detection
      const locationKey = `${Math.round(lat * 1000)}-${Math.round(lng * 1000)}`;
      
      // Skip if we already have an agent at this location (prevent overlap)
      if (agentLocations.has(locationKey)) {
        return;
      }
      agentLocations.set(locationKey, true);
      
      // Define coverage radius based on service area type
      let radiusKm;
      switch (agent.service_area_type) {
        case 'city':
          radiusKm = 8; // Smaller radius for cities
          break;
        case 'county':
          radiusKm = 20; // Medium radius for counties
          break;
        case 'state':
          radiusKm = 50; // Large radius for states
          break;
        default:
          radiusKm = 12;
      }
      
      // Create circle polygon with more natural curves
      const steps = 32; // Fewer steps for smoother performance
      const coordinates = [];
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const dx = radiusKm * 0.009 * Math.cos(angle);
        const dy = radiusKm * 0.009 * Math.sin(angle);
        coordinates.push([lng + dx, lat + dy]);
      }
      coordinates.push(coordinates[0]); // Close the polygon
      
      features.push({
        type: 'Feature',
        properties: {
          agent_id: agent.id,
          service_area_type: agent.service_area_type,
          agent_name: agent.full_name
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates]
        }
      });
    });

    return {
      type: 'FeatureCollection',
      features
    };
  };



  const heatmapLayer = {
    id: 'heatmap',
    type: 'heatmap',
    source: 'agents',
    maxzoom: 15,
    paint: {
      'heatmap-weight': ['get', 'weight'],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(33, 102, 172, 0)',
        0.2, 'rgb(103, 169, 207)',
        0.4, 'rgb(209, 229, 240)',
        0.6, 'rgb(253, 219, 199)',
        0.8, 'rgb(239, 138, 98)',
        1, 'rgb(178, 24, 43)'
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 15, 0]
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Atlas</h1>
              <span className="ml-2 text-sm text-slate-600">Real Estate Agents</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMyAgents(!showMyAgents)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  showMyAgents 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye className="w-4 h-4 mr-2" />
                My Agents
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Agent
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search with Autocomplete and Button */}
            <div className="flex-1 flex gap-2">
              <div className="flex-1 relative search-container">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search address, city, or state..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCommitSearch();
                    }
                  }}
                  onFocus={() => {
                    if (searchSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                />
                
                {/* Autocomplete Dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-50 max-h-60 overflow-y-auto">
                    {searchSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleSelectSuggestion(suggestion)}
                      >
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {suggestion.place_name}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {suggestion.place_type?.join(', ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleCommitSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('both')}
                className={`px-3 py-2 ${viewMode === 'both' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                <Filter className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-2 ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                <MapPin className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tags Filter */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Tags:</label>
            <div className="flex flex-wrap gap-2">
              {predefinedTags.slice(0, 10).map((tag, index) => (
                <button
                  key={index}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${viewMode === 'map' ? 'w-full' : 'max-w-7xl mx-auto'} px-4 sm:px-6 lg:px-8 py-6`}>
        <div className={`${viewMode === 'both' ? 'flex gap-6' : ''}`}>
          {/* List View */}
          {(viewMode === 'list' || viewMode === 'both') && (
            <div className={`${viewMode === 'both' ? 'w-1/2' : 'w-full max-w-7xl mx-auto'}`}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  {filteredAgents.length} Agents Found {showMyAgents ? '(My Submissions)' : ''}
                </h2>
              </div>
              
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-slate-600">Loading agents...</p>
                  </div>
                ) : filteredAgents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-slate-600">No agents found matching your criteria.</p>
                  </div>
                ) : (
                  filteredAgents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Map View */}
          {(viewMode === 'map' || viewMode === 'both') && (
            <div className={`${viewMode === 'both' ? 'w-1/2' : 'w-full'} ${viewMode === 'map' ? 'h-screen' : 'h-[calc(100vh-200px)]'}`}>
              <div className="h-full rounded-lg overflow-hidden shadow-md">
                <Map
                  {...viewport}
                  onMove={evt => setViewport(evt.viewState)}
                  mapboxAccessToken={MAPBOX_TOKEN}
                  style={{width: '100%', height: '100%'}}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                  preserveDrawingBuffer={true}
                >
                  <NavigationControl position="top-right" />
                  
                  {/* Coverage Area Visualization - Semi-transparent fills only */}
                  <Source id="coverage-areas" type="geojson" data={createCoverageHeatmap()}>
                    {/* Semi-transparent blue fills for all coverage areas */}
                    <Layer
                      id="coverage-fill"
                      type="fill"
                      source="coverage-areas"
                      paint={{
                        'fill-color': [
                          'case',
                          ['==', ['get', 'service_area_type'], 'city'], '#3B82F6', // Blue for cities
                          ['==', ['get', 'service_area_type'], 'county'], '#6366F1', // Indigo for counties  
                          ['==', ['get', 'service_area_type'], 'state'], '#8B5CF6', // Purple for states
                          '#3B82F6' // Default blue
                        ],
                        'fill-opacity': 0.15 // Subtle semi-transparency
                      }}
                    />
                  </Source>
                  
                  {/* Agent Markers - Stable positioning */}
                  {filteredAgents.map((agent, index) => {
                    // Generate consistent coordinates for each agent
                    const agentHash = agent.id ? agent.id.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0) : index;
                    const lat = agent.latitude || (40.7128 + ((agentHash % 100) - 50) * 0.001);
                    const lng = agent.longitude || (-74.0060 + ((agentHash % 100) - 50) * 0.001);
                    
                    return (
                      <Marker
                        key={`marker-${agent.id || index}`}
                        latitude={lat}
                        longitude={lng}
                        onClick={(e) => {
                          e.originalEvent.stopPropagation();
                          handleAgentClick(agent);
                        }}
                      >
                        <div 
                          className="bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 hover:scale-110 transition-all duration-200 shadow-lg border-2 border-white"
                          title={`${agent.full_name} - ${agent.brokerage}`}
                          style={{ zIndex: 1000 }}
                        >
                          <MapPin className="w-4 h-4" />
                        </div>
                      </Marker>
                    );
                  })}
                </Map>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agent Details Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-start gap-4">
                  {selectedAgent.profile_image ? (
                    <img 
                      src={selectedAgent.profile_image} 
                      alt={selectedAgent.full_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedAgent.full_name}</h2>
                    <p className="text-slate-600">{selectedAgent.brokerage}</p>
                    <div className="flex items-center mt-2">
                      {renderStars(Math.floor(selectedAgent.rating || 0))}
                      <span className="ml-2 text-sm text-slate-600">({selectedAgent.rating || 0})</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReachOut(selectedAgent)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Reach Out
                  </button>
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{selectedAgent.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{selectedAgent.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 mr-2 text-gray-400" />
                      <a href={selectedAgent.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                        Website <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{selectedAgent.service_area_type}: {selectedAgent.service_area}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Professional Details</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Last Deal Address:</span>
                      <p className="text-sm">{selectedAgent.address_last_deal}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Submitted by:</span>
                      <p className="text-sm">{selectedAgent.submitted_by}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedAgent.tags && selectedAgent.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedAgent.notes && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Notes</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedAgent.notes}</p>
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4 flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Comments ({comments.length})
                </h3>

                {/* Add Comment Form */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Your name"
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                      value={newComment.author_name}
                      onChange={(e) => setNewComment({...newComment, author_name: e.target.value})}
                    />
                    <select
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                      value={newComment.rating}
                      onChange={(e) => setNewComment({...newComment, rating: parseInt(e.target.value)})}
                    >
                      <option value={5}>5 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={3}>3 Stars</option>
                      <option value={2}>2 Stars</option>
                      <option value={1}>1 Star</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Share your experience..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                    rows={3}
                    value={newComment.content}
                    onChange={(e) => setNewComment({...newComment, content: e.target.value})}
                  />
                  <button
                    onClick={handleAddComment}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Post Comment
                  </button>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border-b pb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium">{comment.author_name}</span>
                          {comment.rating && (
                            <div className="flex items-center mt-1">
                              {renderStars(comment.rating)}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Add New Agent</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleAddAgent(); }} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name *"
                    required
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    value={newAgent.full_name}
                    onChange={(e) => setNewAgent({...newAgent, full_name: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Brokerage *"
                    required
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    value={newAgent.brokerage}
                    onChange={(e) => setNewAgent({...newAgent, brokerage: e.target.value})}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="tel"
                    placeholder="Phone *"
                    required
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    value={newAgent.phone}
                    onChange={(e) => setNewAgent({...newAgent, phone: e.target.value})}
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    required
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    value={newAgent.email}
                    onChange={(e) => setNewAgent({...newAgent, email: e.target.value})}
                  />
                </div>

                <input
                  type="url"
                  placeholder="Website *"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={newAgent.website}
                  onChange={(e) => setNewAgent({...newAgent, website: e.target.value})}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    value={newAgent.service_area_type}
                    onChange={(e) => setNewAgent({...newAgent, service_area_type: e.target.value})}
                  >
                    <option value="city">City</option>
                    <option value="county">County</option>
                    <option value="state">State</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Service Area *"
                    required
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    value={newAgent.service_area}
                    onChange={(e) => setNewAgent({...newAgent, service_area: e.target.value})}
                  />
                </div>

                <input
                  type="text"
                  placeholder="Address of Last Deal *"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={newAgent.address_last_deal}
                  onChange={(e) => setNewAgent({...newAgent, address_last_deal: e.target.value})}
                />

                <input
                  type="text"
                  placeholder="Submitted By (Your Name/Company) *"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={newAgent.submitted_by}
                  onChange={(e) => {
                    setNewAgent({...newAgent, submitted_by: e.target.value});
                    setCurrentUser(e.target.value); // Set for "My Agents" feature
                  }}
                />

                {/* Tags Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Tags * (Choose at least one)
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                    {predefinedTags.map((tag, index) => (
                      <label key={index} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newAgent.tags.includes(tag)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewAgent({...newAgent, tags: [...newAgent.tags, tag]});
                            } else {
                              setNewAgent({...newAgent, tags: newAgent.tags.filter(t => t !== tag)});
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{tag}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <textarea
                  placeholder="Notes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  value={newAgent.notes}
                  onChange={(e) => setNewAgent({...newAgent, notes: e.target.value})}
                />

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Agent
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;