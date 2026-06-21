// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase === 'undefined') {
        console.error('Supabase client not loaded.');
        return;
    }

    let isAuthChecked = false;

    // Wait for auth state
    supabase.auth.onAuthStateChange((event, session) => {
        isAuthChecked = true;
        if (!session) {
            // Not logged in -> redirect to home
            window.location.href = 'index.html';
        } else {
            // Logged in -> Load dashboard data
            loadDashboardData(session.user);
        }
    });

    setTimeout(() => {
        if (!isAuthChecked && !currentUser) {
            window.location.href = 'index.html';
        }
    }, 2500);

    // ============================================================
    // Tab Switching (pass event explicitly from onclick)
    // ============================================================
    window.switchTab = function(tabId, evt) {
        // Update nav items
        document.querySelectorAll('.dashboard-nav li').forEach(li => li.classList.remove('active'));
        // Use evt if available, otherwise find by tabId
        if (evt && evt.currentTarget) {
            evt.currentTarget.classList.add('active');
        } else {
            // Fallback: mark the correct li
            document.querySelectorAll('.dashboard-nav li').forEach(li => {
                if (li.textContent.toLowerCase().includes(tabId.replace('s', ''))) {
                    li.classList.add('active');
                }
            });
        }

        // Update content panels
        document.querySelectorAll('.dash-tab').forEach(tab => tab.classList.remove('active'));
        const targetTab = document.getElementById('tab-' + tabId);
        if (targetTab) targetTab.classList.add('active');
    };

    // ============================================================
    // Load All Dashboard Data
    // ============================================================
    async function loadDashboardData(user) {
        // Load Profile
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            // PGRST116 = no rows returned (profile not yet created)
            if (error && error.code !== 'PGRST116') {
                console.warn('Profile fetch warning:', error.message);
            }

            const emailEl = document.getElementById('dash-email');
            const nameEl = document.getElementById('dash-name');
            const nameInput = document.getElementById('profile-name-input');
            const phoneInput = document.getElementById('profile-phone-input');

            if (emailEl) emailEl.textContent = user.email;

            if (profile) {
                if (nameEl) nameEl.textContent = profile.full_name || user.email.split('@')[0];
                if (nameInput) nameInput.value = profile.full_name || '';
                if (phoneInput) phoneInput.value = profile.phone_number || '';
            } else {
                if (nameEl) nameEl.textContent = user.email.split('@')[0];
            }
        } catch (err) {
            console.error('Error loading profile:', err);
        }

        // Load Bookings & Payments in parallel
        loadBookings(user.id);
        loadPayments(user.id);
    }

    // ============================================================
    // Load Bookings
    // ============================================================
    async function loadBookings(userId) {
        const list = document.getElementById('bookings-list');
        if (!list) return;

        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            list.innerHTML = '';

            if (!data || data.length === 0) {
                list.innerHTML = '<p class="empty-msg">You have no bookings yet. <a href="booking.html" style="color:var(--oak);">Book a space now!</a></p>';
                return;
            }

            data.forEach(booking => {
                const start = new Date(booking.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const end = new Date(booking.end_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                const statusColors = {
                    active: '#2ecc71',
                    pending: '#f39c12',
                    expired: '#95a5a6',
                    cancelled: '#e74c3c'
                };
                const statusColor = statusColors[booking.status] || '#95a5a6';

                const card = document.createElement('div');
                card.className = 'dash-card';
                card.innerHTML = `
                    <div class="dash-card-header">
                        <h4>Booking #${booking.id.substring(0, 8)}</h4>
                        <span class="status-badge" style="background-color:${statusColor}; color:white; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:600;">${booking.status.toUpperCase()}</span>
                    </div>
                    <div class="dash-card-body">
                        <p><strong>Package:</strong> ${(booking.package_type || '').replace('_', ' ')}</p>
                        <p><strong>From:</strong> ${start}</p>
                        <p><strong>To:</strong> ${end}</p>
                    </div>
                `;
                list.appendChild(card);
            });
        } catch (err) {
            console.error('Error fetching bookings:', err);
            list.innerHTML = '<p class="empty-msg">Could not load bookings. The database tables may not be set up yet.</p>';
        }
    }

    // ============================================================
    // Load Payments (via user's booking IDs)
    // ============================================================
    async function loadPayments(userId) {
        const list = document.getElementById('payments-list');
        if (!list) return;

        try {
            // Step 1: Get this user's booking IDs
            const { data: userBookings, error: bErr } = await supabase
                .from('bookings')
                .select('id')
                .eq('user_id', userId);

            if (bErr) throw bErr;

            if (!userBookings || userBookings.length === 0) {
                list.innerHTML = '<p class="empty-msg">No payment history.</p>';
                return;
            }

            const bookingIds = userBookings.map(b => b.id);

            // Step 2: Get payments for those bookings
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .in('booking_id', bookingIds)
                .order('created_at', { ascending: false });

            if (error) throw error;

            list.innerHTML = '';

            if (!data || data.length === 0) {
                list.innerHTML = '<p class="empty-msg">No payment history.</p>';
                return;
            }

            data.forEach(pay => {
                const amount = Number(pay.amount) || 0;
                const methodLabel = (pay.payment_method || '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                const statusLabel = (pay.payment_status || '').replace(/\b\w/g, l => l.toUpperCase());

                const card = document.createElement('div');
                card.className = 'dash-card';
                card.innerHTML = `
                    <div class="dash-card-header">
                        <h4>${pay.transaction_ref || 'Payment #' + pay.id.substring(0, 8)}</h4>
                        <strong style="color: var(--oak);">฿${amount.toLocaleString()}</strong>
                    </div>
                    <div class="dash-card-body">
                        <p><strong>Method:</strong> ${methodLabel}</p>
                        <p><strong>Status:</strong> ${statusLabel}</p>
                    </div>
                `;
                list.appendChild(card);
            });
        } catch (err) {
            console.error('Error fetching payments:', err);
            list.innerHTML = '<p class="empty-msg">Could not load payment history.</p>';
        }
    }

    // ============================================================
    // Update Profile
    // ============================================================
    window.updateProfile = async function() {
        if (!currentUser) return;

        const nameInput = document.getElementById('profile-name-input');
        const phoneInput = document.getElementById('profile-phone-input');
        if (!nameInput || !phoneInput) return;

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: currentUser.id,
                    full_name: name,
                    phone_number: phone,
                    email: currentUser.email
                });

            if (error) throw error;

            alert('Profile updated successfully!');
            const nameEl = document.getElementById('dash-name');
            if (nameEl) nameEl.textContent = name || currentUser.email.split('@')[0];
        } catch (err) {
            alert('Failed to update profile: ' + err.message);
        }
    };
});
