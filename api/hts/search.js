// api/hts/search.js - HTS search endpoint for Vercel
const { setCorsHeaders, handleOptions } = require('../_utils/cors');

// Extended HTS codes database for search functionality
const HTS_CODES_DATABASE = [
  {
    hts_code: '8471.30.0100',
    description: 'Portable automatic data processing machines, weighing not more than 10 kg, consisting of at least a central processing unit, a keyboard and a display',
    category: 'Electronics',
    chapter: '84',
    heading: '8471',
    subheading: '847130',
    unit: 'No.',
    general_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '8517.12.0020',
    description: 'Telephones for cellular networks or for other wireless networks, other than satellite',
    category: 'Electronics',
    chapter: '85',
    heading: '8517',
    subheading: '851712',
    unit: 'No.',
    general_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '8528.72.3200',
    description: 'Reception apparatus for television, color, with flat panel screen, LCD, with screen size exceeding 17 inches but not exceeding 19 inches',
    category: 'Electronics',
    chapter: '85',
    heading: '8528',
    subheading: '852872',
    unit: 'No.',
    general_rate: '1.4%',
    special_rate: 'Free'
  },
  {
    hts_code: '6203.42.4010',
    description: 'Men\'s or boys\' trousers, breeches and shorts, of cotton, not knitted or crocheted, containing 36 percent or more by weight of wool or fine animal hair',
    category: 'Textiles',
    chapter: '62',
    heading: '6203',
    subheading: '620342',
    unit: 'doz.',
    general_rate: '16.6%',
    special_rate: '15.3%'
  },
  {
    hts_code: '6204.62.4010',
    description: 'Women\'s or girls\' trousers, breeches and shorts, of cotton, not knitted or crocheted',
    category: 'Textiles',
    chapter: '62',
    heading: '6204',
    subheading: '620462',
    unit: 'doz.',
    general_rate: '16.6%',
    special_rate: '15.3%'
  },
  {
    hts_code: '6109.10.0027',
    description: 'T-shirts, singlets and other vests, knitted or crocheted, of cotton, for men or boys',
    category: 'Textiles',
    chapter: '61',
    heading: '6109',
    subheading: '610910',
    unit: 'doz.',
    general_rate: '16.5%',
    special_rate: '15.8%'
  },
  {
    hts_code: '9403.60.8081',
    description: 'Wooden furniture for offices, shops and the like, other than seats',
    category: 'Furniture',
    chapter: '94',
    heading: '9403',
    subheading: '940360',
    unit: 'X',
    general_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '8708.29.5030',
    description: 'Parts and accessories of bodies for motor vehicles, body panels',
    category: 'Automotive',
    chapter: '87',
    heading: '8708',
    subheading: '870829',
    unit: 'kg',
    general_rate: '2.5%',
    special_rate: 'Free'
  },
  {
    hts_code: '3926.90.9989',
    description: 'Articles of plastics, other, nesoi',
    category: 'Plastics',
    chapter: '39',
    heading: '3926',
    subheading: '392690',
    unit: 'kg',
    general_rate: '5.3%',
    special_rate: '4.2%'
  },
  {
    hts_code: '7326.90.8588',
    description: 'Articles of iron or steel, other, nesoi',
    category: 'Metals',
    chapter: '73',
    heading: '7326',
    subheading: '732690',
    unit: 'kg',
    general_rate: '2.9%',
    special_rate: 'Free'
  },
  {
    hts_code: '4202.92.3100',
    description: 'Travel, sports and similar bags with outer surface of plastic sheeting',
    category: 'Leather Goods',
    chapter: '42',
    heading: '4202',
    subheading: '420292',
    unit: 'No.',
    general_rate: '20%',
    special_rate: '18%'
  },
  {
    hts_code: '6403.91.6030',
    description: 'Footwear with outer soles of rubber, plastics, leather or composition leather and uppers of leather, covering the ankle',
    category: 'Footwear',
    chapter: '64',
    heading: '6403',
    subheading: '640391',
    unit: 'prs.',
    general_rate: '10.5%',
    special_rate: '8.5%'
  },
  {
    hts_code: '8544.42.9090',
    description: 'Electric conductors, for a voltage not exceeding 1,000 V, fitted with connectors, other',
    category: 'Electrical',
    chapter: '85',
    heading: '8544',
    subheading: '854442',
    unit: 'kg',
    general_rate: '2.6%',
    special_rate: 'Free'
  },
  {
    hts_code: '9018.19.9550',
    description: 'Electro-diagnostic apparatus used in medical, surgical, dental or veterinary sciences, other',
    category: 'Medical',
    chapter: '90',
    heading: '9018',
    subheading: '901819',
    unit: 'X',
    general_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '8443.32.1050',
    description: 'Printers, copying machines and facsimile machines, whether or not combined, multifunction machines',
    category: 'Electronics',
    chapter: '84',
    heading: '8443',
    subheading: '844332',
    unit: 'No.',
    general_rate: '0%',
    special_rate: 'Free'
  },
  // Add more codes for better search results
  {
    hts_code: '8471.41.0150',
    description: 'Automatic data processing machines, comprising in the same housing at least a central processing unit, desktop computers',
    category: 'Electronics',
    chapter: '84',
    heading: '8471',
    subheading: '847141',
    unit: 'No.',
    general_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '8471.49.0000',
    description: 'Automatic data processing machines and units thereof, other, presented in the form of systems',
    category: 'Electronics',
    chapter: '84',
    heading: '8471',
    subheading: '847149',
    unit: 'No.',
    general_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '8471.70.4000',
    description: 'Storage units for automatic data processing machines',
    category: 'Electronics',
    chapter: '84',
    heading: '8471',
    subheading: '847170',
    unit: 'No.',
    general_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '8471.60.7000',
    description: 'Input or output units for automatic data processing machines, keyboards',
    category: 'Electronics',
    chapter: '84',
    heading: '8471',
    subheading: '847160',
    unit: 'No.',
    general_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '8528.71.1000',
    description: 'Reception apparatus for television, not designed to incorporate a video display or screen',
    category: 'Electronics',
    chapter: '85',
    heading: '8528',
    subheading: '852871',
    unit: 'No.',
    general_rate: '1.4%',
    special_rate: 'Free'
  }
];

