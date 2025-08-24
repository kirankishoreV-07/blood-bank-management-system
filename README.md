# Blood Bank Management System

A comprehensive blood bank management system with React Native frontend and Express.js backend, integrated with Supabase database.

## Features

### 🩸 Three User Sections:
- **Admin Portal**: Manage blood bank operations, users, and inventory
- **Donor Portal**: Register donors, track donation history, find blood requests
- **Recipient Portal**: Request blood, track requests, find compatible donors

### 🔐 Authentication & Security:
- JWT-based authentication
- Role-based access control
- Secure password hashing with bcrypt
- Row Level Security (RLS) in Supabase

### 📱 Frontend Features:
- Beautiful, modern UI with gradient backgrounds
- Responsive design for mobile devices
- Real-time data updates
- Intuitive navigation between sections
- Form validation and error handling

### 🗄️ Backend Features:
- RESTful API with Express.js
- Supabase integration for database operations
- Comprehensive user management
- Blood request and donation tracking
- Admin dashboard with statistics

## Technology Stack

### Frontend (React Native)
- **React Navigation**: Navigation management
- **Expo**: Development platform
- **AsyncStorage**: Local data persistence
- **Axios**: HTTP client for API calls
- **Vector Icons**: Beautiful icons
- **Linear Gradient**: Gradient backgrounds

### Backend (Express.js)
- **Express.js**: Web application framework
- **Supabase**: Database and authentication
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **cors**: Cross-Origin Resource Sharing
- **dotenv**: Environment variables

## Project Structure

```
/
├── frontend/                 # React Native app
│   ├── src/
│   │   ├── screens/
│   │   │   ├── admin/       # Admin screens
│   │   │   ├── donor/       # Donor screens
│   │   │   ├── recipient/   # Recipient screens
│   │   │   └── WelcomeScreen.js
│   │   └── services/
│   │       └── api.js       # API service layer
│   ├── App.js
│   └── package.json
├── backend/                  # Express.js API
│   ├── server.js            # Main server file
│   ├── .env                 # Environment variables
│   ├── database_schema.sql  # Database schema
│   └── package.json
└── README.md
```

## Database Schema

The system uses Supabase (PostgreSQL) with the following main tables:

- **users**: Store user information for all types (admin, donor, recipient)
- **blood_requests**: Track blood requests from recipients
- **donations**: Record blood donations from donors
- **blood_inventory**: Manage blood stock levels
- **blood_matches**: Track matches between donors and recipients

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (for React Native development)
- Supabase account

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - Copy the `.env` file and update with your Supabase credentials
   - The credentials are already configured for the provided Supabase instance

4. **Set up database:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL commands from `database_schema.sql`

5. **Start the server:**
   ```bash
   npm run dev
   ```
   The server will run on http://localhost:3000

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update API configuration:**
   - Open `src/services/api.js`
   - Update `BASE_URL` to point to your backend server
   - For development: `http://localhost:3000/api`
   - For production: Your deployed backend URL

4. **Start the app:**
   ```bash
   npm start
   # or for specific platforms:
   npm run ios
   npm run android
   npm run web
   ```

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

### Blood Requests (Recipients)
- `POST /api/blood-request` - Create blood request
- `GET /api/blood-requests` - Get blood requests

### Donations (Donors)
- `POST /api/donation` - Record donation
- `GET /api/donations` - Get donations

### Admin
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/users` - Get all users

## User Roles & Permissions

### Admin
- View dashboard with system statistics
- Manage all users
- View all blood requests and donations
- Manage blood inventory
- Generate reports

### Donor
- Register as blood donor
- Record donation history
- View blood requests matching their blood type
- Track personal donation statistics

### Recipient
- Register as blood recipient
- Submit blood requests
- Track request status
- Find compatible donors
- Emergency contact features

## Key Features Implemented

### Security
- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- SQL injection prevention

### User Experience
- Intuitive welcome screen with role selection
- Role-specific color schemes (Red for Admin, Green for Donor, Blue for Recipient)
- Beautiful gradient backgrounds
- Responsive design
- Loading states and error handling
- Pull-to-refresh functionality

### Data Management
- Real-time data synchronization
- Offline data persistence
- Comprehensive form validation
- Blood type compatibility checking
- Emergency contact management

## Development Scripts

### Backend
```bash
npm start       # Start production server
npm run dev     # Start development server with nodemon
```

### Frontend
```bash
npm start       # Start Expo development server
npm run android # Run on Android device/emulator
npm run ios     # Run on iOS device/simulator
npm run web     # Run in web browser
```

## Configuration

### Environment Variables (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
PORT=3000
NODE_ENV=development
```

### Supabase Configuration
The system is configured to work with the provided Supabase instance:
- **URL**: https://ywnaacinyhkmxutqturp.supabase.co
- **Key**: (Service role key provided)

## Blood Group Compatibility

The system supports all major blood groups:
- **A+, A-**: Can donate to A+, AB+, A-, AB-
- **B+, B-**: Can donate to B+, AB+, B-, AB-  
- **AB+**: Universal plasma donor
- **AB-**: Can donate to AB+, AB-
- **O+**: Can donate to A+, B+, AB+, O+
- **O-**: Universal blood donor

## Future Enhancements

- Push notifications for urgent blood requests
- GPS integration for nearby donor/recipient matching
- Blood bank inventory management
- Appointment scheduling system
- Medical report upload functionality
- Multi-language support
- Dark mode theme
- Advanced analytics and reporting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Built with ❤️ for saving lives through blood donation**
