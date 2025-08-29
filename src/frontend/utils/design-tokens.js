// Design token utility for ICRS SPARC frontend
// Provides fallback support for missing token files and type-safe token access

import colorsTokens from '../../../design-documentation/tokens/colors.json';
import spacingTokens from '../../../design-documentation/tokens/spacing.json';
import typographyTokens from '../../../design-documentation/tokens/typography.json';

// Fallback tokens in case JSON files are missing
const fallbackTokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a'
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    },
    success: { 500: '#10b981', 600: '#059669' },
    error: { 500: '#ef4444', 600: '#dc2626' },
    warning: { 500: '#f59e0b', 600: '#d97706' },
    info: { 500: '#0ea5e9', 600: '#0284c7' }
  },
  spacing: {
    1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem',
    5: '1.25rem', 6: '1.5rem', 8: '2rem', 10: '2.5rem',
    12: '3rem', 16: '4rem', 20: '5rem', 24: '6rem'
  },
  typography: {
    fonts: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace']
    },
    fontSizes: {
      xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem',
      xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem'
    },
    fontWeights: {
      normal: '400', medium: '500', semibold: '600', bold: '700'
    }
  }
};

// Safe token access with fallbacks
const safeGet = (obj, path, fallback) => {
  try {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? fallback;
  } catch {
    return fallback;
  }
};

// Load tokens with fallback support
const loadTokens = () => {
  try {
    return {
      colors: colorsTokens?.colors || fallbackTokens.colors,
      spacing: spacingTokens?.spacing || fallbackTokens.spacing,
      typography: typographyTokens || fallbackTokens.typography,
      semantic: {
        colors: colorsTokens?.semantic || {},
        spacing: spacingTokens?.semantic || {},
        typography: typographyTokens?.semantic || {}
      }
    };
  } catch (error) {
    console.warn('Design tokens not found, using fallbacks:', error.message);
    return fallbackTokens;
  }
};

const tokens = loadTokens();

// Token accessor functions
export const getColor = (path, fallback = '#000000') => {
  const color = safeGet(tokens.colors, path) || safeGet(tokens.semantic.colors, path);
  return color || fallback;
};

export const getSpacing = (path, fallback = '1rem') => {
  const spacing = safeGet(tokens.spacing, path) || safeGet(tokens.semantic.spacing, path);
  return spacing || fallback;
};

export const getTypography = (path, fallback = {}) => {
  const typography = safeGet(tokens.typography, path) || safeGet(tokens.semantic.typography, path);
  return typography || fallback;
};

export const getFontFamily = (type = 'sans') => {
  const fonts = tokens.typography.fonts || fallbackTokens.typography.fonts;
  return fonts[type] ? fonts[type].join(', ') : fonts.sans.join(', ');
};

export const getFontSize = (size = 'base') => {
  return safeGet(tokens.typography, `fontSizes.${size}`, '1rem');
};

export const getFontWeight = (weight = 'normal') => {
  return safeGet(tokens.typography, `fontWeights.${weight}`, '400');
};

// CSS custom properties generator for dynamic theme support
export const generateCSSCustomProperties = () => {
  const cssVars = {};
  
  // Colors
  Object.entries(tokens.colors).forEach(([colorName, colorValues]) => {
    if (typeof colorValues === 'object') {
      Object.entries(colorValues).forEach(([shade, value]) => {
        cssVars[`--color-${colorName}-${shade}`] = value;
      });
    } else {
      cssVars[`--color-${colorName}`] = colorValues;
    }
  });
  
  // Spacing
  Object.entries(tokens.spacing).forEach(([key, value]) => {
    cssVars[`--spacing-${key}`] = value;
  });
  
  // Typography
  Object.entries(tokens.typography.fontSizes || {}).forEach(([size, value]) => {
    cssVars[`--font-size-${size}`] = value;
  });
  
  Object.entries(tokens.typography.fontWeights || {}).forEach(([weight, value]) => {
    cssVars[`--font-weight-${weight}`] = value;
  });
  
  return cssVars;
};

// Tailwind CSS theme extension
export const getTailwindTheme = () => {
  return {
    extend: {
      colors: tokens.colors,
      spacing: tokens.spacing,
      fontFamily: tokens.typography.fonts,
      fontSize: tokens.typography.fontSizes,
      fontWeight: tokens.typography.fontWeights,
      lineHeight: tokens.typography.lineHeights
    }
  };
};

