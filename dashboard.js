// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    if (!window.supabase) {
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
    }, 2000);

    // Tab switching logic
    window.switchTab = function(tabId) {
        // Update nav items
        document.querySelectorAll('.dashboard-nav li').forEach(li => li.classList.remove('active'));
        event.currentTarget.classList.add('active');

        // Update content panels
        document.querySelectorAll('.dash-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById('tab-' + tabId).classList.add('active');
    };

    async function loadDashboardData(user) {
        // Load Profile
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows returned

            document.getElementById('dash-email').textContent = user.email;
            
            if (profile) {
                document.getElementById('dash-name').textContent = profile.full_name || 'Anonymous User';
                document.getElementById('profile-name-input').value = profile.full_name || '';
                document.getElementById('profile-phone-input').value = profile.phone_number || '';
            } else {
                document.getElementById('dash-name').textContent = 'Welcome, User';
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        }

        // Load Bookings
        loadBookings(user.id);
        
        // Load Payments
        loadPayments(user.id);
    }

    async function loadBookings(userId) {
        const list = document.getElementById('bookings-list');
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, space_id')
                .eq('user_id', userId)
                .order('start_time', { ascending: false });

            if (error) throw error;

            list.innerHTML = '';
            
            if (!data || data.length === 0) {
                list.innerHTML = '<p class="empty-msg">You have no bookings yet.</p>';
                return;
            }

            data.forEach(booking => {
                const start = new Date(booking.start_time).toLocaleString();
                const end = new Date(booking.end_time).toLocaleString();
                const statusColor = booking.status === 'active' ? 'green' : (booking.status === 'pending' ? 'orange' : 'gray');

                const card = document.createElement('div');
                card.className = 'dash-card';
                card.innerHTML = `
                    <div class="dash-card-header">
                        <h4>Booking Ref: ${booking.id.substring(0,8)}...</h4>
                        <span class="status-badge" style="background-color: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${booking.status.toUpperCase()}</span>
                    </div>
                    <div class="dash-card-body">
                        <p><strong>Package:</strong> ${booking.package_type}</p>
                        <p><strong>Time:</strong> ${start} - ${end}</p>
                    </div>
                `;
                list.appendChild(card);
            });
        } catch (err) {
            console.error('Error fetching bookings:', err);
            list.innerHTML = '<p class="empty-msg">Mock Mode: You have no active bookings (Supabase connection error or tables not ready).</p>';
        }
    }

    async function loadPayments(userId) {
        const list = document.getElementById('payments-list');
        try {
            // To get payments for this user, we need to join bookings
            // But if we can't join easily in UI, we fetch bookings first then get payments where booking_id in (...)
            // For simplicity, we can fetch all payments and filter on server, but let's do a basic approach
            
            const { data: userBookings } = await supabase.from('bookings').select('id').eq('user_id', userId);
            
            if (!userBookings || userBookings.length === 0) {
                list.innerHTML = '<p class="empty-msg">No payment history.</p>';
                return;
            }

            const bookingIds = userBookings.map(b => b.id);
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .in('booking_id', bookingIds)
                .order('id', { ascending: false });

            if (error) throw error;

            list.innerHTML = '';
            
            if (!data || data.length === 0) {
                list.innerHTML = '<p class="empty-msg">No payment history.</p>';
                return;
            }

            data.forEach(pay => {
                const card = document.createElement('div');
                card.className = 'dash-card';
                card.innerHTML = `
                    <div class="dash-card-header">
                        <h4>Payment Ref: ${pay.transaction_ref || pay.id.substring(0,8)}</h4>
                        <strong style="color: var(--oak);">฿${pay.amount.toLocaleString()}</strong>
                    </div>
                    <div class="dash-card-body">
                        <p><strong>Method:</strong> ${pay.payment_method}</p>
                        <p><strong>Status:</strong> ${pay.payment_status}</p>
                    </div>
                `;
                list.appendChild(card);
            });
        } catch (err) {
            console.error('Error fetching payments:', err);
            list.innerHTML = '<p class="empty-msg">Mock Mode: No payment history found.</p>';
        }
    }

    window.updateProfile = async function() {
        if (!currentUser) return;
        const name = document.getElementById('profile-name-input').value;
        const phone = document.getElementById('profile-phone-input').value;
        
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({ 
                    id: currentUser.id, 
                    full_name: name,
                    phone_number: phone
                });

            if (error) throw error;
            
            alert('Profile updated successfully!');
            document.getElementById('dash-name').textContent = name || 'Anonymous User';
        } catch (err) {
            alert('Failed to update profile: ' + err.message);
        }
    };
});
