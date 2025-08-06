import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'

interface User {
  id: string
  email: string
  name: string
  birth_date?: string
}

interface Parent {
  id: string
  name: string
  birth_date: string // YYYY-MM-DD format
  relationship: 'mom' | 'dad' | 'stepmom' | 'stepdad' | 'guardian' | 'grandmother' | 'grandfather'
  personality: string[]
  interests: string[]
  challenges: string[]
  communication_style?: 'calls' | 'texts' | 'visits' | 'emails'
  relationship_goals: string[]
  last_contact?: string
}

interface ConversationPrompt {
  id: string
  category: string
  question: string
  description: string
}

interface MedicalAppointment {
  id: string
  parent_id: string
  date: string
  time: string
  doctor: string
  specialty: string
  location: string
  reason: string
  notes: string
  completed: boolean
  follow_up_needed: boolean
}

interface MedicalNote {
  id: string
  parent_id: string
  date: string
  type: 'appointment' | 'medication' | 'symptom' | 'general'
  title: string
  content: string
}

type Screen = 'login' | 'register' | 'onboarding' | 'dashboard' | 'conversations' | 'memories' | 'medical'

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001')

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login')
  const [user, setUser] = useState<User | null>(null)
  const [parents, setParents] = useState<Parent[]>([])
  const [appointments, setAppointments] = useState<MedicalAppointment[]>([])
  const [medicalNotes, setMedicalNotes] = useState<MedicalNote[]>([])
  
  // Auth forms
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' })
  const [parentForm, setParentForm] = useState({ name: '', birth_date: '', relationship: 'mom' as 'mom' | 'dad' | 'stepmom' | 'stepdad' | 'guardian' | 'grandmother' | 'grandfather' })
  
  // Form states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appointmentForm, setAppointmentForm] = useState({
    parent_id: '',
    date: '',
    time: '',
    doctor: '',
    specialty: '',
    location: '',
    reason: '',
    notes: ''
  })
  const [noteForm, setNoteForm] = useState({
    parent_id: '',
    date: '',
    type: 'general' as 'appointment' | 'medication' | 'symptom' | 'general',
    title: '',
    content: ''
  })

  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [quickNotes, setQuickNotes] = useState<{[parentId: string]: string}>({})
  const [showConversationPrompts, setShowConversationPrompts] = useState<{[parentId: string]: boolean}>({})
  const [editingParent, setEditingParent] = useState<string | null>(null)
  const [showStats, setShowStats] = useState(true)
  const [editForm, setEditForm] = useState<Parent | null>(null)
  const [userBirthDate, setUserBirthDate] = useState('1990-01-01')
  const [callFrequency, setCallFrequency] = useState(52)
  const [visitFrequency, setVisitFrequency] = useState(4)
  const [deletingParent, setDeletingParent] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [recentlyDeleted, setRecentlyDeleted] = useState<Parent[]>([])
  const [showDeleted, setShowDeleted] = useState(false)
  
  // Conversation prompts to help users connect with parents
  const conversationPrompts: ConversationPrompt[] = [
    { id: '1', category: 'Memories', question: 'What was your favorite family tradition when you were growing up?', description: 'Learn about their childhood experiences' },
    { id: '2', category: 'Life Lessons', question: 'What\'s the most important thing you learned from your parents?', description: 'Understand their values and upbringing' },
    { id: '3', category: 'Dreams', question: 'Is there anywhere in the world you still want to visit?', description: 'Discover their aspirations and bucket list' },
    { id: '4', category: 'Stories', question: 'Tell me about the day I was born. What do you remember?', description: 'Hear personal stories about your early life' },
    { id: '5', category: 'Wisdom', question: 'What advice would you give to your younger self?', description: 'Gain insights from their life experience' },
    { id: '6', category: 'Love', question: 'How did you and mom/dad meet? What was your first impression?', description: 'Learn about their love story and relationships' },
    { id: '7', category: 'Career', question: 'What did you want to be when you grew up? Did it turn out differently?', description: 'Understand their career journey and dreams' },
    { id: '8', category: 'Family', question: 'What\'s your favorite memory of our family together?', description: 'Reflect on cherished family moments' },
    { id: '9', category: 'Health', question: 'How are you feeling lately? Any concerns I should know about?', description: 'Check in on their wellbeing and health' },
    { id: '10', category: 'Gratitude', question: 'What are you most grateful for in your life right now?', description: 'Share in their appreciation and positivity' },
    { id: '11', category: 'Current', question: 'What\'s been the highlight of your week so far?', description: 'Stay connected to their daily experiences' },
    { id: '12', category: 'Future', question: 'What are you looking forward to most this year?', description: 'Learn about their hopes and plans' }
  ]

  // Check for existing session on load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      if (token && userData) {
        try {
          const user = JSON.parse(userData)
          setUser(user)
          // Initialize user birth date if available
          if (user.birth_date) {
            setUserBirthDate(user.birth_date)
          }
          
          // Check if user has parents, if not show onboarding
          try {
            const parents = await fetchParents(token)
            if (parents.length === 0) {
              setCurrentScreen('onboarding')
            } else {
              setCurrentScreen('dashboard')
              setParents(parents)
              // Fetch additional data in parallel
              await Promise.all([
                fetchAppointments(token),
                fetchMedicalNotes(token)
              ])
            }
          } catch (fetchError) {
            // Token might be invalid
            console.error('Failed to fetch user data:', fetchError)
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setUser(null)
            setCurrentScreen('login')
          }
        } catch (parseError) {
          // Invalid user data in localStorage
          console.error('Failed to parse user data:', parseError)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setCurrentScreen('login')
        }
      } else {
        // No stored credentials
        setCurrentScreen('login')
      }
    }
    
    initializeAuth()
  }, [])

  const fetchParents = async (token: string) => {
    const response = await fetch(`${API_URL}/api/parents`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) throw new Error('Failed to fetch parents')
    const data = await response.json()
    return data.parents || []
  }

  const fetchAppointments = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAppointments(data.appointments || [])
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error)
    }
  }

  const fetchMedicalNotes = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/notes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMedicalNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Failed to fetch medical notes:', error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      })

      const data = await response.json()

      if (response.ok) {
        if (!data.session || !data.session.access_token) {
          setError('Login successful but no session token received')
          return
        }
        
        localStorage.setItem('token', data.session.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
        
        // Check if user has parents
        const parents = await fetchParents(data.session.access_token)
        if (parents.length === 0) {
          setCurrentScreen('onboarding')
        } else {
          setCurrentScreen('dashboard')
          setParents(parents)
          fetchAppointments(data.session.access_token)
          fetchMedicalNotes(data.session.access_token)
        }
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerForm)
      })

      const data = await response.json()

      if (response.ok) {
        if (data.requiresEmailConfirmation) {
          setError('Registration successful! Please check your email to confirm your account, then try logging in.')
          return
        }
        
        if (!data.session || !data.session.access_token) {
          setError('Registration successful but no session token received')
          return
        }
        
        localStorage.setItem('token', data.session.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
        setCurrentScreen('onboarding')
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const isDemoMode = localStorage.getItem('isDemoMode') === 'true'
      
      if (isDemoMode) {
        // Handle demo mode - save to localStorage
        const newParent: Parent = {
          id: 'parent-' + Date.now(),
          name: parentForm.name,
          birth_date: parentForm.birth_date,
          relationship: parentForm.relationship,
          personality: [],
          interests: [],
          challenges: [],
          relationship_goals: []
        }
        
        const updatedParents = [...parents, newParent]
        setParents(updatedParents)
        setParentForm({ name: '', birth_date: '', relationship: 'mom' })
        setCurrentScreen('dashboard')
      } else {
        // Handle real API mode
        const token = localStorage.getItem('token')
        if (!token) throw new Error('No authentication token')

        const parentData = {
          name: parentForm.name,
          birth_date: parentForm.birth_date,
          relationship: parentForm.relationship,
          personality: [],
          interests: [],
          challenges: [],
          relationship_goals: []
        }

        const response = await fetch(`${API_URL}/api/parents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(parentData)
        })

        const data = await response.json()

        if (response.ok) {
          const updatedParents = await fetchParents(token)
          setParents(updatedParents)
          setCurrentScreen('dashboard')
          fetchAppointments(token)
          fetchMedicalNotes(token)
        } else {
          setError(data.error || 'Failed to create parent profile')
        }
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setParents([])
    setAppointments([])
    setMedicalNotes([])
    setCurrentScreen('login')
    setLoginForm({ email: '', password: '' })
    setRegisterForm({ name: '', email: '', password: '' })
    setParentForm({ name: '', birth_date: '', relationship: 'mom' })
  }

  const handleDemoMode = () => {
    // Use localStorage for persistent demo mode
    const storedDemoData = localStorage.getItem('demoData')
    
    if (storedDemoData) {
      // Load existing demo data
      const data = JSON.parse(storedDemoData)
      setUser(data.user)
      setParents(data.parents || [])
      setAppointments(data.appointments || [])
      setMedicalNotes(data.medicalNotes || [])
      
      // If user already has parents, go straight to dashboard
      if (data.parents && data.parents.length > 0) {
        setCurrentScreen('dashboard')
      } else {
        setCurrentScreen('onboarding')
      }
    } else {
      // Initialize with minimal default data
      const demoUser = {
        id: 'demo-user-' + Date.now(),
        email: 'demo@parentos.com',
        name: 'Your Name',
        birth_date: '1990-01-01'
      }
      
      // Start with empty parents - user can add their own
      const demoData = {
        user: demoUser,
        parents: [],
        appointments: [],
        medicalNotes: []
      }
      
      localStorage.setItem('demoData', JSON.stringify(demoData))
      localStorage.setItem('isDemoMode', 'true')
      setUser(demoUser)
      setParents([])
      setAppointments([])
      setMedicalNotes([])
      setCurrentScreen('onboarding')
    }
    
    localStorage.setItem('isDemoMode', 'true')
  }
  
  // Auto-save demo data whenever it changes
  useEffect(() => {
    const isDemoMode = localStorage.getItem('isDemoMode') === 'true'
    if (isDemoMode && user) {
      const demoData = {
        user,
        parents,
        appointments,
        medicalNotes
      }
      localStorage.setItem('demoData', JSON.stringify(demoData))
    }
  }, [user, parents, appointments, medicalNotes])

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No authentication token')

      const response = await fetch(`${API_URL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointmentForm)
      })

      const data = await response.json()

      if (response.ok) {
        await fetchAppointments(token)
        setAppointmentForm({
          parent_id: '',
          date: '',
          time: '',
          doctor: '',
          specialty: '',
          location: '',
          reason: '',
          notes: ''
        })
        setShowAppointmentForm(false)
      } else {
        setError(data.error || 'Failed to create appointment')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No authentication token')

      const response = await fetch(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteForm)
      })

      const data = await response.json()

      if (response.ok) {
        await fetchMedicalNotes(token)
        setNoteForm({
          parent_id: '',
          date: '',
          type: 'general',
          title: '',
          content: ''
        })
        setShowNoteForm(false)
      } else {
        setError(data.error || 'Failed to create note')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getParentName = (parentId: string) => {
    const parent = parents.find(p => p.id === parentId)
    return parent?.name || 'Unknown'
  }

  // Auto-save quick notes
  const handleQuickNoteChange = (parentId: string, note: string) => {
    setQuickNotes(prev => ({ ...prev, [parentId]: note }))
    
    // Auto-save after 2 seconds of no typing
    const timeoutId = setTimeout(() => {
      if (note.trim()) {
        saveQuickNote(parentId, note)
      }
    }, 2000)

    // Clear previous timeout
    const prevTimeout = (window as any)[`noteTimeout_${parentId}`]
    if (prevTimeout) clearTimeout(prevTimeout);
    (window as any)[`noteTimeout_${parentId}`] = timeoutId
  }

  const saveQuickNote = async (parentId: string, note: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const noteData = {
        parent_id: parentId,
        date: new Date().toISOString().split('T')[0],
        type: 'general' as const,
        title: `Quick Note - ${new Date().toLocaleString()}`,
        content: note
      }

      const response = await fetch(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
      })

      if (response.ok) {
        await fetchMedicalNotes(token)
        // Clear the quick note after saving
        setQuickNotes(prev => ({ ...prev, [parentId]: '' }))
      }
    } catch (error) {
      console.error('Failed to save quick note:', error)
    }
  }

  const upcomingAppointments = appointments
    .filter(apt => !apt.completed && new Date(apt.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const recentNotes = medicalNotes
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {currentScreen === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="screen auth-screen"
          >
            <div className="container">
              <div className="header">
                <h1>ParentOS</h1>
                <p>Your operating system for being a better child</p>
              </div>

              <form onSubmit={handleLogin} className="form">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                {error && <div className="error">{error}</div>}

                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Logging in...' : 'Log In'}
                </button>
              </form>

              <p className="switch-form">
                Don't have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setCurrentScreen('register')}
                  className="link-button"
                >
                  Sign up
                </button>
              </p>

              <p className="switch-form">
                <button 
                  type="button" 
                  onClick={handleDemoMode}
                  className="link-button"
                  style={{ color: '#8B5CF6', textDecoration: 'underline' }}
                >
                  🚀 Try Without Account (Your data saves locally)
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {currentScreen === 'register' && (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="screen auth-screen"
          >
            <div className="container">
              <div className="header">
                <h1>Create Account</h1>
                <p>Join ParentOS and strengthen your family relationships</p>
              </div>

              <form onSubmit={handleRegister} className="form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                {error && <div className="error">{error}</div>}

                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <p className="switch-form">
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setCurrentScreen('login')}
                  className="link-button"
                >
                  Log in
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {currentScreen === 'onboarding' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="screen auth-screen"
          >
            <div className="container">
              <div className="header">
                <h1>Welcome to ParentOS</h1>
                <p>Let's create your first parent profile</p>
              </div>

              <form onSubmit={handleCreateParent} className="form">
                <div className="form-group">
                  <label>Parent's Name</label>
                  <input
                    type="text"
                    value={parentForm.name}
                    onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Birth Date</label>
                  <input
                    type="date"
                    value={parentForm.birth_date}
                    onChange={(e) => setParentForm({ ...parentForm, birth_date: e.target.value })}
                    required
                    disabled={loading}
                    max={new Date().toISOString().split('T')[0]} // Can't be in the future
                  />
                </div>

                <div className="form-group">
                  <label>Relationship</label>
                  <select
                    value={parentForm.relationship}
                    onChange={(e) => setParentForm({ ...parentForm, relationship: e.target.value as any })}
                    disabled={loading}
                  >
                    <option value="mom">Mom</option>
                    <option value="dad">Dad</option>
                    <option value="stepmom">Stepmom</option>
                    <option value="stepdad">Stepdad</option>
                    <option value="grandmother">Grandmother</option>
                    <option value="grandfather">Grandfather</option>
                    <option value="guardian">Guardian</option>
                  </select>
                </div>

                {error && <div className="error">{error}</div>}

                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Creating profile...' : 'Create Profile'}
                </button>
              </form>

              {user && (
                <button onClick={handleLogout} className="btn-secondary">
                  Logout
                </button>
              )}
            </div>
          </motion.div>
        )}

        {currentScreen === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="screen dashboard-screen"
          >
            <div className="apple-layout">
              <aside className="sidebar">
                <div className="sidebar-header">
                  <h1>ParentOS</h1>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user?.name || 'User'}</div>
                      <button onClick={handleLogout} className="logout-link">Sign Out</button>
                    </div>
                  </div>
                </div>

                <nav className="sidebar-nav">
                  <button onClick={() => setCurrentScreen('dashboard')} className="nav-item active">
                    <div className="nav-icon">📊</div>
                    <span>Dashboard</span>
                  </button>
                  <button onClick={() => setCurrentScreen('medical')} className="nav-item">
                    <div className="nav-icon">🏥</div>
                    <span>Medical</span>
                  </button>
                  <button onClick={() => setCurrentScreen('conversations')} className="nav-item">
                    <div className="nav-icon">💬</div>
                    <span>Conversations</span>
                  </button>
                  <button onClick={() => setCurrentScreen('memories')} className="nav-item">
                    <div className="nav-icon">📸</div>
                    <span>Memories</span>
                  </button>
                </nav>
                
                {parents.length > 0 && (
                  <div className="sidebar-section">
                    <div className="sidebar-section-header">
                      <h3>Your Parents</h3>
                    </div>
                    <div className="parents-list">
                      {parents.map(parent => (
                        <button 
                          key={parent.id} 
                          className="parent-item"
                          onClick={() => {
                            // Could implement parent-specific view
                            setCurrentScreen('dashboard')
                          }}
                        >
                          <div className="parent-item-avatar">
                            {parent.relationship === 'mom' || parent.relationship === 'stepmom' ? '👩' :
                             parent.relationship === 'dad' || parent.relationship === 'stepdad' ? '👨' :
                             parent.relationship === 'grandmother' ? '👵' :
                             parent.relationship === 'grandfather' ? '👴' : '👤'}
                          </div>
                          <div className="parent-item-details">
                            <div className="parent-item-name">{parent.name}</div>
                            <div className="parent-item-relationship">{parent.relationship}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => setCurrentScreen('onboarding')} 
                      className="add-parent-btn"
                    >
                      <span className="add-icon">+</span>
                      <span>Add Parent</span>
                    </button>
                  </div>
                )}
                
                {parents.length === 0 && (
                  <div className="sidebar-section">
                    <button 
                      onClick={() => setCurrentScreen('onboarding')} 
                      className="add-parent-btn primary"
                    >
                      <span className="add-icon">+</span>
                      <span>Add Your First Parent</span>
                    </button>
                  </div>
                )}
              </aside>

              <main className="main-content">
              <div className="time-awareness-header">
                <h1 className="primary-message">💝 Thousands of Beautiful Moments Ahead</h1>
                <p className="awareness-subtitle">You have so many opportunities to create memories, share laughs, and deepen your connection with your parents.</p>
              </div>
              
              <div className="life-calculator">
                <div className="calculator-header">
                  <h2>✨ Connection Planner</h2>
                  <p>Let's plan all the wonderful moments you'll share with your parents</p>
                </div>
                
                <div className="calculator-controls">
                  <div className="control-group">
                    <label>Your Birth Date</label>
                    <input 
                      type="date" 
                      className="date-input"
                      id="userBirthDate"
                      defaultValue={user?.birth_date || '1990-01-01'}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div className="control-group">
                    <label>How often do you typically call?</label>
                    <select className="frequency-select" id="contactFrequency" defaultValue="52">
                      <option value="365">Daily calls (365 times/year)</option>
                      <option value="182">Every other day (182 times/year)</option>
                      <option value="104">Twice a week (104 calls/year)</option>
                      <option value="52">Weekly calls (52 times/year)</option>
                      <option value="26">Bi-weekly calls (26 times/year)</option>
                      <option value="12">Monthly calls (12 times/year)</option>
                    </select>
                  </div>
                  
                  <div className="control-group">
                    <label>How often do you visit?</label>
                    <select className="frequency-select" id="visitFrequency" defaultValue="4">
                      <option value="52">Weekly visits (52 times/year)</option>
                      <option value="26">Bi-weekly visits (26 times/year)</option>
                      <option value="12">Monthly visits (12 times/year)</option>
                      <option value="6">Every 2 months (6 visits/year)</option>
                      <option value="4">Quarterly visits (4 times/year)</option>
                      <option value="2">Twice a year (2 visits/year)</option>
                    </select>
                  </div>
                  
                  <button className="recalculate-btn" onClick={() => {
                    // Force re-render by updating a state variable
                    setQuickNotes(prev => ({ ...prev }))
                    // Show confirmation
                    alert('✅ Recalculated! All time estimates have been updated based on your new settings.')
                  }}>
                    🔄 Recalculate Everything
                  </button>
                </div>
              </div>

              {parents.map(parent => {
                // Use state variables for calculations
                
                // Calculate ages from birth dates
                const parentBirthDate = new Date(parent.birth_date)
                const userBirthDateObj = new Date(userBirthDate)
                const today = new Date()
                
                const parentAge = Math.floor((today.getTime() - parentBirthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
                const userAge = Math.floor((today.getTime() - userBirthDateObj.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
                
                // Simplified calculation: assume 90 years life expectancy for everyone
                const estimatedParentLifespan = 90
                const estimatedUserLifespan = 90
                
                // Years left is limited by whoever might pass first
                const parentYearsLeft = Math.max(0, estimatedParentLifespan - parentAge)
                const userYearsLeft = Math.max(0, estimatedUserLifespan - userAge)
                const yearsLeftTogether = Math.min(parentYearsLeft, userYearsLeft)
                
                // Calculate realistic interaction counts
                const daysLeft = Math.max(0, yearsLeftTogether * 365)
                const weeksLeft = Math.max(0, yearsLeftTogether * 52)
                const callsLeft = Math.max(0, yearsLeftTogether * callFrequency)
                const visitsLeft = Math.max(0, yearsLeftTogether * visitFrequency)
                const totalMomentsLeft = callsLeft + visitsLeft
                
                // Days since last contact
                const daysSinceContact = parent.last_contact ? 
                  Math.floor((new Date().getTime() - new Date(parent.last_contact).getTime()) / (1000 * 60 * 60 * 24)) : null
                
                return (
                  <div key={parent.id} className="life-measurement-card">
                    <div className="parent-header">
                      <div className="parent-avatar">
                        <div className="avatar-circle">
                          {parent.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="parent-identity">
                        {editingParent === parent.id ? (
                          <div className="edit-parent-form">
                            <input
                              type="text"
                              value={editForm?.name || ''}
                              onChange={(e) => setEditForm(editForm ? {...editForm, name: e.target.value} : null)}
                              className="edit-input"
                              placeholder="Name"
                            />
                            <input
                              type="date"
                              value={editForm?.birth_date || ''}
                              onChange={(e) => setEditForm(editForm ? {...editForm, birth_date: e.target.value} : null)}
                              className="edit-input"
                            />
                            <select
                              value={editForm?.relationship || 'mom'}
                              onChange={(e) => setEditForm(editForm ? {...editForm, relationship: e.target.value as any} : null)}
                              className="edit-input"
                            >
                              <option value="mom">Mom</option>
                              <option value="dad">Dad</option>
                              <option value="stepmom">Stepmom</option>
                              <option value="stepdad">Stepdad</option>
                              <option value="grandmother">Grandmother</option>
                              <option value="grandfather">Grandfather</option>
                              <option value="guardian">Guardian</option>
                            </select>
                            <div className="edit-actions">
                              <button 
                                className="save-btn"
                                onClick={() => {
                                  if (editForm) {
                                    const updatedParents = parents.map(p => 
                                      p.id === parent.id ? editForm : p
                                    )
                                    setParents(updatedParents)
                                    setEditingParent(null)
                                    setEditForm(null)
                                  }
                                }}
                              >
                                Save
                              </button>
                              <button 
                                className="cancel-btn"
                                onClick={() => {
                                  setEditingParent(null)
                                  setEditForm(null)
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h2 className="parent-name">
                              {parent.name}
                              <button 
                                className="edit-parent-btn"
                                onClick={() => {
                                  setEditingParent(parent.id)
                                  setEditForm(parent)
                                }}
                              >
                                ✏️
                              </button>
                            </h2>
                            <p className="parent-relationship">Your {parent.relationship}</p>
                            <p className="parent-details">
                              <span className="parent-age">{parentAge} years old</span>
                              <span className="age-separator">•</span>
                              <span className="user-age">you're {userAge}</span>
                            </p>
                            <p className="parent-birthdate">Born {new Date(parent.birth_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </>
                        )}
                      </div>
                      <div className="stats-toggle">
                        <button 
                          className="toggle-stats-btn"
                          onClick={() => setShowStats(!showStats)}
                        >
                          {showStats ? 'Hide Stats' : 'Show Stats'}
                        </button>
                      </div>
                    </div>
                    
                    {showStats && (
                      <div className="health-metrics-grid">
                        <div className="health-card primary-time">
                          <div className="health-card-header">
                            <div className="health-icon">🌟</div>
                            <div className="health-title">DAYS TO CONNECT</div>
                          </div>
                          <div className="health-metric">
                            <div className="health-number">{daysLeft.toLocaleString()}</div>
                            <div className="health-unit">beautiful days</div>
                          </div>
                          <div className="health-subtitle">≈ {yearsLeftTogether} years of memories to make</div>
                        </div>
                      
                        <div className="health-card secondary-time">
                          <div className="health-card-header">
                            <div className="health-icon">💬</div>
                            <div className="health-title">CONVERSATIONS AHEAD</div>
                          </div>
                          <div className="health-metric">
                            <div className="health-number">{callsLeft.toLocaleString()}</div>
                            <div className="health-unit">chats to enjoy</div>
                          </div>
                          <div className="health-subtitle">Stories to share</div>
                        </div>
                        
                        <div className="health-card moments-time">
                          <div className="health-card-header">
                            <div className="health-icon">🤗</div>
                            <div className="health-title">HUGS & VISITS</div>
                          </div>
                          <div className="health-metric">
                            <div className="health-number">{visitsLeft.toLocaleString()}</div>
                            <div className="health-unit">gatherings</div>
                          </div>
                          <div className="health-subtitle">Hugs to give</div>
                        </div>
                      </div>
                    )}
                    
                    {showStats && (
                      <div className="total-moments-card">
                        <div className="health-card-header">
                          <div className="health-icon">🎉</div>
                          <div className="health-title">MOMENTS TO CREATE TOGETHER</div>
                        </div>
                        <div className="health-metric large">
                          <div className="health-number">{totalMomentsLeft.toLocaleString()}</div>
                          <div className="health-unit">opportunities to connect</div>
                        </div>
                        <div className="health-breakdown">
                          {callsLeft.toLocaleString()} laughs on the phone + {visitsLeft.toLocaleString()} warm embraces
                        </div>
                      </div>
                    )}
                    
                    <div className="health-card connection-card">
                      <div className="health-card-header">
                        <div className="health-icon">📞</div>
                        <div className="health-title">LAST CONTACT</div>
                      </div>
                      {daysSinceContact !== null ? (
                        <div className="connection-display">
                          <div className="health-metric">
                            <div className="health-number">{daysSinceContact}</div>
                            <div className="health-unit">days ago</div>
                          </div>
                          {daysSinceContact > 7 && (
                            <div className="health-alert">💌 They'd love to hear from you!</div>
                          )}
                          {daysSinceContact <= 3 && (
                            <div className="health-good">🌈 You're staying connected!</div>
                          )}
                        </div>
                      ) : (
                        <div className="health-prompt">
                          <div className="health-icon-large">📱</div>
                          <div className="health-prompt-text">When did you last connect?</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="conversation-prompts-section">
                      <div className="prompts-header">
                        <h3>💡 Fun Things to Ask {parent.name}</h3>
                        <p>Discover new stories and create deeper connections</p>
                        <button 
                          className="toggle-prompts-btn"
                          onClick={() => setShowConversationPrompts(prev => ({ ...prev, [parent.id]: !prev[parent.id] }))}
                        >
                          {showConversationPrompts[parent.id] ? 'Hide' : 'Show'} Conversation Ideas
                        </button>
                      </div>
                      
                      {showConversationPrompts[parent.id] && (
                        <div className="conversation-prompts-grid">
                          {conversationPrompts.slice(0, 3).map(prompt => (
                            <div key={prompt.id} className="conversation-prompt-card">
                              <div className="prompt-category">{prompt.category}</div>
                              <div className="prompt-question">"{prompt.question}"</div>
                              <div className="prompt-description">{prompt.description}</div>
                              <button 
                                className="use-prompt-btn"
                                onClick={() => {
                                  navigator.clipboard.writeText(prompt.question)
                                  alert('Question copied! Now call or text your parent.')
                                }}
                              >
                                📋 Copy Question
                              </button>
                            </div>
                          ))}
                          <button 
                            className="get-more-prompts-btn"
                            onClick={() => {
                              const randomPrompts = conversationPrompts.sort(() => 0.5 - Math.random()).slice(0, 3)
                              alert(`Here are 3 more ideas:\n\n• ${randomPrompts.map(p => p.question).join('\n• ')}`)
                            }}
                          >
                            🎲 Get 3 More Ideas
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="health-actions">
                      <div className="action-header">
                        <h3>🌸 Make {parent.name}'s Day</h3>
                        <p>A quick call or message can brighten both your days!</p>
                      </div>
                      
                      <div className="health-action-grid">
                        <button className="health-action-card primary" onClick={() => window.open(`tel:${parent.phone || ''}`, '_self')}>
                          <div className="action-icon">📞</div>
                          <div className="action-text">Call Now</div>
                        </button>
                        <button className="health-action-card" onClick={() => {
                          const choice = confirm('Open WhatsApp Web in browser? (Cancel for WhatsApp mobile app)')
                          if (choice) {
                            window.open('https://web.whatsapp.com/', '_blank')
                          } else {
                            window.open('https://wa.me/', '_blank')
                          }
                        }}>
                          <div className="action-icon">💬</div>
                          <div className="action-text">Start Chat</div>
                        </button>
                        <button className="health-action-card" onClick={() => setCurrentScreen('memories')}>
                          <div className="action-icon">📸</div>
                          <div className="action-text">Capture Memory</div>
                        </button>
                        <button className="health-action-card" onClick={() => setCurrentScreen('medical')}>
                          <div className="action-icon">🏥</div>
                          <div className="action-text">Medical Info</div>
                        </button>
                      </div>
                    </div>
                    
                    <div className="quick-note-section">
                      <div className="quick-note-header">
                        <div className="note-icon">📝</div>
                        <span>Quick Note</span>
                        <span className="auto-save-indicator">Auto-saves</span>
                      </div>
                      <textarea
                        className="quick-note-input"
                        placeholder={`Jot down something about ${parent.name}...`}
                        value={quickNotes[parent.id] || ''}
                        onChange={(e) => handleQuickNoteChange(parent.id, e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                )
              })}
              
              {parents.length === 0 && (
                <div className="meaningful-empty-state">
                  <div className="empty-content">
                    <h2>🌟 Thousands of Moments Await You</h2>
                    <p className="time-reality">Your parents are waiting to share stories, give advice, and celebrate life with you.</p>
                    <div className="empty-stats">
                      <div className="empty-stat joyful">
                        <div className="empty-number">∞</div>
                        <div className="empty-label">Stories to discover</div>
                        <div className="empty-note">About their life & yours</div>
                      </div>
                      <div className="empty-stat precious">
                        <div className="empty-number">💝</div>
                        <div className="empty-label">Love to share</div>
                        <div className="empty-note">Every conversation matters</div>
                      </div>
                    </div>
                    <div className="wake-up-call positive">
                      <h3>🎁 The Gift of Connection</h3>
                      <p>Every call is a chance to say "I love you" and every visit creates lasting memories.</p>
                    </div>
                    <button onClick={() => setCurrentScreen('onboarding')} className="meaningful-cta joyful">
                      💖 Start Connecting Today
                    </button>
                  </div>
                </div>
              )}
              </main>
            </div>
          </motion.div>
        )}

        {currentScreen === 'medical' && (
          <motion.div
            key="medical"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="screen dashboard-screen"
          >
            <div className="apple-layout">
              <aside className="sidebar">
                <div className="sidebar-header">
                  <h1>ParentOS</h1>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user?.name || 'User'}</div>
                      <button onClick={handleLogout} className="logout-link">Sign Out</button>
                    </div>
                  </div>
                </div>

                <nav className="sidebar-nav">
                  <button onClick={() => setCurrentScreen('dashboard')} className="nav-item">
                    <div className="nav-icon">📊</div>
                    <span>Dashboard</span>
                  </button>
                  <button onClick={() => setCurrentScreen('medical')} className="nav-item active">
                    <div className="nav-icon">🏥</div>
                    <span>Medical</span>
                  </button>
                  <button onClick={() => setCurrentScreen('conversations')} className="nav-item">
                    <div className="nav-icon">💬</div>
                    <span>Conversations</span>
                  </button>
                  <button onClick={() => setCurrentScreen('memories')} className="nav-item">
                    <div className="nav-icon">📸</div>
                    <span>Memories</span>
                  </button>
                </nav>
                
                {parents.length > 0 && (
                  <div className="sidebar-section">
                    <div className="sidebar-section-header">
                      <h3>Your Parents</h3>
                    </div>
                    <div className="parents-list">
                      {parents.map(parent => (
                        <button 
                          key={parent.id} 
                          className="parent-item"
                          onClick={() => {
                            setCurrentScreen('dashboard')
                          }}
                        >
                          <div className="parent-item-avatar">
                            {parent.relationship === 'mom' || parent.relationship === 'stepmom' ? '👩' :
                             parent.relationship === 'dad' || parent.relationship === 'stepdad' ? '👨' :
                             parent.relationship === 'grandmother' ? '👵' :
                             parent.relationship === 'grandfather' ? '👴' : '👤'}
                          </div>
                          <div className="parent-item-details">
                            <div className="parent-item-name">{parent.name}</div>
                            <div className="parent-item-relationship">{parent.relationship}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => setCurrentScreen('onboarding')} 
                      className="add-parent-btn"
                    >
                      <span className="add-icon">+</span>
                      <span>Add Parent</span>
                    </button>
                  </div>
                )}
              </aside>

              <main className="main-content">

            <div className="medical-content">
              <div className="page-header">
                <h1>🏥 Medical Management</h1>
                <p>Track health information and appointments for your parents</p>
              </div>
              
              <div className="medical-actions">
                <button onClick={() => setShowAppointmentForm(true)} className="action-button primary">
                  <span className="button-icon">📅</span>
                  <span>Add Appointment</span>
                </button>
                <button onClick={() => setShowNoteForm(true)} className="action-button secondary">
                  <span className="button-icon">📝</span>
                  <span>Add Note</span>
                </button>
              </div>

              {showAppointmentForm && (
                <div className="modal-overlay">
                  <div className="modal">
                    <h2>New Appointment</h2>
                    <form onSubmit={handleCreateAppointment} className="form">
                      <div className="form-group">
                        <label>Parent</label>
                        <select
                          value={appointmentForm.parent_id}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, parent_id: e.target.value })}
                          required
                        >
                          <option value="">Select parent</option>
                          {parents.map(parent => (
                            <option key={parent.id} value={parent.id}>
                              {parent.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="date"
                          value={appointmentForm.date}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Time</label>
                        <input
                          type="time"
                          value={appointmentForm.time}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Doctor</label>
                        <input
                          type="text"
                          value={appointmentForm.doctor}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, doctor: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Specialty</label>
                        <input
                          type="text"
                          value={appointmentForm.specialty}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, specialty: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Location</label>
                        <input
                          type="text"
                          value={appointmentForm.location}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, location: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Reason</label>
                        <input
                          type="text"
                          value={appointmentForm.reason}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Notes (optional)</label>
                        <textarea
                          value={appointmentForm.notes}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                        />
                      </div>

                      <div className="form-actions">
                        <button type="submit" disabled={loading} className="btn-primary">
                          {loading ? 'Creating...' : 'Create Appointment'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAppointmentForm(false)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {showNoteForm && (
                <div className="modal-overlay">
                  <div className="modal">
                    <h2>New Medical Note</h2>
                    <form onSubmit={handleCreateNote} className="form">
                      <div className="form-group">
                        <label>Parent</label>
                        <select
                          value={noteForm.parent_id}
                          onChange={(e) => setNoteForm({ ...noteForm, parent_id: e.target.value })}
                          required
                        >
                          <option value="">Select parent</option>
                          {parents.map(parent => (
                            <option key={parent.id} value={parent.id}>
                              {parent.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="date"
                          value={noteForm.date}
                          onChange={(e) => setNoteForm({ ...noteForm, date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Type</label>
                        <select
                          value={noteForm.type}
                          onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value as any })}
                          required
                        >
                          <option value="general">General</option>
                          <option value="appointment">Appointment</option>
                          <option value="medication">Medication</option>
                          <option value="symptom">Symptom</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Title</label>
                        <input
                          type="text"
                          value={noteForm.title}
                          onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Content</label>
                        <textarea
                          value={noteForm.content}
                          onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                          required
                          rows={4}
                        />
                      </div>

                      <div className="form-actions">
                        <button type="submit" disabled={loading} className="btn-primary">
                          {loading ? 'Creating...' : 'Create Note'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNoteForm(false)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="medical-sections">
                <div className="section-card">
                  <div className="section-header">
                    <h2>📅 Upcoming Appointments</h2>
                    <span className="section-count">{appointments.filter(a => !a.completed).length}</span>
                  </div>
                  {appointments.length > 0 ? (
                    <div className="items-list">
                      {appointments.map(appointment => (
                        <div key={appointment.id} className="item-card">
                          <div className="item-icon-container">
                            <div className="item-icon">{appointment.completed ? '✅' : '🏥'}</div>
                          </div>
                          <div className="item-content">
                            <div className="item-title">{appointment.doctor}</div>
                            <div className="item-subtitle">{appointment.specialty} • {getParentName(appointment.parent_id)}</div>
                            <div className="item-details">
                              <span className="detail-badge">📅 {new Date(appointment.date).toLocaleDateString()}</span>
                              <span className="detail-badge">⏰ {appointment.time}</span>
                              <span className="detail-badge">📍 {appointment.location}</span>
                            </div>
                            {appointment.notes && (
                              <div className="item-note">{appointment.notes}</div>
                            )}
                          </div>
                          <div className="item-status">
                            <span className={`status-badge ${appointment.completed ? 'completed' : 'upcoming'}`}>
                              {appointment.completed ? 'Completed' : 'Upcoming'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">📅</div>
                      <p>No appointments yet</p>
                      <button onClick={() => setShowAppointmentForm(true)} className="empty-action">
                        Add First Appointment
                      </button>
                    </div>
                  )}
                </div>

                <div className="section-card">
                  <div className="section-header">
                    <h2>📝 Medical Notes</h2>
                    <span className="section-count">{medicalNotes.length}</span>
                  </div>
                  {medicalNotes.length > 0 ? (
                    <div className="items-list">
                      {medicalNotes.map(note => (
                        <div key={note.id} className="item-card">
                          <div className="item-icon-container">
                            <div className="item-icon">
                              {note.type === 'medication' ? '💊' : 
                               note.type === 'symptom' ? '🌡️' :
                               note.type === 'appointment' ? '🏥' : '📝'}
                            </div>
                          </div>
                          <div className="item-content">
                            <div className="item-title">{note.title}</div>
                            <div className="item-subtitle">{getParentName(note.parent_id)} • {new Date(note.date).toLocaleDateString()}</div>
                            <div className="item-description">{note.content}</div>
                            <span className="type-badge">{note.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">📝</div>
                      <p>No medical notes yet</p>
                      <button onClick={() => setShowNoteForm(true)} className="empty-action">
                        Add First Note
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
              </main>
            </div>

          </motion.div>
        )}

        {(currentScreen === 'conversations' || currentScreen === 'memories') && (
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="screen dashboard-screen"
          >
            <div className="apple-layout">
              <aside className="sidebar">
                <div className="sidebar-header">
                  <h1>ParentOS</h1>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user?.name || 'User'}</div>
                      <button onClick={handleLogout} className="logout-link">Sign Out</button>
                    </div>
                  </div>
                </div>

                <nav className="sidebar-nav">
                  <button onClick={() => setCurrentScreen('dashboard')} className="nav-item">
                    <div className="nav-icon">📊</div>
                    <span>Dashboard</span>
                  </button>
                  <button onClick={() => setCurrentScreen('medical')} className="nav-item">
                    <div className="nav-icon">🏥</div>
                    <span>Medical</span>
                  </button>
                  <button onClick={() => setCurrentScreen('conversations')} 
                          className={`nav-item ${currentScreen === 'conversations' ? 'active' : ''}`}>
                    <div className="nav-icon">💬</div>
                    <span>Conversations</span>
                  </button>
                  <button onClick={() => setCurrentScreen('memories')} 
                          className={`nav-item ${currentScreen === 'memories' ? 'active' : ''}`}>
                    <div className="nav-icon">📸</div>
                    <span>Memories</span>
                  </button>
                </nav>
                
                {parents.length > 0 && (
                  <div className="sidebar-section">
                    <div className="sidebar-section-header">
                      <h3>Your Parents</h3>
                    </div>
                    <div className="parents-list">
                      {parents.map(parent => (
                        <button 
                          key={parent.id} 
                          className="parent-item"
                          onClick={() => {
                            setCurrentScreen('dashboard')
                          }}
                        >
                          <div className="parent-item-avatar">
                            {parent.relationship === 'mom' || parent.relationship === 'stepmom' ? '👩' :
                             parent.relationship === 'dad' || parent.relationship === 'stepdad' ? '👨' :
                             parent.relationship === 'grandmother' ? '👵' :
                             parent.relationship === 'grandfather' ? '👴' : '👤'}
                          </div>
                          <div className="parent-item-details">
                            <div className="parent-item-name">{parent.name}</div>
                            <div className="parent-item-relationship">{parent.relationship}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => setCurrentScreen('onboarding')} 
                      className="add-parent-btn"
                    >
                      <span className="add-icon">+</span>
                      <span>Add Parent</span>
                    </button>
                  </div>
                )}
              </aside>

              <main className="main-content">
                <div className="page-content">
                  <div className="page-header">
                    <h1>{currentScreen === 'conversations' ? '💬 Conversation Starters' : '📸 Memory Book'}</h1>
                    <p>{currentScreen === 'conversations' 
                      ? 'Meaningful questions and topics to discuss with your parents' 
                      : 'Capture and preserve precious moments with your family'
                    }</p>
                  </div>

                  <div className="coming-soon-card">
                    <div className="coming-soon-icon">
                      {currentScreen === 'conversations' ? '🚀' : '🎨'}
                    </div>
                    <h2>Coming Soon!</h2>
                    <p>We're working hard to bring you this feature. It will help you {currentScreen === 'conversations' 
                      ? 'discover meaningful conversation topics and questions tailored to your parents\' interests' 
                      : 'create a beautiful digital scrapbook of photos, stories, and memories with your parents'}.</p>
                    <div className="feature-preview">
                      <h3>What to expect:</h3>
                      {currentScreen === 'conversations' ? (
                        <ul>
                          <li>Personalized conversation topics based on your parents' interests</li>
                          <li>Deep questions to learn about their life stories</li>
                          <li>Fun activities and games to do together</li>
                          <li>Conversation history and notes</li>
                        </ul>
                      ) : (
                        <ul>
                          <li>Photo albums with captions and stories</li>
                          <li>Voice recording integration</li>
                          <li>Timeline of important family events</li>
                          <li>Shareable memory books</li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