// Component style helpers
export const componentStyles = {
  // Button variants using design tokens
  button: {
    primary: {
      backgroundColor: getColor('primary.500'),
      color: getColor('semantic.text.inverse', '#ffffff'),
      padding: `${getSpacing('2')} ${getSpacing('4')}`,
      fontSize: getFontSize('sm'),
      fontWeight: getFontWeight('medium'),
      borderRadius: '0.375rem',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
      ':hover': {
        backgroundColor: getColor('primary.600')
      }
    },
    secondary: {
      backgroundColor: getColor('semantic.background.secondary', '#f9fafb'),
      color: getColor('semantic.text.primary'),
      border: `1px solid ${getColor('semantic.border.default')}`,
      padding: `${getSpacing('2')} ${getSpacing('4')}`,
      fontSize: getFontSize('sm'),
      fontWeight: getFontWeight('medium'),
      borderRadius: '0.375rem',
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
      ':hover': {
        backgroundColor: getColor('semantic.background.tertiary'),
        borderColor: getColor('semantic.border.hover')
      }
    }
  },
  
  // Card styles
  card: {
    default: {
      backgroundColor: getColor('semantic.background.primary'),
      border: `1px solid ${getColor('semantic.border.default')}`,
      borderRadius: '0.5rem',
      padding: getSpacing('6'),
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    },
    elevated: {
      backgroundColor: getColor('semantic.background.primary'),
      border: `1px solid ${getColor('semantic.border.default')}`,
      borderRadius: '0.5rem',
      padding: getSpacing('6'),
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }
  },
  
  // Input styles
  input: {
    default: {
      backgroundColor: getColor('semantic.background.primary'),
      border: `1px solid ${getColor('semantic.border.default')}`,
      borderRadius: '0.375rem',
      padding: `${getSpacing('2')} ${getSpacing('3')}`,
      fontSize: getFontSize('sm'),
      color: getColor('semantic.text.primary'),
      ':focus': {
        outline: 'none',
        borderColor: getColor('semantic.border.focus'),
        boxShadow: `0 0 0 3px ${getColor('primary.100')}`
      }
    },
    error: {
      borderColor: getColor('error.500'),
      ':focus': {
        borderColor: getColor('error.500'),
        boxShadow: `0 0 0 3px ${getColor('error.100')}`
      }
    }
  },
  
  // Status indicators
  status: {
    success: {
      backgroundColor: getColor('success.50'),
      color: getColor('success.800'),
      border: `1px solid ${getColor('success.200')}`,
      padding: `${getSpacing('2')} ${getSpacing('3')}`,
      borderRadius: '0.375rem',
      fontSize: getFontSize('sm')
    },
    error: {
      backgroundColor: getColor('error.50'),
      color: getColor('error.800'),
      border: `1px solid ${getColor('error.200')}`,
      padding: `${getSpacing('2')} ${getSpacing('3')}`,
      borderRadius: '0.375rem',
      fontSize: getFontSize('sm')
    },
    warning: {
      backgroundColor: getColor('warning.50'),
      color: getColor('warning.800'),
      border: `1px solid ${getColor('warning.200')}`,
      padding: `${getSpacing('2')} ${getSpacing('3')}`,
      borderRadius: '0.375rem',
      fontSize: getFontSize('sm')
    },
    info: {
      backgroundColor: getColor('info.50'),
      color: getColor('info.800'),
      border: `1px solid ${getColor('info.200')}`,
      padding: `${getSpacing('2')} ${getSpacing('3')}`,
      borderRadius: '0.375rem',
      fontSize: getFontSize('sm')
    }
  }
};

// Export all tokens for direct access
export { tokens };

// Export individual token categories
export const colors = tokens.colors;
export const spacing = tokens.spacing;
export const typography = tokens.typography;
export const semantic = tokens.semantic;

export default {
  tokens,
  getColor,
  getSpacing,
  getTypography,
  getFontFamily,
  getFontSize,
  getFontWeight,
  generateCSSCustomProperties,
  getTailwindTheme,
  componentStyles
};