# LinkedIn Comment Automation Microservice

A Node.js Express microservice for automating LinkedIn comments using OAuth 2.0 authentication.

## Features

- 🔐 LinkedIn OAuth 2.0 authentication
- 💬 Post comments to LinkedIn posts
- 👤 Fetch user profile information
- 🔄 Token persistence (in-memory and .env file)
- 🚀 RESTful API endpoints
- ❌ Comprehensive error handling

## Prerequisites

1. **LinkedIn Developer Account**: Create a LinkedIn Developer App at https://www.linkedin.com/developers/
2. **Node.js**: Version 14 or higher
3. **LinkedIn App Permissions**: Make sure your LinkedIn app has the following permissions:
   - `r_liteprofile` (to read profile info)
   - `r_emailaddress` (for email access)
   - `w_member_social` (to post comments)

## Setup Instructions

### 1. LinkedIn Developer App Configuration

1. Go to https://www.linkedin.com/developers/
2. Create a new app or use an existing one
3. In your app settings, add this redirect URL: `http://localhost:3000/auth/linkedin/callback`
4. Note down your **Client ID** and **Client Secret**

### 2. Project Setup

```bash
# Clone or download this project
cd linkedin-comment-automation

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 3. Environment Configuration

Edit the `.env` file with your LinkedIn app credentials:

```env
LINKEDIN_CLIENT_ID=your_actual_client_id_here
LINKEDIN_CLIENT_SECRET=your_actual_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback

# These will be set automatically after authentication
LINKEDIN_TOKEN=
LINKEDIN_PROFILE_URN=
```

### 4. Start the Service

```bash
npm start
```

The server will start on `http://localhost:3000`

## Usage Guide

### Step 1: Authenticate with LinkedIn

1. Visit: http://localhost:3000/auth/linkedin
2. You'll be redirected to LinkedIn's OAuth consent page
3. Authorize the application
4. You'll be redirected back with a success message
5. Your access token will be automatically saved

### Step 2: Get Your Profile Information

Visit: http://localhost:3000/me

This will show your LinkedIn profile and URN (needed for commenting).

### Step 3: Post Comments

Send a POST request to `/comment` with JSON body:

```bash
curl -X POST http://localhost:3000/comment \
  -H "Content-Type: application/json" \
  -d '{
    "urn": "urn:li:activity:1234567890",
    "comment": "Great post! Thanks for sharing."
  }'
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/linkedin` | Start LinkedIn OAuth flow |
| `GET` | `/auth/linkedin/callback` | Handle OAuth callback |

### Profile & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Service home page |
| `GET` | `/me` | Get LinkedIn profile info |
| `GET` | `/status` | Check authentication status |

### Comments

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/comment` | Post a comment | `{"urn": "post_urn", "comment": "text"}` |

## Request/Response Examples

### GET /me Response
```json
{
  "success": true,
  "profile": {
    "id": "abc123",
    "firstName": "John",
    "lastName": "Doe",
    "urn": "urn:li:person:abc123"
  }
}
```

### POST /comment Request
```json
{
  "urn": "urn:li:activity:1234567890",
  "comment": "This is a great insight! Thank you for sharing."
}
```

### POST /comment Response
```json
{
  "success": true,
  "message": "Comment posted successfully!",
  "comment_id": "Generated",
  "posted_comment": "This is a great insight! Thank you for sharing.",
  "target_urn": "urn:li:activity:1234567890"
}
```

## Finding Post URNs

To comment on LinkedIn posts, you need the post's URN. Here are ways to find it:

1. **From LinkedIn Post URLs**: 
   - Post URL: `https://www.linkedin.com/feed/update/urn:li:activity:1234567890/`
   - URN: `urn:li:activity:1234567890`

2. **From LinkedIn API**: Use LinkedIn's API to fetch posts

3. **Browser DevTools**: Inspect network requests when viewing LinkedIn posts

## Error Handling

The service includes comprehensive error handling:

- **401 Unauthorized**: Token expired or invalid
- **403 Forbidden**: Insufficient permissions
- **400 Bad Request**: Missing required fields
- **500 Internal Server Error**: API or server errors

## Token Management

- Tokens are stored in memory and persisted to the `.env` file
- If a token expires, visit `/auth/linkedin` again to re-authenticate
- The service will automatically clear invalid tokens

## Troubleshooting

### Common Issues

1. **"LinkedIn OAuth not configured" error**
   - Make sure `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are set in `.env`

2. **"Permission denied" when commenting**
   - Ensure your LinkedIn app has `w_member_social` permission
   - Make sure you're commenting on a post you have access to

3. **"Access token expired"**
   - Visit `/auth/linkedin` to re-authenticate

### Debug Mode

The service logs all operations to the console. Watch the terminal for detailed information about:
- OAuth flow steps
- API requests and responses
- Token operations
- Error details

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- The LinkedIn Client Secret should never be exposed in client-side code
- Access tokens are sensitive - treat them like passwords
- This implementation is for development/testing - use a proper database for production

## LinkedIn API Documentation

- [LinkedIn OAuth 2.0](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [LinkedIn Social Actions API](https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/social-actions-api)

## Dependencies

- **express**: Web framework
- **axios**: HTTP client for API requests
- **dotenv**: Environment variable management
- **cors**: Cross-origin resource sharing

## License

MIT License