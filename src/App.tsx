import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'

interface User {
  id: string
  email: string
  name: string
}

interface Session {
  access_token: string
  refresh_token: string
  expires_in: number
  user: User
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

type Screen = 'login' | 'register' | 'onboarding' | 'dashboard' | 'conversations' | 'memories' | 'gifts' | 'habits' | 'medical'

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login')
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [parents, setParents] = useState<Parent[]>([])
  const [appointments, setAppointments] = useState<MedicalAppointment[]>([])
  const [medicalNotes, setMedicalNotes] = useState<MedicalNote[]>([])
  
  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' })
  const [parentForm, setParentForm] = useState({
    name: '',
    age: '',
    relationship: 'mom' as 'mom' | 'dad' | 'guardian',
    personality: [] as string[],
    interests: [] as string[],
    challenges: [] as string[]
  })
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const savedSession = localStorage.getItem('parentos_session')
    if (savedSession) {
      const session = JSON.parse(savedSession)
      setSession(session)
      setUser(session.user)
      setCurrentScreen('dashboard')
      fetchUserData(session.access_token)
    }
  }, [])

  const fetchUserData = async (token: string) => {
    try {
      const [parentsRes, appointmentsRes, notesRes] = await Promise.all([
        fetch(`${API_BASE}/api/parents`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/appointments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/notes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (parentsRes.ok) {
        const parentsData = await parentsRes.json()
        setParents(parentsData.parents)
      }
      
      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json()
        setAppointments(appointmentsData.appointments)
      }
      
      if (notesRes.ok) {
        const notesData = await notesRes.json()
        setMedicalNotes(notesData.notes)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })

      const data = await response.json()
      
      if (response.ok) {
        setSession(data.session)
        setUser(data.user)
        localStorage.setItem('parentos_session', JSON.stringify(data.session))
        setCurrentScreen(parents.length > 0 ? 'dashboard' : 'onboarding')
        fetchUserData(data.session.access_token)
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
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      })

      const data = await response.json()
      
      if (response.ok) {
        setSession(data.session)
        setUser(data.user)
        localStorage.setItem('parentos_session', JSON.stringify(data.session))
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

  const handleLogout = () => {
    setSession(null)
    setUser(null)
    setParents([])
    setAppointments([])
    setMedicalNotes([])
    localStorage.removeItem('parentos_session')
    setCurrentScreen('login')
  }

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/parents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...parentForm,
          age: parentForm.age ? parseInt(parentForm.age) : null
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setParents([...parents, data.parent])
        setParentForm({
          name: '',
          age: '',
          relationship: 'mom',
          personality: [],
          interests: [],
          challenges: []
        })
        setCurrentScreen('dashboard')
      } else {
        setError(data.error || 'Failed to create parent profile')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(appointmentForm)
      })

      const data = await response.json()
      
      if (response.ok) {
        setAppointments([...appointments, data.appointment])
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
    if (!session) return

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(noteForm)
      })

      const data = await response.json()
      
      if (response.ok) {
        setMedicalNotes([...medicalNotes, data.note])
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
            className="screen"
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
            </div>
          </motion.div>
        )}

        {currentScreen === 'register' && (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="screen"
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
            className="screen"
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
            className="screen"
          >
            <div className="header">
              <h1>ParentOS Dashboard</h1>
              <p>Welcome back, {user?.name}!</p>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>

            <nav className="navigation">
              <button onClick={() => setCurrentScreen('dashboard')} className="nav-btn active">
                Dashboard
              </button>
              <button onClick={() => setCurrentScreen('medical')} className="nav-btn">
                Medical
              </button>
              <button onClick={() => setCurrentScreen('conversations')} className="nav-btn">
                Conversations
              </button>
              <button onClick={() => setCurrentScreen('memories')} className="nav-btn">
                Memories
              </button>
            </nav>

            <div className="dashboard-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Parents</h3>
                  <div className="stat-number">{parents.length}</div>
                </div>
                <div className="stat-card">
                  <h3>Upcoming Appointments</h3>
                  <div className="stat-number">{upcomingAppointments.length}</div>
                </div>
                <div className="stat-card">
                  <h3>Medical Notes</h3>
                  <div className="stat-number">{medicalNotes.length}</div>
                </div>
              </div>

              <div className="content-grid">
                <div className="content-section">
                  <h2>Recent Activity</h2>
                  {recentNotes.length > 0 ? (
                    <div className="activity-list">
                      {recentNotes.map(note => (
                        <div key={note.id} className="activity-item">
                          <div className="activity-type">{note.type}</div>
                          <div className="activity-title">{note.title}</div>
                          <div className="activity-parent">{getParentName(note.parent_id)}</div>
                          <div className="activity-date">{new Date(note.date).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No recent activity</p>
                  )}
                </div>

                <div className="content-section">
                  <h2>Upcoming Appointments</h2>
                  {upcomingAppointments.length > 0 ? (
                    <div className="appointments-list">
                      {upcomingAppointments.slice(0, 3).map(appointment => (
                        <div key={appointment.id} className="appointment-item">
                          <div className="appointment-date">
                            {new Date(appointment.date).toLocaleDateString()}
                          </div>
                          <div className="appointment-time">{appointment.time}</div>
                          <div className="appointment-doctor">{appointment.doctor}</div>
                          <div className="appointment-parent">{getParentName(appointment.parent_id)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No upcoming appointments</p>
                  )}
                </div>
              </div>
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
