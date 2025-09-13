// api/_handlers/auth-debug.js - Comprehensive authentication debugging endpoint
const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, handleOptions } = require('../_utils/cors');

module.exports = async function handler(req, res) {
  // Disable debug endpoint in production for security
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
  }

  // Handle CORS
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed - Use POST with credentials`
    });
  }

  const debugResults = {
    timestamp: new Date().toISOString(),
    vercel_deployment: process.env.VERCEL_URL || 'unknown',
    phases: {}
  };

  try {
    // PHASE 1: Environment & Runtime Analysis
    debugResults.phases.environment = {
      status: 'testing',
      results: {}
    };

    const envAnalysis = {
      node_env: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV,
      vercel_url: process.env.VERCEL_URL,
      runtime: {
        node_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage()
      },
      supabase_config: {
        url: {
          exists: !!process.env.SUPABASE_URL,
          value: process.env.SUPABASE_URL || 'NOT_SET',
          length: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.length : 0
        },
        anon_key: {
          exists: !!process.env.SUPABASE_ANON_KEY,
          length: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.length : 0,
          preview: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'NOT_SET'
        },
        service_key: {
          exists: !!process.env.SUPABASE_SERVICE_KEY,
          length: process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY.length : 0,
          preview: process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY.substring(0, 20) + '...' : 'NOT_SET'
        }
      }
    };

    debugResults.phases.environment.results = envAnalysis;
    debugResults.phases.environment.status = 'completed';

    // PHASE 2: Request Analysis
    debugResults.phases.request = {
      status: 'testing',
      results: {}
    };

    const requestAnalysis = {
      headers: req.headers,
      content_type: req.headers['content-type'],
      origin: req.headers.origin,
      user_agent: req.headers['user-agent'],
      body_type: typeof req.body,
      body_exists: !!req.body,
      raw_body: JSON.stringify(req.body),
      parsed_credentials: {
        email: req.body?.email || 'NOT_PROVIDED',
        password_exists: !!req.body?.password,
        password_length: req.body?.password ? req.body.password.length : 0,
        password_preview: req.body?.password ? req.body.password.substring(0, 3) + '***' : 'NOT_PROVIDED'
      }
    };

    debugResults.phases.request.results = requestAnalysis;
    debugResults.phases.request.status = 'completed';

    // PHASE 3: Supabase Client Testing
    debugResults.phases.supabase_clients = {
      status: 'testing',
      results: {}
    };

    const clientTests = {};

    // Test 1: Anon Key Client
    try {
      const anonClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
      
      clientTests.anon_client = {
        creation: 'success',
        url: process.env.SUPABASE_URL,
        key_type: 'anon',
        key_preview: process.env.SUPABASE_ANON_KEY?.substring(0, 20) + '...'
      };
    } catch (error) {
      clientTests.anon_client = {
        creation: 'failed',
        error: error.message
      };
    }

    // Test 2: Service Key Client
    try {
      if (process.env.SUPABASE_SERVICE_KEY) {
        const serviceClient = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );
        
        clientTests.service_client = {
          creation: 'success',
          url: process.env.SUPABASE_URL,
          key_type: 'service',
          key_preview: process.env.SUPABASE_SERVICE_KEY?.substring(0, 20) + '...'
        };
      } else {
        clientTests.service_client = {
          creation: 'skipped',
          reason: 'SUPABASE_SERVICE_KEY not available'
        };
      }
    } catch (error) {
      clientTests.service_client = {
        creation: 'failed',
        error: error.message
      };
    }

    debugResults.phases.supabase_clients.results = clientTests;
    debugResults.phases.supabase_clients.status = 'completed';

    // PHASE 4: Authentication Testing
    debugResults.phases.authentication = {
      status: 'testing',
      results: {}
    };

    const { email, password } = req.body || {};
    
    if (!email || !password) {
      debugResults.phases.authentication.results = {
        status: 'skipped',
        reason: 'Email or password not provided in request body',
        required_format: {
          email: 'string',
          password: 'string'
        }
      };
      debugResults.phases.authentication.status = 'completed';
    } else {
      const authTests = {};

      // Test with Anon Key
      if (process.env.SUPABASE_ANON_KEY) {
        try {
          const anonClient = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
          );

          console.log('Testing auth with anon key for:', email);
          const anonResult = await anonClient.auth.signInWithPassword({
            email,
            password
          });

          authTests.anon_key_auth = {
            status: anonResult.error ? 'failed' : 'success',
            has_data: !!anonResult.data,
            has_session: !!(anonResult.data && anonResult.data.session),
            has_user: !!(anonResult.data && anonResult.data.user),
            error: anonResult.error ? {
              message: anonResult.error.message,
              status: anonResult.error.status,
              code: anonResult.error.code,
              details: anonResult.error.details
            } : null,
            user_id: anonResult.data?.user?.id || null,
            session_expires: anonResult.data?.session?.expires_at || null
          };
        } catch (error) {
          authTests.anon_key_auth = {
            status: 'exception',
            error: {
              message: error.message,
              stack: error.stack
            }
          };
        }
      }

      // Test with Service Key
      if (process.env.SUPABASE_SERVICE_KEY) {
        try {
          const serviceClient = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
          );

          console.log('Testing auth with service key for:', email);
          const serviceResult = await serviceClient.auth.signInWithPassword({
            email,
            password
          });

          authTests.service_key_auth = {
            status: serviceResult.error ? 'failed' : 'success',
            has_data: !!serviceResult.data,
            has_session: !!(serviceResult.data && serviceResult.data.session),
            has_user: !!(serviceResult.data && serviceResult.data.user),
            error: serviceResult.error ? {
              message: serviceResult.error.message,
              status: serviceResult.error.status,
              code: serviceResult.error.code,
              details: serviceResult.error.details
            } : null,
            user_id: serviceResult.data?.user?.id || null,
            session_expires: serviceResult.data?.session?.expires_at || null
          };
        } catch (error) {
          authTests.service_key_auth = {
            status: 'exception',
            error: {
              message: error.message,
              stack: error.stack
            }
          };
        }
      }

      debugResults.phases.authentication.results = authTests;
      debugResults.phases.authentication.status = 'completed';
    }

    // PHASE 5: Network & Connectivity Testing
    debugResults.phases.connectivity = {
      status: 'testing',
      results: {}
    };

    const connectivityTests = {};

    // Test basic Supabase connectivity
    try {
      const testClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );

      // Simple query to test connectivity
      const { data, error } = await testClient
        .from('customers')
        .select('id')
        .limit(1);

      connectivityTests.supabase_connectivity = {
        status: error ? 'failed' : 'success',
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details
        } : null,
        response_received: !!data || !!error
      };
    } catch (error) {
      connectivityTests.supabase_connectivity = {
        status: 'exception',
        error: {
          message: error.message,
          stack: error.stack
        }
      };
    }

    debugResults.phases.connectivity.results = connectivityTests;
    debugResults.phases.connectivity.status = 'completed';

    // Final Analysis
    debugResults.analysis = {
      overall_status: 'completed',
      recommendations: [],
      next_steps: []
    };

    // Analyze results and provide recommendations
    if (!envAnalysis.supabase_config.url.exists) {
      debugResults.analysis.recommendations.push('CRITICAL: SUPABASE_URL environment variable is not set');
    }

    if (!envAnalysis.supabase_config.anon_key.exists && !envAnalysis.supabase_config.service_key.exists) {
      debugResults.analysis.recommendations.push('CRITICAL: Neither SUPABASE_ANON_KEY nor SUPABASE_SERVICE_KEY is set');
    }

    if (debugResults.phases.authentication.results) {
      const authResults = debugResults.phases.authentication.results;
      
      if (authResults.anon_key_auth?.status === 'failed') {
        debugResults.analysis.recommendations.push(`ANON KEY AUTH FAILED: ${authResults.anon_key_auth.error?.message || 'Unknown error'}`);
      }
      
      if (authResults.service_key_auth?.status === 'failed') {
        debugResults.analysis.recommendations.push(`SERVICE KEY AUTH FAILED: ${authResults.service_key_auth.error?.message || 'Unknown error'}`);
      }
      
      if (authResults.anon_key_auth?.status === 'success' || authResults.service_key_auth?.status === 'success') {
        debugResults.analysis.recommendations.push('SUCCESS: At least one authentication method worked - check which one succeeded');
      }
    }

    res.json({
      success: true,
      debug_results: debugResults
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Debug endpoint failed',
      debug_results: debugResults,
      exception: {
        message: error.message,
        stack: error.stack
      }
    });
  }
}