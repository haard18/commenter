/**
 * LinkedIn Comment Automation Microservice
 * 
 * HOW TO GET STARTED:
 * 1. Create a LinkedIn Developer App at https://www.linkedin.com/developers/
 * 2. Copy your Client ID and Client Secret to .env file
 * 3. Set LINKEDIN_REDIRECT_URI to http://localhost:3000/auth/linkedin/callback
 * 4. Run: npm install
 * 5. Run: npm start
 * 6. Visit: http://localhost:3000/auth/linkedin to authenticate
 * 7. After successful auth, visit: http://localhost:3000/me to get your profile URN
 * 8. Use POST /comment endpoint to post comments
 * 
 * MANUAL TOKEN FLOW:
 * 1. GET /auth/linkedin - Opens LinkedIn OAuth consent page
 * 2. User authorizes app on LinkedIn
 * 3. LinkedIn redirects to /auth/linkedin/callback with authorization code
 * 4. Server exchanges code for access_token and saves it to .env
 * 5. Use the token for API calls
 */

const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// LinkedIn OAuth Configuration
const LINKEDIN_CONFIG = {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/auth/linkedin/callback',
    scope: 'profile openid w_member_social',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    apiUrl: 'https://api.linkedin.com/v2'
};

// In-memory token storage (will also persist to .env)
let accessToken = process.env.LINKEDIN_TOKEN || null;
let profileUrn = process.env.LINKEDIN_PROFILE_URN || null;

/**
 * Utility function to update .env file with new values
 */
function updateEnvFile(key, value) {
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    try {
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }
    } catch (error) {
        console.error('Error reading .env file:', error.message);
    }

    const lines = envContent.split('\n');
    let keyFound = false;
    
    // Update existing key or add new one
    const updatedLines = lines.map(line => {
        if (line.startsWith(`${key}=`)) {
            keyFound = true;
            return `${key}=${value}`;
        }
        return line;
    });
    
    if (!keyFound) {
        updatedLines.push(`${key}=${value}`);
    }
    
    try {
        fs.writeFileSync(envPath, updatedLines.join('\n'));
        console.log(`✅ Updated .env file with ${key}`);
    } catch (error) {
        console.error(`❌ Error updating .env file:`, error.message);
    }
}

/**
 * Route: GET /
 * Home page with basic instructions
 */
app.get('/', (req, res) => {
    res.json({
        message: 'LinkedIn Comment Automation Service',
        endpoints: {
            'GET /auth/linkedin': 'Start LinkedIn OAuth flow',
            'GET /auth/linkedin/callback': 'OAuth callback handler',
            'GET /me': 'Get LinkedIn profile info',
            'POST /comment': 'Post a comment (requires JSON: {urn, comment})'
        },
        authenticated: !!accessToken,
        profile_urn: profileUrn || 'Not set'
    });
});

/**
 * Route: GET /auth/linkedin
 * Redirects user to LinkedIn OAuth consent page
 */
app.get('/auth/linkedin', (req, res) => {
    console.log('🔗 Starting LinkedIn OAuth flow...');
    
    if (!LINKEDIN_CONFIG.clientId || !LINKEDIN_CONFIG.clientSecret) {
        return res.status(500).json({ 
            error: 'LinkedIn OAuth not configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env' 
        });
    }

    const state = Math.random().toString(36).substring(7); // Simple state parameter
    const authUrl = `${LINKEDIN_CONFIG.authUrl}?response_type=code&client_id=${LINKEDIN_CONFIG.clientId}&redirect_uri=${encodeURIComponent(LINKEDIN_CONFIG.redirectUri)}&state=${state}&scope=${encodeURIComponent(LINKEDIN_CONFIG.scope)}`;
    
    console.log(`🔐 Redirecting to LinkedIn OAuth: ${authUrl}`);
    res.redirect(authUrl);
});
app.get('/status', (_, res) => res.send('OK'));

/**
 * Route: GET /auth/linkedin/callback
 * Handles LinkedIn OAuth callback and exchanges code for access token
 */
