// api/suppliers/index.js - Vercel serverless suppliers endpoint
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
      // Get all suppliers with optional filtering
      const { search, limit, offset } = req.query;
      
      let options = {
        select: 'id, supplier_code, name, contact_person, email, phone, country, created_at, updated_at',
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      if (search) {
        // Search by name or contact person
        options.filters = {
          or: `name.ilike.%${search}%,contact_person.ilike.%${search}%`
        };
      }

      const result = await supabaseClient.getAll('suppliers', options);
      
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
      // Create new supplier
      const supplierData = req.body;
      
      const result = await supabaseClient.create('suppliers', supplierData);
      
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
    console.error('Suppliers API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = requireAuth(handler);