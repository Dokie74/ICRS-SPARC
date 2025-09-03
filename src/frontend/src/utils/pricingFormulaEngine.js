// src/frontend/src/utils/pricingFormulaEngine.js
// Pricing formula calculations and timeline management for ICRS SPARC
// Provides 3-month rolling average calculations and pricing timeline logic

export const PRICING_FORMULAS = {
  "3_month_rolling": {
    name: "3-Month Rolling Average Standard",
    description: "Average of rolling 3 months (month1, month2, month3) communicated in month4 becomes new price in month5",
    calculate: (prices) => {
      if (!Array.isArray(prices) || prices.length !== 3) {
        throw new Error('3-month rolling average requires exactly 3 price values');
      }
      const validPrices = prices.filter(p => !isNaN(parseFloat(p)));
      if (validPrices.length !== 3) {
        throw new Error('All 3 prices must be valid numbers');
      }
      return validPrices.reduce((sum, price) => sum + parseFloat(price), 0) / 3;
    },
    timeline: {
      dataMonths: 3,
      communicationDelay: 1, // month after data collection
      effectiveDelay: 2       // month after communication
    }
  },
  "simple_average": {
    name: "Simple 3-Month Average",
    description: "Average of specific 3 months",
    calculate: (prices) => {
      if (!Array.isArray(prices) || prices.length !== 3) {
        throw new Error('Simple average requires exactly 3 price values');
      }
      const validPrices = prices.filter(p => !isNaN(parseFloat(p)));
      if (validPrices.length !== 3) {
        throw new Error('All 3 prices must be valid numbers');
      }
      return validPrices.reduce((sum, price) => sum + parseFloat(price), 0) / 3;
    },
    timeline: {
      dataMonths: 3,
      communicationDelay: 0,
      effectiveDelay: 1
    }
  },
  "quarterly_standard": {
    name: "Quarterly Standard Formula",
    description: "Standard quarterly pricing adjustment formula used by ICRS SPARC",
    calculate: (prices) => {
      if (!Array.isArray(prices) || prices.length !== 3) {
        throw new Error('Quarterly standard requires exactly 3 price values');
      }
      const validPrices = prices.filter(p => !isNaN(parseFloat(p)));
      if (validPrices.length !== 3) {
        throw new Error('All 3 prices must be valid numbers');
      }
      // Same calculation as 3-month rolling but with specific FTZ compliance weighting
      const average = validPrices.reduce((sum, price) => sum + parseFloat(price), 0) / 3;
      // Apply slight adjustment for FTZ compliance (0.5% buffer)
      return average * 1.005;
    },
    timeline: {
      dataMonths: 3,
      communicationDelay: 1,
      effectiveDelay: 2
    }
  }
};

class PricingFormulaEngine {
  constructor() {
    this.defaultFormula = '3_month_rolling';
    this.supportedMaterials = ['aluminum', 'steel', 'stainless_steel'];
  }

