// OptionTracker - Google OAuth Authentication
// Improved with silent fallback for local development

const auth = {
    user: null,
    isAuthenticated: false
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAuth);

function initAuth() {
    // Check for stored user session
    const storedUser = localStorage.getItem('optiontracker_user');
    if (storedUser) {
        try {
            auth.user = JSON.parse(storedUser);
            auth.isAuthenticated = true;
            updateAuthUI();
            return; // Already logged in
        } catch (e) {
            localStorage.removeItem('optiontracker_user');
        }
    }

    // Try to setup Google Sign-In with error handling
    setupGoogleAuth();

    // Setup sign out button
    document.getElementById('signOutBtn')?.addEventListener('click', signOut);
}

function setupGoogleAuth() {
    // Check if we can use Google Identity Services
    const clientId = getGoogleClientId();
    const isValidClientId = clientId && !clientId.includes('YOUR_GOOGLE_CLIENT_ID');
    const isSecureOrigin = window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost';

    if (typeof google !== 'undefined' && google.accounts && isValidClientId && isSecureOrigin) {
        try {
            google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleSignIn,
                auto_select: false
            });

            // Render Google button in navbar
            renderGoogleButton('googleSignInBtn', 'medium');
            renderGoogleButton('watchlistGoogleBtn', 'large');

        } catch (e) {
            console.log('Google Sign-In not available, using demo mode');
            renderDemoButtons();
        }
    } else {
        // Use demo buttons for local development
        console.log('🔐 OptionTracker: Using demo sign-in for local development');
        renderDemoButtons();
    }
}

function renderGoogleButton(containerId, size) {
    const container = document.getElementById(containerId);
    if (container && !auth.isAuthenticated && typeof google !== 'undefined') {
        google.accounts.id.renderButton(container, {
            type: 'standard',
            theme: 'filled_blue',
            size: size,
            text: 'signin_with',
            shape: 'rectangular'
        });
    }
}

function getGoogleClientId() {
    // Replace this with your actual Google Cloud OAuth Client ID
    // Instructions: https://console.cloud.google.com/apis/credentials
    return 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
}

function handleGoogleSignIn(response) {
    const payload = decodeJWT(response.credential);

    if (payload) {
        auth.user = {
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture
        };
        auth.isAuthenticated = true;

        localStorage.setItem('optiontracker_user', JSON.stringify(auth.user));
        updateAuthUI();

        if (typeof loadWatchlist === 'function') loadWatchlist();
        console.log('✅ Signed in as:', auth.user.name);
    }
}

function decodeJWT(token) {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')));
    } catch (e) {
        return null;
    }
}

function signOut() {
    auth.user = null;
    auth.isAuthenticated = false;
    localStorage.removeItem('optiontracker_user');

    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }

    updateAuthUI();
    renderDemoButtons();
    console.log('👋 Signed out');
}

function updateAuthUI() {
    const googleBtn = document.getElementById('googleSignInBtn');
    const userProfile = document.getElementById('userProfile');
    const watchlistAuthPrompt = document.getElementById('watchlistAuthPrompt');
    const watchlistContent = document.getElementById('watchlistContent');

    if (auth.isAuthenticated && auth.user) {
        googleBtn?.classList.add('hidden');
        userProfile?.classList.remove('hidden');

        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');

        if (userName) userName.textContent = auth.user.name || 'User';
        if (userEmail) userEmail.textContent = auth.user.email || '';
        if (userAvatar) userAvatar.src = auth.user.picture || 'logo.png';

        watchlistAuthPrompt?.classList.add('hidden');
        watchlistContent?.classList.remove('hidden');
    } else {
        googleBtn?.classList.remove('hidden');
        userProfile?.classList.add('hidden');

        watchlistAuthPrompt?.classList.remove('hidden');
        watchlistContent?.classList.add('hidden');
    }
}

// Demo buttons for local development (no Google OAuth errors)
function renderDemoButtons() {
    const containers = ['googleSignInBtn', 'watchlistGoogleBtn'];

    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container && !auth.isAuthenticated) {
            const isLarge = id === 'watchlistGoogleBtn';
            container.innerHTML = `
                <button class="demo-sign-in-btn ${isLarge ? 'large' : ''}" onclick="demoSignIn()">
                    <svg width="18" height="18" viewBox="0 0 48 48" style="margin-right:8px">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Sign in with Google
                </button>
            `;
        }
    });
}

// Demo sign-in for local development
function demoSignIn() {
    auth.user = {
        id: 'demo-' + Date.now(),
        name: 'Demo User',
        email: 'demo@optiontracker.app',
        picture: 'logo.png'
    };
    auth.isAuthenticated = true;

    localStorage.setItem('optiontracker_user', JSON.stringify(auth.user));
    updateAuthUI();

    if (typeof loadWatchlist === 'function') loadWatchlist();
    console.log('✅ Demo sign-in successful');
}

window.demoSignIn = demoSignIn;

console.log('🔐 OptionTracker Auth loaded');
