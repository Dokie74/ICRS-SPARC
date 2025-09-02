// src/frontend/components/pages/HTSBrowser.js
// Complete HTS Browser component for ICRS SPARC
// Provides comprehensive HTS code lookup and duty rate calculation

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import htsService from '../../services/htsService';
import { useApp } from '../../contexts/AppContext';

const HTSBrowser = () => {
  const { showNotification } = useApp();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('description'); // 'description' or 'code'
  const [searchResults, setSearchResults] = useState([]);
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [popularCodes, setPopularCodes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage] = useState(50);
  const [totalResults, setTotalResults] = useState(0);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [viewMode, setViewMode] = useState('search'); // 'search', 'browse', 'details'

  // Initialize HTS service on mount
  useEffect(() => {
    const initializeService = async () => {
      setLoading(true);
      try {
        // Initialize service and get status
        const [initResult, statusResult] = await Promise.all([
          htsService.initialize(),
          htsService.getStatus()
        ]);

        if (initResult.success) {
          setInitialized(true);
          setCountries(htsService.getCachedCountries());
          setPopularCodes(htsService.getCachedPopularCodes());
          
          if (initResult.source === 'network') {
            showNotification('HTS service initialized successfully');
          }
        } else {
          showNotification(`Failed to initialize HTS service: ${initResult.error}`, true);
        }

        if (statusResult.success) {
          setServiceStatus(statusResult.data);
        }
      } catch (error) {
        showNotification(`Error initializing HTS service: ${error.message}`, true);
      } finally {
        setLoading(false);
      }
    };

    initializeService();
  }, [showNotification]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term, type, country) => {
      if (!term || term.length < 2) {
        setSearchResults([]);
        setTotalResults(0);
        return;
      }

      setLoading(true);
      try {
        const result = await htsService.search(term, type, {
          limit: resultsPerPage,
          countryOfOrigin: country || null
        });

        if (result.success) {
          setSearchResults(result.data);
          setTotalResults(result.meta?.resultCount || result.data.length);
          setCurrentPage(1);
        } else {
          showNotification(`Search failed: ${result.error}`, true);
          setSearchResults([]);
          setTotalResults(0);
        }
      } catch (error) {
        showNotification(`Search error: ${error.message}`, true);
        setSearchResults([]);
        setTotalResults(0);
      } finally {
        setLoading(false);
      }
    }, 300),
    [resultsPerPage, showNotification]
  );

  // Handle search input changes
  useEffect(() => {
    if (initialized && searchTerm.length >= 2) {
      debouncedSearch(searchTerm, searchType, countryOfOrigin);
    } else {
      setSearchResults([]);
      setTotalResults(0);
    }
  }, [searchTerm, searchType, countryOfOrigin, initialized, debouncedSearch]);

  // Handle HTS entry selection
  const handleSelect = async (entry) => {
    setSelectedEntry(entry);
    setShowDetails(true);
    setViewMode('details');
    
    // Get detailed information with duty calculation
    if (countryOfOrigin) {
      setLoading(true);
      try {
        const detailResult = await htsService.getByHtsCode(entry.htsno, countryOfOrigin);
        if (detailResult.success) {
          setSelectedEntry(detailResult.data);
        }
      } catch (error) {
        console.error('Error loading HTS details:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle country change
  const handleCountryChange = (country) => {
    setCountryOfOrigin(country);
    
    // Refresh selected entry details if available
    if (selectedEntry && country) {
      handleSelect(selectedEntry);
    }
  };

  // Handle popular code selection
  const handlePopularCodeSelect = async (popularCode) => {
    setLoading(true);
    try {
      const result = await htsService.searchByCode(popularCode.htsno, 20, countryOfOrigin);
      if (result.success && result.data.length > 0) {
        const exactMatch = result.data.find(item => item.htsno === popularCode.htsno);
        if (exactMatch) {
          handleSelect(exactMatch);
        } else {
          setSearchResults(result.data);
          setTotalResults(result.data.length);
          setSearchType('code');
          setSearchTerm(popularCode.htsno);
          setViewMode('search');
        }
      }
    } catch (error) {
      showNotification(`Error loading HTS code: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  // Memoized search results with highlighting
  const highlightedResults = useMemo(() => {
    if (!searchTerm || searchResults.length === 0) return searchResults;

    return searchResults.map(result => ({
      ...result,
      highlightedDescription: highlightText(result.description, searchTerm),
      highlightedHtsno: highlightText(result.htsno, searchTerm)
    }));
  }, [searchResults, searchTerm]);

  // Handle refresh data (admin only)
  const handleRefreshData = async () => {
    setLoading(true);
    try {
      const result = await htsService.refreshData();
      if (result.success) {
        showNotification('HTS data refreshed successfully');
        // Refresh status
        const statusResult = await htsService.getStatus();
        if (statusResult.success) {
          setServiceStatus(statusResult.data);
        }
      } else {
        showNotification(`Refresh failed: ${result.error}`, true);
      }
    } catch (error) {
      showNotification(`Refresh error: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  if (!initialized && loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold">Loading HTS Database...</h3>
            <p className="text-gray-600 mt-2">This may take a moment on first use</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">HTS Browser</h1>
            <p className="text-gray-600 mt-1">Complete USITC Harmonized Tariff Schedule Database</p>
          </div>
          
          {/* Service Status */}
          {serviceStatus && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${serviceStatus.loaded ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <div className="text-sm">
                  <div className="font-medium">{serviceStatus.loaded ? 'Data Loaded' : 'Loading...'}</div>
                  <div className="text-gray-500">{serviceStatus.entryCount?.toLocaleString() || 0} entries</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setViewMode('search')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Search & Browse
            </button>
            {selectedEntry && (
              <button
                onClick={() => setViewMode('details')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  viewMode === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Details - {selectedEntry.htsno}
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Search & Browse View */}
      {viewMode === 'search' && (
        <div className="space-y-6">
          {/* Search Controls */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
              <div className="lg:col-span-5">
                <input
                  type="text"
                  placeholder={searchType === 'description' ? 
                    'Search by description (e.g., "electronic circuits")' : 
                    'Search by HTS code (e.g., "8542")'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              
              <div className="lg:col-span-3">
                <div className="flex border border-gray-300 rounded-md overflow-hidden">
                  <button
                    onClick={() => setSearchType('description')}
                    className={`flex-1 px-4 py-3 text-sm font-medium ${
                      searchType === 'description' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Description
                  </button>
                  <button
                    onClick={() => setSearchType('code')}
                    className={`flex-1 px-4 py-3 text-sm font-medium border-l border-gray-300 ${
                      searchType === 'code' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    HTS Code
                  </button>
                </div>
              </div>
              
              <div className="lg:col-span-4">
                <select
                  value={countryOfOrigin}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Country of Origin (Optional)</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {!countryOfOrigin && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                <p className="text-sm text-amber-800">
                  💡 Select a country of origin to see applicable duty rates and trade agreement benefits.
                </p>
              </div>
            )}
            
            {/* Popular Codes */}
            {popularCodes.length > 0 && searchTerm.length < 2 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Popular HTS Categories:</p>
                <div className="flex flex-wrap gap-2">
                  {popularCodes.slice(0, 8).map((code) => (
                    <button
                      key={code.htsno}
                      onClick={() => handlePopularCodeSelect(code)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                      disabled={loading}
                    >
                      {code.htsno} - {code.description.substring(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search Results */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {searchTerm ? `Search Results for "${searchTerm}"` : 'HTS Codes'}
                </h3>
                {totalResults > 0 && (
                  <span className="text-sm text-gray-500">
                    {totalResults.toLocaleString()} results
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-4">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Searching...</span>
                </div>
              )}

              {!loading && searchTerm.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No HTS codes found for "{searchTerm}"
                </div>
              )}

              {!loading && searchTerm.length < 2 && popularCodes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Enter at least 2 characters to search HTS codes
                </div>
              )}

              {!loading && highlightedResults.length > 0 && (
                <div className="space-y-2">
                  {highlightedResults.map((entry, index) => {
                    const entryDutyInfo = countryOfOrigin && entry.dutyInfo ? entry.dutyInfo : null;
                    
                    return (
                      <div
                        key={`${entry.htsno}-${index}`}
                        onClick={() => handleSelect(entry)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedEntry?.htsno === entry.htsno
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-mono text-sm font-semibold text-blue-600 mb-1">
                              <span dangerouslySetInnerHTML={{ 
                                __html: entry.highlightedHtsno || entry.htsno 
                              }} />
                            </div>
                            <div 
                              className="text-gray-900" 
                              style={{ marginLeft: `${(entry.indent || 0) * 20}px` }}
                            >
                              <span dangerouslySetInnerHTML={{ 
                                __html: entry.highlightedDescription || entry.description 
                              }} />
                            </div>
                            
                            {/* Country-specific duty preview */}
                            {entryDutyInfo && (
                              <div className="mt-2 text-xs space-y-1 bg-gray-50 rounded p-2">
                                <div className="flex items-center gap-4">
                                  <span className="text-gray-600">General:</span>
                                  <span className="font-medium">{entryDutyInfo.general || 'N/A'}</span>
                                  
                                  {entryDutyInfo.applicable !== entryDutyInfo.general && (
                                    <>
                                      <span className="text-green-600">→ Applicable:</span>
                                      <span className="font-medium text-green-600">
                                        {entryDutyInfo.applicable}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {entryDutyInfo.specialNote && (
                                  <div className="text-green-600 italic text-xs">
                                    {entryDutyInfo.specialNote}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {entry.units && entry.units.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Units: {entry.units.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details View */}
      {viewMode === 'details' && selectedEntry && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold">HTS Code Details</h3>
              <button
                onClick={() => setViewMode('search')}
                className="text-gray-400 hover:text-gray-600"
              >
                ← Back to Search
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HTS Number</label>
              <div className="font-mono text-blue-600 font-semibold text-lg">{selectedEntry.htsno}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <div className="text-gray-900">{selectedEntry.description}</div>
            </div>
            
            {selectedEntry.units && selectedEntry.units.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Units of Measure</label>
                <div className="text-gray-900">{selectedEntry.units.join(', ')}</div>
              </div>
            )}
            
            {/* Duty Rates Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedEntry.general && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">General Rate</label>
                  <div className="text-gray-900 font-medium">{selectedEntry.general}</div>
                </div>
              )}
              
              {selectedEntry.special && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Rate</label>
                  <div className="text-gray-900 text-sm">{selectedEntry.special}</div>
                </div>
              )}
              
              {selectedEntry.other && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Column 2 Rate</label>
                  <div className="text-gray-900 font-medium">{selectedEntry.other}</div>
                </div>
              )}
            </div>

            {/* Country-Specific Information */}
            {selectedEntry.dutyInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-3">
                  Duty Information for {countries.find(c => c.code === countryOfOrigin)?.name || countryOfOrigin}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Applicable Rate:</span>
                    <div className="font-semibold text-blue-900 text-lg">
                      {selectedEntry.dutyInfo.applicable}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-blue-700 font-medium">Trade Status:</span>
                    <div className="text-blue-900">{selectedEntry.dutyInfo.tradeStatus}</div>
                  </div>
                </div>
                
                {selectedEntry.dutyInfo.specialNote && (
                  <div className="mt-3 text-green-700 font-medium text-sm">
                    {selectedEntry.dutyInfo.specialNote}
                  </div>
                )}

                {selectedEntry.dutyInfo.verified && (
                  <div className="mt-3 text-xs text-blue-600">
                    ✓ CBP Verified Data - {selectedEntry.dutyInfo.source}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Helper function for highlighting search terms
function highlightText(text, searchTerm) {
  if (!text || !searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
}

export default HTSBrowser;