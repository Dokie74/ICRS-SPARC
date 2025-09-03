// src/frontend/src/components/modals/EnhancedQuarterlyUpdateModal.js
// Enhanced Quarterly Pricing Update Modal for ICRS SPARC
// 4-step wizard: Timeline Selection → Price Entry → Impact Analysis → Application

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import materialIndexService from '../../services/materialIndexService';
import pricingFormulaEngine from '../../utils/pricingFormulaEngine';

const EnhancedQuarterlyUpdateModal = ({ 
  onClose, 
  showNotification = toast,
  onDataUpdate = () => {} 
}) => {
  // Main state
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Timeline Selection
  const [selectedMaterial, setSelectedMaterial] = useState('aluminum');
  const [timeline, setTimeline] = useState(null);
  const [customTimeline, setCustomTimeline] = useState(false);
  const [dataMonths, setDataMonths] = useState([]);
  
  // Custom timeline state
  const [customDataMonths, setCustomDataMonths] = useState([
    { month: new Date().getMonth() - 2, year: new Date().getFullYear() },
    { month: new Date().getMonth() - 1, year: new Date().getFullYear() },
    { month: new Date().getMonth(), year: new Date().getFullYear() }
  ]);
  const [customCommunicationMonth, setCustomCommunicationMonth] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [customEffectiveMonth, setCustomEffectiveMonth] = useState({
    month: new Date().getMonth() + 2,
    year: new Date().getFullYear()
  });

  // Step 2: Price Entry
  const [priceData, setPriceData] = useState({});
  const [calculatedAverage, setCalculatedAverage] = useState(null);
  const [oldAverage, setOldAverage] = useState(null);
  const [priceChangePercent, setPriceChangePercent] = useState(0);

  // Step 3: Impact Analysis
  const [impactAnalysis, setImpactAnalysis] = useState(null);
  const [affectedParts, setAffectedParts] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);

  // Step 4: Application
  const [adjustmentData, setAdjustmentData] = useState(null);
  const [applicationResults, setApplicationResults] = useState(null);

  // Available materials
  const materials = [
    { value: 'aluminum', label: 'Aluminum' },
    { value: 'steel', label: 'Steel' },
    { value: 'stainless_steel', label: 'Stainless Steel' }
  ];

  // Step configuration
  const steps = [
    { id: 1, title: 'Timeline Selection', description: 'Select material and pricing timeline' },
    { id: 2, title: 'Price Entry', description: 'Enter or fetch material pricing data' },
    { id: 3, title: 'Impact Analysis', description: 'Review pricing impact on parts' },
    { id: 4, title: 'Application', description: 'Apply pricing adjustment to parts' }
  ];

  // Initialize timeline on material change or custom timeline toggle
  useEffect(() => {
    if (selectedMaterial) {
      let newTimeline, newDataMonths;
      
      if (customTimeline) {
        // Use custom timeline
        newDataMonths = customDataMonths.map(month => 
          `${month.year}-${String(month.month + 1).padStart(2, '0')}`
        );
        
        // Create custom timeline object for display
        newTimeline = {
          dataMonths: customDataMonths.map((month, index) => ({
            key: `${month.year}-${String(month.month + 1).padStart(2, '0')}`,
            monthName: new Date(month.year, month.month).toLocaleDateString('en-US', { month: 'long' }),
            fullName: new Date(month.year, month.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            year: month.year
          })),
          communicationMonth: {
            key: `${customCommunicationMonth.year}-${String(customCommunicationMonth.month + 1).padStart(2, '0')}`,
            monthName: new Date(customCommunicationMonth.year, customCommunicationMonth.month).toLocaleDateString('en-US', { month: 'long' }),
            fullName: new Date(customCommunicationMonth.year, customCommunicationMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            year: customCommunicationMonth.year
          },
          effectiveMonth: {
            key: `${customEffectiveMonth.year}-${String(customEffectiveMonth.month + 1).padStart(2, '0')}`,
            monthName: new Date(customEffectiveMonth.year, customEffectiveMonth.month).toLocaleDateString('en-US', { month: 'long' }),
            fullName: new Date(customEffectiveMonth.year, customEffectiveMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            year: customEffectiveMonth.year
          },
          description: 'Custom timeline configured by user'
        };
      } else {
        // Use automatic timeline
        newTimeline = pricingFormulaEngine.getPricingTimeline();
        newDataMonths = newTimeline.dataMonths.map(m => m.key);
      }
      
      setTimeline(newTimeline);
      setDataMonths(newDataMonths);
      setPriceData({});
      setCalculatedAverage(null);
      setOldAverage(null);
    }
  }, [selectedMaterial, customTimeline, customDataMonths, customCommunicationMonth, customEffectiveMonth]);

  // Fetch existing prices for selected months (moved before useEffect to fix hoisting)
  const fetchExistingPrices = useCallback(async () => {
    if (!selectedMaterial || dataMonths.length !== 3) return;
    
    setLoading(true);
    try {
      const startDate = `${dataMonths[0]}-01`;
      const endDate = `${dataMonths[2]}-31`;
      
      const result = await materialIndexService.getAllMaterialIndices({
        material: selectedMaterial,
        startDate,
        endDate
      });

      if (result.success && result.data) {
        const newPriceData = {};
        result.data.forEach(index => {
          const monthKey = index.price_date.substring(0, 7); // YYYY-MM
          if (dataMonths.includes(monthKey)) {
            newPriceData[monthKey] = index.price_usd_per_mt;
          }
        });
        setPriceData(newPriceData);
      }
    } catch (error) {
      console.error('Error fetching existing prices:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMaterial, dataMonths]);

  // Fetch existing pricing data when data months change
  useEffect(() => {
    fetchExistingPrices();
  }, [fetchExistingPrices]);

  // Calculate 3-month average
  const calculateAverage = useCallback(() => {
    const prices = dataMonths.map(month => parseFloat(priceData[month]) || 0);
    const validPrices = prices.filter(p => p > 0);
    
    if (validPrices.length === 3) {
      const calculation = pricingFormulaEngine.calculatePrice('3_month_rolling', validPrices);
      if (calculation.success) {
        setCalculatedAverage(calculation.result);
        
        // Calculate price change percentage if we have old average
        if (oldAverage && oldAverage > 0) {
          const changePercent = ((calculation.result - oldAverage) / oldAverage) * 100;
          setPriceChangePercent(parseFloat(changePercent.toFixed(2)));
        }
        
        return calculation.result;
      }
    }
    return null;
  }, [dataMonths, priceData, oldAverage]);

  // Recalculate average when price data changes
  useEffect(() => {
    calculateAverage();
  }, [calculateAverage]);

  // Fetch parts for impact analysis
  const fetchPartsForImpact = async () => {
    setLoading(true);
    try {
      // This would typically call a parts API endpoint
      // For now, we'll simulate with mock data
      const mockParts = [
        {
          id: '1',
          part_number: 'ALM-001',
          description: 'Aluminum Housing Component',
          material: selectedMaterial,
          material_weight: 2.5,
          standard_value: 45.00
        },
        {
          id: '2', 
          part_number: 'ALM-002',
          description: 'Aluminum Bracket Assembly',
          material: selectedMaterial,
          material_weight: 1.8,
          standard_value: 32.50
        }
      ];
      
      setAffectedParts(mockParts);
      setSelectedParts(mockParts.map(p => p.id));
      
      // Calculate impact analysis
      if (calculatedAverage && oldAverage) {
        const impact = pricingFormulaEngine.calculatePartPriceImpact(
          mockParts,
          oldAverage,
          calculatedAverage
        );
        setImpactAnalysis(impact);
      }
    } catch (error) {
      console.error('Error fetching parts for impact:', error);
      showNotification.error('Failed to load parts data');
    } finally {
      setLoading(false);
    }
  };

  // Handle step navigation
  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate timeline selection
      if (!selectedMaterial || !timeline) {
        showNotification.error('Please select a material and timeline');
        return;
      }
    }
    
    if (currentStep === 2) {
      // Validate price entry
      const prices = dataMonths.map(month => parseFloat(priceData[month]) || 0);
      const validPrices = prices.filter(p => p > 0);
      
      if (validPrices.length !== 3) {
        showNotification.error('Please enter all three monthly prices');
        return;
      }
      
      if (!calculatedAverage) {
        showNotification.error('Unable to calculate average price');
        return;
      }
      
      // Fetch old average for comparison
      setLoading(true);
      try {
        const lastYear = new Date().getFullYear() - 1;
        const previousMonths = dataMonths.map(month => {
          const [, monthNum] = month.split('-');
          return `${lastYear}-${monthNum}`;
        });
        
        const result = await materialIndexService.calculate3MonthAverage(
          selectedMaterial,
          previousMonths[0],
          previousMonths[1], 
          previousMonths[2]
        );
        
        if (result.success) {
          setOldAverage(result.data.average);
          const changePercent = ((calculatedAverage - result.data.average) / result.data.average) * 100;
          setPriceChangePercent(parseFloat(changePercent.toFixed(2)));
        }
      } catch (error) {
        console.error('Error fetching old average:', error);
      } finally {
        setLoading(false);
      }
      
      // Move to impact analysis and fetch parts
      await fetchPartsForImpact();
    }
    
    if (currentStep === 3) {
      // Validate impact analysis
      if (!impactAnalysis || selectedParts.length === 0) {
        showNotification.error('Please select parts to be affected by the pricing adjustment');
        return;
      }
      
      // Prepare adjustment data
      const adjustment = {
        adjustment_name: `Q${Math.ceil(new Date().getMonth() / 3)} ${new Date().getFullYear()} ${materials.find(m => m.value === selectedMaterial)?.label} Price Adjustment`,
        material: selectedMaterial,
        data_months: dataMonths,
        communication_month: timeline.communicationMonth.key,
        effective_month: timeline.effectiveMonth.key,
        old_average_price: oldAverage,
        new_average_price: calculatedAverage,
        price_change_usd: calculatedAverage - (oldAverage || 0),
        price_change_percent: priceChangePercent,
        parts_affected: selectedParts.length,
        total_cost_impact: impactAnalysis.data.summary.totalCostImpact,
        pricing_formula: '3_month_rolling',
        formula_config: {
          dataMonths: dataMonths,
          prices: dataMonths.map(month => priceData[month])
        }
      };
      
      setAdjustmentData(adjustment);
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Handle final application
  const handleApplyAdjustment = async () => {
    if (!adjustmentData) {
      showNotification.error('No adjustment data available');
      return;
    }
    
    setSubmitting(true);
    try {
      // Create pricing adjustment
      const createResult = await materialIndexService.createPricingAdjustment(adjustmentData);
      
      if (!createResult.success) {
        throw new Error(createResult.error);
      }
      
      // Apply the adjustment
      const applyResult = await materialIndexService.applyPricingAdjustment(createResult.data.id);
      
      if (!applyResult.success) {
        throw new Error(applyResult.error);
      }
      
      setApplicationResults(applyResult.data);
      showNotification.success(`Pricing adjustment applied successfully! ${applyResult.data.partsUpdated} parts updated.`);
      
      // Refresh data in parent component
      onDataUpdate();
      
    } catch (error) {
      console.error('Error applying pricing adjustment:', error);
      showNotification.error(error.message || 'Failed to apply pricing adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  // MonthYear Selector Component for Custom Timeline
  const MonthYearSelector = ({ label, value, onChange, className = "" }) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);
    
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="flex space-x-2">
          <select
            value={value.month}
            onChange={(e) => onChange({ ...value, month: parseInt(e.target.value) })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={value.year}
            onChange={(e) => onChange({ ...value, year: parseInt(e.target.value) })}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  // Handle timeline changes for custom mode
  const handleTimelineChange = (field, value) => {
    switch(field) {
      case 'dataMonth1':
        setCustomDataMonths(prev => [value, prev[1], prev[2]]);
        break;
      case 'dataMonth2':
        setCustomDataMonths(prev => [prev[0], value, prev[2]]);
        break;
      case 'dataMonth3':
        setCustomDataMonths(prev => [prev[0], prev[1], value]);
        break;
      case 'communicationMonth':
        setCustomCommunicationMonth(value);
        break;
      case 'effectiveMonth':
        setCustomEffectiveMonth(value);
        break;
      default:
        console.warn(`Unknown timeline field: ${field}`);
    }
  };

  // Step 1: Timeline Selection Component
  const TimelineSelection = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Material
        </label>
        <select
          value={selectedMaterial}
          onChange={(e) => setSelectedMaterial(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {materials.map(material => (
            <option key={material.value} value={material.value}>
              {material.label}
            </option>
          ))}
        </select>
      </div>

      {timeline && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Pricing Timeline</h4>
          <p className="text-sm text-blue-800 mb-3">{timeline.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Data Months:</span>
              <div className="text-gray-600">
                {timeline.dataMonths.map(m => m.monthName).join(', ')} {timeline.dataMonths[0].year}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Communication:</span>
              <div className="text-gray-600">{timeline.communicationMonth.fullName}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Effective:</span>
              <div className="text-gray-600">{timeline.effectiveMonth.fullName}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="custom-timeline"
          checked={customTimeline}
          onChange={(e) => setCustomTimeline(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="custom-timeline" className="text-sm text-gray-700">
          Use custom timeline (advanced)
        </label>
      </div>

      {customTimeline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-yellow-900 mb-3">Custom Timeline Configuration</h4>
          
          {/* Data Months Section */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Data Collection Months (3 months required)</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MonthYearSelector
                label="First Data Month"
                value={customDataMonths[0]}
                onChange={(value) => handleTimelineChange('dataMonth1', value)}
              />
              <MonthYearSelector
                label="Second Data Month"
                value={customDataMonths[1]}
                onChange={(value) => handleTimelineChange('dataMonth2', value)}
              />
              <MonthYearSelector
                label="Third Data Month"
                value={customDataMonths[2]}
                onChange={(value) => handleTimelineChange('dataMonth3', value)}
              />
            </div>
          </div>

          {/* Communication Month Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MonthYearSelector
              label="Communication Month (when pricing is communicated)"
              value={customCommunicationMonth}
              onChange={(value) => handleTimelineChange('communicationMonth', value)}
            />
            <MonthYearSelector
              label="Effective Month (when pricing goes live)"
              value={customEffectiveMonth}
              onChange={(value) => handleTimelineChange('effectiveMonth', value)}
            />
          </div>

          {/* Timeline Summary */}
          <div className="bg-white border border-gray-200 rounded p-3 text-sm">
            <h6 className="font-medium text-gray-700 mb-2">Timeline Summary:</h6>
            <div className="space-y-1 text-gray-600">
              <div><strong>Data from:</strong> {customDataMonths.map(month => 
                new Date(month.year, month.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              ).join(', ')}</div>
              <div><strong>Communicated:</strong> {new Date(customCommunicationMonth.year, customCommunicationMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              <div><strong>Effective:</strong> {new Date(customEffectiveMonth.year, customEffectiveMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Step 2: Price Entry Component
  const PriceEntry = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">
          Enter {materials.find(m => m.value === selectedMaterial)?.label} Prices (USD per Metric Ton)
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dataMonths.map((month, index) => {
            const monthName = timeline?.dataMonths[index]?.fullName || month;
            return (
              <div key={month}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {monthName}
                </label>
                <input
                  key={`price-${month}-${index}`}
                  type="number"
                  step="0.01"
                  value={priceData[month] || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPriceData(prev => ({
                      ...prev,
                      [month]: value
                    }));
                  }}
                  onBlur={(e) => {
                    // Format on blur if valid number
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value > 0) {
                      setPriceData(prev => ({
                        ...prev,
                        [month]: value.toFixed(2)
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  autoComplete="off"
                />
              </div>
            );
          })}
        </div>
      </div>

      {calculatedAverage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Calculation Results</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-800">3-Month Average:</span>
              <div className="font-semibold">{pricingFormulaEngine.formatCurrency(calculatedAverage)}/MT</div>
            </div>
            {oldAverage && (
              <div>
                <span className="text-green-800">Change from Previous:</span>
                <div className={`font-semibold ${priceChangePercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading existing price data...</span>
        </div>
      )}
    </div>
  );

  // Step 3: Impact Analysis Component
  const ImpactAnalysis = () => (
    <div className="space-y-6">
      {impactAnalysis && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-3">Pricing Impact Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-yellow-800">Parts Affected:</span>
              <div className="font-semibold">{impactAnalysis.data.summary.partsAffected}</div>
            </div>
            <div>
              <span className="text-yellow-800">Total Cost Impact:</span>
              <div className="font-semibold">{pricingFormulaEngine.formatCurrency(impactAnalysis.data.summary.totalCostImpact)}</div>
            </div>
            <div>
              <span className="text-yellow-800">Average per Part:</span>
              <div className="font-semibold">{pricingFormulaEngine.formatCurrency(impactAnalysis.data.summary.averageImpactPerPart)}</div>
            </div>
            <div>
              <span className="text-yellow-800">Price Change:</span>
              <div className="font-semibold">{pricingFormulaEngine.formatPercentage(priceChangePercent)}</div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="font-medium text-gray-900 mb-3">Affected Parts</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedParts.length === affectedParts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedParts(affectedParts.map(p => p.id));
                        } else {
                          setSelectedParts([]);
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Value</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impact</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {affectedParts.map((part) => {
                  const impact = impactAnalysis?.data.impacts.find(i => i.partId === part.id);
                  return (
                    <tr key={part.id} className={selectedParts.includes(part.id) ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedParts.includes(part.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedParts(prev => [...prev, part.id]);
                            } else {
                              setSelectedParts(prev => prev.filter(id => id !== part.id));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{part.part_number}</div>
                        <div className="text-sm text-gray-500">{part.description}</div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {part.material_weight} kg
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {pricingFormulaEngine.formatCurrency(part.standard_value)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {impact && (
                          <div className="text-sm">
                            <div className={`font-medium ${impact.priceImpactPerPart >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {impact.priceImpactPerPart >= 0 ? '+' : ''}{pricingFormulaEngine.formatCurrency(impact.priceImpactPerPart)}
                            </div>
                            <div className="text-gray-500">
                              ({impact.percentChange >= 0 ? '+' : ''}{impact.percentChange}%)
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 4: Application Component
  const Application = () => (
    <div className="space-y-6">
      {adjustmentData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3">Pricing Adjustment Summary</h4>
          <div className="space-y-2 text-sm">
            <div><strong>Name:</strong> {adjustmentData.adjustment_name}</div>
            <div><strong>Material:</strong> {materials.find(m => m.value === adjustmentData.material)?.label}</div>
            <div><strong>Data Period:</strong> {adjustmentData.data_months.join(', ')}</div>
            <div><strong>New Average Price:</strong> {pricingFormulaEngine.formatCurrency(adjustmentData.new_average_price)}/MT</div>
            <div><strong>Price Change:</strong> {adjustmentData.price_change_percent >= 0 ? '+' : ''}{adjustmentData.price_change_percent}%</div>
            <div><strong>Parts Affected:</strong> {adjustmentData.parts_affected}</div>
            <div><strong>Total Cost Impact:</strong> {pricingFormulaEngine.formatCurrency(adjustmentData.total_cost_impact)}</div>
            <div><strong>Effective Month:</strong> {adjustmentData.effective_month}</div>
          </div>
        </div>
      )}

      {!applicationResults ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">Ready to Apply</h4>
          <p className="text-sm text-yellow-800 mb-4">
            This action will create a pricing adjustment record and update the selected parts with new material pricing. 
            This action cannot be undone.
          </p>
          
          <button
            onClick={handleApplyAdjustment}
            disabled={submitting}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Applying Adjustment...
              </>
            ) : (
              'Apply Pricing Adjustment'
            )}
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">✅ Application Successful</h4>
          <div className="text-sm text-green-800 space-y-1">
            <div><strong>Parts Updated:</strong> {applicationResults.partsUpdated}</div>
            <div><strong>Total Cost Impact:</strong> {pricingFormulaEngine.formatCurrency(applicationResults.totalCostImpact)}</div>
            <div><strong>Price Changes Recorded:</strong> {applicationResults.priceChanges}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Quarterly Pricing Update</h2>
              <p className="text-blue-100">Material pricing adjustment wizard</p>
            </div>
            <button
              onClick={onClose}
              className="text-blue-200 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-between mt-6">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-white text-blue-600 border-white' 
                    : 'border-blue-300 text-blue-300'
                }`}>
                  {currentStep > step.id ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <div className="ml-3 text-left">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-blue-200">{step.description}</div>
                </div>
                {step.id < 4 && <div className="flex-1 h-px bg-blue-400 mx-4"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {currentStep === 1 && <TimelineSelection />}
          {currentStep === 2 && <PriceEntry />}
          {currentStep === 3 && <ImpactAnalysis />}
          {currentStep === 4 && <Application />}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg transition-colors duration-200"
          >
            Previous
          </button>

          <div className="text-sm text-gray-500">
            Step {currentStep} of {steps.length}
          </div>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors duration-200 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                'Next'
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors duration-200"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedQuarterlyUpdateModal;