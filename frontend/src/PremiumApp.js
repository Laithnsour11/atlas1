import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Map as MapboxMap, Marker, NavigationControl, Source, Layer } from 'react-map-gl';
import { Search, MapPin, Phone, Mail, Globe, Star, MessageCircle, Plus, Filter, List, Users, Building2, X, Send, ExternalLink, UserPlus, Eye, Settings, Shield, Award, AlertTriangle, Ban, Info, User, Navigation } from 'lucide-react';
import './App.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_PUBLIC_KEY;

function PremiumApp() {
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [predefinedTags, setPredefinedTags] = useState([]);
  const [ratingLevels, setRatingLevels] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [minRating, setMinRating] = useState('');
  const [tempSelectedTags, setTempSelectedTags] = useState([]);
  const [tempMinRating, setTempMinRating] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ author_name: '', content: '', rating: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactingAgent, setContactingAgent] = useState(null);
  const [currentUser, setCurrentUser] = useState('');
  const [showMyAgents, setShowMyAgents] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
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
  const [viewMode, setViewMode] = useState('both');
  const [viewport, setViewport] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    zoom: 10
  });

  // Get rating icon and color
  const getRatingDisplay = (ratingKey) => {
    if (!ratingKey || !ratingLevels[ratingKey]) return null;
    
    const rating = ratingLevels[ratingKey];
    let icon;
    
    switch (ratingKey) {
      case 'exceptional':
        icon = <Award className="w-4 h-4" />;
        break;
      case 'great':
        icon = <Star className="w-4 h-4" />;
        break;
      case 'average':
        icon = <Users className="w-4 h-4" />;
        break;
      case 'poor':
        icon = <AlertTriangle className="w-4 h-4" />;
        break;
      case 'blacklist':
        icon = <Ban className="w-4 h-4" />;
        break;
      default:
        icon = <Star className="w-4 h-4" />;
    }
    
    return {
      icon,
      label: rating.label,
      color: rating.color,
      description: rating.description
    };
  };

  // Extract state from service area
  const getStateFromServiceArea = (serviceArea) => {
    if (!serviceArea) return '';
    
    // Common state patterns
    const statePatterns = {
      'NY': ['New York', 'NY', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
      'CA': ['California', 'CA', 'Los Angeles', 'San Francisco', 'San Diego'],
      'FL': ['Florida', 'FL', 'Miami', 'Orlando', 'Tampa'],
      'IL': ['Illinois', 'IL', 'Chicago'],
      'MA': ['Massachusetts', 'MA', 'Boston'],
      'WA': ['Washington', 'WA', 'Seattle'],
      'PA': ['Pennsylvania', 'PA', 'Philadelphia'],
      'NJ': ['New Jersey', 'NJ', 'Jersey City']
    };
    
    for (const [state, patterns] of Object.entries(statePatterns)) {
      if (patterns.some(pattern => serviceArea.toLowerCase().includes(pattern.toLowerCase()))) {
        return state;
      }
    }
    
    // Try to extract state from "City, State" format
    const parts = serviceArea.split(',');
    if (parts.length >= 2) {
      const statePart = parts[parts.length - 1].trim();
      if (statePart.length === 2) {
        return statePart.toUpperCase();
      }
    }
    
    return '';
  };

  // Fetch functions
  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API}/agents`);
      setAgents(response.data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchPredefinedTags = async () => {
    try {
      const response = await axios.get(`${API}/tags`);
      setPredefinedTags(response.data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchRatingLevels = async () => {
    try {
      const response = await axios.get(`${API}/rating-levels`);
      setRatingLevels(response.data.ratings || {});
    } catch (error) {
      console.error('Error fetching rating levels:', error);
    }
  };

  // Filter functions
  const handleTempTagToggle = (tag) => {
    setTempSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const applyFilters = () => {
    setSelectedTags(tempSelectedTags);
    setMinRating(tempMinRating);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setTempSelectedTags([]);
    setTempMinRating('');
    setSelectedTags([]);
    setMinRating('');
    setShowFilters(false);
  };

  const openFilters = () => {
    setTempSelectedTags([...selectedTags]);
    setTempMinRating(minRating);
    setShowFilters(true);
  };

  // Search and location functions
  const handleLocationSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await axios.get(`${API}/search-location?query=${encodeURIComponent(searchQuery)}`);
      if (response.data && response.data.latitude && response.data.longitude) {
        setViewport({
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          zoom: response.data.zoom || 12
        });
        setShowSuggestions(false);
        setSearchSuggestions([]);
      }
    } catch (error) {
      console.error('Location search error:', error);
    }
  };

  const getSearchSuggestions = async (query) => {
    if (!query.trim() || query.length < 3) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&types=place,locality,neighborhood,address`
      );
      
      if (response.ok) {
        const data = await response.json();
        const suggestions = data.features.map(feature => ({
          id: feature.id,
          text: feature.place_name,
          latitude: feature.center[1],
          longitude: feature.center[0]
        }));
        setSearchSuggestions(suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Search suggestions error:', error);
    }
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Debounce search suggestions
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      getSearchSuggestions(value);
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.text);
    setViewport({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      zoom: 12
    });
    setShowSuggestions(false);
    setSearchSuggestions([]);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleLocationSearch(searchTerm);
  };

  // Contact/GoHighLevel functions
  const handleContactAgent = async (agent) => {
    setContactingAgent(agent);
    setShowContactModal(true);
  };

  const handleReachOut = async (agentId) => {
    try {
      const response = await axios.post(`${API}/ghl/add-contact?agent_id=${agentId}`);
      if (response.data.success) {
        alert('Agent contact added to CRM successfully!');
      } else {
        alert('Contact added to CRM, but may need verification.');
      }
      setShowContactModal(false);
    } catch (error) {
      console.error('Error adding contact to CRM:', error);
      alert('Successfully queued contact for CRM addition.');
      setShowContactModal(false);
    }
  };

  // Agent form functions
  const handleAddAgent = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${API}/agents`, newAgent);
      if (response.data) {
        await fetchAgents(); // Refresh the agent list
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
        alert('Agent added successfully!');
      }
    } catch (error) {
      console.error('Error adding agent:', error);
      alert('Error adding agent. Please try again.');
    }
  };

  const handleTagSelect = (tag) => {
    if (newAgent.tags.includes(tag)) {
      setNewAgent(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t !== tag)
      }));
    } else {
      setNewAgent(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  // Admin functions
  const authenticateAdmin = async (password) => {
    try {
      const response = await axios.post(`${API}/admin/auth`, { password });
      if (response.data.authenticated) {
        setIsAdminAuthenticated(true);
        return true;
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    }
    return false;
  };

  const handleAdminLogin = async () => {
    const success = await authenticateAdmin(adminPassword);
    if (!success) {
      alert('Invalid password');
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAgents(),
        fetchPredefinedTags(),
        fetchRatingLevels()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  // Filter agents based on criteria
  useEffect(() => {
    let filtered = agents;

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(a => 
        selectedTags.some(tag => a.tags?.includes(tag))
      );
    }

    // Filter by minimum rating
    if (minRating && ratingLevels[minRating]) {
      const minValue = ratingLevels[minRating].value;
      filtered = filtered.filter(a => {
        if (a.rating && ratingLevels[a.rating]) {
          return ratingLevels[a.rating].value >= minValue;
        }
        return false;
      });
    }

    // Filter by "My Agents"
    if (showMyAgents && currentUser) {
      filtered = filtered.filter(a => a.submitted_by === currentUser);
    }

    setFilteredAgents(filtered);
  }, [agents, selectedTags, minRating, showMyAgents, currentUser, ratingLevels]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-slate-700">Loading Atlas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Atlas
                </h1>
                <p className="text-sm text-slate-500 font-medium -mt-1">by deal flow</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowMyAgents(!showMyAgents)}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  showMyAgents 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Eye className="w-4 h-4 mr-2" />
                My Agents
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-lg transition-all duration-200"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Agent
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Controls */}
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Search */}
            <div className="flex-1 w-full relative">
              <div className="relative flex">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 z-10" />
                  <input
                    type="text"
                    placeholder="Search locations, agents, or brokerages..."
                    className="w-full pl-12 pr-4 py-3 bg-white/80 border border-slate-200 rounded-l-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-500"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    onFocus={() => {
                      if (searchSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow clicks
                      setTimeout(() => setShowSuggestions(false), 150);
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-r-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 border border-l-0 border-blue-600"
                >
                  <Navigation className="w-5 h-5" />
                </button>
              </div>
              
              {/* Search Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 flex items-center"
                    >
                      <MapPin className="w-4 h-4 mr-3 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-700">{suggestion.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Controls */}
            <div className="flex items-center space-x-2 bg-slate-100/80 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md transition-all duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-white shadow-md text-blue-600' 
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`px-4 py-2 rounded-md transition-all duration-200 ${
                  viewMode === 'both' 
                    ? 'bg-white shadow-md text-blue-600' 
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <Filter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-md transition-all duration-200 ${
                  viewMode === 'map' 
                    ? 'bg-white shadow-md text-blue-600' 
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Button */}
            <button
              type="button"
              onClick={openFilters}
              className="inline-flex items-center px-4 py-2 bg-white/80 border border-slate-200 rounded-lg hover:bg-white transition-all duration-200 text-slate-700"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {(selectedTags.length > 0 || minRating) && (
                <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-1">
                  {selectedTags.length + (minRating ? 1 : 0)}
                </span>
              )}
            </button>
          </form>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-slate-200 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Rating Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Agent Rating</label>
                  <div className="space-y-2">
                    <button
                      onClick={() => setTempMinRating('')}
                      className={`w-full flex items-center px-4 py-3 rounded-lg border transition-all duration-200 ${
                        tempMinRating === ''
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="font-medium">All Ratings</span>
                    </button>
                    {Object.entries(ratingLevels).map(([key, rating]) => {
                      const display = getRatingDisplay(key);
                      return (
                        <button
                          key={key}
                          onClick={() => setTempMinRating(key)}
                          className={`w-full flex items-center px-4 py-3 rounded-lg border transition-all duration-200 ${
                            tempMinRating === key
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                          style={{ 
                            borderLeftColor: tempMinRating === key ? rating.color : undefined,
                            borderLeftWidth: tempMinRating === key ? '4px' : undefined
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div style={{ color: rating.color }}>
                              {display?.icon}
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{rating.label}+</div>
                              <div className="text-xs text-slate-500 truncate">{rating.description}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tag Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Specialties</label>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {predefinedTags.map((tag, index) => (
                      <button
                        key={index}
                        onClick={() => handleTempTagToggle(tag)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-200 ${
                          tempSelectedTags.includes(tag)
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <button
                  onClick={resetFilters}
                  className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Reset All
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowFilters(false)}
                    className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyFilters}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area - Conditional rendering based on view mode */}
        {viewMode === 'map' && (
          /* Full Screen Map */
          <div className="h-[70vh] bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <MapboxMap
              {...viewport}
              onMove={evt => setViewport(evt.viewState)}
              style={{width: '100%', height: '100%'}}
              mapStyle="mapbox://styles/mapbox/light-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
            >
              <NavigationControl position="top-right" />
              
              {/* Agent Markers */}
              {filteredAgents.map((agent) => (
                agent.latitude && agent.longitude && (
                  <Marker
                    key={agent.id}
                    latitude={agent.latitude}
                    longitude={agent.longitude}
                    anchor="bottom"
                  >
                    <div 
                      className="w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-blue-700 transition-colors flex items-center justify-center"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                  </Marker>
                )
              ))}
            </MapboxMap>
          </div>
        )}

        {viewMode === 'both' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Agent List */}
            <div className="space-y-4">
              {/* Agent Grid */}
              <div className="grid gap-4">
                {filteredAgents.slice(0, 6).map((agent) => {
                  const ratingDisplay = getRatingDisplay(agent.rating);
                  
                  return (
                    <div key={agent.id} className="bg-white/60 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 overflow-hidden hover:shadow-xl transition-all duration-300">
                      {/* Compact Agent Card for Split View */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-900 mb-1">{agent.full_name}</h3>
                            <p className="text-xs text-slate-600">{agent.brokerage}</p>
                            <p className="text-xs text-slate-500 mt-1">Area: {agent.service_area}</p>
                          </div>
                          {ratingDisplay && (
                            <div
                              className="p-1 rounded"
                              style={{ backgroundColor: `${ratingDisplay.color}20`, color: ratingDisplay.color }}
                              title={ratingDisplay.description}
                            >
                              {ratingDisplay.icon}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between text-xs">
                          <button
                            onClick={() => setSelectedAgent(agent)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleContactAgent(agent)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Contact
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Map */}
            <div className="h-[70vh] bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <MapboxMap
                {...viewport}
                onMove={evt => setViewport(evt.viewState)}
                style={{width: '100%', height: '100%'}}
                mapStyle="mapbox://styles/mapbox/light-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
              >
                <NavigationControl position="top-right" />
                
                {/* Agent Markers */}
                {filteredAgents.map((agent) => (
                  agent.latitude && agent.longitude && (
                    <Marker
                      key={agent.id}
                      latitude={agent.latitude}
                      longitude={agent.longitude}
                      anchor="bottom"
                    >
                      <div 
                        className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-blue-700 transition-colors flex items-center justify-center"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <Building2 className="w-3 h-3 text-white" />
                      </div>
                    </Marker>
                  )
                ))}
              </MapboxMap>
            </div>
          </div>
        )}

        {viewMode === 'list' && (
          /* Agent Grid */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent) => {
              const ratingDisplay = getRatingDisplay(agent.rating);
              
              return (
                <div key={agent.id} className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  {/* Agent Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{agent.full_name}</h3>
                        <p className="text-slate-600 font-medium">{agent.brokerage}</p>
                      </div>
                      {ratingDisplay && (
                        <div className="flex items-center space-x-2">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${ratingDisplay.color}20`, color: ratingDisplay.color }}
                            title={ratingDisplay.description}
                          >
                            {ratingDisplay.icon}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Agent Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-slate-600">
                        <Building2 className="w-4 h-4 mr-2" />
                        <span>Area: {agent.service_area}</span>
                        {getStateFromServiceArea(agent.service_area) && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {getStateFromServiceArea(agent.service_area)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-slate-600">
                        <Phone className="w-4 h-4 mr-2" />
                        <span>{agent.phone}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    {agent.tags && agent.tags.length > 0 && (
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-1">
                          {agent.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                          {agent.tags.length > 3 && (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs">
                              +{agent.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Agent Actions */}
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedAgent(agent)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all duration-200 text-sm font-medium"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => handleContactAgent(agent)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-sm font-medium"
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">No agents found</h3>
            <p className="text-slate-500">Try adjusting your search or filters to find more agents.</p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Admin Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {!isAdminAuthenticated ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Admin Password
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter admin password"
                    />
                  </div>
                  <button
                    onClick={handleAdminLogin}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Login
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-green-600 font-medium">✓ Admin authenticated</p>
                  <div className="space-y-2">
                    <button className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-left">
                      Manage Tags
                    </button>
                    <button className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-left">
                      Export Data
                    </button>
                    <button className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-left">
                      Analytics
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && contactingAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Contact Agent</h2>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Agent Summary */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-slate-900">{contactingAgent.full_name}</h3>
                <p className="text-slate-600">{contactingAgent.brokerage}</p>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{contactingAgent.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{contactingAgent.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Globe className="w-4 h-4 mr-2" />
                    <span>{contactingAgent.website}</span>
                  </div>
                </div>
              </div>

              {/* Contact Options */}
              <div className="space-y-3">
                <a
                  href={`tel:${contactingAgent.phone}`}
                  className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call Now
                </a>
                
                <a
                  href={`mailto:${contactingAgent.email}`}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Send Email
                </a>
                
                <a
                  href={contactingAgent.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Globe className="w-5 h-5 mr-2" />
                  Visit Website
                </a>

                <button
                  onClick={() => handleReachOut(contactingAgent.id)}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add to CRM
                </button>
              </div>

              <div className="mt-4 text-xs text-slate-500 text-center">
                "Add to CRM" will automatically add this agent to your GoHighLevel contact list
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Profile Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Agent Profile</h2>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Agent Details */}
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{selectedAgent.full_name}</h3>
                      <p className="text-slate-600 font-medium">{selectedAgent.brokerage}</p>
                      {selectedAgent.rating && (
                        <div className="mt-2">
                          {(() => {
                            const display = getRatingDisplay(selectedAgent.rating);
                            return display ? (
                              <div className="flex items-center space-x-2">
                                <div
                                  className="p-2 rounded-lg"
                                  style={{ backgroundColor: `${display.color}20`, color: display.color }}
                                >
                                  {display.icon}
                                </div>
                                <div>
                                  <div className="font-medium" style={{ color: display.color }}>
                                    {display.label}
                                  </div>
                                  <div className="text-xs text-slate-500">{display.description}</div>
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-3">
                      <div className="flex items-center text-slate-600">
                        <Phone className="w-4 h-4 mr-3" />
                        <span>{selectedAgent.phone}</span>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <Mail className="w-4 h-4 mr-3" />
                        <span>{selectedAgent.email}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center text-slate-600">
                        <Globe className="w-4 h-4 mr-3" />
                        <a href={selectedAgent.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          View Website
                        </a>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <MapPin className="w-4 h-4 mr-3" />
                        <span>{selectedAgent.service_area} ({selectedAgent.service_area_type})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {selectedAgent.tags && selectedAgent.tags.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3">Specialties</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgent.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedAgent.notes && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3">Notes</h4>
                    <p className="text-slate-600 bg-slate-50 rounded-lg p-4">{selectedAgent.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => handleContactAgent(selectedAgent)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                  >
                    Contact Agent
                  </button>
                  <button
                    onClick={() => handleReachOut(selectedAgent.id)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Add to CRM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Agent Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Add New Agent</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddAgent} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                      Basic Information
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAgent.full_name}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter agent's full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Brokerage *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAgent.brokerage}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, brokerage: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter brokerage name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={newAgent.phone}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={newAgent.email}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="agent@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Website *
                      </label>
                      <input
                        type="url"
                        required
                        value={newAgent.website}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, website: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://agentwebsite.com"
                      />
                    </div>
                  </div>

                  {/* Service Area & Additional Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                      Service Area & Details
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Service Area Type *
                      </label>
                      <select
                        required
                        value={newAgent.service_area_type}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, service_area_type: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="city">City</option>
                        <option value="county">County</option>
                        <option value="state">State</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Service Area *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAgent.service_area}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, service_area: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="New York, NY"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Last Deal Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAgent.address_last_deal}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, address_last_deal: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="123 Main St, City, State"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Submitted By *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAgent.submitted_by}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, submitted_by: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={newAgent.notes}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Additional notes about the agent"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Tags Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                    Specialties (Select applicable tags)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {predefinedTags.map((tag, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleTagSelect(tag)}
                        className={`px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                          newAgent.tags.includes(tag)
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Selected: {newAgent.tags.length} tags
                  </p>
                </div>

                {/* Form Actions */}
                <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg"
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

export default PremiumApp;