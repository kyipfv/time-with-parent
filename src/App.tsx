import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'

interface User {
  id: string
  email: string
  name: string
}

interface Parent {
  id: string
  name: string
  age?: number
  relationship: 'mom' | 'dad' | 'guardian'
  personality: string[]
  interests: string[]
  challenges: string[]
  communication_style?: 'calls' | 'texts' | 'visits' | 'emails'
  relationship_goals: string[]
  last_contact?: string
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
  const [parentForm, setParentForm] = useState({ name: '', age: '', relationship: 'mom' as 'mom' | 'dad' | 'guardian' })
  
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
        age: parentForm.age ? parseInt(parentForm.age) : null,
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
    setParentForm({ name: '', age: '', relationship: 'mom' })
  }

  const handleDemoMode = () => {
    // Set up demo user and data
    const demoUser = {
      id: 'demo-user-123',
      email: 'demo@parentos.com',
      name: 'Sarah Johnson'
    }
    
    const demoParents = [{
      id: 'demo-parent-1',
      name: 'Margaret Johnson',
      age: 72,
      relationship: 'mom' as const,
      personality: ['caring', 'independent', 'creative'],
      interests: ['gardening', 'reading', 'cooking', 'knitting'],
      challenges: ['technology', 'mobility'],
      communication_style: 'calls' as const,
      relationship_goals: ['more quality time', 'help with technology'],
      last_contact: '2025-01-05T10:30:00Z'
    }]
    
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
                  <label>Age (optional)</label>
                  <input
                    type="number"
                    value={parentForm.age}
                    onChange={(e) => setParentForm({ ...parentForm, age: e.target.value })}
                    min="1"
                    max="150"
                    disabled={loading}
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
            <div className="dashboard-header">
              <div className="header-content">
                <h1>Welcome back, {user?.name}</h1>
                <button onClick={handleLogout} className="logout-btn">Sign Out</button>
              </div>
            </div>

            <nav className="navigation">
              <button onClick={() => setCurrentScreen('dashboard')} className="nav-btn active">
                🏠 Dashboard
              </button>
              <button onClick={() => setCurrentScreen('medical')} className="nav-btn">
                🏥 Medical
              </button>
              <button onClick={() => setCurrentScreen('conversations')} className="nav-btn">
                💬 Conversations
              </button>
              <button onClick={() => setCurrentScreen('memories')} className="nav-btn">
                📸 Memories
              </button>
            </nav>

            <div className="dashboard-content">
              <div className="life-calculator">
                <div className="calculator-header">
                  <h2>Your Life Measurement Settings</h2>
                  <p>Adjust these to get your personalized time calculation</p>
                </div>
                
                <div className="calculator-controls">
                  <div className="control-group">
                    <label>Expected Life Expectancy</label>
                    <div className="control-input">
                      <input 
                        type="number" 
                        min="70" 
                        max="100" 
                        defaultValue="85"
                        className="expectancy-input"
                        id="lifeExpectancy"
                      />
                      <span>years</span>
                    </div>
                  </div>
                  
                  <div className="control-group">
                    <label>How often do you connect?</label>
                    <select className="frequency-select" id="contactFrequency" defaultValue="26">
                      <option value="52">Weekly (52 times/year)</option>
                      <option value="26">Every 2 weeks (26 times/year)</option>
                      <option value="12">Monthly (12 times/year)</option>
                      <option value="6">Every 2 months (6 times/year)</option>
                      <option value="4">Quarterly (4 times/year)</option>
                    </select>
                  </div>
                  
                  <button className="recalculate-btn" onClick={() => window.location.reload()}>
                    🔄 Recalculate
                  </button>
                </div>
              </div>

              {parents.map(parent => {
                // Get user's custom settings
                const lifeExpectancyInput = document.getElementById('lifeExpectancy') as HTMLInputElement
                const contactFrequencyInput = document.getElementById('contactFrequency') as HTMLSelectElement
                
                const customLifeExpectancy = lifeExpectancyInput?.value ? parseInt(lifeExpectancyInput.value) : 85
                const customContactFrequency = contactFrequencyInput?.value ? parseInt(contactFrequencyInput.value) : 26
                
                // Calculate time left based on user settings
                const currentAge = parent.age || 75
                const yearsLeft = Math.max(0, customLifeExpectancy - currentAge)
                const daysLeft = Math.max(0, yearsLeft * 365)
                
                // Calculate meaningful moments left based on user's contact frequency
                const weeksLeft = Math.max(0, yearsLeft * 52)
                const momentsLeft = Math.max(0, yearsLeft * customContactFrequency)
                
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
                        {parent.age && <p className="parent-age">{parent.age} years old</p>}
                      </div>
                    </div>
                    
                    <div className="time-awareness">
                      <div className="primary-metric">
                        <div className="metric-value">{daysLeft.toLocaleString()}</div>
                        <div className="metric-label">Days Remaining</div>
                        <div className="metric-context">Based on average life expectancy</div>
                      </div>
                      
                      <div className="secondary-metrics">
                        <div className="secondary-metric">
                          <div className="metric-number">{weeksLeft}</div>
                          <div className="metric-text">Weeks</div>
                        </div>
                        <div className="secondary-metric">
                          <div className="metric-number">{momentsLeft}</div>
                          <div className="metric-text">Visits</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="connection-status">
                      {daysSinceContact !== null ? (
                        <div className={`last-contact ${daysSinceContact > 7 ? 'overdue' : daysSinceContact > 3 ? 'due-soon' : 'recent'}`}>
                          <div className="contact-indicator">
                            <div className="contact-days">{daysSinceContact}</div>
                            <div className="contact-label">days since last contact</div>
                          </div>
                          {daysSinceContact > 7 && (
                            <div className="contact-reminder">Time to reach out</div>
                          )}
                        </div>
                      ) : (
                        <div className="no-contact-data">
                          <div className="contact-prompt">When did you last connect?</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="action-section">
                      <div className="action-prompt">
                        <h3>How will you measure this relationship?</h3>
                        <p>Every day counts. Every conversation matters.</p>
                      </div>
                      
                      <div className="quick-actions">
                        <button className="action-btn primary" onClick={() => window.open(`tel:${parent.phone || ''}`, '_self')}>
                          📞 Call Now
                        </button>
                        <button className="action-btn secondary" onClick={() => setCurrentScreen('conversations')}>
                          💬 Start Conversation
                        </button>
                        <button className="action-btn secondary" onClick={() => setCurrentScreen('memories')}>
                          📸 Capture Memory
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {parents.length === 0 && (
                <div className="meaningful-empty-state">
                  <div className="empty-content">
                    <h2>Time is finite. Love is infinite.</h2>
                    <p>Add a parent to start measuring what matters most — the time you have left together.</p>
                    <div className="empty-stats">
                      <div className="empty-stat">
                        <div className="empty-number">~30,000</div>
                        <div className="empty-label">Average days in a life</div>
                      </div>
                      <div className="empty-stat">
                        <div className="empty-number">?</div>
                        <div className="empty-label">Days left with your parents</div>
                      </div>
                    </div>
                    <button onClick={() => setCurrentScreen('onboarding')} className="meaningful-cta">
                      Start Measuring What Matters
                    </button>
                  </div>
                </div>
              )}
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
