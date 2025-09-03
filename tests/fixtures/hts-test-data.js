// tests/fixtures/hts-test-data.js
// Test data and fixtures for HTS Browser E2E tests
// Provides sample HTS codes, countries, and mock responses

// Sample HTS codes for testing
export const htsTestData = {
  // Popular electronic components HTS codes
  electronics: {
    integratedCircuits: {
      htsno: '8542310001',
      description: 'Electronic integrated circuits: Processors and controllers, whether or not combined with memories, converters, logic circuits, amplifiers, clock and timing circuits, or other circuits',
      general: '0%',
      special: 'Free (A+, AU, B, BH, CA, CL, CO, D, E, IL, JO, KR, MA, MX, OM, P, PA, PE, S, SG)',
      other: '35%',
      units: ['No.'],
      indent: 2
    },
    semiconductors: {
      htsno: '8541100020',
      description: 'Diodes, other than photosensitive or light-emitting diodes: Rectifier diodes',
      general: '0%',
      special: 'Free (A+, AU, B, BH, CA, CL, CO, D, E, IL, JO, KR, MA, MX, OM, P, PA, PE, S, SG)',
      other: '35%',
      units: ['No.'],
      indent: 2
    },
    capacitors: {
      htsno: '8532290020',
      description: 'Fixed capacitors: Ceramic dielectric, multilayer',
      general: '0%',
      special: 'Free (A+, AU, B, BH, CA, CL, CO, D, E, IL, JO, KR, MA, MX, OM, P, PA, PE, S, SG)',
      other: '35%',
      units: ['No.'],
      indent: 2
    }
  },

  // Textiles and apparel
  textiles: {
    cottonShirts: {
      htsno: '6205200020',
      description: 'Men\'s or boys\' shirts: Of cotton, not knitted or crocheted',
      general: '19.7%',
      special: 'Free (BH, CA, CL, CO, IL, JO, KR, MA, MX, OM, P, PA, PE, SG) 15.8% (AU)',
      other: '90%',
      units: ['doz.', 'kg'],
      indent: 2
    },
    polyesterFabric: {
      htsno: '5407610020',
      description: 'Woven fabrics of synthetic filament yarn: Of polyester filaments, unbleached or bleached',
      general: '14.9%',
      special: 'Free (BH, CA, CL, CO, IL, JO, KR, MA, MX, OM, P, PA, PE, SG) 11.9% (AU)',
      other: '81%',
      units: ['kg', 'm²'],
      indent: 2
    }
  },

  // Machinery and equipment
  machinery: {
    pumps: {
      htsno: '8413709990',
      description: 'Pumps for liquids, whether or not fitted with a measuring device: Other, other',
      general: '2.5%',
      special: 'Free (A+, AU, B, BH, CA, CL, CO, D, E, IL, JO, KR, MA, MX, OM, P, PA, PE, S, SG)',
      other: '35%',
      units: ['No.'],
      indent: 3
    },
    motors: {
      htsno: '8501109920',
      description: 'Electric motors of an output not exceeding 37.5 W: Other, other',
      general: '6.7%',
      special: 'Free (A+, AU, B, BH, CA, CL, CO, D, E, IL, JO, KR, MA, MX, OM, P, PA, PE, S, SG)',
      other: '35%',
      units: ['No.'],
      indent: 3
    }
  },

  // Invalid/edge cases for testing
  edgeCases: {
    invalidCode: {
      htsno: '99999999',
      description: 'Invalid HTS code for testing',
      shouldNotExist: true
    },
    shortCode: {
      htsno: '8542',
      description: 'Partial HTS code - should match multiple entries'
    }
  }
};

