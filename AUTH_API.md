# Authentication API Documentation

## Overview

This authentication system provides user registration, login, logout, and token management for the HRMS backend application.

## Features

- ✅ User registration (admin type only)
- ✅ Automatic free trial plan creation
- ✅ JWT-based authentication
- ✅ Access & refresh tokens
- ✅ Protected routes
- ✅ User profile management

## Environment Variables

Add these to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
```

## API Endpoints

### 1. Register User

Creates a new admin user with a free trial plan if no plan exists.

**Endpoint:** `POST /api/auth/register`

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "phone": 1234567890,
  "gender": "male",
  "dob": "1990-01-01",
  "bloodGroup": "A+",
  "maritalStatus": "single",
  "address": "123 Main St",
  "aadharNo": 123456789012,
  "pancardNo": null
}
```

**Required Fields:**

- `name` (string)
- `email` (string)
- `password` (string)

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "empId": "EMP123456789",
      "name": "John Doe",
      "email": "john@example.com",
      "type": "admin",
      "active": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### 2. Login

Authenticates a user and returns access & refresh tokens.

**Endpoint:** `POST /api/auth/login`

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "empId": "EMP123456789",
      "name": "John Doe",
      "email": "john@example.com",
      "type": "admin",
      "active": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### 3. Logout

Logs out the current user (requires authentication).

**Endpoint:** `POST /api/auth/logout`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Logout successful. Please remove the token from client storage."
}
```

### 4. Refresh Token

Generates new access and refresh tokens using a valid refresh token.

**Endpoint:** `POST /api/auth/refresh-token`

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### 5. Get Profile

Retrieves the authenticated user's profile (requires authentication).

**Endpoint:** `GET /api/auth/profile`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "empId": "EMP123456789",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": 1234567890,
      "type": "admin",
      "gender": "male",
      "dob": "1990-01-01",
      "bloodGroup": "A+",
      "maritalStatus": "single",
      "address": "123 Main St",
      "active": true
    },
    "plan": {
      "id": 1,
      "userId": 1,
      "type": "startup",
      "price": 0,
      "module": "hrms",
      "active": true,
      "expired": "2026-02-27T...",
      "purchaseDate": "2026-01-28T..."
    }
  }
}
```

## Authentication Flow

### For New Users:

1. Register using `/api/auth/register`
2. Receive access token and refresh token
3. Store tokens securely (localStorage/sessionStorage)
4. Use access token in Authorization header for protected routes

### For Existing Users:

1. Login using `/api/auth/login`
2. Receive access token and refresh token
3. Store tokens securely
4. Use access token for API calls

### Token Refresh:

1. When access token expires, use refresh token
2. Call `/api/auth/refresh-token` with refresh token
3. Receive new access and refresh tokens
4. Update stored tokens

### Logout:

1. Call `/api/auth/logout` (optional, mainly client-side)
2. Remove tokens from client storage

## Middleware

### `authenticate`

Validates the JWT token and adds user information to the request object.

**Usage:**

```typescript
import { authenticate } from "./middleware/auth.js";

router.get("/protected-route", authenticate, controller);
```

### `authorizeAdmin`

Checks if the authenticated user has admin privileges.

**Usage:**

```typescript
import { authenticate, authorizeAdmin } from "./middleware/auth.js";

router.post("/admin-only", authenticate, authorizeAdmin, controller);
```

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Email and password are required"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}
```

### 409 Conflict

```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Registration failed",
  "error": "Error details"
}
```

## Security Notes

1. **Password Hashing:** All passwords are hashed using bcrypt with 10 salt rounds
2. **JWT Secret:** Change the `JWT_SECRET` in production to a strong, random value
3. **Token Expiry:** Access tokens expire in 7 days, refresh tokens in 30 days (configurable)
4. **HTTPS:** Always use HTTPS in production
5. **Token Storage:** Store tokens securely (avoid localStorage in sensitive applications)

## Database Schema

### Users Table

- Auto-generated employee ID (e.g., EMP123456789)
- User type is always "admin" for registration
- Default active status is `true`

### Plan Table (Plain)

- Automatically creates free trial plan if no plan exists
- 30-day trial period
- Type: "startup", Price: 0, Module: "hrms"

## Testing with cURL

### Register:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123"
  }'
```

### Login:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123"
  }'
```

### Get Profile:

```bash
curl -X GET http://localhost:4000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Logout:

```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```
