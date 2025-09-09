// api/hts/duty-rate.js - HTS duty rate calculation endpoint for Vercel
const { setCorsHeaders, handleOptions } = require('../_utils/cors');

// Duty rate data by HTS code and country
const DUTY_RATE_DATA = {
  '8471.30.0100': {
    general_rate: '0%',
    special_rates: {
      'CA': 'Free', // USMCA
      'MX': 'Free', // USMCA
      'CL': 'Free', // US-Chile FTA
      'SG': 'Free', // US-Singapore FTA
      'AU': 'Free', // US-Australia FTA
      'default': '0%'
    }
  },
  '8517.12.0020': {
    general_rate: '0%',
    special_rates: {
      'CA': 'Free',
      'MX': 'Free',
      'default': '0%'
    }
  },
  '8528.72.3200': {
    general_rate: '1.4%',
    special_rates: {
      'CA': 'Free',
      'MX': 'Free',
      'KR': 'Free', // KORUS
      'default': '1.4%'
    }
  },
  '6203.42.4010': {
    general_rate: '16.6%',
    special_rates: {
      'CA': 'Free',
      'MX': 'Free',
      'CL': 'Free',
      'SG': 'Free',
      'AU': 'Free',
      'MA': 'Free', // US-Morocco FTA
      'default': '16.6%'
    }
  },
  '6204.62.4010': {
    general_rate: '16.6%',
    special_rates: {
      'CA': 'Free',
      'MX': 'Free',
      'CL': 'Free',
      'SG': 'Free',
      'AU': 'Free',
      'default': '16.6%'
    }
  },
  '6109.10.0027': {
    general_rate: '16.5%',
    special_rates: {
      'CA': 'Free',
      'MX': 'Free',
      'CL': 'Free',
      'default': '16.5%'
    }
  },
  '9403.60.8081': {
    general_rate: '0%',
    special_rates: {
      'default': 'Free'
    }
  },
  '8708.29.5030': {
    general_rate: '2.5%',
    special_rates: {
      'CA': 'Free',
      'MX': 'Free',
      'KR': 'Free',
      'default': '2.5%'
    }
  },
  '3926.90.9989': {
    general_rate: '5.3%',
    special_rates: {
      'CA': 'Free',
      'MX': 'Free',
      'CL': '4.2%',
      'SG': '4.2%',
      'default': '5.3%'
    }
  },
  '7326.90.8588': {
    general_rate: '2.9%',
    special_rates: {
      'CA': 'Free',
      'MX': 'Free',
      'CL': 'Free',
      'default': '2.9%'
    }
  }
};

// Trade agreement information
const TRADE_AGREEMENTS = {
  'CA': 'USMCA (United States-Mexico-Canada Agreement)',
  'MX': 'USMCA (United States-Mexico-Canada Agreement)', 
  'CL': 'US-Chile Free Trade Agreement',
  'SG': 'US-Singapore Free Trade Agreement',
  'AU': 'US-Australia Free Trade Agreement',
  'BH': 'US-Bahrain Free Trade Agreement',
  'MA': 'US-Morocco Free Trade Agreement',
  'OM': 'US-Oman Free Trade Agreement',
  'PE': 'US-Peru Trade Promotion Agreement',
  'CO': 'US-Colombia Trade Promotion Agreement',
  'KR': 'KORUS FTA (Korea-US Free Trade Agreement)',
  'PA': 'US-Panama Trade Promotion Agreement',
  'JO': 'US-Jordan Free Trade Agreement',
  'IL': 'US-Israel Free Trade Agreement'
};

async function handler(req, res) {
  // Handle CORS
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'POST') {
      const { htsCode, countryOfOrigin } = req.body;
      
      if (!htsCode) {
        return res.status(400).json({
          success: false,
          error: 'HTS code is required'
        });
      }
      
      if (!countryOfOrigin) {
        return res.status(400).json({
          success: false,
          error: 'Country of origin is required'
        });
      }
      
      // Normalize inputs
      const normalizedHts = htsCode.trim().toUpperCase();
      const normalizedCountry = countryOfOrigin.trim().toUpperCase();
      
      // Find duty rate data for this HTS code
      const dutyData = DUTY_RATE_DATA[normalizedHts];
      
      if (!dutyData) {
        return res.status(404).json({
          success: false,
          error: `Duty rate data not available for HTS code: ${htsCode}`
        });
      }
      
      // Get applicable rate for country
      const applicableRate = dutyData.special_rates[normalizedCountry] || dutyData.special_rates.default || dutyData.general_rate;
      
      // Determine trade agreement
      const tradeAgreement = TRADE_AGREEMENTS[normalizedCountry] || null;
      
      // Calculate additional information
      const isPreferential = applicableRate !== dutyData.general_rate && applicableRate.toLowerCase() !== dutyData.general_rate.toLowerCase();
      const isDutyFree = applicableRate.toLowerCase() === 'free' || applicableRate === '0%';
      
      const result = {
        hts_code: normalizedHts,
        country_of_origin: normalizedCountry,
        general_rate: dutyData.general_rate,
        applicable_rate: applicableRate,
        is_preferential: isPreferential,
        is_duty_free: isDutyFree,
        trade_agreement: tradeAgreement,
        calculation_date: new Date().toISOString(),
        notes: [],
        requirements: []
      };
      
      // Add notes and requirements
      if (isPreferential) {
        result.notes.push(`Preferential rate available under ${tradeAgreement}`);
        result.requirements.push('Certificate of origin required');
        result.requirements.push('Must meet origin requirements');
      }
      
      if (isDutyFree) {
        result.notes.push('This product is duty-free from this country');
      }
      
      // Add specific notes for certain products
      if (normalizedHts.startsWith('61') || normalizedHts.startsWith('62')) {
        result.notes.push('Textile product - verify quota/visa requirements');
        result.requirements.push('May require textile visa');
      }
      
      if (normalizedHts.startsWith('85')) {
        result.notes.push('Electronic product - FCC certification may be required');
      }
      
      // Add general disclaimer
      result.notes.push('Rates subject to change - verify current status before entry');
      
      res.json({
        success: true,
        data: result
      });
      
    } else {
      res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
    }
  } catch (error) {
    console.error('HTS duty rate API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = handler;