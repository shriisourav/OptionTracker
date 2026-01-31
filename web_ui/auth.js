// OptionTracker - Google OAuth Authentication
// Uses Google Identity Services (GIS) for Sign-In

const auth = {
    user: null,
    isAuthenticated: false
};

// Initialize Google Sign-In when the library loads
function initGoogleAuth() {
    // Check for stored user session
    const storedUser = localStorage.getItem('optiontracker_user');
    if (storedUser) {
        try {
            auth.user = JSON.parse(storedUser);
            auth.isAuthenticated = true;
            updateAuthUI();
        } catch (e) {
            localStorage.removeItem('optiontracker_user');
        }
    }

    // Wait for Google Identity Services to load
    if (typeof google !== 'undefined' && google.accounts) {
        setupGoogleSignIn();
    } else {
        // Retry when library loads
        window.addEventListener('load', () => {
            setTimeout(setupGoogleSignIn, 500);
        });
    }

    // Setup sign out button
    document.getElementById('signOutBtn')?.addEventListener('click', signOut);
}

function setupGoogleSignIn() {
    if (typeof google === 'undefined' || !google.accounts) {
        console.warn('Google Identity Services not loaded. Using demo mode.');
        renderDemoButton();
        return;
    }

    try {
        // Initialize Google Sign-In
        google.accounts.id.initialize({
            client_id: getGoogleClientId(),
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        // Render the Google Sign-In button in navbar
        const navBtn = document.getElementById('googleSignInBtn');
        if (navBtn && !auth.isAuthenticated) {
            google.accounts.id.renderButton(navBtn, {
                type: 'standard',
                theme: 'filled_black',
                size: 'medium',
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left'
            });
        }

        // Render in watchlist page
        const watchlistBtn = document.getElementById('watchlistGoogleBtn');
        if (watchlistBtn && !auth.isAuthenticated) {
            google.accounts.id.renderButton(watchlistBtn, {
                type: 'standard',
                theme: 'filled_blue',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
                width: 280
            });
        }

        // Prompt One Tap if not authenticated
        if (!auth.isAuthenticated) {
            google.accounts.id.prompt();
        }

    } catch (e) {
        console.error('Google Sign-In setup error:', e);
        renderDemoButton();
    }
}

function getGoogleClientId() {
    // For production, replace with your actual Google Cloud OAuth Client ID
    // Create one at: https://console.cloud.google.com/apis/credentials
    // 
    // INSTRUCTIONS:
    // 1. Go to Google Cloud Console
    // 2. Create a new project or select existing
    // 3. Go to APIs & Services > Credentials
    // 4. Create OAuth 2.0 Client ID (Web application)
    // 5. Add your domain to Authorized JavaScript origins
    // 6. Copy the Client ID and paste below

    return 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
}

function handleGoogleSignIn(response) {
    // Decode the JWT credential
    const payload = decodeJWT(response.credential);

    if (payload) {
        auth.user = {
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            givenName: payload.given_name,
            familyName: payload.family_name
        };
        auth.isAuthenticated = true;

        // Store session
        localStorage.setItem('optiontracker_user', JSON.stringify(auth.user));

        updateAuthUI();

        // Load watchlist for this user
        if (typeof loadWatchlist === 'function') {
            loadWatchlist();
        }

        console.log('✅ Signed in as:', auth.user.name);
    }
}

function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('JWT decode error:', e);
        return null;
    }
}

function signOut() {
    auth.user = null;
    auth.isAuthenticated = false;
    localStorage.removeItem('optiontracker_user');

    // Revoke Google session
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }

    updateAuthUI();

    // Re-render sign-in buttons
    setupGoogleSignIn();

    console.log('👋 Signed out');
}

function updateAuthUI() {
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const userProfile = document.getElementById('userProfile');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');
    const watchlistAuthPrompt = document.getElementById('watchlistAuthPrompt');
    const watchlistContent = document.getElementById('watchlistContent');

    if (auth.isAuthenticated && auth.user) {
        // Hide sign-in buttons, show profile
        if (googleSignInBtn) googleSignInBtn.classList.add('hidden');
        if (userProfile) userProfile.classList.remove('hidden');

        if (userName) userName.textContent = auth.user.name || 'User';
        if (userEmail) userEmail.textContent = auth.user.email || '';
        if (userAvatar) userAvatar.src = auth.user.picture || 'logo.png';

        // Show watchlist content
        if (watchlistAuthPrompt) watchlistAuthPrompt.classList.add('hidden');
        if (watchlistContent) watchlistContent.classList.remove('hidden');
    } else {
        // Show sign-in buttons, hide profile
        if (googleSignInBtn) googleSignInBtn.classList.remove('hidden');
        if (userProfile) userProfile.classList.add('hidden');

        // Show auth prompt on watchlist
        if (watchlistAuthPrompt) watchlistAuthPrompt.classList.remove('hidden');
        if (watchlistContent) watchlistContent.classList.add('hidden');
    }
}

// Fallback demo button for local development
function renderDemoButton() {
    const containers = ['googleSignInBtn', 'watchlistGoogleBtn'];

    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container && !auth.isAuthenticated) {
            container.innerHTML = `
                <button class="demo-sign-in-btn" onclick="demoSignIn()">
                    <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" style="width:18px;height:18px;margin-right:8px;">
                    Sign in with Google
                </button>
            `;
        }
    });
}

// Demo sign-in for local development without Google Client ID
function demoSignIn() {
    auth.user = {
        id: 'demo-user-' + Date.now(),
        name: 'Demo User',
        email: 'demo@optiontracker.app',
        picture: 'logo.png',
        givenName: 'Demo',
        familyName: 'User'
    };
    auth.isAuthenticated = true;

    localStorage.setItem('optiontracker_user', JSON.stringify(auth.user));
    updateAuthUI();

    if (typeof loadWatchlist === 'function') {
        loadWatchlist();
    }

    console.log('✅ Demo sign-in successful');
}

// Make available globally
window.demoSignIn = demoSignIn;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initGoogleAuth);

console.log('🔐 OptionTracker Auth Module Loaded');
console.log('📝 To use Google Sign-In: Replace YOUR_GOOGLE_CLIENT_ID in auth.js');
console.log('🧪 For demo/testing: Click the Sign In button or run demoSignIn()');
