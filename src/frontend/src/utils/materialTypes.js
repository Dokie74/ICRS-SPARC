// src/frontend/utils/materialTypes.js
// Material type utilities for ICRS SPARC admin functionality
// Provides material type mapping and labeling functions

/**
 * Material type mapping for display labels
 */
export const materialTypes = {
  steel: {
    label: 'Steel',
    category: 'metal',
    color: 'bg-gray-100 text-gray-800',
    icon: 'fas fa-hammer'
  },
  aluminum: {
    label: 'Aluminum',
    category: 'metal',
    color: 'bg-blue-100 text-blue-800',
    icon: 'fas fa-cube'
  },
  copper: {
    label: 'Copper',
    category: 'metal',
    color: 'bg-orange-100 text-orange-800',
    icon: 'fas fa-circle'
  },
  brass: {
    label: 'Brass',
    category: 'metal',
    color: 'bg-yellow-100 text-yellow-800',
    icon: 'fas fa-circle'
  },
  plastic: {
    label: 'Plastic',
    category: 'polymer',
    color: 'bg-green-100 text-green-800',
    icon: 'fas fa-shapes'
  },
  rubber: {
    label: 'Rubber',
    category: 'polymer',
    color: 'bg-purple-100 text-purple-800',
    icon: 'fas fa-circle'
  },
  glass: {
    label: 'Glass',
    category: 'ceramic',
    color: 'bg-indigo-100 text-indigo-800',
    icon: 'fas fa-gem'
  },
  ceramic: {
    label: 'Ceramic',
    category: 'ceramic',
    color: 'bg-red-100 text-red-800',
    icon: 'fas fa-shapes'
  },
  composite: {
    label: 'Composite',
    category: 'composite',
    color: 'bg-teal-100 text-teal-800',
    icon: 'fas fa-layer-group'
  },
  wood: {
    label: 'Wood',
    category: 'organic',
    color: 'bg-amber-100 text-amber-800',
    icon: 'fas fa-tree'
  },
  fabric: {
    label: 'Fabric',
    category: 'textile',
    color: 'bg-pink-100 text-pink-800',
    icon: 'fas fa-cut'
  },
  paper: {
    label: 'Paper',
    category: 'organic',
    color: 'bg-slate-100 text-slate-800',
    icon: 'fas fa-file'
  },
  other: {
    label: 'Other',
    category: 'misc',
    color: 'bg-gray-100 text-gray-800',
    icon: 'fas fa-question'
  }
};

/**
 * Get display label for material type
 * @param {string} materialType - The material type code
 * @returns {string} Display label
 */
export const getMaterialLabel = (materialType) => {
  if (!materialType) return 'Unknown';
  
  const type = materialTypes[materialType.toLowerCase()];
  return type ? type.label : materialType.charAt(0).toUpperCase() + materialType.slice(1);
};

/**
 * Get material type configuration
 * @param {string} materialType - The material type code
 * @returns {object} Material configuration object
 */
export const getMaterialConfig = (materialType) => {
  if (!materialType) return materialTypes.other;
  
  return materialTypes[materialType.toLowerCase()] || materialTypes.other;
};

/**
 * Get all material types as options for select inputs
 * @returns {array} Array of option objects with value and label
 */
export const getMaterialOptions = () => {
  return Object.entries(materialTypes).map(([key, config]) => ({
    value: key,
    label: config.label,
    category: config.category
  }));
};

/**
 * Group materials by category
 * @returns {object} Materials grouped by category
 */
export const getMaterialsByCategory = () => {
  const grouped = {};
  
  Object.entries(materialTypes).forEach(([key, config]) => {
    if (!grouped[config.category]) {
      grouped[config.category] = [];
    }
    grouped[config.category].push({
      value: key,
      label: config.label,
      ...config
    });
  });
  
  return grouped;
};

/**
 * Validate material type
 * @param {string} materialType - The material type to validate
 * @returns {boolean} Whether the material type is valid
 */
export const isValidMaterialType = (materialType) => {
  return materialType && materialTypes.hasOwnProperty(materialType.toLowerCase());
};

export default {
  materialTypes,
  getMaterialLabel,
  getMaterialConfig,
  getMaterialOptions,
  getMaterialsByCategory,
  isValidMaterialType
};