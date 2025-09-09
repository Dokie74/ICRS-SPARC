// api/materials/index.js - Vercel serverless materials endpoint
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
      // Get all materials with optional filtering
      const { search, limit, offset } = req.query;
      
      let options = {
        select: 'id, name, code, category, created_at, updated_at',
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      if (search) {
        // Search by code or name
        options.filters = {
          or: `code.ilike.%${search}%,name.ilike.%${search}%`
        };
      }

      const result = await supabaseClient.getAll('material_indices', options);
      
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
      // Create new material
      const materialData = req.body;
      
      const result = await supabaseClient.create('material_indices', materialData);
      
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
    console.error('Materials API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = requireAuth(handler);