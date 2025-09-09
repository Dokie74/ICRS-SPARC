// api/hts/modules/browse-data.js - HTS browse data with hierarchical structure

const HTS_BROWSE_DATA = [
  // Chapter headers
  {
    type: 'chapter',
    code: '84',
    title: 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof',
    level: 'chapter'
  },
  {
    type: 'chapter', 
    code: '85',
    title: 'Electrical machinery and equipment and parts thereof; sound recorders and reproducers, television image and sound recorders and reproducers, and parts and accessories of such articles',
    level: 'chapter'
  },
  {
    type: 'chapter',
    code: '61', 
    title: 'Articles of apparel and clothing accessories, knitted or crocheted',
    level: 'chapter'
  },
  {
    type: 'chapter',
    code: '62',
    title: 'Articles of apparel and clothing accessories, not knitted or crocheted', 
    level: 'chapter'
  },
  {
    type: 'chapter',
    code: '94',
    title: 'Furniture; bedding, mattresses, mattress supports, cushions and similar stuffed furnishings; luminaires and lighting fittings, not elsewhere specified or included; illuminated signs, illuminated name-plates and the like; prefabricated buildings',
    level: 'chapter'
  },
  {
    type: 'chapter',
    code: '87',
    title: 'Vehicles other than railway or tramway rolling stock, and parts and accessories thereof',
    level: 'chapter'
  },
  {
    type: 'chapter',
    code: '39',
    title: 'Plastics and articles thereof',
    level: 'chapter'
  },
  {
    type: 'chapter',
    code: '73',
    title: 'Articles of iron or steel',
    level: 'chapter'
  },
  {
    type: 'chapter',
    code: '42',
    title: 'Articles of leather; saddlery and harness; travel goods, handbags and similar containers; articles of animal gut (other than silkworm gut)',
    level: 'chapter'
  },
  {
    type: 'chapter',
    code: '64',
    title: 'Footwear, gaiters and the like; parts of such articles',
    level: 'chapter'
  },
  
  // Sample headings for Chapter 84
  {
    type: 'heading',
    code: '8471',
    title: 'Automatic data processing machines and units thereof; magnetic or optical readers, machines for transcribing data onto data media in coded form and machines for processing such data, not elsewhere specified or included',
    chapter: '84',
    level: 'heading'
  },
  {
    type: 'heading',
    code: '8443',
    title: 'Printing machinery used for printing by means of plates, cylinders and other printing components of heading 8442; other printers, copying machines and facsimile machines, whether or not combined; parts and accessories thereof',
    chapter: '84',
    level: 'heading'
  },
  {
    type: 'heading',
    code: '8708',
    title: 'Parts and accessories of the motor vehicles of headings 8701 to 8705',
    chapter: '87',
    level: 'heading'
  },
  
  // Sample subheadings for 8471
  {
    type: 'subheading',
    code: '847130',
    title: 'Portable automatic data processing machines, weighing not more than 10 kg, consisting of at least a central processing unit, a keyboard and a display',
    heading: '8471',
    chapter: '84',
    level: 'subheading'
  },
  {
    type: 'subheading', 
    code: '847141',
    title: 'Comprising in the same housing at least a central processing unit and an input and output unit, whether or not combined',
    heading: '8471',
    chapter: '84',
    level: 'subheading'
  },
  {
    type: 'subheading',
    code: '847149',
    title: 'Other, presented in the form of systems',
    heading: '8471',
    chapter: '84',
    level: 'subheading'
  },
  {
    type: 'subheading',
    code: '847160',
    title: 'Input or output units, whether or not containing storage units in the same housing',
    heading: '8471',
    chapter: '84',
    level: 'subheading'
  },
  {
    type: 'subheading',
    code: '847170',
    title: 'Storage units',
    heading: '8471',
    chapter: '84',
    level: 'subheading'
  },
  
  // Actual HTS codes
  {
    type: 'tariff_line',
    hts_code: '8471.30.0100',
    description: 'Portable automatic data processing machines, weighing not more than 10 kg, consisting of at least a central processing unit, a keyboard and a display',
    subheading: '847130',
    heading: '8471',
    chapter: '84',
    level: 'tariff_line',
    unit: 'No.',
    general_rate: '0%',
    special_rate: 'Free'
  },
  {
    type: 'tariff_line',
    hts_code: '8471.41.0150', 
    description: 'Desktop computers',
    subheading: '847141',
    heading: '8471',
    chapter: '84',
    level: 'tariff_line',
    unit: 'No.',
    general_rate: '0%',
    special_rate: 'Free'
  },
  {
    type: 'tariff_line',
    hts_code: '8471.49.0000',
    description: 'Other, presented in the form of systems', 
    subheading: '847149',
    heading: '8471',
    chapter: '84',
    level: 'tariff_line',
    unit: 'No.',
    general_rate: '0%',
    special_rate: 'Free'
  },
  {
    type: 'tariff_line',
    hts_code: '8471.60.7000',
    description: 'Keyboards',
    subheading: '847160', 
    heading: '8471',
    chapter: '84',
    level: 'tariff_line',
    unit: 'No.',
    general_rate: '0%',
    special_rate: 'Free'
  },
  {
    type: 'tariff_line',
    hts_code: '8471.70.4000',
    description: 'Storage units',
    subheading: '847170',
    heading: '8471', 
    chapter: '84',
    level: 'tariff_line',
    unit: 'No.',
    general_rate: '0%',
    special_rate: 'Free'
  }
];

module.exports = {
  HTS_BROWSE_DATA
};