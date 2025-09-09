// api/hts/countries.js - HTS countries endpoint for Vercel
const { setCorsHeaders, handleOptions } = require('../_utils/cors');

// Common countries with trade relationships to US
const COUNTRIES_DATA = [
  { code: 'CA', name: 'Canada', region: 'North America', trade_agreement: 'USMCA' },
  { code: 'MX', name: 'Mexico', region: 'North America', trade_agreement: 'USMCA' },
  { code: 'CN', name: 'China', region: 'Asia', trade_agreement: null },
  { code: 'JP', name: 'Japan', region: 'Asia', trade_agreement: 'USJTA' },
  { code: 'KR', name: 'South Korea', region: 'Asia', trade_agreement: 'KORUS' },
  { code: 'IN', name: 'India', region: 'Asia', trade_agreement: null },
  { code: 'TW', name: 'Taiwan', region: 'Asia', trade_agreement: null },
  { code: 'TH', name: 'Thailand', region: 'Asia', trade_agreement: null },
  { code: 'VN', name: 'Vietnam', region: 'Asia', trade_agreement: null },
  { code: 'MY', name: 'Malaysia', region: 'Asia', trade_agreement: null },
  { code: 'SG', name: 'Singapore', region: 'Asia', trade_agreement: 'USSFTA' },
  { code: 'ID', name: 'Indonesia', region: 'Asia', trade_agreement: null },
  { code: 'PH', name: 'Philippines', region: 'Asia', trade_agreement: null },
  { code: 'DE', name: 'Germany', region: 'Europe', trade_agreement: null },
  { code: 'GB', name: 'United Kingdom', region: 'Europe', trade_agreement: null },
  { code: 'FR', name: 'France', region: 'Europe', trade_agreement: null },
  { code: 'IT', name: 'Italy', region: 'Europe', trade_agreement: null },
  { code: 'ES', name: 'Spain', region: 'Europe', trade_agreement: null },
  { code: 'NL', name: 'Netherlands', region: 'Europe', trade_agreement: null },
  { code: 'BE', name: 'Belgium', region: 'Europe', trade_agreement: null },
  { code: 'CH', name: 'Switzerland', region: 'Europe', trade_agreement: null },
  { code: 'AT', name: 'Austria', region: 'Europe', trade_agreement: null },
  { code: 'SE', name: 'Sweden', region: 'Europe', trade_agreement: null },
  { code: 'NO', name: 'Norway', region: 'Europe', trade_agreement: null },
  { code: 'DK', name: 'Denmark', region: 'Europe', trade_agreement: null },
  { code: 'FI', name: 'Finland', region: 'Europe', trade_agreement: null },
  { code: 'IE', name: 'Ireland', region: 'Europe', trade_agreement: null },
  { code: 'PT', name: 'Portugal', region: 'Europe', trade_agreement: null },
  { code: 'GR', name: 'Greece', region: 'Europe', trade_agreement: null },
  { code: 'PL', name: 'Poland', region: 'Europe', trade_agreement: null },
  { code: 'CZ', name: 'Czech Republic', region: 'Europe', trade_agreement: null },
  { code: 'HU', name: 'Hungary', region: 'Europe', trade_agreement: null },
  { code: 'BR', name: 'Brazil', region: 'South America', trade_agreement: null },
  { code: 'AR', name: 'Argentina', region: 'South America', trade_agreement: null },
  { code: 'CL', name: 'Chile', region: 'South America', trade_agreement: 'USFTA' },
  { code: 'CO', name: 'Colombia', region: 'South America', trade_agreement: 'USCCTA' },
  { code: 'PE', name: 'Peru', region: 'South America', trade_agreement: 'USPTA' },
  { code: 'EC', name: 'Ecuador', region: 'South America', trade_agreement: null },
  { code: 'UY', name: 'Uruguay', region: 'South America', trade_agreement: null },
  { code: 'AU', name: 'Australia', region: 'Oceania', trade_agreement: 'USAFTA' },
  { code: 'NZ', name: 'New Zealand', region: 'Oceania', trade_agreement: null },
  { code: 'ZA', name: 'South Africa', region: 'Africa', trade_agreement: 'AGOA' },
  { code: 'EG', name: 'Egypt', region: 'Africa', trade_agreement: null },
  { code: 'MA', name: 'Morocco', region: 'Africa', trade_agreement: 'USMFTA' },
  { code: 'IL', name: 'Israel', region: 'Middle East', trade_agreement: 'USIFTA' },
  { code: 'AE', name: 'United Arab Emirates', region: 'Middle East', trade_agreement: null },
  { code: 'SA', name: 'Saudi Arabia', region: 'Middle East', trade_agreement: null },
  { code: 'TR', name: 'Turkey', region: 'Middle East', trade_agreement: null },
  { code: 'JO', name: 'Jordan', region: 'Middle East', trade_agreement: 'USJFTA' },
  { code: 'BH', name: 'Bahrain', region: 'Middle East', trade_agreement: 'USBFTA' },
  { code: 'OM', name: 'Oman', region: 'Middle East', trade_agreement: 'USOFTA' }
];

async function handler(req, res) {
  // Handle CORS
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      const { region, trade_agreement_only, search } = req.query;
      
      let filteredCountries = [...COUNTRIES_DATA];
      
      // Filter by region if specified
      if (region) {
        filteredCountries = filteredCountries.filter(country => 
          country.region.toLowerCase() === region.toLowerCase()
        );
      }
      
      // Filter by trade agreement if specified
      if (trade_agreement_only === 'true') {
        filteredCountries = filteredCountries.filter(country => 
          country.trade_agreement !== null
        );
      }
      
      // Filter by search term if specified
      if (search) {
        const searchTerm = search.toLowerCase();
        filteredCountries = filteredCountries.filter(country =>
          country.name.toLowerCase().includes(searchTerm) ||
          country.code.toLowerCase().includes(searchTerm)
        );
      }
      
      // Sort by name
      filteredCountries.sort((a, b) => a.name.localeCompare(b.name));
      
      res.json({
        success: true,
        data: filteredCountries,
        meta: {
          total: filteredCountries.length,
          available_regions: [...new Set(COUNTRIES_DATA.map(c => c.region))],
          trade_agreements: [...new Set(COUNTRIES_DATA.map(c => c.trade_agreement).filter(Boolean))]
        }
      });
    } else {
      res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
    }
  } catch (error) {
    console.error('HTS countries API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = handler;