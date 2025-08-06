const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client with service role for server operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper functions for database operations
const selectRows = async (table, filters = {}, options = {}) => {
  let query = supabase.from(table).select('*');
  
  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  // Apply ordering
  if (options.orderBy) {
    query = query.order(options.orderBy.column, { 
      ascending: options.orderBy.ascending || false 
    });
  }
  
  // Apply limit
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

const selectRow = async (table, filters = {}) => {
  let query = supabase.from(table).select('*');
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  const { data, error } = await query.single();
  if (error) throw error;
  return data;
};

const insertRow = async (table, data) => {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

const updateRow = async (table, filters, updates) => {
  let query = supabase.from(table).update(updates);
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
};

const deleteRow = async (table, filters) => {
  let query = supabase.from(table).delete();
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  const { error } = await query;
  if (error) throw error;
  return true;
};

module.exports = {
  supabase,
  selectRows,
  selectRow,
  insertRow,
  updateRow,
  deleteRow
};