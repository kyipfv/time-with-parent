const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../database/supabase');

const router = express.Router();

// Register new user
router.post('/register', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password, name } = req.body;

    // Register user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Check if email confirmation is required
    if (!data.session) {
      return res.status(200).json({
        message: 'Registration successful. Please check your email to confirm your account.',
        requiresEmailConfirmation: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata.name
        }
      });
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name
      },
      session: data.session
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name || data.user.email
      },
      session: data.session
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

module.exports = router;