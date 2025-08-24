<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Blood Bank Management System - Copilot Instructions

## Project Overview
This is a comprehensive blood bank management system with:
- **Frontend**: React Native with Expo
- **Backend**: Express.js with Supabase integration
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: JWT-based with role-based access control

## Architecture
- Three user roles: Admin, Donor, Recipient
- Each role has dedicated login/signup flows and dashboards
- RESTful API design with proper error handling
- Responsive mobile-first design

## Key Technologies
- React Native with Expo
- React Navigation for routing
- Express.js for backend API
- Supabase for database and authentication
- JWT for session management
- bcrypt for password hashing

## Code Style Guidelines
- Use functional components with hooks
- Implement proper error handling and loading states
- Follow React Native best practices
- Use consistent naming conventions
- Include proper TypeScript-style commenting

## API Patterns
- All API endpoints start with `/api/`
- Use proper HTTP status codes
- Implement authentication middleware
- Follow RESTful conventions
- Include comprehensive error responses

## UI/UX Guidelines
- Use role-specific color schemes:
  - Admin: Red gradient (#dc2626, #ef4444)
  - Donor: Green gradient (#10b981, #059669)
  - Recipient: Blue gradient (#3b82f6, #2563eb)
- Implement consistent card-based layouts
- Use Ionicons for all icons
- Include loading states and empty states
- Implement pull-to-refresh functionality

## Security Considerations
- Always validate user input
- Implement proper authentication checks
- Use Row Level Security (RLS) in Supabase
- Hash passwords with bcrypt
- Sanitize data before database operations

## Database Guidelines
- Use UUID for primary keys
- Implement proper foreign key relationships
- Include created_at and updated_at timestamps
- Use appropriate data types and constraints
- Implement proper indexing for performance

## File Organization
- Keep screens organized by user role
- Separate API logic in services directory
- Use consistent file naming conventions
- Group related components together
- Implement proper import/export patterns

## Testing Considerations
- Test all authentication flows
- Validate form submissions
- Test error handling scenarios
- Verify role-based access control
- Test API endpoints with different user roles

## Blood Bank Domain Knowledge
- Support all major blood groups (A+, A-, B+, B-, AB+, AB-, O+, O-)
- Implement blood compatibility rules
- Track donation eligibility (18-65 years for donors)
- Include medical conditions tracking
- Support emergency contact management
- Implement urgency levels for blood requests

## Performance Guidelines
- Implement proper loading states
- Use pagination for large data sets
- Optimize images and assets
- Implement proper caching strategies
- Use efficient database queries