// Country data for duty calculations
export const countryTestData = {
  // Major trading partners
  china: {
    code: 'CN',
    name: 'China',
    tradeAgreements: ['MFN'],
    specialRates: {
      '8542310001': {
        applicable: '25%',
        tradeStatus: 'Section 301 Tariffs',
        specialNote: 'Additional tariffs may apply under Section 301'
      }
    }
  },
  mexico: {
    code: 'MX',
    name: 'Mexico',
    tradeAgreements: ['USMCA', 'MFN'],
    specialRates: {
      '8542310001': {
        applicable: 'Free',
        tradeStatus: 'USMCA Preferential',
        specialNote: 'Free under USMCA agreement'
      },
      '6205200020': {
        applicable: 'Free',
        tradeStatus: 'USMCA Preferential',
        specialNote: 'Free under USMCA agreement'
      }
    }
  },
  canada: {
    code: 'CA',
    name: 'Canada',
    tradeAgreements: ['USMCA', 'MFN'],
    specialRates: {
      '8542310001': {
        applicable: 'Free',
        tradeStatus: 'USMCA Preferential',
        specialNote: 'Free under USMCA agreement'
      }
    }
  },
  germany: {
    code: 'DE',
    name: 'Germany',
    tradeAgreements: ['MFN'],
    specialRates: {
      '8542310001': {
        applicable: '0%',
        tradeStatus: 'MFN',
        specialNote: 'Most Favored Nation rate'
      }
    }
  },
  vietnam: {
    code: 'VN',
    name: 'Vietnam',
    tradeAgreements: ['MFN'],
    specialRates: {
      '6205200020': {
        applicable: '19.7%',
        tradeStatus: 'General Rate',
        specialNote: 'General duty rate applies'
      }
    }
  }
};

// Popular HTS codes that should be displayed
export const popularCodesData = [
  {
    htsno: '8542310001',
    description: 'Electronic integrated circuits: Processors and controllers',
    category: 'Electronics',
    frequency: 'high'
  },
  {
    htsno: '6205200020',
    description: 'Men\'s or boys\' shirts: Of cotton',
    category: 'Textiles',
    frequency: 'high'
  },
  {
    htsno: '8413709990',
    description: 'Pumps for liquids',
    category: 'Machinery',
    frequency: 'medium'
  },
  {
    htsno: '8541100020',
    description: 'Rectifier diodes',
    category: 'Electronics',
    frequency: 'medium'
  },
  {
    htsno: '5407610020',
    description: 'Woven fabrics of synthetic filament yarn',
    category: 'Textiles',
    frequency: 'medium'
  },
  {
    htsno: '8501109920',
    description: 'Electric motors of small output',
    category: 'Machinery',
    frequency: 'low'
  }
];

// Search test cases
export const searchTestCases = {
  // Valid searches that should return results
  validSearches: {
    description: [
      {
        term: 'electronic circuits',
        expectedResultsMin: 1,
        shouldHighlight: ['electronic', 'circuits']
      },
      {
        term: 'cotton shirts',
        expectedResultsMin: 1,
        shouldHighlight: ['cotton', 'shirts']
      },
      {
        term: 'pumps',
        expectedResultsMin: 1,
        shouldHighlight: ['pumps']
      },
      {
        term: 'fabric',
        expectedResultsMin: 1,
        shouldHighlight: ['fabric']
      }
    ],
    codes: [
      {
        term: '8542',
        expectedResultsMin: 1,
        shouldHighlight: ['8542']
      },
      {
        term: '6205',
        expectedResultsMin: 1,
        shouldHighlight: ['6205']
      },
      {
        term: '8413',
        expectedResultsMin: 1,
        shouldHighlight: ['8413']
      }
    ]
  },

  // Invalid searches
  invalidSearches: [
    {
      term: 'xyzinvalidterm123',
      expectedResults: 0,
      expectedMessage: 'No HTS codes found'
    },
    {
      term: '99999999',
      expectedResults: 0,
      expectedMessage: 'No HTS codes found'
    }
  ],

  // Edge cases
  edgeCases: [
    {
      term: 'a',
      expectedResults: 0,
      expectedMessage: 'Enter at least 2 characters'
    },
    {
      term: '',
      expectedResults: 0,
      expectedMessage: 'Enter at least 2 characters'
    }
  ]
};

