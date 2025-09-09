// api/hts/code/[htsCode].js - HTS code lookup endpoint for Vercel
const { setCorsHeaders, handleOptions } = require('../../_utils/cors');

// Use the same database as search for consistency
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
    special_rate: 'Free',
    additional_duties: [],
    statistical_suffix: '0100'
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
    special_rate: 'Free',
    additional_duties: [],
    statistical_suffix: '0020'
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
    special_rate: 'Free',
    additional_duties: ['AD-CVD may apply'],
    statistical_suffix: '3200'
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
    special_rate: '15.3%',
    additional_duties: ['Textile quotas may apply'],
    statistical_suffix: '4010'
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
    special_rate: '15.3%',
    additional_duties: ['Textile quotas may apply'],
    statistical_suffix: '4010'
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
    special_rate: '15.8%',
    additional_duties: ['Textile quotas may apply'],
    statistical_suffix: '0027'
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
    special_rate: 'Free',
    additional_duties: [],
    statistical_suffix: '8081'
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
    special_rate: 'Free',
    additional_duties: [],
    statistical_suffix: '5030'
  }
];

async function handler(req, res) {
  // Handle CORS
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      const { htsCode } = req.query;
      const { countryOfOrigin } = req.query;
      
      if (!htsCode) {
        return res.status(400).json({
          success: false,
          error: 'HTS code is required'
        });
      }
      
      // Normalize HTS code - remove dots and normalize format
      const normalizedCode = htsCode.replace(/\./g, '');
      const searchCode = htsCode.toLowerCase();
      
      // Find the HTS code in database
      const htsData = HTS_CODES_DATABASE.find(item =>
        item.hts_code.toLowerCase() === searchCode ||
        item.hts_code.replace(/\./g, '').toLowerCase() === normalizedCode.toLowerCase()
      );
      
      if (!htsData) {
        return res.status(404).json({
          success: false,
          error: `HTS code '${htsCode}' not found`
        });
      }
      
      // Prepare response data
      let responseData = {
        ...htsData,
        found: true,
        lookup_date: new Date().toISOString(),
        notes: []
      };
      
      // Add country-specific information if country is provided
      if (countryOfOrigin) {
        const countryInfo = getCountrySpecificInfo(htsCode, countryOfOrigin);
        responseData.country_specific = countryInfo;
        
        if (countryInfo.applicable_rate !== responseData.general_rate) {
          responseData.notes.push(`Special rate applies for ${countryOfOrigin}: ${countryInfo.applicable_rate}`);
        }
      }
      
      // Add general notes
      if (responseData.general_rate === '0%') {
        responseData.notes.push('This item is duty-free under general rates');
      }
      
      if (responseData.additional_duties.length > 0) {
        responseData.notes.push('Additional duties or restrictions may apply - verify current status');
      }
      
      res.json({
        success: true,
        data: responseData
      });
      
    } else {
      res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
    }
  } catch (error) {
    console.error('HTS code lookup API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Helper function for country-specific information
function getCountrySpecificInfo(htsCode, countryCode) {
  const countryCode_upper = countryCode.toUpperCase();
  
  // Trade agreement mappings
  const tradeAgreements = {
    'CA': { name: 'USMCA', preferential: true },
    'MX': { name: 'USMCA', preferential: true },
    'CL': { name: 'US-Chile FTA', preferential: true },
    'SG': { name: 'US-Singapore FTA', preferential: true },
    'AU': { name: 'US-Australia FTA', preferential: true },
    'BH': { name: 'US-Bahrain FTA', preferential: true },
    'MA': { name: 'US-Morocco FTA', preferential: true },
    'OM': { name: 'US-Oman FTA', preferential: true },
    'PE': { name: 'US-Peru FTA', preferential: true },
    'CO': { name: 'US-Colombia FTA', preferential: true },
    'KR': { name: 'KORUS FTA', preferential: true },
    'PA': { name: 'US-Panama FTA', preferential: true }
  };
  
  const agreement = tradeAgreements[countryCode_upper];
  
  return {
    country_code: countryCode_upper,
    country_name: getCountryName(countryCode_upper),
    trade_agreement: agreement ? agreement.name : null,
    preferential_treatment: agreement ? agreement.preferential : false,
    applicable_rate: agreement && agreement.preferential ? 'Free or Reduced' : 'General Rate',
    origin_requirements: agreement ? 'Must meet origin requirements' : 'N/A',
    notes: agreement ? `Preferential treatment available under ${agreement.name}` : 'General MFN rates apply'
  };
}

// Helper function for country names
function getCountryName(countryCode) {
  const countryNames = {
    'CA': 'Canada',
    'MX': 'Mexico',
    'CN': 'China',
    'JP': 'Japan',
    'KR': 'South Korea',
    'DE': 'Germany',
    'GB': 'United Kingdom',
    'FR': 'France',
    'IT': 'Italy',
    'CL': 'Chile',
    'SG': 'Singapore',
    'AU': 'Australia',
    'BH': 'Bahrain',
    'MA': 'Morocco',
    'OM': 'Oman',
    'PE': 'Peru',
    'CO': 'Colombia',
    'PA': 'Panama'
  };
  
  return countryNames[countryCode] || countryCode;
}

module.exports = handler;