# 🔐 Authentication System - Quick Start

## ✅ What Was Created

### 1. **Database Schema Updates**

- Added `planTypeEnum` for future plan management
- [schema.ts](src/db/schema.ts#L48-L53)

### 2. **JWT Token Management**

- Token generation & verification utilities
- Access tokens (7 days) and refresh tokens (30 days)
- [jwt.ts](src/utils/jwt.ts)

### 3. **Authentication Middleware**

- `authenticate` - Validates JWT tokens
- `authorizeAdmin` - Restricts routes to admin users
- [auth.ts](src/middleware/auth.ts)

### 4. **Auth Controller**

- `register` - Create admin user with auto free trial plan
- `login` - Authenticate and get tokens
- `logout` - Logout handler
- `refreshToken` - Refresh expired tokens
- `getProfile` - Get user profile with plan info
- [authController.ts](src/controllers/authController.ts)

### 5. **Routes**

- `POST /api/auth/register` - Register new admin
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout (protected)
- `POST /api/auth/refresh-token` - Refresh tokens
- `GET /api/auth/profile` - Get profile (protected)
- [authRoutes.ts](src/router/authRoutes.ts)

## 🚀 Quick Start

### 1. Update Environment Variables

Add to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
```

### 2. Start the Server

```bash
npm run dev
```

### 3. Test Registration

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "Admin@123"
  }'
```

### 4. Test Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }'
```

## 🔑 Key Features

### ✨ Auto Free Trial

When a user registers, if they don't have a plan:

- Automatically creates a **30-day free trial**
- Plan type: `startup`
- Module: `hrms`
- Price: `0`

### 🔒 Admin Only Registration

- All registered users have `type: "admin"`
- Employee creation can be added later through admin panel

### 🎫 Token System

- **Access Token**: Short-lived (7 days), used for API requests
- **Refresh Token**: Long-lived (30 days), used to get new access tokens

### 🛡️ Protected Routes Example

```typescript
import { authenticate, authorizeAdmin } from "./middleware/auth.js";

// Only authenticated users
router.get("/profile", authenticate, controller);

// Only admin users
router.post("/create-employee", authenticate, authorizeAdmin, controller);
```

## 📖 Full Documentation

See [AUTH_API.md](AUTH_API.md) for complete API documentation.

## 🗄️ Database Changes

Migration completed! The new `plan_type` enum has been added to the schema.

## 🧪 Testing Checklist

- [ ] Register a new admin user
- [ ] Login with credentials
- [ ] Access protected route with token
- [ ] Refresh expired token
- [ ] Get user profile
- [ ] Logout

## 🔐 Security Reminders

1. Change `JWT_SECRET` in production
2. Use HTTPS in production
3. Passwords are auto-hashed with bcrypt
4. Tokens should be stored securely on client-side

---

**All set!** Your authentication system is ready to use. 🎉