// Mock API responses for testing
export const mockApiResponses = {
  // Successful search response
  searchSuccess: {
    success: true,
    data: [
      htsTestData.electronics.integratedCircuits,
      htsTestData.electronics.semiconductors,
      htsTestData.electronics.capacitors
    ],
    meta: {
      searchTerm: 'electronic',
      searchType: 'description',
      limit: 100,
      resultCount: 3,
      countryOfOrigin: null
    }
  },

  // Empty search response
  searchEmpty: {
    success: true,
    data: [],
    meta: {
      searchTerm: 'invalidterm',
      searchType: 'description',
      limit: 100,
      resultCount: 0,
      countryOfOrigin: null
    }
  },

  // Error response
  searchError: {
    success: false,
    error: 'Internal server error during HTS search'
  },

  // HTS code lookup success
  htsCodeSuccess: {
    success: true,
    data: {
      ...htsTestData.electronics.integratedCircuits,
      dutyInfo: {
        applicable: '0%',
        general: '0%',
        tradeStatus: 'MFN',
        specialNote: 'Most Favored Nation rate',
        verified: true,
        source: 'USITC'
      }
    }
  },

  // HTS code not found
  htsCodeNotFound: {
    success: false,
    error: 'HTS code not found'
  },

  // Countries list
  countriesSuccess: {
    success: true,
    data: [
      { code: 'CN', name: 'China' },
      { code: 'MX', name: 'Mexico' },
      { code: 'CA', name: 'Canada' },
      { code: 'DE', name: 'Germany' },
      { code: 'JP', name: 'Japan' },
      { code: 'KR', name: 'South Korea' },
      { code: 'VN', name: 'Vietnam' },
      { code: 'IN', name: 'India' }
    ],
    meta: {
      resultCount: 8
    }
  },

  // Popular codes
  popularCodesSuccess: {
    success: true,
    data: popularCodesData,
    meta: {
      limit: 20,
      resultCount: popularCodesData.length
    }
  },

  // Service status
  statusSuccess: {
    success: true,
    data: {
      loaded: true,
      entryCount: 19847,
      lastUpdated: '2024-01-15T10:30:00Z',
      version: '2024.1',
      source: 'USITC'
    }
  },

  // Network error simulation
  networkError: {
    name: 'NetworkError',
    message: 'Failed to fetch'
  },

  // Rate limit error
  rateLimitError: {
    success: false,
    error: 'Too many HTS requests, please try again later',
    statusCode: 429
  }
};

// Test scenarios for comprehensive testing
export const testScenarios = {
  // Happy path scenarios
  happyPath: {
    searchAndSelect: {
      searchTerm: 'electronic circuits',
      searchType: 'description',
      expectedResults: 3,
      selectIndex: 0,
      country: 'CN',
      expectedDutyInfo: true
    },
    popularCodeFlow: {
      popularCodeIndex: 0,
      country: 'MX',
      expectedDutyInfo: true
    },
    countryComparison: {
      htsCode: '8542310001',
      countries: ['CN', 'MX', 'DE'],
      expectedDifferentRates: true
    }
  },

  // Error scenarios
  errorScenarios: {
    invalidSearch: {
      searchTerm: 'invalidterm123',
      expectedError: 'No HTS codes found'
    },
    networkFailure: {
      simulateNetworkError: true,
      expectedNotification: true
    },
    serverError: {
      simulateServerError: true,
      expectedError: 'Internal server error'
    }
  },

  // Performance scenarios
  performance: {
    largeResultSet: {
      searchTerm: 'a',
      searchType: 'description',
      expectedMaxResults: 100,
      expectedMaxTime: 5000
    },
    rapidSearch: {
      searchTerms: ['el', 'ele', 'elec', 'elect', 'electr', 'electro', 'electron', 'electronic'],
      expectedDebouncing: true
    }
  }
};

// Utility functions for test data manipulation
export const testDataUtils = {
  // Get HTS code by category
  getHtsByCategory(category) {
    return htsTestData[category] || {};
  },

  // Get country by code
  getCountryByCode(code) {
    return Object.values(countryTestData).find(country => country.code === code);
  },

  // Get special rate for HTS code and country
  getSpecialRate(htsCode, countryCode) {
    const country = this.getCountryByCode(countryCode);
    return country?.specialRates?.[htsCode] || null;
  },

  // Generate random search terms
  getRandomSearchTerms(count = 5) {
    const terms = [
      'electronic', 'textile', 'machinery', 'cotton', 'metal',
      'plastic', 'chemical', 'motor', 'pump', 'circuit',
      'fabric', 'equipment', 'component', 'device', 'instrument'
    ];
    
    return terms.sort(() => 0.5 - Math.random()).slice(0, count);
  },

  // Generate test HTS codes
  getRandomHtsCodes(count = 3) {
    const allCodes = Object.values(htsTestData)
      .flatMap(category => Object.values(category))
      .filter(item => !item.shouldNotExist)
      .map(item => item.htsno);
    
    return allCodes.sort(() => 0.5 - Math.random()).slice(0, count);
  }
};