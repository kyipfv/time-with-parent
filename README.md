# ParentOS

Your operating system for being a better child - helping adult children strengthen relationships with their parents.

## 🌟 Features

- **Parent Profiles**: Create comprehensive profiles for your parents with personality traits, interests, and challenges
- **Medical Management**: Track appointments, medications, symptoms, and medical notes with dates
- **Secure Authentication**: User accounts with Supabase Auth integration
- **Data Privacy**: Each user only sees their own family data with Row Level Security
- **Mobile-Friendly**: iOS-inspired responsive design that works on all devices
- **Real-Time**: Built on Supabase for real-time capabilities and automatic scaling

## 🚀 Live Demo

Visit: [Your Render App URL]

## 🛠 Technology Stack

### Frontend
- **React 19** with TypeScript for type safety
- **Framer Motion** for smooth animations
- **Vite** for fast development and optimized builds
- **iOS-inspired CSS** for beautiful, familiar UI

### Backend
- **Node.js + Express** RESTful API server
- **Supabase** for database, authentication, and real-time features
- **PostgreSQL** database with advanced security policies
- **JWT authentication** with automatic session management

### Deployment
- **Render Web Service** for seamless deployment
- **GitHub integration** for automatic deployments
- **Environment-based configuration** for development and production

## 📱 User Journey

1. **Sign Up/Login**: Secure authentication with Supabase Auth
2. **Create Parent Profile**: Add your parent's information, personality, interests
3. **Track Medical Info**: Schedule appointments, take medical notes by category
4. **Dashboard Overview**: See upcoming appointments, recent activity, and stats
5. **Secure Data**: All data is private to your account with enterprise-grade security

## 🏗 Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone Repository
```bash
git clone https://github.com/kyipfv/time-with-parent.git
cd time-with-parent
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server && npm install
```

### 3. Set Up Supabase Database
1. Go to [Supabase](https://supabase.com) and create a new project
2. Go to SQL Editor and run the contents of `database_setup.sql`
3. Get your project URL and keys from Settings → API

### 4. Configure Environment Variables
Create `server/.env`:
```env
PORT=3001
NODE_ENV=development

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

CLIENT_URL=http://localhost:5173
```

### 5. Start Development
```bash
# Start both frontend and backend
npm run dev

# Or start individually:
npm run client:dev  # Frontend only (port 5173)
npm run server:dev  # Backend only (port 3001)
```

Visit `http://localhost:5173` to see the app.

## 🚢 Production Deployment

### Deploy to Render
1. Fork this repository to your GitHub account
2. Create a new **Web Service** on Render
3. Connect your GitHub repository
4. Configure build settings:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Add environment variables in Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` 
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CLIENT_URL` (your Render app URL)
6. Deploy!

The app automatically builds the React frontend and serves it through the Express server.

## 🔒 Security Features

- **Row Level Security (RLS)**: Users can only access their own family data
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: All API endpoints validate input data
- **CORS Protection**: Configured for your frontend domain only
- **Helmet.js**: Security headers for protection against common vulnerabilities
- **Environment Variables**: Sensitive keys stored securely

## 🏗 Architecture

```
ParentOS/
├── src/                    # React frontend
│   ├── App.tsx            # Main application component
│   ├── App.css            # iOS-inspired styles
│   └── ...
├── server/                # Express.js backend
│   ├── routes/            # API route handlers
│   ├── middleware/        # Authentication middleware
│   ├── database/          # Supabase client and helpers
│   └── index.js           # Server entry point
├── database_setup.sql     # PostgreSQL schema for Supabase
└── package.json           # Build configuration
```

## 📊 Database Schema

### Tables
- **users**: User profiles linked to Supabase Auth
- **parents**: Parent profiles with personality and interests
- **appointments**: Medical appointments with full details
- **medical_notes**: Categorized medical notes with timestamps
- **conversation_logs**: Communication tracking (future feature)

### Key Features
- UUID primary keys for security
- JSONB fields for flexible personality/interests data
- Comprehensive foreign key relationships
- Optimized indexes for fast queries
- Row Level Security policies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with love for families everywhere
- Inspired by the need to be better children to our aging parents
- Uses Supabase for backend infrastructure
- Deployed on Render for reliable hosting

## 🆘 Support

For issues and questions:
1. Check the GitHub Issues page
2. Review the Supabase documentation
3. Check Render deployment logs
4. Open a new issue with detailed information

---

**ParentOS** - Because being a great child shouldn't be complicated. 💙
```
