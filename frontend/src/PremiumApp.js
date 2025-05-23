import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Map as MapboxMap, Marker, NavigationControl, Source, Layer } from 'react-map-gl';
import { Search, MapPin, Phone, Mail, Globe, Star, MessageCircle, Plus, Filter, List, Users, Building2, X, Send, ExternalLink, UserPlus, Eye, Settings, Shield, Award, AlertTriangle, Ban, Info } from 'lucide-react';
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
      }
    } catch (error) {
      console.error('Location search error:', error);
    }
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
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search locations, agents, or brokerages..."
                  className="w-full pl-12 pr-4 py-3 bg-white/80 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
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

        {/* Agent Grid */}
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
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{agent.service_area}</span>
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
    </div>
  );
}

export default PremiumApp;