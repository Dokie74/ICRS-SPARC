// src/frontend/components/pages/HTSBrowser.js
import React from 'react';

const HTSBrowser = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">HTS Browser</h1>
        <p className="text-gray-600 mt-1">Complete USITC tariff dataset browser</p>
      </div>
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">HTS Browser Migration Pending</h3>
        <p className="text-gray-600">Component will be migrated from original ICRS with 40MB+ CSV data.</p>
      </div>
    </div>
  );
};

export default HTSBrowser;