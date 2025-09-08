// api/customers/index.js - Vercel serverless customers endpoint
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
      // Get all customers with optional filtering
      const { search, limit, offset } = req.query;
      
      let options = {
        select: 'id, company_name, contact_person, email, phone, status, created_at',
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      if (search) {
        // Note: This is simplified - in production you'd want more sophisticated search
        options.filters = {
          company_name: search
        };
      }

      const result = await supabaseClient.getAll('customers', options);
      
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
      // Create new customer
      const customerData = req.body;
      
      const result = await supabaseClient.create('customers', customerData);
      
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
    console.error('Customers API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = requireAuth(handler);