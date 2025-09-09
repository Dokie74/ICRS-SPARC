// api/hts/modules/duty-rate-data.js - Duty rate data by HTS code and country

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

module.exports = {
  DUTY_RATE_DATA,
  TRADE_AGREEMENTS
};