async function handler(req, res) {
  // Handle CORS
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      const { 
        q: searchTerm,
        type = 'description',
        limit = 100,
        countryOfOrigin,
        category
      } = req.query;
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.json({
          success: true,
          data: [],
          meta: {
            total: 0,
            search_term: searchTerm,
            search_type: type
          }
        });
      }
      
      const cleanSearchTerm = searchTerm.trim().toLowerCase();
      let results = [];
      
      // Search based on type
      if (type === 'code') {
        // Search by HTS code
        results = HTS_CODES_DATABASE.filter(item =>
          item.hts_code.toLowerCase().includes(cleanSearchTerm) ||
          item.hts_code.replace(/\./g, '').toLowerCase().includes(cleanSearchTerm.replace(/\./g, ''))
        );
      } else {
        // Search by description (default)
        results = HTS_CODES_DATABASE.filter(item =>
          item.description.toLowerCase().includes(cleanSearchTerm) ||
          item.category.toLowerCase().includes(cleanSearchTerm)
        );
      }
      
      // Filter by category if specified
      if (category) {
        results = results.filter(item =>
          item.category.toLowerCase() === category.toLowerCase()
        );
      }
      
      // Sort results by relevance
      results = results.sort((a, b) => {
        // Prioritize exact code matches
        if (type === 'code') {
          const aExact = a.hts_code.toLowerCase() === cleanSearchTerm;
          const bExact = b.hts_code.toLowerCase() === cleanSearchTerm;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
        } else {
          // Prioritize matches at the beginning of description
          const aStartsWith = a.description.toLowerCase().startsWith(cleanSearchTerm);
          const bStartsWith = b.description.toLowerCase().startsWith(cleanSearchTerm);
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
        }
        
        // Then sort by HTS code
        return a.hts_code.localeCompare(b.hts_code);
      });
      
      // Apply limit
      const limitNum = parseInt(limit);
      if (limitNum > 0 && limitNum < results.length) {
        results = results.slice(0, limitNum);
      }
      
      // Add country-specific duty rates if country is specified
      if (countryOfOrigin) {
        results = results.map(item => ({
          ...item,
          country_specific_rate: getCountrySpecificRate(item.hts_code, countryOfOrigin)
        }));
      }
      
      res.json({
        success: true,
        data: results,
        meta: {
          total: results.length,
          search_term: searchTerm,
          search_type: type,
          country_of_origin: countryOfOrigin,
          available_categories: [...new Set(HTS_CODES_DATABASE.map(c => c.category))],
          total_database_entries: HTS_CODES_DATABASE.length
        }
      });
      
    } else {
      res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
    }
  } catch (error) {
    console.error('HTS search API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Helper function to simulate country-specific duty rates
function getCountrySpecificRate(htsCode, countryCode) {
  // This is a simplified simulation - in real implementation,
  // this would query actual trade agreement data
  const tradeAgreements = {
    'CA': 'Free', // USMCA
    'MX': 'Free', // USMCA
    'CN': 'Variable', // Varies by product and current trade relations
    'GB': 'Standard', // Standard MFN rates
    'DE': 'Standard'
  };
  
  const agreement = tradeAgreements[countryCode?.toUpperCase()] || 'Standard';
  
  return {
    applicable_rate: agreement === 'Free' ? '0%' : 'See tariff schedule',
    trade_agreement: agreement,
    notes: agreement === 'Free' ? 'Duty-free under trade agreement' : 'Standard MFN rates apply'
  };
}

module.exports = handler;