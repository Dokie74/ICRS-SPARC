// src/components/modals/HTSLookupModal.js
// Modal for searching and selecting HTS codes in ICRS SPARC

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import htsService from '../../services/htsService';

const HTSLookupModal = ({ onClose, onSelect, currentHtsCode = '', currentCountryOfOrigin = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('description'); // 'description' or 'code'
  const [searchResults, setSearchResults] = useState([]);
  const [countryOfOrigin, setCountryOfOrigin] = useState(currentCountryOfOrigin);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [popularCodes, setPopularCodes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [dutyInfo, setDutyInfo] = useState(null);

  // Initialize HTS service on mount
  useEffect(() => {
    const initializeService = async () => {
      setLoading(true);
      try {
        const result = await htsService.initialize();
        if (result.success) {
          setInitialized(true);
          setCountries(htsService.getCountryList());
          
          if (result.source === 'network') {
            toast.success('HTS data loaded successfully');
          }
          
          // Load popular codes
          const popularResult = await htsService.getPopularHtsCodes();
          if (popularResult.success) {
            setPopularCodes(popularResult.data);
          }
          
          // If we have a current HTS code, search for it
          if (currentHtsCode && currentHtsCode.trim()) {
            const codeResult = await htsService.getByHtsNumber(currentHtsCode);
            if (codeResult.success) {
              setSelectedEntry(codeResult.data);
              setShowDetails(true);
              
              // Calculate duty info if country is provided
              if (currentCountryOfOrigin) {
                const dutyResult = htsService.getDutyRate(codeResult.data, currentCountryOfOrigin);
                setDutyInfo(dutyResult);
              }
            }
          }
        } else {
          toast.error(`Failed to load HTS data: ${result.error}`);
        }
      } catch (error) {
        toast.error(`Error initializing HTS service: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    initializeService();
  }, [currentHtsCode, currentCountryOfOrigin]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term, type) => {
      if (!term || term.length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        let result;
        if (type === 'description') {
          result = await htsService.searchByDescription(term, 50);
        } else {
          result = await htsService.searchByHtsNumber(term, 50);
        }

        if (result.success) {
          setSearchResults(result.data);
        } else {
          toast.error(`Search failed: ${result.error}`);
          setSearchResults([]);
        }
      } catch (error) {
        toast.error(`Search error: ${error.message}`);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Handle search input changes
  useEffect(() => {
    if (initialized && searchTerm.length >= 2) {
      debouncedSearch(searchTerm, searchType);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, searchType, initialized, debouncedSearch]);

  // Handle HTS entry selection
  const handleSelect = (entry) => {
    setSelectedEntry(entry);
    setShowDetails(true);
    
    // Calculate duty info if country is selected
    if (countryOfOrigin) {
      const dutyResult = htsService.getDutyRate(entry, countryOfOrigin);
      setDutyInfo(dutyResult);
    }
  };

  // Handle country change
  const handleCountryChange = (country) => {
    setCountryOfOrigin(country);
    
    // Recalculate duty info if entry is selected
    if (selectedEntry) {
      const dutyResult = htsService.getDutyRate(selectedEntry, country);
      setDutyInfo(dutyResult);
    }
  };

  // Handle confirming selection
  const handleConfirmSelection = () => {
    if (!countryOfOrigin) {
      toast.error('Please select a country of origin to see applicable duty rates');
      return;
    }
    
    if (selectedEntry) {
      onSelect({ 
        ...selectedEntry, 
        dutyInfo: dutyInfo,
        countryOfOrigin: countryOfOrigin 
      });
      onClose();
    }
  };

  // Handle popular code selection
  const handlePopularCodeSelect = async (popularCode) => {
    setLoading(true);
    try {
      const result = await htsService.searchByHtsNumber(popularCode.htsno, 20);
      if (result.success && result.data.length > 0) {
        const exactMatch = result.data.find(item => item.htsno === popularCode.htsno);
        if (exactMatch) {
          handleSelect(exactMatch);
        } else {
          setSearchResults(result.data);
          setSearchType('code');
          setSearchTerm(popularCode.htsno);
        }
      }
    } catch (error) {
      toast.error(`Error loading HTS code: ${error.message}`);
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

  // Loading screen
  if (!initialized && loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold">Loading HTS Database...</h3>
            <p className="text-gray-600 mt-2">This may take a moment on first use</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">HTS Code Lookup</h3>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl focus:outline-none"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            
            {/* Search Controls */}
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        searchType === 'description' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Description
                    </button>
                    <button
                      onClick={() => setSearchType('code')}
                      className={`flex-1 px-4 py-3 text-sm font-medium border-l border-gray-300 transition-colors ${
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
                    <option value="">Select Country of Origin *</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {!countryOfOrigin && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm text-amber-800">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Please select a country of origin to see applicable duty rates and complete HTS selection.
                  </p>
                </div>
              )}
              
              {/* Popular Codes */}
              {popularCodes.length > 0 && searchTerm.length < 2 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Popular HTS Categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {popularCodes.slice(0, 6).map((code) => (
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
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Search Results */}
            <div className="flex-1 p-6 overflow-y-auto">
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
                    const entryDutyInfo = countryOfOrigin ? htsService.getDutyRate(entry, countryOfOrigin) : null;
                    
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
                              <span dangerouslySetInnerHTML={{ __html: entry.highlightedHtsno || entry.htsno }} />
                            </div>
                            <div className="text-gray-900" style={{ marginLeft: `${(entry.indent || 0) * 20}px` }}>
                              <span dangerouslySetInnerHTML={{ __html: entry.highlightedDescription || entry.description }} />
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
                                      <span className="font-medium text-green-600">{entryDutyInfo.applicable}</span>
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

            {/* Details Panel */}
            {showDetails && selectedEntry && (
              <div className="w-80 border-l border-gray-200 p-6 overflow-y-auto bg-gray-50">
                <h4 className="font-semibold text-lg mb-4 text-gray-900">HTS Code Details</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HTS Number</label>
                    <div className="font-mono text-blue-600 font-semibold">{selectedEntry.htsno}</div>
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
                  
                  {selectedEntry.general && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">General Rate</label>
                      <div className="text-gray-900">{selectedEntry.general}</div>
                    </div>
                  )}
                  
                  {selectedEntry.special && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Rate</label>
                      <div className="text-gray-900">{selectedEntry.special}</div>
                    </div>
                  )}
                  
                  {selectedEntry.other && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Rate</label>
                      <div className="text-gray-900">{selectedEntry.other}</div>
                    </div>
                  )}

                  {/* Country-Specific Information */}
                  {dutyInfo && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-3">
                      <div className="text-sm font-medium text-blue-800 mb-2">
                        For {countries.find(c => c.code === countryOfOrigin)?.name}:
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Applicable Rate:</span>
                          <span className="font-medium text-blue-900">{dutyInfo.applicable}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-blue-700">Trade Status:</span>
                          <span className="text-blue-900">{dutyInfo.tradeStatus}</span>
                        </div>
                        
                        {dutyInfo.specialNote && (
                          <div className="text-green-700 font-medium">
                            {dutyInfo.specialNote}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {searchResults.length > 0 && `${searchResults.length} results found`}
            </div>
            <div className="space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              {selectedEntry && (
                <button
                  onClick={handleConfirmSelection}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Select HTS Code
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
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

export default HTSLookupModal;