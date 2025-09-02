// src/backend/services/reference/HTSService.js
// HTS (Harmonized Tariff Schedule) data service for ICRS SPARC
// Maintains complete USITC HTS data management with FTZ compliance

const BaseService = require('../BaseService');
const { getVerifiedDutyRate } = require('./verifiedDutyRates');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

class HTSService extends BaseService {
  constructor() {
    super('hts_data');
    this.htsData = null;
    this.lastUpdated = null;
    this.cacheFile = path.join(__dirname, '../../../../cache/hts-cache.json');
    this.currentVersion = '2025_revision_16';
    this.dataUrl = 'https://www.usitc.gov/sites/default/files/tata/hts/hts_2025_revision_16_json.json';
    this.cacheExpiryDays = 7; // Cache for 7 days
    this.initializing = false;
    this.initPromise = null;
  }

  // Initialize HTS data (load from cache or fetch)
  async initialize(options = {}) {
    try {
      // Prevent multiple simultaneous initializations
      if (this.initializing && this.initPromise) {
        return await this.initPromise;
      }

      if (this.htsData) {
        return { success: true, source: 'already_loaded' };
      }

      this.initializing = true;
      this.initPromise = this._doInitialize(options);
      
      const result = await this.initPromise;
      this.initializing = false;
      this.initPromise = null;
      
      return result;
    } catch (error) {
      this.initializing = false;
      this.initPromise = null;
      console.error('Error initializing HTS service:', error);
      return this.createResponse(false, null, error.message);
    }
  }

  async _doInitialize(options = {}) {
    // Check if we have cached data
    const cachedData = await this.getCachedData();
    if (cachedData && this.isCacheValid(cachedData)) {
      this.htsData = cachedData.data;
      this.lastUpdated = new Date(cachedData.timestamp);
      return { success: true, source: 'cache' };
    }

    // Fetch fresh data or use fallback
    if (options.forceFallback) {
      return this.createFallbackData();
    }

    return await this.fetchHtsData(options);
  }

  // Fetch HTS data from USITC
  async fetchHtsData(options = {}) {
    try {
      console.log('Attempting to fetch HTS data from USITC...');
      
      // Try direct fetch first
      try {
        const data = await this.downloadJson(this.dataUrl);
        if (Array.isArray(data) && data.length > 0) {
          this.htsData = data;
          this.lastUpdated = new Date();
          await this.cacheData(data);
          console.log(`HTS data loaded from USITC: ${data.length} entries`);
          return { success: true, source: 'network', count: data.length };
        }
      } catch (networkError) {
        console.warn('USITC direct fetch failed:', networkError.message);
      }

      // Fallback to comprehensive test data
      console.warn('Network methods failed, using comprehensive fallback data');
      return this.createFallbackData();
      
    } catch (error) {
      console.error('Error fetching HTS data:', error);
      return this.createFallbackData();
    }
  }

