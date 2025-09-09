// api/parts/index.js - Vercel serverless parts endpoint
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
      // Get all parts with optional filtering
      const { search, limit, offset } = req.query;
      
      let options = {
        select: 'id, description, hts_code, country_of_origin, standard_value, unit_of_measure, manufacturer_id, gross_weight, package_quantity, package_type, material_price, labor_price, overhead_price, price_source, last_price_update, material_weight, material',
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      if (search) {
        // Search by id or description (id serves as part number)
        options.filters = {
          or: `id.ilike.%${search}%,description.ilike.%${search}%`
        };
      }

      const result = await supabaseClient.getAll('parts', options);
      
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
      // Create new part
      const partData = req.body;
      
      const result = await supabaseClient.create('parts', partData);
      
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
    console.error('Parts API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = requireAuth(handler);