app.get('/auth/linkedin/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
        console.error('❌ LinkedIn OAuth error:', error, error_description);
        return res.status(400).json({ 
            error: 'LinkedIn OAuth failed', 
            details: error_description 
        });
    }

    if (!code) {
        console.error('❌ No authorization code received');
        return res.status(400).json({ 
            error: 'No authorization code received' 
        });
    }

    try {
        console.log('🔄 Exchanging authorization code for access token...');
        
        // Exchange authorization code for access token
        const tokenResponse = await axios.post(LINKEDIN_CONFIG.tokenUrl, {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: LINKEDIN_CONFIG.redirectUri,
            client_id: LINKEDIN_CONFIG.clientId,
            client_secret: LINKEDIN_CONFIG.clientSecret
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, expires_in } = tokenResponse.data;
        
        if (!access_token) {
            throw new Error('No access token received from LinkedIn');
        }

        // Store token in memory and .env file
        accessToken = access_token;
        updateEnvFile('LINKEDIN_TOKEN', access_token);
        
        console.log('✅ Successfully obtained LinkedIn access token');
        console.log(`⏱️  Token expires in: ${expires_in} seconds`);

        // Try to fetch user profile to get URN (optional, will be set later if needed)
        try {
            const profileResponse = await axios.get(`${LINKEDIN_CONFIG.apiUrl}/userinfo`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            });

            if (profileResponse.data.sub) {
                profileUrn = `urn:li:person:${profileResponse.data.sub}`;
                updateEnvFile('LINKEDIN_PROFILE_URN', profileUrn);
                console.log('✅ Profile URN obtained:', profileUrn);
            }

        } catch (profileError) {
            console.log('ℹ️  Profile fetch skipped - will be set when needed');
            // This is not critical for the OAuth flow
        }

        res.json({
            success: true,
            message: 'LinkedIn authentication successful!',
            access_token: access_token.substring(0, 10) + '...',
            profile_urn: profileUrn,
            expires_in: expires_in,
            next_steps: [
                'Visit /me to see your full profile',
                'Use POST /comment to post comments'
            ]
        });

    } catch (error) {
        console.error('❌ Error exchanging code for token:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to exchange code for access token',
            details: error.response?.data || error.message
        });
    }
});

/**
 * Route: GET /me
 * Fetches and displays LinkedIn profile information
 */
app.get('/me', async (req, res) => {
    if (!accessToken) {
        return res.status(401).json({ 
            error: 'Not authenticated. Please visit /auth/linkedin first.' 
        });
    }

    try {
        console.log('👤 Fetching LinkedIn profile...');
        
        // Try userinfo endpoint first (works with openid scope)
        let profile = null;
        let userUrn = null;
        
        try {
            const userinfoResponse = await axios.get(`${LINKEDIN_CONFIG.apiUrl}/userinfo`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            profile = userinfoResponse.data;
            if (profile.sub) {
                userUrn = `urn:li:person:${profile.sub}`;
            }
        } catch (userinfoError) {
            console.log('ℹ️  Userinfo endpoint not accessible, trying alternative...');
            
            // Fallback: try to get profile from people endpoint
            const peopleResponse = await axios.get(`${LINKEDIN_CONFIG.apiUrl}/people/~`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });
            
            profile = peopleResponse.data;
            if (profile.id) {
                userUrn = `urn:li:person:${profile.id}`;
            }
        }
        
        // Update profile URN if we got one
        if (userUrn && !profileUrn) {
            profileUrn = userUrn;
            updateEnvFile('LINKEDIN_PROFILE_URN', profileUrn);
        }

        console.log('✅ Profile fetched successfully');
        console.log('👤 Profile URN:', userUrn || profileUrn || 'Not available');

        res.json({
            success: true,
            profile: {
                id: profile?.sub || profile?.id || 'unknown',
                name: profile?.name || `${profile?.given_name || ''} ${profile?.family_name || ''}`.trim(),
                email: profile?.email || 'Not available',
                urn: userUrn || profileUrn || 'Not available'
            },
            message: 'Profile retrieved. If URN is not available, you can manually set LINKEDIN_PROFILE_URN in .env',
            note: 'For commenting, you can also extract URNs from LinkedIn post URLs'
        });

    } catch (error) {
        console.error('❌ Error fetching profile:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            accessToken = null; // Clear invalid token
            return res.status(401).json({ 
                error: 'Access token expired or invalid. Please re-authenticate at /auth/linkedin' 
            });
        }

        res.status(500).json({ 
            error: 'Failed to fetch profile',
            details: error.response?.data || error.message
        });
    }
});

