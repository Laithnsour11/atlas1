import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import { Search, MapPin, Phone, Mail, Globe, Star, MessageCircle, Plus, Filter, List, Users, Building2, X, Send } from 'lucide-react';
import './App.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_PUBLIC_KEY;

function App() {
  const [professionals, setProfessionals] = useState([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ author_name: '', content: '', rating: 5 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProfessional, setNewProfessional] = useState({
    name: '',
    type: 'agent',
    company: '',
    phone: '',
    email: '',
    website: '',
    service_areas: [],
    specialties: [],
    latitude: null,
    longitude: null
  });
  const [viewMode, setViewMode] = useState('both'); // 'list', 'map', 'both'
  const [viewport, setViewport] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    zoom: 10
  });

  // Fetch professionals
  useEffect(() => {
    fetchProfessionals();
  }, []);

  // Filter professionals when search or filters change
  useEffect(() => {
    let filtered = professionals;

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.service_areas?.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedType) {
      filtered = filtered.filter(p => p.type === selectedType);
    }

    if (selectedSpecialty) {
      filtered = filtered.filter(p => 
        p.specialties?.includes(selectedSpecialty)
      );
    }

    setFilteredProfessionals(filtered);
  }, [searchTerm, selectedType, selectedSpecialty, professionals]);

  const fetchProfessionals = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/professionals`);
      setProfessionals(response.data);
      setFilteredProfessionals(response.data);
    } catch (error) {
      console.error('Error fetching professionals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (professionalId) => {
    try {
      const response = await axios.get(`${API}/professionals/${professionalId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleProfessionalClick = (professional) => {
    setSelectedProfessional(professional);
    fetchComments(professional.id);
  };

  const handleAddComment = async () => {
    if (!newComment.author_name || !newComment.content) return;

    try {
      await axios.post(`${API}/comments`, {
        ...newComment,
        professional_id: selectedProfessional.id
      });
      
      setNewComment({ author_name: '', content: '', rating: 5 });
      fetchComments(selectedProfessional.id);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAddProfessional = async () => {
    try {
      const professionalData = {
        ...newProfessional,
        service_areas: newProfessional.service_areas.filter(area => area.trim()),
        specialties: newProfessional.specialties.filter(spec => spec.trim())
      };

      await axios.post(`${API}/professionals`, professionalData);
      setShowAddForm(false);
      setNewProfessional({
        name: '',
        type: 'agent',
        company: '',
        phone: '',
        email: '',
        website: '',
        service_areas: [],
        specialties: [],
        latitude: null,
        longitude: null
      });
      fetchProfessionals();
    } catch (error) {
      console.error('Error adding professional:', error);
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const ProfessionalCard = ({ professional }) => (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 cursor-pointer border-l-4 border-blue-500"
      onClick={() => handleProfessionalClick(professional)}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{professional.name}</h3>
          <p className="text-sm text-slate-600">{professional.company}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          professional.type === 'agent' ? 'bg-blue-100 text-blue-800' :
          professional.type === 'buyer' ? 'bg-green-100 text-green-800' :
          'bg-purple-100 text-purple-800'
        }`}>
          {professional.type}
        </span>
      </div>
      
      <div className="space-y-2 mb-4">
        {professional.phone && (
          <div className="flex items-center text-sm text-slate-600">
            <Phone className="w-4 h-4 mr-2" />
            {professional.phone}
          </div>
        )}
        {professional.email && (
          <div className="flex items-center text-sm text-slate-600">
            <Mail className="w-4 h-4 mr-2" />
            {professional.email}
          </div>
        )}
      </div>

      {professional.service_areas && professional.service_areas.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {professional.service_areas.slice(0, 3).map((area, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                {area}
              </span>
            ))}
            {professional.service_areas.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                +{professional.service_areas.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {professional.specialties && professional.specialties.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {professional.specialties.slice(0, 2).map((specialty, index) => (
              <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                {specialty}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {renderStars(Math.floor(professional.rating || 0))}
          <span className="ml-1 text-sm text-slate-600">({professional.rating || 0})</span>
        </div>
        <MapPin className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Atlas</h1>
              <span className="ml-2 text-sm text-slate-600">Real Estate Professionals</span>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </button>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, company, or area..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="agent">Agents</option>
                <option value="buyer">Buyers</option>
                <option value="vendor">Vendors</option>
              </select>

              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                <option value="">All Specialties</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="investment">Investment</option>
                <option value="luxury">Luxury</option>
              </select>

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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* List View */}
          {(viewMode === 'list' || viewMode === 'both') && (
            <div className={`${viewMode === 'both' ? 'w-1/2' : 'w-full'}`}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  {filteredProfessionals.length} Professionals Found
                </h2>
              </div>
              
              <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-slate-600">Loading professionals...</p>
                  </div>
                ) : filteredProfessionals.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-slate-600">No professionals found matching your criteria.</p>
                  </div>
                ) : (
                  filteredProfessionals.map((professional) => (
                    <ProfessionalCard key={professional.id} professional={professional} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Map View */}
          {(viewMode === 'map' || viewMode === 'both') && (
            <div className={`${viewMode === 'both' ? 'w-1/2' : 'w-full'} h-[calc(100vh-200px)]`}>
              <div className="h-full rounded-lg overflow-hidden shadow-md">
                <Map
                  {...viewport}
                  onMove={evt => setViewport(evt.viewState)}
                  mapboxAccessToken={MAPBOX_TOKEN}
                  style={{width: '100%', height: '100%'}}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                >
                  <NavigationControl position="top-right" />
                  
                  {filteredProfessionals
                    .filter(p => p.latitude && p.longitude)
                    .map((professional) => (
                      <Marker
                        key={professional.id}
                        latitude={professional.latitude}
                        longitude={professional.longitude}
                        onClick={() => handleProfessionalClick(professional)}
                      >
                        <div className="bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                          <MapPin className="w-4 h-4" />
                        </div>
                      </Marker>
                    ))}
                </Map>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Professional Details Modal */}
      {selectedProfessional && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{selectedProfessional.name}</h2>
                  <p className="text-slate-600">{selectedProfessional.company}</p>
                </div>
                <button
                  onClick={() => setSelectedProfessional(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    {selectedProfessional.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{selectedProfessional.phone}</span>
                      </div>
                    )}
                    {selectedProfessional.email && (
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{selectedProfessional.email}</span>
                      </div>
                    )}
                    {selectedProfessional.website && (
                      <div className="flex items-center">
                        <Globe className="w-4 h-4 mr-2 text-gray-400" />
                        <a href={selectedProfessional.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Service Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfessional.service_areas?.map((area, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

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

      {/* Add Professional Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Add New Professional</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleAddProfessional(); }} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    value={newProfessional.name}
                    onChange={(e) => setNewProfessional({...newProfessional, name: e.target.value})}
                  />
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    value={newProfessional.type}
                    onChange={(e) => setNewProfessional({...newProfessional, type: e.target.value})}
                  >
                    <option value="agent">Real Estate Agent</option>
                    <option value="buyer">Buyer</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Company"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={newProfessional.company}
                  onChange={(e) => setNewProfessional({...newProfessional, company: e.target.value})}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="tel"
                    placeholder="Phone"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    value={newProfessional.phone}
                    onChange={(e) => setNewProfessional({...newProfessional, phone: e.target.value})}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    value={newProfessional.email}
                    onChange={(e) => setNewProfessional({...newProfessional, email: e.target.value})}
                  />
                </div>

                <input
                  type="url"
                  placeholder="Website"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={newProfessional.website}
                  onChange={(e) => setNewProfessional({...newProfessional, website: e.target.value})}
                />

                <textarea
                  placeholder="Service Areas (comma separated)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  value={newProfessional.service_areas.join(', ')}
                  onChange={(e) => setNewProfessional({
                    ...newProfessional, 
                    service_areas: e.target.value.split(',').map(area => area.trim())
                  })}
                />

                <textarea
                  placeholder="Specialties (comma separated)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  value={newProfessional.specialties.join(', ')}
                  onChange={(e) => setNewProfessional({
                    ...newProfessional, 
                    specialties: e.target.value.split(',').map(spec => spec.trim())
                  })}
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
                    Add Professional
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