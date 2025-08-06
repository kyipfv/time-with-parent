const express = require('express');
const { body, validationResult } = require('express-validator');
const { selectRows, selectRow, insertRow, updateRow, deleteRow } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all appointments for user's parents
router.get('/', async (req, res) => {
  try {
    // Get user's parent IDs first
    const parents = await selectRows('parents', { user_id: req.user.id });
    const parentIds = parents.map(p => p.id);

    if (parentIds.length === 0) {
      return res.json({ appointments: [] });
    }

    // Get appointments for all user's parents
    const { supabase } = require('../database/supabase');
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        parents!inner(id, name, user_id)
      `)
      .in('parent_id', parentIds)
      .order('date', { ascending: false });

    if (error) throw error;

    res.json({ appointments });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Failed to get appointments' });
  }
});

// Get appointments for specific parent
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

    const appointments = await selectRows('appointments', 
      { parent_id: req.params.parentId },
      { orderBy: { column: 'date', ascending: false } }
    );

    res.json({ appointments });
  } catch (error) {
    console.error('Get parent appointments error:', error);
    res.status(500).json({ error: 'Failed to get appointments' });
  }
});

// Create new appointment
router.post('/', [
  body('parent_id').isUUID().withMessage('Valid parent ID required'),
  body('date').isISO8601().withMessage('Valid date required (YYYY-MM-DD)'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time required (HH:MM)'),
  body('doctor').trim().isLength({ min: 1 }).withMessage('Doctor name is required'),
  body('specialty').trim().isLength({ min: 1 }).withMessage('Specialty is required'),
  body('location').trim().isLength({ min: 1 }).withMessage('Location is required'),
  body('reason').trim().isLength({ min: 1 }).withMessage('Reason is required'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('follow_up_needed').optional().isBoolean().withMessage('Follow up needed must be boolean')
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
      time,
      doctor,
      specialty,
      location,
      reason,
      notes = '',
      follow_up_needed = false
    } = req.body;

    const appointmentData = {
      parent_id,
      date,
      time,
      doctor,
      specialty,
      location,
      reason,
      notes,
      follow_up_needed,
      completed: false
    };

    const newAppointment = await insertRow('appointments', appointmentData);

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: newAppointment
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Update appointment
router.put('/:id', [
  body('date').optional().isISO8601().withMessage('Valid date required (YYYY-MM-DD)'),
  body('time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time required (HH:MM)'),
  body('doctor').optional().trim().isLength({ min: 1 }).withMessage('Doctor name cannot be empty'),
  body('specialty').optional().trim().isLength({ min: 1 }).withMessage('Specialty cannot be empty'),
  body('location').optional().trim().isLength({ min: 1 }).withMessage('Location cannot be empty'),
  body('reason').optional().trim().isLength({ min: 1 }).withMessage('Reason cannot be empty'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('completed').optional().isBoolean().withMessage('Completed must be boolean'),
  body('follow_up_needed').optional().isBoolean().withMessage('Follow up needed must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Verify appointment exists and parent belongs to user
    const { supabase } = require('../database/supabase');
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        parents!inner(user_id)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !appointment || appointment.parents.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const updates = {};
    const allowedFields = ['date', 'time', 'doctor', 'specialty', 'location', 'reason', 'notes', 'completed', 'follow_up_needed'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedAppointment = await updateRow('appointments', 
      { id: req.params.id }, 
      updates
    );

    res.json({
      message: 'Appointment updated successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Delete appointment
router.delete('/:id', async (req, res) => {
  try {
    // Verify appointment exists and parent belongs to user
    const { supabase } = require('../database/supabase');
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        parents!inner(user_id)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !appointment || appointment.parents.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await deleteRow('appointments', { id: req.params.id });

    res.json({ message: 'Appointment deleted successfully' });

  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

module.exports = router;