/**
 * Route: POST /comment
 * Posts a comment to LinkedIn using the API
 * Body: { urn, comment }
 */
app.post('/comment', async (req, res) => {
    if (!accessToken) {
        return res.status(401).json({ 
            error: 'Not authenticated. Please visit /auth/linkedin first.' 
        });
    }

    const { urn, comment, actorUrn } = req.body;

    if (!urn || !comment) {
        return res.status(400).json({ 
            error: 'Missing required fields. Please provide both "urn" and "comment" in the request body.' 
        });
    }

    // Use provided actorUrn or fall back to stored profileUrn
    const actor = actorUrn || profileUrn;
    
    if (!actor) {
        return res.status(400).json({ 
            error: 'No actor URN available. Please provide "actorUrn" in request body or visit /me to set profile URN.',
            hint: 'You can extract your URN from your LinkedIn profile URL or provide it manually'
        });
    }

    try {
        console.log('💬 Posting comment to LinkedIn...');
        console.log('🎯 Target URN:', urn);
        console.log('📝 Comment:', comment);
        console.log('👤 Actor URN:', actor);

        // LinkedIn API v2 comment structure
        const commentData = {
            actor: actor,
            object: urn,
            message: {
                text: comment
            }
        };

        const response = await axios.post(
            `${LINKEDIN_CONFIG.apiUrl}/socialActions/${encodeURIComponent(urn)}/comments`,
            commentData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            }
        );

        console.log('✅ Comment posted successfully!');
        console.log('📊 Response status:', response.status);

        res.json({
            success: true,
            message: 'Comment posted successfully!',
            comment_id: response.headers['x-restli-id'] || 'Generated',
            posted_comment: comment,
            target_urn: urn,
            actor_urn: actor
        });

    } catch (error) {
        console.error('❌ Error posting comment:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            accessToken = null; // Clear invalid token
            return res.status(401).json({ 
                error: 'Access token expired or invalid. Please re-authenticate at /auth/linkedin' 
            });
        }

        if (error.response?.status === 403) {
            return res.status(403).json({ 
                error: 'Permission denied. Make sure you have permission to comment on this post and your LinkedIn app has the correct permissions.' 
            });
        }

        res.status(500).json({ 
            error: 'Failed to post comment',
            details: error.response?.data || error.message,
            status: error.response?.status
        });
    }
});

/**
 * Route: GET /status
 * Check authentication and service status
 */
app.get('/status', (req, res) => {
    res.json({
        service: 'LinkedIn Comment Automation',
        status: 'running',
        authenticated: !!accessToken,
        profile_urn: profileUrn || null,
        config: {
            client_id_set: !!LINKEDIN_CONFIG.clientId,
            client_secret_set: !!LINKEDIN_CONFIG.clientSecret,
            redirect_uri: LINKEDIN_CONFIG.redirectUri
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        available_endpoints: [
            'GET /',
            'GET /auth/linkedin', 
            'GET /auth/linkedin/callback',
            'GET /me',
            'POST /comment',
            'GET /status'
        ]
    });
});

// Start server
app.listen(3001, () => {
    console.log('🚀 LinkedIn Comment Automation Service started!');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log('');
    console.log('📋 Quick Start:');
    console.log('1. Make sure your .env file has LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET');
    console.log('2. Visit http://localhost:3000/auth/linkedin to authenticate');
    console.log('3. Visit http://localhost:3000/me to get your profile URN');
    console.log('4. Use POST http://localhost:3000/comment with JSON: {urn, comment}');
    console.log('');
    console.log(`🔑 Authenticated: ${!!accessToken}`);
    console.log(`👤 Profile URN: ${profileUrn || 'Not set'}`);
});

module.exports = app;