  // Download JSON from URL
  async downloadJson(url) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        });
      });

      request.on('error', reject);
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  // Create comprehensive fallback data representing real HTS structure
  createFallbackData() {
    console.log('Creating comprehensive HTS data for development...');
    
    const fallbackData = [
      // Chapter 01 - Live Animals
      {
        "htsno": "0101",
        "indent": "0",
        "description": "Live horses, asses, mules and hinnies:",
        "superior": null,
        "units": [],
        "general": "",
        "special": "",
        "other": ""
      },
      {
        "htsno": "0101.21.00",
        "indent": "2",
        "description": "Purebred breeding animals",
        "superior": null,
        "units": ["No."],
        "general": "Free",
        "special": "",
        "other": "Free"
      },
      {
        "htsno": "0101.29.00",
        "indent": "2", 
        "description": "Other horses",
        "superior": null,
        "units": ["No."],
        "general": "Free",
        "special": "",
        "other": "20%"
      },

      // Chapter 39 - Plastics
      {
        "htsno": "3926",
        "indent": "0",
        "description": "Other articles of plastics and articles of other materials of headings 3901 to 3914:",
        "superior": null,
        "units": [],
        "general": "",
        "special": "",
        "other": ""
      },
      {
        "htsno": "3926.90.99",
        "indent": "2",
        "description": "Other articles of plastics and articles of other materials of headings 3901 to 3914, nesoi",
        "superior": null,
        "units": ["kg"],
        "general": "5.3%",
        "special": "Free (A,AU,BH,CA,CL,CO,D,E,IL,JO,KR,MA,MX,OM,P,PA,PE,S,SG)",
        "other": "80%"
      },

      // Chapter 76 - Aluminum
      {
        "htsno": "7616",
        "indent": "0",
        "description": "Other articles of aluminum:",
        "superior": null,
        "units": [],
        "general": "",
        "special": "",
        "other": ""
      },
      {
        "htsno": "7616.99.51",
        "indent": "2",
        "description": "Other articles of aluminum, nesoi",
        "superior": null,
        "units": ["kg"],
        "general": "2.5%",
        "special": "Free (A,AU,BH,CA,CL,CO,D,E,IL,JO,KR,MA,MX,OM,P,PA,PE,S,SG)",
        "other": "10%"
      },

      // Chapter 84 - Machinery and Mechanical Appliances
      {
        "htsno": "8471",
        "indent": "0",
        "description": "Automatic data processing machines and units thereof; magnetic or optical readers, machines for transcribing data onto data media in coded form and machines for processing such data, not elsewhere specified or included:",
        "superior": null,
        "units": [],
        "general": "",
        "special": "",
        "other": ""
      },
      {
        "htsno": "8471.30.01",
        "indent": "2",
        "description": "Portable automatic data processing machines, weighing not more than 10 kg, consisting of at least a central processing unit, a keyboard and a display",
        "superior": null,
        "units": ["No."],
        "general": "Free",
        "special": "",
        "other": "Free"
      },
      {
        "htsno": "8471.41.01",
        "indent": "2",
        "description": "Comprising in the same housing at least a central processing unit and an input and output unit, whether or not combined",
        "superior": null,
        "units": ["No."],
        "general": "Free",
        "special": "",
        "other": "Free"
      },
      {
        "htsno": "8473",
        "indent": "0",
        "description": "Parts and accessories (other than covers, carrying cases and the like) suitable for use solely or principally with machines of headings 8469 to 8472:",
        "superior": null,
        "units": [],
        "general": "",
        "special": "",
        "other": ""
      },
      {
        "htsno": "8473.30.11",
        "indent": "2",
        "description": "Printed circuit assemblies",
        "superior": null,
        "units": ["No.", "kg"],
        "general": "Free",
        "special": "",
        "other": "Free"
      },
      {
        "htsno": "8473.30.20",
        "indent": "2",
        "description": "Power supplies for automatic data processing machines or units thereof of heading 8471",
        "superior": null,
        "units": ["No."],
        "general": "Free",
        "special": "",
        "other": "Free"
      },

      // Chapter 85 - Electrical Equipment
      {
        "htsno": "8517",
        "indent": "0",
        "description": "Telephone sets, including telephones for cellular networks or for other wireless networks; other apparatus for transmission or reception of voice, images or other data:",
        "superior": null,
        "units": [],
        "general": "",
        "special": "",
        "other": ""
      },
      {
        "htsno": "8517.12.00",
        "indent": "2",
        "description": "Telephones for cellular networks or for other wireless networks",
        "superior": null,
        "units": ["No."],
        "general": "Free",
        "special": "",
        "other": "Free"
      },
      {
        "htsno": "8536",
        "indent": "0",
        "description": "Electrical apparatus for switching or protecting electrical circuits, or for making connections to or in electrical circuits:",
        "superior": null,
        "units": [],
        "general": "",
        "special": "",
        "other": ""
      },
      {
        "htsno": "8536.69.40",
        "indent": "2",
        "description": "Electrical plugs and sockets, for a voltage not exceeding 1000 V",
        "superior": null,
        "units": ["No."],
        "general": "2.5%",
        "special": "Free (A,AU,BH,CA,CL,CO,D,E,IL,JO,KR,MA,MX,OM,P,PA,PE,S,SG)",
        "other": "35%"
      },
      {
        "htsno": "8542",
        "indent": "0",
        "description": "Electronic integrated circuits:",
        "superior": null,
        "units": [],
        "general": "",
        "special": "",
        "other": ""
      },
      {
        "htsno": "8542.31.00",
        "indent": "2",
        "description": "Processors and controllers, whether or not combined with memories, converters, logic circuits, amplifiers, clock and timing circuits, or other circuits",
        "superior": null,
        "units": ["No."],
        "general": "Free",
        "special": "",
        "other": "Free"
      },
      {
        "htsno": "8542.32.00",
        "indent": "2",
        "description": "Memories",
        "superior": null,
        "units": ["No."],
        "general": "Free",
        "special": "",
        "other": "Free"
      },
      {
        "htsno": "8542.33.00",
        "indent": "2",
        "description": "Amplifiers",
        "superior": null,
        "units": ["No."],
        "general": "Free",
        "special": "",
        "other": "Free"
      },
      {
        "htsno": "8542.39.00",
        "indent": "2",
        "description": "Other electronic integrated circuits",
        "superior": null,
        "units": ["No."],
        "general": "Free",
        "special": "",
        "other": "Free"
      },

      // Chapter 87 - Vehicles and Parts Thereof (CBP compliance focus)
      {
        "htsno": "8708",
        "indent": "0",
        "description": "Parts and accessories of the motor vehicles of headings 8701 to 8705:",
        "superior": null,
        "units": [],
        "general": "",
        "special": "",
        "other": ""
      },
      {
        "htsno": "8708.80",
        "indent": "1",
        "description": "Suspension systems and parts thereof (including shock absorbers):",
        "superior": "true",
        "units": [],
        "general": "",
        "special": "",
        "other": ""
      },
      {
        "htsno": "8708.80.6590",
        "indent": "2",
        "description": "Other suspension system parts (forged aluminum control arms, etc.)",
        "superior": null,
        "units": ["No."],
        "general": "2.5%",
        "special": "Free (A+,AU,BH,CL,CO,D,E,IL,JO,KR,MA,OM,P,PA,PE,S,SG)",
        "other": "25%"
      },

      // Chapter 90 - Optical and Precision Instruments
      {
        "htsno": "9013",
        "indent": "0",
        "description": "Liquid crystal devices not constituting articles provided for more specifically in other headings; lasers, other than laser diodes; other optical appliances and instruments, not elsewhere specified or included:",
        "superior": null,
        "units": [],
        "general": "",
        "special": "",
        "other": ""
      },
      {
        "htsno": "9013.80.90",
        "indent": "2",
        "description": "Other optical appliances and instruments, nesoi",
        "superior": null,
        "units": ["No."],
        "general": "Free",
        "special": "",
        "other": "Free"
      }
    ];

    this.htsData = fallbackData;
    this.lastUpdated = new Date();
    this.cacheData(fallbackData);

    return { success: true, source: 'fallback', count: fallbackData.length };
  }

  // Cache data to file system
  async cacheData(data) {
    try {
      const cacheDir = path.dirname(this.cacheFile);
      await fs.mkdir(cacheDir, { recursive: true });
      
      const cacheObject = {
        data: data,
        timestamp: new Date().toISOString(),
        version: this.currentVersion
      };
      
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheObject));
    } catch (error) {
      console.warn('Failed to cache HTS data:', error);
    }
  }

  // Get cached data
  async getCachedData() {
    try {
      const cached = await fs.readFile(this.cacheFile, 'utf8');
      const data = JSON.parse(cached);
      
      if (data.version !== this.currentVersion) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  // Check if cache is still valid
  isCacheValid(cachedData) {
    if (!cachedData || !cachedData.timestamp) {
      return false;
    }

    const cacheDate = new Date(cachedData.timestamp);
    const now = new Date();
    const daysDiff = (now - cacheDate) / (1000 * 60 * 60 * 24);

    return daysDiff < this.cacheExpiryDays;
  }

  // Search HTS codes by description
  async searchByDescription(searchTerm, limit = 100, options = {}) {
    if (!this.htsData) {
      const initResult = await this.initialize(options);
      if (!initResult.success) {
        return initResult;
      }
    }

    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return { success: true, data: [] };
      }

      const term = searchTerm.toLowerCase().trim();
      const results = this.htsData
        .filter(item => 
          item.description && 
          item.description.toLowerCase().includes(term) &&
          item.htsno && 
          item.htsno.trim() !== ''
        )
        .slice(0, limit)
        .map(item => ({
          htsno: item.htsno,
          description: item.description,
          indent: item.indent,
          units: item.units || [],
          general: item.general || '',
          special: item.special || '',
          other: item.other || '',
          superior: item.superior
        }));

      return { success: true, data: results };
    } catch (error) {
      console.error('Error searching HTS by description:', error);
      return { success: false, error: error.message };
    }
  }

  // Search HTS codes by HTS number
  async searchByHtsNumber(htsNumber, limit = 50, options = {}) {
    if (!this.htsData) {
      const initResult = await this.initialize(options);
      if (!initResult.success) {
        return initResult;
      }
    }

    try {
      if (!htsNumber || htsNumber.trim().length < 2) {
        return { success: true, data: [] };
      }

      const term = htsNumber.toLowerCase().trim();
      const results = this.htsData
        .filter(item => 
          item.htsno && 
          item.htsno.toLowerCase().startsWith(term)
        )
        .slice(0, limit)
        .map(item => ({
          htsno: item.htsno,
          description: item.description,
          indent: item.indent,
          units: item.units || [],
          general: item.general || '',
          special: item.special || '',
          other: item.other || '',
          superior: item.superior
        }));

      return { success: true, data: results };
    } catch (error) {
      console.error('Error searching HTS by number:', error);
      return { success: false, error: error.message };
    }
  }

  // Get HTS entry by exact HTS number
  async getByHtsNumber(htsNumber, options = {}) {
    if (!this.htsData) {
      const initResult = await this.initialize(options);
      if (!initResult.success) {
        return initResult;
      }
    }

    try {
      const entry = this.htsData.find(item => 
        item.htsno === htsNumber
      );

      if (entry) {
        return {
          success: true,
          data: {
            htsno: entry.htsno,
            description: entry.description,
            indent: entry.indent,
            units: entry.units || [],
            general: entry.general || '',
            special: entry.special || '',
            other: entry.other || '',
            superior: entry.superior
          }
        };
      } else {
        return { success: false, error: 'HTS code not found' };
      }
    } catch (error) {
      console.error('Error getting HTS by number:', error);
      return { success: false, error: error.message };
    }
  }

  // Get duty rate for specific HTS code and country of origin
  getDutyRate(htsEntry, countryOfOrigin) {
    if (!htsEntry || !countryOfOrigin) {
      return { 
        general: htsEntry?.general || '', 
        special: htsEntry?.special || '', 
        other: htsEntry?.other || '',
        additionalTariffs: this.getAdditionalTariffs(htsEntry, countryOfOrigin)
      };
    }

    // Always try verified rates first for critical HTS codes
    if (htsEntry.htsno) {
      const verifiedData = getVerifiedDutyRate(htsEntry.htsno, countryOfOrigin);
      if (verifiedData.found) {
        console.log(`Using verified duty rates for HTS ${htsEntry.htsno} from ${countryOfOrigin}:`, verifiedData);
        return {
          general: verifiedData.general,
          special: verifiedData.special,
          other: verifiedData.other,
          applicable: verifiedData.applicable,
          tradeStatus: verifiedData.tradeStatus,
          specialNote: `Verified CBP compliance data: ${verifiedData.rateType}`,
          countryOfOrigin: countryOfOrigin,
          additionalTariffs: this.getAdditionalTariffs(htsEntry, countryOfOrigin),
          footnotes: htsEntry.footnotes || [],
          verified: true,
          source: verifiedData.source
        };
      }
    }

    const country = countryOfOrigin.toUpperCase();
    
    // Free trade agreement countries and their benefits
    const freeTradeCountries = {
      // USMCA (former NAFTA)
      'CA': 'USMCA', 'MX': 'USMCA',
      // CAFTA-DR
      'CR': 'CAFTA-DR', 'DO': 'CAFTA-DR', 'GT': 'CAFTA-DR', 'HN': 'CAFTA-DR', 'NI': 'CAFTA-DR', 'SV': 'CAFTA-DR',
      // Other FTAs
      'AU': 'Australia FTA', 'BH': 'Bahrain FTA', 'CL': 'Chile FTA', 'CO': 'Colombia FTA',
      'IL': 'Israel FTA', 'JO': 'Jordan FTA', 'KR': 'Korea FTA', 'MA': 'Morocco FTA',
      'OM': 'Oman FTA', 'PA': 'Panama FTA', 'PE': 'Peru FTA', 'SG': 'Singapore FTA',
      // GSP countries (examples)
      'IN': 'GSP', 'BR': 'GSP', 'TH': 'GSP', 'TR': 'GSP',
      // MFN countries
      'JP': 'MFN', 'DE': 'MFN', 'GB': 'MFN', 'FR': 'MFN', 'IT': 'MFN'
    };

    const tradeStatus = freeTradeCountries[country] || 'Other';
    
    // Parse special rate to see if country qualifies for reduced rate
    let applicableRate = htsEntry.general || '';
    let specialNote = '';
    
    if (htsEntry.special && htsEntry.special.includes('Free')) {
      // Check if country code appears in the special rate parentheses
      const specialCountries = htsEntry.special.match(/\(([^)]+)\)/);
      if (specialCountries) {
        const countryCodes = specialCountries[1].split(',').map(c => c.trim());
        if (countryCodes.some(code => code === country || code === 'A')) {
          applicableRate = 'Free';
          specialNote = `Free under ${tradeStatus}`;
        }
      }
    }

    // Get additional tariffs (232, 301, etc.)
    const additionalTariffs = this.getAdditionalTariffs(htsEntry, country);
    
    // Determine final applicable rate considering additional tariffs
    let finalRate = applicableRate;
    let finalNote = specialNote;
    
    if (additionalTariffs.length > 0) {
      const highestAdditional = additionalTariffs.find(t => t.applies);
      if (highestAdditional) {
        finalRate = highestAdditional.rate;
        finalNote = `${highestAdditional.description} applies`;
      }
    }

    return {
      general: htsEntry.general || '',
      special: htsEntry.special || '',
      other: htsEntry.other || '',
      applicable: finalRate,
      tradeStatus: tradeStatus,
      specialNote: finalNote,
      countryOfOrigin: countryOfOrigin,
      additionalTariffs: additionalTariffs,
      footnotes: htsEntry.footnotes || []
    };
  }

  // Get additional tariffs (Section 232, 301, etc.) - simplified for now
  getAdditionalTariffs(htsEntry, countryOfOrigin) {
    // This would be enhanced based on actual footnote data
    return [];
  }

  // Get popular/common HTS codes
  async getPopularHtsCodes(limit = 20, options = {}) {
    return {
      success: true,
      data: [
        { htsno: '8471', description: 'Automatic data processing machines and units thereof' },
        { htsno: '8473', description: 'Parts and accessories for machines of headings 8469 to 8472' },
        { htsno: '8517', description: 'Telephone sets and other apparatus for transmission' },
        { htsno: '8542', description: 'Electronic integrated circuits' },
        { htsno: '9013', description: 'Liquid crystal devices' },
        { htsno: '3926', description: 'Other articles of plastics' },
        { htsno: '7616', description: 'Other articles of aluminum' },
        { htsno: '8536', description: 'Electrical apparatus for switching or protecting' }
      ]
    };
  }

  // Get country list for dropdown
  getCountryList() {
    return [
      { code: 'AU', name: 'Australia' },
      { code: 'BH', name: 'Bahrain' },
      { code: 'BR', name: 'Brazil' },
      { code: 'CA', name: 'Canada' },
      { code: 'CL', name: 'Chile' },
      { code: 'CN', name: 'China' },
      { code: 'CO', name: 'Colombia' },
      { code: 'CR', name: 'Costa Rica' },
      { code: 'DE', name: 'Germany' },
      { code: 'DO', name: 'Dominican Republic' },
      { code: 'FR', name: 'France' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'GT', name: 'Guatemala' },
      { code: 'HN', name: 'Honduras' },
      { code: 'IL', name: 'Israel' },
      { code: 'IN', name: 'India' },
      { code: 'IT', name: 'Italy' },
      { code: 'JP', name: 'Japan' },
      { code: 'JO', name: 'Jordan' },
      { code: 'KR', name: 'South Korea' },
      { code: 'MA', name: 'Morocco' },
      { code: 'MX', name: 'Mexico' },
      { code: 'MY', name: 'Malaysia' },
      { code: 'NI', name: 'Nicaragua' },
      { code: 'OM', name: 'Oman' },
      { code: 'PA', name: 'Panama' },
      { code: 'PE', name: 'Peru' },
      { code: 'PH', name: 'Philippines' },
      { code: 'SG', name: 'Singapore' },
      { code: 'SV', name: 'El Salvador' },
      { code: 'TH', name: 'Thailand' },
      { code: 'TR', name: 'Turkey' },
      { code: 'TW', name: 'Taiwan' },
      { code: 'VN', name: 'Vietnam' }
    ];
  }

  // Clear cache (for debugging or forcing refresh)
  async clearCache() {
    try {
      await fs.unlink(this.cacheFile);
      this.htsData = null;
      this.lastUpdated = null;
      return { success: true };
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error clearing HTS cache:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    }
  }

  // Force refresh data
  async refreshData(options = {}) {
    await this.clearCache();
    this.htsData = null;
    this.lastUpdated = null;
    return await this.fetchHtsData(options);
  }

  // Get all HTS data (for browsing)
  async getAllHtsData(options = {}) {
    if (!this.htsData) {
      const initResult = await this.initialize(options);
      if (!initResult.success) {
        return initResult;
      }
    }

    const {
      offset = 0,
      limit = null,
      includeHeaders = true
    } = options;

    try {
      let data = this.htsData;
      
      // Filter to include headers and regular entries if requested
      if (includeHeaders) {
        data = this.htsData.filter(item => 
          item.htsno || item.superior === "true" || item.indent === "0"
        );
      } else {
        data = this.htsData.filter(item => 
          item.htsno && item.htsno.trim() !== ''
        );
      }

      // Apply pagination if requested
      if (limit) {
        data = data.slice(offset, offset + limit);
      }

      return {
        success: true,
        data: data,
        total: this.htsData.length,
        offset: offset,
        limit: limit
      };
    } catch (error) {
      console.error('Error getting all HTS data:', error);
      return { success: false, error: error.message };
    }
  }

  // Get data status info
  getDataStatus() {
    return {
      loaded: !!this.htsData,
      lastUpdated: this.lastUpdated,
      entryCount: this.htsData ? this.htsData.length : 0,
      version: this.currentVersion
    };
  }
}

module.exports = new HTSService();