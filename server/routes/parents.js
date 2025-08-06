const express = require('express');
const { body, validationResult } = require('express-validator');
const { selectRows, selectRow, insertRow, updateRow, deleteRow } = require('../database/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all parents for the authenticated user
router.get('/', async (req, res) => {
  try {
    const parents = await selectRows('parents', { user_id: req.user.id }, {
      orderBy: { column: 'created_at', ascending: true }
    });

    res.json({ parents });
  } catch (error) {
    console.error('Get parents error:', error);
    res.status(500).json({ error: 'Failed to get parents' });
  }
});

// Get specific parent
router.get('/:id', async (req, res) => {
  try {
    const parent = await selectRow('parents', { 
      id: req.params.id, 
      user_id: req.user.id 
    });

    res.json({ parent });
  } catch (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Parent not found' });
    }
    console.error('Get parent error:', error);
    res.status(500).json({ error: 'Failed to get parent' });
  }
});

// Create new parent profile
router.post('/', [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('age').optional().isInt({ min: 1, max: 150 }).withMessage('Age must be between 1 and 150'),
  body('relationship').isIn(['mom', 'dad', 'guardian']).withMessage('Invalid relationship type'),
  body('personality').optional().isArray().withMessage('Personality must be an array'),
  body('interests').optional().isArray().withMessage('Interests must be an array'),
  body('challenges').optional().isArray().withMessage('Challenges must be an array'),
  body('communication_style').optional().isIn(['calls', 'texts', 'visits', 'emails']).withMessage('Invalid communication style'),
  body('relationship_goals').optional().isArray().withMessage('Relationship goals must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const {
      name,
      age,
      relationship,
      personality = [],
      interests = [],
      challenges = [],
      communication_style,
      relationship_goals = []
    } = req.body;

    const parentData = {
      user_id: req.user.id,
      name,
      age: age || null,
      relationship,
      personality,
      interests,
      challenges,
      communication_style: communication_style || null,
      relationship_goals
    };

    const newParent = await insertRow('parents', parentData);

    res.status(201).json({
      message: 'Parent profile created successfully',
      parent: newParent
    });

  } catch (error) {
    console.error('Create parent error:', error);
    res.status(500).json({ error: 'Failed to create parent profile' });
  }
});

// Update parent profile
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('age').optional().isInt({ min: 1, max: 150 }).withMessage('Age must be between 1 and 150'),
  body('relationship').optional().isIn(['mom', 'dad', 'guardian']).withMessage('Invalid relationship type'),
  body('personality').optional().isArray().withMessage('Personality must be an array'),
  body('interests').optional().isArray().withMessage('Interests must be an array'),
  body('challenges').optional().isArray().withMessage('Challenges must be an array'),
  body('communication_style').optional().isIn(['calls', 'texts', 'visits', 'emails']).withMessage('Invalid communication style'),
  body('relationship_goals').optional().isArray().withMessage('Relationship goals must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Verify parent exists and belongs to user
    try {
      await selectRow('parents', { 
        id: req.params.id, 
        user_id: req.user.id 
      });
    } catch (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Parent not found' });
      }
      throw error;
    }

    const updates = {};
    const allowedFields = ['name', 'age', 'relationship', 'personality', 'interests', 'challenges', 'communication_style', 'relationship_goals', 'last_contact'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedParent = await updateRow('parents', 
      { id: req.params.id, user_id: req.user.id }, 
      updates
    );

    res.json({
      message: 'Parent profile updated successfully',
      parent: updatedParent
    });

  } catch (error) {
    console.error('Update parent error:', error);
    res.status(500).json({ error: 'Failed to update parent profile' });
  }
});

// Delete parent profile
router.delete('/:id', async (req, res) => {
  try {
    // Verify parent exists and belongs to user
    try {
      await selectRow('parents', { 
        id: req.params.id, 
        user_id: req.user.id 
      });
    } catch (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Parent not found' });
      }
      throw error;
    }

    await deleteRow('parents', { id: req.params.id, user_id: req.user.id });

    res.json({ message: 'Parent profile deleted successfully' });

  } catch (error) {
    console.error('Delete parent error:', error);
    res.status(500).json({ error: 'Failed to delete parent profile' });
  }
});

module.exports = router;