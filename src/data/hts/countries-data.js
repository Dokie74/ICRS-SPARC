// api/hts/modules/countries-data.js - Countries data for HTS API

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

function getCountrySpecificInfo(htsCode, countryCode) {
  const countryCode_upper = countryCode.toUpperCase();
  
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

function getCountryName(countryCode) {
  const country = COUNTRIES_DATA.find(c => c.code === countryCode);
  return country ? country.name : countryCode;
}

module.exports = {
  COUNTRIES_DATA,
  getCountrySpecificInfo,
  getCountryName
};