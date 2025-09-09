// api/hts/popular.js - Popular HTS codes endpoint for Vercel
const { setCorsHeaders, handleOptions } = require('../_utils/cors');

// Popular HTS codes commonly used in imports
const POPULAR_HTS_CODES = [
  {
    hts_code: '8471.30.0100',
    description: 'Portable automatic data processing machines, weighing not more than 10 kg',
    category: 'Electronics',
    usage_frequency: 'Very High',
    general_duty_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '8517.12.0020',
    description: 'Telephones for cellular networks or for other wireless networks',
    category: 'Electronics',
    usage_frequency: 'Very High',
    general_duty_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '8528.72.3200',
    description: 'LCD monitors with screen size exceeding 17 inches but not exceeding 19 inches',
    category: 'Electronics',
    usage_frequency: 'High',
    general_duty_rate: '1.4%',
    special_rate: 'Free'
  },
  {
    hts_code: '6203.42.4010',
    description: 'Men\'s or boys\' trousers and breeches of cotton, not knitted',
    category: 'Textiles',
    usage_frequency: 'High',
    general_duty_rate: '16.6%',
    special_rate: '15.3%'
  },
  {
    hts_code: '6204.62.4010',
    description: 'Women\'s or girls\' trousers and breeches of cotton, not knitted',
    category: 'Textiles',
    usage_frequency: 'High',
    general_duty_rate: '16.6%',
    special_rate: '15.3%'
  },
  {
    hts_code: '6109.10.0027',
    description: 'T-shirts, singlets and other vests, knitted or crocheted, of cotton',
    category: 'Textiles',
    usage_frequency: 'Very High',
    general_duty_rate: '16.5%',
    special_rate: '15.8%'
  },
  {
    hts_code: '9403.60.8081',
    description: 'Wooden furniture for offices, shops and the like',
    category: 'Furniture',
    usage_frequency: 'Medium',
    general_duty_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '8708.29.5030',
    description: 'Parts and accessories of motor vehicles; body panels',
    category: 'Automotive',
    usage_frequency: 'High',
    general_duty_rate: '2.5%',
    special_rate: 'Free'
  },
  {
    hts_code: '3926.90.9989',
    description: 'Articles of plastics, other',
    category: 'Plastics',
    usage_frequency: 'Very High',
    general_duty_rate: '5.3%',
    special_rate: '4.2%'
  },
  {
    hts_code: '7326.90.8588',
    description: 'Articles of iron or steel, other',
    category: 'Metals',
    usage_frequency: 'High',
    general_duty_rate: '2.9%',
    special_rate: 'Free'
  },
  {
    hts_code: '4202.92.3100',
    description: 'Travel, sports and similar bags with outer surface of plastic sheeting',
    category: 'Leather Goods',
    usage_frequency: 'Medium',
    general_duty_rate: '20%',
    special_rate: '18%'
  },
  {
    hts_code: '6403.91.6030',
    description: 'Footwear with outer soles of rubber or plastics, uppers of leather',
    category: 'Footwear',
    usage_frequency: 'High',
    general_duty_rate: '10.5%',
    special_rate: '8.5%'
  },
  {
    hts_code: '8544.42.9090',
    description: 'Electric cables, for voltage not exceeding 1000V, other',
    category: 'Electrical',
    usage_frequency: 'Medium',
    general_duty_rate: '2.6%',
    special_rate: 'Free'
  },
  {
    hts_code: '9018.19.9550',
    description: 'Electro-diagnostic apparatus used in medical sciences',
    category: 'Medical',
    usage_frequency: 'Medium',
    general_duty_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '8443.32.1050',
    description: 'Printers, multifunction machines, suitable for connecting to computers',
    category: 'Electronics',
    usage_frequency: 'High',
    general_duty_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '9506.62.8020',
    description: 'Footballs and soccer balls',
    category: 'Sports Equipment',
    usage_frequency: 'Medium',
    general_duty_rate: '4%',
    special_rate: 'Free'
  },
  {
    hts_code: '9503.00.0021',
    description: 'Toys representing animals or non-human creatures',
    category: 'Toys',
    usage_frequency: 'High',
    general_duty_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '0901.21.0020',
    description: 'Coffee, roasted, not decaffeinated',
    category: 'Food & Beverage',
    usage_frequency: 'High',
    general_duty_rate: '0%',
    special_rate: 'Free'
  },
  {
    hts_code: '1806.32.0600',
    description: 'Chocolate and other food preparations containing cocoa',
    category: 'Food & Beverage',
    usage_frequency: 'Medium',
    general_duty_rate: '8.5%',
    special_rate: '6.1%'
  },
  {
    hts_code: '7113.19.5000',
    description: 'Jewelry and parts thereof, of precious metal other than silver',
    category: 'Jewelry',
    usage_frequency: 'Medium',
    general_duty_rate: '5.8%',
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
        limit = 20, 
        category, 
        usage_frequency,
        search 
      } = req.query;
      
      let filteredCodes = [...POPULAR_HTS_CODES];
      
      // Filter by category if specified
      if (category) {
        filteredCodes = filteredCodes.filter(code => 
          code.category.toLowerCase() === category.toLowerCase()
        );
      }
      
      // Filter by usage frequency if specified
      if (usage_frequency) {
        filteredCodes = filteredCodes.filter(code => 
          code.usage_frequency.toLowerCase() === usage_frequency.toLowerCase()
        );
      }
      
      // Filter by search term if specified
      if (search) {
        const searchTerm = search.toLowerCase();
        filteredCodes = filteredCodes.filter(code =>
          code.hts_code.includes(searchTerm) ||
          code.description.toLowerCase().includes(searchTerm) ||
          code.category.toLowerCase().includes(searchTerm)
        );
      }
      
      // Sort by usage frequency (Very High first, then High, Medium)
      const frequencyOrder = { 'Very High': 3, 'High': 2, 'Medium': 1 };
      filteredCodes.sort((a, b) => {
        const freqDiff = frequencyOrder[b.usage_frequency] - frequencyOrder[a.usage_frequency];
        if (freqDiff !== 0) return freqDiff;
        return a.hts_code.localeCompare(b.hts_code);
      });
      
      // Apply limit
      const limitNum = parseInt(limit);
      if (limitNum > 0) {
        filteredCodes = filteredCodes.slice(0, limitNum);
      }
      
      res.json({
        success: true,
        data: filteredCodes,
        meta: {
          total: filteredCodes.length,
          available_categories: [...new Set(POPULAR_HTS_CODES.map(c => c.category))],
          available_frequencies: [...new Set(POPULAR_HTS_CODES.map(c => c.usage_frequency))],
          total_available: POPULAR_HTS_CODES.length
        }
      });
    } else {
      res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
    }
  } catch (error) {
    console.error('HTS popular codes API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = handler;