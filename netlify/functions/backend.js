/**
 * Netlify Serverless Function — Legal Sthal Backend API (backend.js)
 * Routes all /api/backend requests directly to Supabase and Email Engine.
 */

const { handleAction } = require('../../supabaseBackend');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (err) {
        // Fallback for form-encoded or raw strings
        const params = new URLSearchParams(event.body);
        for (const [k, v] of params.entries()) {
          body[k] = v;
        }
      }
    }

    // Merge query parameters for GET requests
    if (event.queryStringParameters) {
      body = Object.assign({}, event.queryStringParameters, body);
    }

    // Infer live production host if PORTAL_URL not explicitly configured
    if (event.headers) {
      const host = event.headers['x-forwarded-host'] || event.headers.host;
      const proto = event.headers['x-forwarded-proto'] || 'https';
      if (host && !host.includes('localhost') && !process.env.PORTAL_URL) {
        process.env.PORTAL_URL = `${proto}://${host}`;
      }
    }

    const action = body.action || (event.queryStringParameters && event.queryStringParameters.action) || 'healthCheck';

    const result = await handleAction(action, body);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result)
    };
  } catch (err) {
    console.error('[Netlify Function Error]', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: err.message || 'Server error processing request.'
        }
      })
    };
  }
};