  /**
   * Calculate using specified formula
   * @param {string} formulaKey - Formula identifier
   * @param {Array<number>} prices - Array of prices
   * @param {Object} options - Additional options
   * @returns {Object} Calculation result
   */
  calculatePrice(formulaKey, prices, options = {}) {
    const formula = PRICING_FORMULAS[formulaKey];
    if (!formula) {
      throw new Error(`Unknown pricing formula: ${formulaKey}`);
    }

    try {
      const result = formula.calculate(prices);
      return {
        success: true,
        result: parseFloat(result.toFixed(4)),
        formula: formulaKey,
        formulaName: formula.name,
        inputPrices: prices.map(p => parseFloat(p)),
        calculation: `(${prices.join(' + ')}) / ${prices.length} = ${result.toFixed(4)}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        formula: formulaKey
      };
    }
  }

  /**
   * Get pricing timeline for current date using standard 3-month rolling
   * @param {Date} referenceDate - Reference date (default: now)
   * @returns {Object} Pricing timeline object
   */
  getPricingTimeline(referenceDate = new Date()) {
    const now = new Date(referenceDate);
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();

    // Calculate the previous 3 months for data collection
    const dataMonths = [];
    for (let i = 3; i >= 1; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      dataMonths.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1, // 1-12
        monthName: date.toLocaleDateString('en-US', { month: 'long' }),
        fullName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      });
    }

    // Communication month (current month)
    const communicationMonth = {
      year: currentYear,
      month: currentMonth + 1,
      monthName: now.toLocaleDateString('en-US', { month: 'long' }),
      fullName: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      key: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    };

    // Effective month (next month)
    const effectiveDate = new Date(currentYear, currentMonth + 1, 1);
    const effectiveMonth = {
      year: effectiveDate.getFullYear(),
      month: effectiveDate.getMonth() + 1,
      monthName: effectiveDate.toLocaleDateString('en-US', { month: 'long' }),
      fullName: effectiveDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      key: `${effectiveDate.getFullYear()}-${String(effectiveDate.getMonth() + 1).padStart(2, '0')}`
    };

    return {
      dataMonths,
      communicationMonth,
      effectiveMonth,
      formula: this.defaultFormula,
      description: `Average of ${dataMonths.map(m => m.monthName).join(', ')} ${dataMonths[0].year} communicated in ${communicationMonth.fullName} becomes new price in ${effectiveMonth.fullName}`,
      summary: {
        dataMonthsText: dataMonths.map(m => m.fullName).join(', '),
        communicationText: communicationMonth.fullName,
        effectiveText: effectiveMonth.fullName
      }
    };
  }

  /**
   * Get specific months for a quarter
   * @param {string} quarter - Quarter identifier (Q1, Q2, Q3, Q4)
   * @param {number} year - Year
   * @returns {Array<Object>} Array of month objects
   */
  getQuarterMonths(quarter, year) {
    const quarters = {
      'Q1': [1, 2, 3],    // Jan, Feb, Mar
      'Q2': [4, 5, 6],    // Apr, May, Jun  
      'Q3': [7, 8, 9],    // Jul, Aug, Sep
      'Q4': [10, 11, 12]  // Oct, Nov, Dec
    };

    const months = quarters[quarter];
    if (!months) {
      throw new Error(`Invalid quarter: ${quarter}. Use Q1, Q2, Q3, or Q4`);
    }

    return months.map(monthNum => {
      const date = new Date(year, monthNum - 1, 1);
      return {
        year: year,
        month: monthNum,
        monthName: date.toLocaleDateString('en-US', { month: 'long' }),
        fullName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        key: `${year}-${String(monthNum).padStart(2, '0')}`
      };
    });
  }

  /**
   * Calculate price impact on parts
   * @param {Array<Object>} parts - Array of part objects
   * @param {number} oldPricePerMT - Old price per metric ton
   * @param {number} newPricePerMT - New price per metric ton
   * @returns {Object} Impact calculation results
   */
  calculatePartPriceImpact(parts, oldPricePerMT, newPricePerMT) {
    if (!Array.isArray(parts)) {
      return { success: false, error: 'Parts must be an array' };
    }

    const priceChangePerKg = (newPricePerMT - oldPricePerMT) / 1000;
    const impacts = [];
    let totalCostImpact = 0;
    let partsAffected = 0;

    parts.forEach(part => {
      const materialWeight = parseFloat(part.material_weight || 0);
      if (materialWeight > 0) {
        const priceImpactPerPart = materialWeight * priceChangePerKg;
        const oldTotalPrice = parseFloat(part.standard_value || 0);
        const newTotalPrice = oldTotalPrice + priceImpactPerPart;

        impacts.push({
          partId: part.id,
          partNumber: part.part_number || part.id,
          description: part.description || '',
          materialWeight: materialWeight,
          priceImpactPerPart: parseFloat(priceImpactPerPart.toFixed(4)),
          oldTotalPrice: parseFloat(oldTotalPrice.toFixed(2)),
          newTotalPrice: parseFloat(newTotalPrice.toFixed(2)),
          percentChange: oldTotalPrice > 0 ? parseFloat(((priceImpactPerPart / oldTotalPrice) * 100).toFixed(2)) : 0
        });

        totalCostImpact += priceImpactPerPart;
        partsAffected++;
      }
    });

    return {
      success: true,
      data: {
        impacts,
        summary: {
          partsAffected,
          totalParts: parts.length,
          totalCostImpact: parseFloat(totalCostImpact.toFixed(2)),
          averageImpactPerPart: partsAffected > 0 ? parseFloat((totalCostImpact / partsAffected).toFixed(2)) : 0,
          priceChangePerMT: parseFloat((newPricePerMT - oldPricePerMT).toFixed(2)),
          priceChangePerKg: parseFloat(priceChangePerKg.toFixed(4)),
          priceChangePercent: oldPricePerMT > 0 ? parseFloat(((newPricePerMT - oldPricePerMT) / oldPricePerMT * 100).toFixed(2)) : 0
        }
      }
    };
  }

  /**
   * Validate pricing formula configuration
   * @param {string} formulaKey - Formula identifier
   * @param {Object} config - Configuration object
   * @returns {Object} Validation result
   */
  validateFormulaConfig(formulaKey, config = {}) {
    const formula = PRICING_FORMULAS[formulaKey];
    if (!formula) {
      return { valid: false, error: `Unknown formula: ${formulaKey}` };
    }

    const errors = [];

    // Check required configuration based on formula
    if (formulaKey === '3_month_rolling' || formulaKey === 'quarterly_standard') {
      if (!config.dataMonths || config.dataMonths.length !== 3) {
        errors.push('3-month rolling formula requires exactly 3 data months');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      formula: formula.name
    };
  }

  /**
   * Generate adjustment timeline description
   * @param {string} formulaKey - Formula identifier
   * @param {Array|string} dataMonths - Data months
   * @param {string} communicationMonth - Communication month
   * @param {string} effectiveMonth - Effective month
   * @returns {string} Description text
   */
  generateAdjustmentDescription(formulaKey, dataMonths, communicationMonth, effectiveMonth) {
    const formula = PRICING_FORMULAS[formulaKey];
    if (!formula) {
      return 'Unknown pricing formula';
    }

    const dataMonthsText = Array.isArray(dataMonths) ? 
      dataMonths.join(', ') : dataMonths;

    switch (formulaKey) {
      case '3_month_rolling':
        return `Using 3-month rolling average of ${dataMonthsText}, communicated in ${communicationMonth}, effective in ${effectiveMonth}`;
      case 'simple_average':
        return `Using simple average of ${dataMonthsText}, effective in ${effectiveMonth}`;
      case 'quarterly_standard':
        return `Using quarterly standard formula with data from ${dataMonthsText}, communicated in ${communicationMonth}, effective in ${effectiveMonth}`;
      default:
        return `Using ${formula.name} with data from ${dataMonthsText}`;
    }
  }

  /**
   * Get all available formulas for UI display
   * @returns {Array<Object>} Array of formula objects
   */
  getAvailableFormulas() {
    return Object.keys(PRICING_FORMULAS).map(key => ({
      key,
      name: PRICING_FORMULAS[key].name,
      description: PRICING_FORMULAS[key].description,
      timeline: PRICING_FORMULAS[key].timeline
    }));
  }

  /**
   * Get material-specific pricing adjustments
   * @param {string} material - Material type
   * @param {Array<number>} prices - Historical prices
   * @returns {Object} Material-specific adjustments
   */
  getMaterialAdjustments(material, prices) {
    const adjustments = {
      aluminum: {
        volatilityFactor: 1.15, // 15% more volatile
        seasonalFactor: 1.02,   // 2% seasonal adjustment
        minimumChange: 0.01     // 1% minimum change threshold
      },
      steel: {
        volatilityFactor: 1.08, // 8% more volatile
        seasonalFactor: 1.01,   // 1% seasonal adjustment  
        minimumChange: 0.02     // 2% minimum change threshold
      },
      stainless_steel: {
        volatilityFactor: 1.25, // 25% more volatile (nickel dependency)
        seasonalFactor: 1.03,   // 3% seasonal adjustment
        minimumChange: 0.015    // 1.5% minimum change threshold
      }
    };

    return adjustments[material] || adjustments.aluminum;
  }

  /**
   * Helper method to format currency
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} Formatted currency
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  }

  /**
   * Helper method to format percentage
   * @param {number} value - Percentage value
   * @param {number} decimals - Decimal places
   * @returns {string} Formatted percentage
   */
  formatPercentage(value, decimals = 2) {
    return `${parseFloat(value).toFixed(decimals)}%`;
  }

  /**
   * Calculate Foreign Trade Zone compliance factor
   * @param {string} material - Material type
   * @param {number} priceChange - Price change amount
   * @returns {number} Compliance factor
   */
  calculateFTZComplianceFactor(material, priceChange) {
    // FTZ regulations may require specific adjustments for duty calculations
    const baseFactor = 1.0;
    const materialFactors = {
      aluminum: 0.995,      // 0.5% reduction for aluminum
      steel: 0.998,         // 0.2% reduction for steel
      stainless_steel: 0.992 // 0.8% reduction for stainless steel
    };

    return materialFactors[material] || baseFactor;
  }

  /**
   * Generate quarterly pricing report data
   * @param {Array<Object>} adjustments - Array of pricing adjustments
   * @returns {Object} Report data
   */
  generateQuarterlyReport(adjustments) {
    const report = {
      totalAdjustments: adjustments.length,
      materialBreakdown: {},
      totalCostImpact: 0,
      averagePercentChange: 0,
      partsAffected: 0
    };

    adjustments.forEach(adj => {
      // Material breakdown
      if (!report.materialBreakdown[adj.material]) {
        report.materialBreakdown[adj.material] = {
          count: 0,
          totalImpact: 0,
          averageChange: 0
        };
      }
      
      report.materialBreakdown[adj.material].count++;
      report.materialBreakdown[adj.material].totalImpact += adj.total_cost_impact || 0;
      report.materialBreakdown[adj.material].averageChange += adj.price_change_percent || 0;
      
      // Overall totals
      report.totalCostImpact += adj.total_cost_impact || 0;
      report.partsAffected += adj.parts_affected || 0;
    });

    // Calculate averages
    Object.keys(report.materialBreakdown).forEach(material => {
      const breakdown = report.materialBreakdown[material];
      breakdown.averageChange = breakdown.averageChange / breakdown.count;
    });

    report.averagePercentChange = adjustments.reduce((sum, adj) => 
      sum + (adj.price_change_percent || 0), 0) / adjustments.length;

    return report;
  }
}

// Export singleton instance
const pricingFormulaEngine = new PricingFormulaEngine();
export default pricingFormulaEngine;

// Also export the class for testing
export { PricingFormulaEngine };