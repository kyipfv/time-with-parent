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
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (signUpError) {
      // If user already exists, try to sign them in instead
      if (signUpError.message.includes('already registered')) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) {
          return res.status(400).json({ error: 'User already exists. Please login instead.' });
        }
        
        return res.status(200).json({
          message: 'User already exists, logged in successfully',
          user: {
            id: signInData.user.id,
            email: signInData.user.email,
            name: signInData.user.user_metadata.name || name
          },
          session: signInData.session
        });
      }
      return res.status(400).json({ error: signUpError.message });
    }

    // If no session returned (email confirmation required), try to sign them in immediately
    if (!signUpData.session) {
      // Attempt immediate sign in to bypass email confirmation
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (!signInError && signInData.session) {
        return res.status(201).json({
          message: 'User registered and logged in successfully',
          user: {
            id: signInData.user.id,
            email: signInData.user.email,
            name: signInData.user.user_metadata.name || name
          },
          session: signInData.session
        });
      }
      
      // If immediate sign in fails, still count registration as success
      return res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: signUpData.user.id,
          email: signUpData.user.email,
          name: name
        },
        session: null,
        requiresEmailConfirmation: false
      });
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: signUpData.user.id,
        email: signUpData.user.email,
        name: signUpData.user.user_metadata.name
      },
      session: signUpData.session
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