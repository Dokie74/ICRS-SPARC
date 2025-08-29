// Tests for design tokens utility
// Ensures design tokens are accessible with proper fallbacks

import { 
  getColor, 
  getSpacing, 
  getTypography, 
  getFontFamily, 
  getFontSize, 
  getFontWeight,
  generateCSSCustomProperties,
  getTailwindTheme,
  componentStyles,
  tokens
} from '../../../src/frontend/utils/design-tokens';

describe('Design Tokens Utility', () => {
  describe('getColor', () => {
    it('should return primary color from tokens', () => {
      const color = getColor('primary.500');
      expect(color).toBe('#3b82f6');
    });

    it('should return semantic color from tokens', () => {
      const color = getColor('text.primary');
      expect(color).toBeTruthy();
    });

    it('should return fallback for invalid color path', () => {
      const color = getColor('nonexistent.color', '#ff0000');
      expect(color).toBe('#ff0000');
    });

    it('should return default fallback when color not found', () => {
      const color = getColor('invalid.path');
      expect(color).toBe('#000000');
    });
  });

  describe('getSpacing', () => {
    it('should return spacing value from tokens', () => {
      const spacing = getSpacing('4');
      expect(spacing).toBe('1rem');
    });

    it('should return fallback for invalid spacing', () => {
      const spacing = getSpacing('invalid', '2rem');
      expect(spacing).toBe('2rem');
    });
  });

  describe('getTypography', () => {
    it('should return typography values', () => {
      const fontSize = getTypography('fontSizes.lg');
      expect(fontSize).toBeTruthy();
    });

    it('should return semantic typography', () => {
      const heading = getTypography('headings.h1');
      expect(heading).toHaveProperty('fontSize');
      expect(heading).toHaveProperty('fontWeight');
    });
  });

  describe('getFontFamily', () => {
    it('should return sans font family string', () => {
      const fontFamily = getFontFamily('sans');
      expect(fontFamily).toContain('Inter');
    });

    it('should return mono font family string', () => {
      const fontFamily = getFontFamily('mono');
      expect(fontFamily).toContain('JetBrains Mono');
    });

    it('should fallback to sans for invalid type', () => {
      const fontFamily = getFontFamily('invalid');
      expect(fontFamily).toContain('Inter');
    });
  });

  describe('getFontSize', () => {
    it('should return font size for valid key', () => {
      const fontSize = getFontSize('lg');
      expect(fontSize).toBe('1.125rem');
    });

    it('should return base size for invalid key', () => {
      const fontSize = getFontSize('invalid');
      expect(fontSize).toBe('1rem');
    });
  });

  describe('getFontWeight', () => {
    it('should return font weight for valid key', () => {
      const fontWeight = getFontWeight('bold');
      expect(fontWeight).toBe('700');
    });

    it('should return normal weight for invalid key', () => {
      const fontWeight = getFontWeight('invalid');
      expect(fontWeight).toBe('400');
    });
  });

  describe('generateCSSCustomProperties', () => {
    it('should generate CSS custom properties object', () => {
      const cssVars = generateCSSCustomProperties();
      
      expect(cssVars).toHaveProperty('--color-primary-500');
      expect(cssVars).toHaveProperty('--spacing-4');
      expect(cssVars).toHaveProperty('--font-size-lg');
      expect(cssVars).toHaveProperty('--font-weight-bold');
    });

    it('should generate valid CSS property names', () => {
      const cssVars = generateCSSCustomProperties();
      
      Object.keys(cssVars).forEach(key => {
        expect(key).toMatch(/^--[a-zA-Z-]+$/);
      });
    });
  });

  describe('getTailwindTheme', () => {
    it('should generate Tailwind theme extension', () => {
      const theme = getTailwindTheme();
      
      expect(theme).toHaveProperty('extend');
      expect(theme.extend).toHaveProperty('colors');
      expect(theme.extend).toHaveProperty('spacing');
      expect(theme.extend).toHaveProperty('fontFamily');
    });
  });

  describe('componentStyles', () => {
    it('should provide button styles', () => {
      expect(componentStyles.button).toHaveProperty('primary');
      expect(componentStyles.button).toHaveProperty('secondary');
      
      expect(componentStyles.button.primary).toHaveProperty('backgroundColor');
      expect(componentStyles.button.primary).toHaveProperty('color');
    });

    it('should provide card styles', () => {
      expect(componentStyles.card).toHaveProperty('default');
      expect(componentStyles.card).toHaveProperty('elevated');
    });

    it('should provide input styles', () => {
      expect(componentStyles.input).toHaveProperty('default');
      expect(componentStyles.input).toHaveProperty('error');
    });

    it('should provide status styles', () => {
      expect(componentStyles.status).toHaveProperty('success');
      expect(componentStyles.status).toHaveProperty('error');
      expect(componentStyles.status).toHaveProperty('warning');
      expect(componentStyles.status).toHaveProperty('info');
    });
  });

  describe('tokens object', () => {
    it('should have all required token categories', () => {
      expect(tokens).toHaveProperty('colors');
      expect(tokens).toHaveProperty('spacing');
      expect(tokens).toHaveProperty('typography');
      expect(tokens).toHaveProperty('semantic');
    });

    it('should have primary color palette', () => {
      expect(tokens.colors.primary).toHaveProperty('500');
      expect(tokens.colors.primary).toHaveProperty('600');
    });

    it('should have gray color palette', () => {
      expect(tokens.colors.gray).toHaveProperty('50');
      expect(tokens.colors.gray).toHaveProperty('900');
    });

    it('should have semantic colors', () => {
      expect(tokens.semantic.colors).toBeDefined();
    });
  });

  describe('fallback behavior', () => {
    it('should handle missing token files gracefully', () => {
      // Test that functions don't throw when tokens are missing
      expect(() => getColor('any.path')).not.toThrow();
      expect(() => getSpacing('any')).not.toThrow();
      expect(() => getTypography('any.path')).not.toThrow();
    });

    it('should provide meaningful fallbacks', () => {
      const color = getColor('nonexistent.color');
      const spacing = getSpacing('nonexistent');
      const fontFamily = getFontFamily();
      
      expect(color).toBe('#000000');
      expect(spacing).toBe('1rem');
      expect(fontFamily).toContain('Inter');
    });
  });
});