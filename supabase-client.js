// Initialize Supabase Client
const SUPABASE_URL = 'https://mybeisbemfrduvheaaul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YmVpc2JlbWZyZHV2aGVhYXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5ODc2ODYsImV4cCI6MjA5NzU2MzY4Nn0.1jaLT7ZbBUzulNvvDEklLu4ryqrLPxtu-xwfXXnmfJY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Variables
let currentUser = null;
let currentProfile = null;

// Auth Modal UI Logic
function showAuthModal(isRegister = false) {
    const modal = document.getElementById('auth-modal');
    const formTitle = document.getElementById('auth-title');
    const nameField = document.getElementById('auth-name-group');
    const submitBtn = document.getElementById('auth-submit');
    const switchText = document.getElementById('auth-switch-text');
    const form = document.getElementById('auth-form');

    form.reset();
    form.dataset.mode = isRegister ? 'register' : 'login';

    if (isRegister) {
        formTitle.setAttribute('data-i18n', 'auth_title_register');
        nameField.style.display = 'block';
        document.getElementById('fullname').required = true;
        submitBtn.setAttribute('data-i18n', 'auth_btn_register');
        switchText.innerHTML = `<span data-i18n="auth_switch_login_text">Already have an account?</span> <a href="#" onclick="showAuthModal(false)" data-i18n="auth_switch_login_link">Login here</a>`;
    } else {
        formTitle.setAttribute('data-i18n', 'auth_title_login');
        nameField.style.display = 'none';
        document.getElementById('fullname').required = false;
        submitBtn.setAttribute('data-i18n', 'auth_btn_login');
        switchText.innerHTML = `<span data-i18n="auth_switch_register_text">Don't have an account?</span> <a href="#" onclick="showAuthModal(true)" data-i18n="auth_switch_register_link">Register now</a>`;
    }

    // Trigger translation update for the newly set attributes
    if (window.setLanguage) {
        window.setLanguage(localStorage.getItem("preferredLanguage") || "en");
    }

    modal.classList.add('active');
}

function hideAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('auth-modal');
    if(modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideAuthModal();
        });
    }

    const authForm = document.getElementById('auth-form');
    if(authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }
});

// Authentication Logic
async function handleAuthSubmit(e) {
    e.preventDefault();
    const mode = e.target.dataset.mode;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Show loading state
    const submitBtn = document.getElementById('auth-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '...';
    submitBtn.disabled = true;

    try {
        if (mode === 'register') {
            const fullname = document.getElementById('fullname').value;
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullname }
                }
            });
            if (error) throw error;
            alert('Registration successful! You are now logged in.');
            hideAuthModal();
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            hideAuthModal();
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert('Error signing out: ' + error.message);
    }
}

// Observe Auth State
supabase.auth.onAuthStateChange(async (event, session) => {
    const authActionBtn = document.getElementById('nav-auth-btn');
    
    if (session) {
        currentUser = session.user;
        // Fetch profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', currentUser.id)
            .single();
        
        currentProfile = profile;
        const displayName = profile?.full_name || currentUser.email.split('@')[0];
        
        if (authActionBtn) {
            authActionBtn.innerHTML = `
                <div class="user-profile">
                    <span class="user-name">${displayName}</span>
                    <button class="btn-text" onclick="handleLogout()" style="margin-left: 10px; font-size: 0.9rem; color: var(--slate); border: none; background: none; cursor: pointer;" data-i18n="nav_logout">Logout</button>
                </div>
            `;
        }
    } else {
        currentUser = null;
        currentProfile = null;
        if (authActionBtn) {
            authActionBtn.innerHTML = `<button class="btn btn-outline" onclick="showAuthModal(false)" data-i18n="nav_login">Login</button>`;
        }
    }
    
    // Re-apply translations for dynamic content
    if (window.setLanguage) {
        window.setLanguage(localStorage.getItem("preferredLanguage") || "en");
    }
});

// Booking Logic
async function createBooking(spaceId, packageType) {
    if (!currentUser) {
        alert('Please login first to book a space.');
        showAuthModal(false);
        return;
    }

    // Default booking duration based on package (Simplified for demo)
    const startTime = new Date();
    const endTime = new Date();
    
    if (packageType === 'day_pass') {
        endTime.setHours(20, 0, 0, 0); // Until 8 PM today
    } else if (packageType === 'monthly') {
        endTime.setMonth(endTime.getMonth() + 1);
    }

    try {
        const { data, error } = await supabase
            .from('bookings')
            .insert([{
                user_id: currentUser.id,
                space_id: spaceId,
                package_type: packageType,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString()
            }]);

        if (error) throw error;
        alert('Booking successfully created! Proceeding to payment...');
        // In a real app, redirect to Stripe/Omise checkout here
    } catch (error) {
        alert('Booking failed: ' + error.message);
    }
}
