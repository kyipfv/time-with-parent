const express = require('express');
const { body, validationResult } = require('express-validator');
const { selectRows, selectRow, insertRow, updateRow, deleteRow } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all medical notes for user's parents
router.get('/', async (req, res) => {
  try {
    // Get user's parent IDs first
    const parents = await selectRows('parents', { user_id: req.user.id });
    const parentIds = parents.map(p => p.id);

    if (parentIds.length === 0) {
      return res.json({ notes: [] });
    }

    // Get notes for all user's parents
    const { supabase } = require('../database/supabase');
    const { data: notes, error } = await supabase
      .from('medical_notes')
      .select(`
        *,
        parents!inner(id, name, user_id)
      `)
      .in('parent_id', parentIds)
      .order('date', { ascending: false });

    if (error) throw error;

    res.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to get medical notes' });
  }
});

// Get notes for specific parent
router.get('/parent/:parentId', async (req, res) => {
  try {
    // Verify parent belongs to user
    try {
      await selectRow('parents', { 
        id: req.params.parentId, 
        user_id: req.user.id 
      });
    } catch (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Parent not found' });
      }
      throw error;
    }

    const notes = await selectRows('medical_notes', 
      { parent_id: req.params.parentId },
      { orderBy: { column: 'date', ascending: false } }
    );

    res.json({ notes });
  } catch (error) {
    console.error('Get parent notes error:', error);
    res.status(500).json({ error: 'Failed to get medical notes' });
  }
});

// Get notes by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['appointment', 'medication', 'symptom', 'general'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid note type' });
    }

    // Get user's parent IDs first
    const parents = await selectRows('parents', { user_id: req.user.id });
    const parentIds = parents.map(p => p.id);

    if (parentIds.length === 0) {
      return res.json({ notes: [] });
    }

    // Get notes of specific type for all user's parents
    const { supabase } = require('../database/supabase');
    const { data: notes, error } = await supabase
      .from('medical_notes')
      .select(`
        *,
        parents!inner(id, name, user_id)
      `)
      .in('parent_id', parentIds)
      .eq('type', type)
      .order('date', { ascending: false });

    if (error) throw error;

    res.json({ notes });
  } catch (error) {
    console.error('Get notes by type error:', error);
    res.status(500).json({ error: 'Failed to get medical notes' });
  }
});

// Create new medical note
router.post('/', [
  body('parent_id').isUUID().withMessage('Valid parent ID required'),
  body('date').isISO8601().withMessage('Valid date required (YYYY-MM-DD)'),
  body('type').isIn(['appointment', 'medication', 'symptom', 'general']).withMessage('Invalid note type'),
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('content').trim().isLength({ min: 1 }).withMessage('Content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Verify parent belongs to user
    try {
      await selectRow('parents', { 
        id: req.body.parent_id, 
        user_id: req.user.id 
      });
    } catch (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Parent not found' });
      }
      throw error;
    }

    const {
      parent_id,
      date,
      type,
      title,
      content
    } = req.body;

    const noteData = {
      parent_id,
      date,
      type,
      title,
      content
    };

    const newNote = await insertRow('medical_notes', noteData);

    res.status(201).json({
      message: 'Medical note created successfully',
      note: newNote
    });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create medical note' });
  }
});

// Update medical note
router.put('/:id', [
  body('date').optional().isISO8601().withMessage('Valid date required (YYYY-MM-DD)'),
  body('type').optional().isIn(['appointment', 'medication', 'symptom', 'general']).withMessage('Invalid note type'),
  body('title').optional().trim().isLength({ min: 1 }).withMessage('Title cannot be empty'),
  body('content').optional().trim().isLength({ min: 1 }).withMessage('Content cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Verify note exists and parent belongs to user
    const { supabase } = require('../database/supabase');
    const { data: note, error } = await supabase
      .from('medical_notes')
      .select(`
        *,
        parents!inner(user_id)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !note || note.parents.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Medical note not found' });
    }

    const updates = {};
    const allowedFields = ['date', 'type', 'title', 'content'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedNote = await updateRow('medical_notes', 
      { id: req.params.id }, 
      updates
    );

    res.json({
      message: 'Medical note updated successfully',
      note: updatedNote
    });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update medical note' });
  }
});

// Delete medical note
router.delete('/:id', async (req, res) => {
  try {
    // Verify note exists and parent belongs to user
    const { supabase } = require('../database/supabase');
    const { data: note, error } = await supabase
      .from('medical_notes')
      .select(`
        *,
        parents!inner(user_id)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !note || note.parents.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Medical note not found' });
    }

    await deleteRow('medical_notes', { id: req.params.id });

    res.json({ message: 'Medical note deleted successfully' });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete medical note' });
  }
});

module.exports = router;