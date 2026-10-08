/**
 * Legal Sthal - Supabase Direct Client (supabaseClient.js)
 * Version: 3.0.0 (Production Database Layer)
 * 
 * Provides direct, high-speed PostgreSQL REST access via Supabase PostgREST API
 * Eliminates Apps Script cold-start delays and concurrency bottlenecks.
 */

import { CONFIG } from '../config.js';

const SUPABASE_URL = 'https://pfsiblstvkcqjfiaajoe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bXXPnBtfn4U-5iBvBDkaZQ_Df2_Dqxt';

class SupabaseClient {
  constructor() {
    this.url = SUPABASE_URL;
    this.key = SUPABASE_ANON_KEY;
  }

  getHeaders(customHeaders = {}) {
    return {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...customHeaders
    };
  }

  /**
   * Executes a GET query against a Supabase table.
   * @param {string} table - Table name (e.g. 'clients', 'services')
   * @param {string} queryString - PostgREST query parameters (e.g. 'select=*&order=created_at.desc')
   */
  async from(table, queryString = 'select=*') {
    try {
      const endpoint = `${this.url}/rest/v1/${table}?${queryString}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { data: null, error: { status: res.status, message: errorText } };
      }

      const data = await res.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { status: 0, message: err.message } };
    }
  }

  /**
   * Inserts records into a Supabase table.
   * @param {string} table - Table name
   * @param {Object|Array} records - Payload object or array of objects
   */
  async insert(table, records) {
    try {
      const endpoint = `${this.url}/rest/v1/${table}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(records)
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { data: null, error: { status: res.status, message: errorText } };
      }

      const data = await res.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { status: 0, message: err.message } };
    }
  }

  /**
   * Updates matching records in a Supabase table.
   * @param {string} table - Table name
   * @param {string} filterQuery - Filter string (e.g. 'client_id=eq.CL001')
   * @param {Object} updates - Updated field-value pairs
   */
  async update(table, filterQuery, updates) {
    try {
      const endpoint = `${this.url}/rest/v1/${table}?${filterQuery}`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { data: null, error: { status: res.status, message: errorText } };
      }

      const data = await res.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { status: 0, message: err.message } };
    }
  }

  /**
   * Deletes matching records from a Supabase table.
   * @param {string} table - Table name
   * @param {string} filterQuery - Filter string (e.g. 'client_id=eq.CL001')
   */
  async delete(table, filterQuery) {
    try {
      const endpoint = `${this.url}/rest/v1/${table}?${filterQuery}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { data: null, error: { status: res.status, message: errorText } };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: { status: 0, message: err.message } };
    }
  }
}

export const supabaseClient = new SupabaseClient();
