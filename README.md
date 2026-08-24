# MyAuth - Authentication API

Authentication backend with user registration, email verification, JWT authentication, password reset, and logout.

## Core Features

* User registration with role-based access
* Email verification
* JWT access & refresh tokens
* Password reset via email
* Protected user profile
* Token refresh and logout

## Getting Started

### Prerequisites

* Node.js 16+
* MongoDB 5.0+
* Email service (Gmail, SendGrid, etc.)

### Installation

```bash
git clone <repository-url>
cd MyAuth
npm install
cp .env.example .env
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure with your actual values. 

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/myauth

ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret
RESET_PASSWORD_TOKEN_SECRET=your_secret

ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@example.com
```

## API

**Base URL:** `http://localhost:5000/api/auth`

### Sign Up

**POST** `/signup`

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "user"
}
```

A verification email is sent after registration.

### Verify Email

**GET** `/verify-email/:token`

Verify the email using the token received by email.

### Sign In

**POST** `/signin`

```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

Returns an `accessToken` and `refreshToken`.

### Get Current User

**GET** `/me`

Requires:

```http
Authorization: Bearer <accessToken>
```

### Refresh Token

**POST** `/refresh-token`

```json
{
  "refreshToken": "<refreshToken>"
}
```

Returns a new access token.

### Forgot Password

**POST** `/forgot-password`

```json
{
  "email": "john@example.com"
}
```

Sends a password reset email.

### Reset Password

**PUT** `/reset-password/:token`

```json
{
  "password": "NewSecurePass123!"
}
```

### Logout

**POST** `/logout`

Requires:

```http
Authorization: Bearer <accessToken>
```

## API Routes

| Method | Route                    | Auth      | Description            |
| ------ | ------------------------ | --------- | ---------------------- |
| POST   | `/signup`                | Public    | Register               |
| POST   | `/signin`                | Public    | Sign in                |
| GET    | `/verify-email/:token`   | Public    | Verify email           |
| POST   | `/forgot-password`       | Public    | Request password reset |
| PUT    | `/reset-password/:token` | Public    | Reset password         |
| POST   | `/refresh-token`         | Public    | Refresh token          |
| GET    | `/me`                    | Protected | Get current user       |
| POST   | `/logout`                | Protected | Logout                 |

## Authentication Flow

1. Sign up.
2. Verify your email.
3. Sign in and receive access & refresh tokens.
4. Use the access token for protected routes.
5. Refresh the access token when needed.
6. Logout when finished.
7. Forgot your password? Use the password reset flow.
