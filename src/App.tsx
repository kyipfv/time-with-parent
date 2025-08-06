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
    // Set up editable demo user and data
    const demoUser = {
      id: 'demo-user-123',
      email: 'demo@parentos.com',
      name: 'Alex',
      birth_date: '1990-06-15'
    }
    
    const demoParents = [
      {
        id: 'demo-parent-1',
        name: 'Mom',
        birth_date: '1955-03-20',
        relationship: 'mom' as const,
        personality: ['caring', 'wise', 'supportive'],
        interests: ['reading', 'cooking', 'gardening'],
        challenges: ['technology'],
        communication_style: 'calls' as const,
        relationship_goals: ['more quality time'],
        last_contact: '2025-01-03T10:30:00Z'
      },
      {
        id: 'demo-parent-2',
        name: 'Dad',
        birth_date: '1952-08-10',
        relationship: 'dad' as const,
        personality: ['funny', 'hardworking', 'practical'],
        interests: ['sports', 'woodworking', 'history'],
        challenges: ['hearing'],
        communication_style: 'calls' as const,
        relationship_goals: ['share more stories'],
        last_contact: '2025-01-01T15:00:00Z'
      }
    ]
    
    const demoAppointments = [
      {
        id: 'demo-apt-1',
        parent_id: 'demo-parent-1',
        date: '2025-01-15',
        time: '10:30',
        doctor: 'Dr. Emily Chen',
        specialty: 'Cardiology',
        location: 'Heart Center, 123 Medical Dr',
        reason: 'Annual checkup and medication review',
        notes: 'Bring current medication list and blood pressure log',
        completed: false,
        follow_up_needed: true
      },
      {
        id: 'demo-apt-2',
        parent_id: 'demo-parent-1',
        date: '2025-01-08',
        time: '14:00',
        doctor: 'Dr. Robert Kim',
        specialty: 'Ophthalmology',
        location: 'Eye Care Clinic, 456 Vision St',
        reason: 'Routine eye exam',
        notes: 'Mentioned some blurry vision recently',
        completed: true,
        follow_up_needed: false
      }
    ]
    
    const demoMedicalNotes = [
      {
        id: 'demo-note-1',
        parent_id: 'demo-parent-1',
        date: '2025-01-08',
        type: 'appointment' as const,
        title: 'Eye Exam Results',
        content: 'Vision is stable. Prescription updated slightly. Dr. Kim recommends coming back in 6 months instead of annual visits due to age.'
      },
      {
        id: 'demo-note-2',
        parent_id: 'demo-parent-1',
        date: '2025-01-05',
        type: 'medication' as const,
        title: 'Blood Pressure Medication',
        content: 'Mom mentioned feeling dizzy in the mornings. Need to discuss with Dr. Chen at next appointment. She takes Lisinopril 10mg daily.'
      },
      {
        id: 'demo-note-3',
        parent_id: 'demo-parent-1',
        date: '2025-01-03',
        type: 'symptom' as const,
        title: 'Knee Pain',
        content: 'Mom complained about knee pain after long walks. Consider asking about physical therapy options.'
      }
    ]
    
    setUser(demoUser)
    setParents(demoParents)
    setAppointments(demoAppointments)
    setMedicalNotes(demoMedicalNotes)
    setCurrentScreen('dashboard')
  }

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
                  🚀 Try Demo Mode (View Dashboard)
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
              </aside>

              <main className="main-content">
              <div className="time-awareness-header">
                <h1 className="primary-message">⏰ Time is Our Most Precious Gift</h1>
                <p className="awareness-subtitle">Every call, every visit, every moment with your parents is irreplaceable. Make them count.</p>
              </div>
              
              <div className="life-calculator">
                <div className="calculator-header">
                  <h2>📊 Life Calculation Settings</h2>
                  <p>Help us calculate how many conversations you have left with your parents</p>
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
                // Get user's custom settings
                const userBirthDateInput = document.getElementById('userBirthDate') as HTMLInputElement
                const contactFrequencyInput = document.getElementById('contactFrequency') as HTMLSelectElement
                const visitFrequencyInput = document.getElementById('visitFrequency') as HTMLSelectElement
                
                const userBirthDate = userBirthDateInput?.value || '1990-01-01'
                const callFrequency = contactFrequencyInput?.value ? parseInt(contactFrequencyInput.value) : 52
                const visitFrequency = visitFrequencyInput?.value ? parseInt(visitFrequencyInput.value) : 4
                
                // Calculate ages from birth dates
                const parentBirthDate = new Date(parent.birth_date)
                const userBirthDateObj = new Date(userBirthDate)
                const today = new Date()
                
                const parentAge = Math.floor((today.getTime() - parentBirthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
                const userAge = Math.floor((today.getTime() - userBirthDateObj.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
                
                // More realistic calculation based on life expectancy and both ages
                // Average life expectancy around 80-85, but account for current health
                const estimatedParentLifespan = parentAge > 70 ? 85 : 80
                const estimatedUserLifespan = 82 // Average
                
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
                          {parent.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      </div>
                      <div className="parent-identity">
                        <h2 className="parent-name">{parent.name}</h2>
                        <p className="parent-relationship">Your {parent.relationship}</p>
                        <p className="parent-age">{parentAge} years old (you're {userAge})</p>
                        <p className="parent-birthdate">Born {new Date(parent.birth_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                    
                    <div className="health-metrics-grid">
                      <div className="health-card primary-time">
                        <div className="health-card-header">
                          <div className="health-icon">⏳</div>
                          <div className="health-title">Days Together</div>
                        </div>
                        <div className="health-metric">
                          <div className="health-number">{daysLeft.toLocaleString()}</div>
                          <div className="health-unit">days</div>
                        </div>
                        <div className="health-subtitle">≈ {yearsLeftTogether} years left</div>
                      </div>
                      
                      <div className="health-card secondary-time">
                        <div className="health-card-header">
                          <div className="health-icon">📞</div>
                          <div className="health-title">Phone Calls</div>
                        </div>
                        <div className="health-metric">
                          <div className="health-number">{callsLeft.toLocaleString()}</div>
                          <div className="health-unit">calls</div>
                        </div>
                        <div className="health-subtitle">At current rate</div>
                      </div>
                      
                      <div className="health-card moments-time">
                        <div className="health-card-header">
                          <div className="health-icon">🏠</div>
                          <div className="health-title">Visits</div>
                        </div>
                        <div className="health-metric">
                          <div className="health-number">{visitsLeft.toLocaleString()}</div>
                          <div className="health-unit">visits</div>
                        </div>
                        <div className="health-subtitle">In-person moments</div>
                      </div>
                    </div>
                    
                    <div className="total-moments-card">
                      <div className="health-card-header">
                        <div className="health-icon">💝</div>
                        <div className="health-title">Total Interactions Left</div>
                      </div>
                      <div className="health-metric large">
                        <div className="health-number">{totalMomentsLeft.toLocaleString()}</div>
                        <div className="health-unit">calls + visits</div>
                      </div>
                      <div className="health-breakdown">
                        {callsLeft.toLocaleString()} calls + {visitsLeft.toLocaleString()} visits
                      </div>
                    </div>
                    
                    <div className="health-card connection-card">
                      <div className="health-card-header">
                        <div className="health-icon">📞</div>
                        <div className="health-title">Last Contact</div>
                      </div>
                      {daysSinceContact !== null ? (
                        <div className="connection-display">
                          <div className="health-metric">
                            <div className="health-number">{daysSinceContact}</div>
                            <div className="health-unit">days ago</div>
                          </div>
                          {daysSinceContact > 7 && (
                            <div className="health-alert">⚠️ Time to reach out</div>
                          )}
                          {daysSinceContact <= 3 && (
                            <div className="health-good">✅ Recent contact</div>
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
                        <h3>💬 Need something to talk about?</h3>
                        <p>Here are meaningful conversation starters with {parent.name}</p>
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
                        <h3>🎯 Connect Right Now</h3>
                        <p>Don't wait - reach out to {parent.name} today</p>
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
                    <h2>⏰ How much time do you have left with your parents?</h2>
                    <p className="time-reality">If your parent is 65 and you call weekly, you might have fewer than 1,000 conversations left together.</p>
                    <div className="empty-stats">
                      <div className="empty-stat urgent">
                        <div className="empty-number">~8,000</div>
                        <div className="empty-label">Days from birth to age 22</div>
                        <div className="empty-note">Most spent with parents</div>
                      </div>
                      <div className="empty-stat precious">
                        <div className="empty-number">?</div>
                        <div className="empty-label">Days remaining together</div>
                        <div className="empty-note">Let's find out</div>
                      </div>
                    </div>
                    <div className="wake-up-call">
                      <h3>🚨 The Wake-Up Call</h3>
                      <p>Most people realize too late that time with parents is limited. Don't be one of them.</p>
                    </div>
                    <button onClick={() => setCurrentScreen('onboarding')} className="meaningful-cta urgent">
                      ⚡ Start Counting Down
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
            className="screen"
          >
            <div className="header">
              <h1>Medical Management</h1>
              <p>Track appointments and medical notes</p>
            </div>

            <nav className="navigation">
              <button onClick={() => setCurrentScreen('dashboard')} className="nav-btn">
                Dashboard
              </button>
              <button onClick={() => setCurrentScreen('medical')} className="nav-btn active">
                Medical
              </button>
              <button onClick={() => setCurrentScreen('conversations')} className="nav-btn">
                Conversations
              </button>
              <button onClick={() => setCurrentScreen('memories')} className="nav-btn">
                Memories
              </button>
            </nav>

            <div className="medical-content">
              <div className="medical-actions">
                <button onClick={() => setShowAppointmentForm(true)} className="btn-primary">
                  Add Appointment
                </button>
                <button onClick={() => setShowNoteForm(true)} className="btn-secondary">
                  Add Note
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
                <div className="medical-section">
                  <h2>Appointments</h2>
                  {appointments.length > 0 ? (
                    <div className="appointments-grid">
                      {appointments.map(appointment => (
                        <div key={appointment.id} className="appointment-card">
                          <div className="appointment-header">
                            <h3>{getParentName(appointment.parent_id)}</h3>
                            <div className="appointment-status">
                              {appointment.completed ? '✓ Completed' : 'Upcoming'}
                            </div>
                          </div>
                          <div className="appointment-details">
                            <div><strong>Date:</strong> {new Date(appointment.date).toLocaleDateString()}</div>
                            <div><strong>Time:</strong> {appointment.time}</div>
                            <div><strong>Doctor:</strong> {appointment.doctor}</div>
                            <div><strong>Specialty:</strong> {appointment.specialty}</div>
                            <div><strong>Location:</strong> {appointment.location}</div>
                            <div><strong>Reason:</strong> {appointment.reason}</div>
                            {appointment.notes && (
                              <div><strong>Notes:</strong> {appointment.notes}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No appointments yet. Create your first appointment!</p>
                  )}
                </div>

                <div className="medical-section">
                  <h2>Medical Notes</h2>
                  {medicalNotes.length > 0 ? (
                    <div className="notes-grid">
                      {medicalNotes.map(note => (
                        <div key={note.id} className="note-card">
                          <div className="note-header">
                            <h3>{note.title}</h3>
                            <div className="note-type">{note.type}</div>
                          </div>
                          <div className="note-details">
                            <div><strong>Parent:</strong> {getParentName(note.parent_id)}</div>
                            <div><strong>Date:</strong> {new Date(note.date).toLocaleDateString()}</div>
                            <div className="note-content">{note.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No medical notes yet. Create your first note!</p>
                  )}
                </div>
              </div>
            </div>

            {error && <div className="error">{error}</div>}
          </motion.div>
        )}

        {(currentScreen === 'conversations' || currentScreen === 'memories') && (
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="screen"
          >
            <div className="header">
              <h1>{currentScreen === 'conversations' ? 'Conversation Starters' : 'Memory Book'}</h1>
              <p>{currentScreen === 'conversations' 
                ? 'Meaningful questions to ask your parents' 
                : 'Preserve precious moments and stories'
              }</p>
            </div>

            <nav className="navigation">
              <button onClick={() => setCurrentScreen('dashboard')} className="nav-btn">
                Dashboard
              </button>
              <button onClick={() => setCurrentScreen('medical')} className="nav-btn">
                Medical
              </button>
              <button onClick={() => setCurrentScreen('conversations')} 
                      className={`nav-btn ${currentScreen === 'conversations' ? 'active' : ''}`}>
                Conversations
              </button>
              <button onClick={() => setCurrentScreen('memories')} 
                      className={`nav-btn ${currentScreen === 'memories' ? 'active' : ''}`}>
                Memories
              </button>
            </nav>

            <div className="placeholder-content">
              <h2>Coming Soon!</h2>
              <p>This feature is under development and will be available in a future update.</p>
              <button onClick={() => setCurrentScreen('dashboard')} className="btn-primary">
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
