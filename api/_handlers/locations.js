// api/locations/index.js - Vercel serverless locations endpoint
const { setCorsHeaders, handleOptions } = require('../_utils/cors');
const { requireAuth } = require('../_utils/auth');
const { SupabaseClient } = require('../_utils/db');

async function handler(req, res) {
  // Handle CORS
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  const supabaseClient = new SupabaseClient(req.accessToken);

  try {
    if (req.method === 'GET') {
      // Get all locations with optional filtering
      const { search, limit, offset } = req.query;
      
      let options = {
        select: 'id, location_code, description, zone, aisle, level, position, created_at, updated_at',
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      if (search) {
        // Search by location code or description
        options.filters = {
          or: `location_code.ilike.%${search}%,description.ilike.%${search}%`
        };
      }

      const result = await supabaseClient.getAll('storage_locations', options);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          count: result.count
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } else if (req.method === 'POST') {
      // Create new location
      const locationData = req.body;
      
      const result = await supabaseClient.create('storage_locations', locationData);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } else {
      res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
    }
  } catch (error) {
    console.error('Locations API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = requireAuth(handler);