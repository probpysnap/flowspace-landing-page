// booking.js
document.addEventListener('DOMContentLoaded', () => {
    // supabase-client.js sets the global `supabase` variable already
    // so we just check if it exists
    if (typeof supabase === 'undefined') {
        console.error('Supabase client not loaded.');
        return;
    }

    let spacesData = [];
    let cart = [];
    let isAuthChecked = false;

    // Listen to Auth State
    supabase.auth.onAuthStateChange((event, session) => {
        isAuthChecked = true;
        if (!session) {
            // Not logged in -> Show Auth Modal
            showAuthModal(false);
            const modal = document.getElementById('auth-modal');
            if (modal) {
                // Prevent closing on outside click (force login)
                const clonedModal = modal.cloneNode(true);
                modal.parentNode.replaceChild(clonedModal, modal);
                clonedModal.classList.add('active');
                // Re-bind form submit on the cloned modal
                const authForm = clonedModal.querySelector('#auth-form');
                if (authForm) authForm.addEventListener('submit', handleAuthSubmit);
            }
        } else {
            // Logged in -> Hide auth modal & load spaces
            const modal = document.getElementById('auth-modal');
            if (modal) modal.classList.remove('active');
            loadSpaces();
        }
    });

    // Fallback: if auth check takes too long, load spaces anyway for browsing
    setTimeout(() => {
        if (!isAuthChecked) {
            loadSpaces();
        }
    }, 2000);

    // Filter Listeners
    const typeFilter = document.getElementById('type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', renderSpaces);
    }

    // ============================================================
    // LOAD SPACES from Supabase `spaces` table
    // ============================================================
    async function loadSpaces() {
        const container = document.getElementById('spaces-container');
        if (!container) return;
        container.innerHTML = '<div class="loading-spinner">Loading spaces...</div>';

        try {
            const { data, error } = await supabase
                .from('spaces')
                .select('*')
                .eq('status', 'available');

            if (error) throw error;

            if (data && data.length > 0) {
                spacesData = data;
            } else {
                // No data yet — use mock data so the UI is still functional
                console.warn('No spaces in database. Using mock data.');
                spacesData = getMockSpaces();
            }
        } catch (err) {
            console.warn('Supabase fetch failed, using mock data:', err.message);
            spacesData = getMockSpaces();
        }

        renderSpaces();
    }

    function getMockSpaces() {
        return [
            { id: 'mock-1', name: 'Nimman Hot Desk', space_type: 'hot_desk', capacity: 1, price_per_unit: 400 },
            { id: 'mock-2', name: 'Ping River Meeting Room', space_type: 'meeting_room', capacity: 6, price_per_unit: 1500 },
            { id: 'mock-3', name: 'Tha Phae Dedicated Desk', space_type: 'dedicated_desk', capacity: 1, price_per_unit: 6500 },
            { id: 'mock-4', name: 'Lanna Private Office', space_type: 'private_office', capacity: 4, price_per_unit: 25000 },
            { id: 'mock-5', name: 'Doi Suthep Silent Zone', space_type: 'hot_desk', capacity: 1, price_per_unit: 450 }
        ];
    }

    // ============================================================
    // RENDER SPACES GRID
    // ============================================================
    function renderSpaces() {
        const container = document.getElementById('spaces-container');
        const filterEl = document.getElementById('type-filter');
        if (!container || !filterEl) return;
        const filterVal = filterEl.value;

        container.innerHTML = '';

        const filtered = filterVal === 'all'
            ? spacesData
            : spacesData.filter(s => s.space_type === filterVal);

        if (filtered.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--slate);">No spaces match your filter.</p>';
            return;
        }

        filtered.forEach(space => {
            const card = document.createElement('div');
            card.className = 'space-card';

            // Format type label: "hot_desk" → "Hot Desk"
            const typeLabel = (space.space_type || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            // Price & period
            const price = Number(space.price_per_unit) || 0;
            let period = '/day';
            if (['dedicated_desk', 'private_office'].includes(space.space_type)) {
                period = '/mo';
            } else if (space.space_type === 'meeting_room') {
                period = '/hr';
            }

            card.innerHTML = `
                <div class="space-image" style="background: linear-gradient(135deg, rgba(181,131,80,0.15), rgba(38,50,56,0.08)); display:flex; align-items:center; justify-content:center; min-height:180px;">
                    <ion-icon name="business-outline" style="font-size:3rem; color:var(--oak); opacity:0.5;"></ion-icon>
                </div>
                <div class="space-details">
                    <span class="space-type-badge">${typeLabel}</span>
                    <h3>${space.name}</h3>
                    <div class="space-capacity">
                        <ion-icon name="people-outline"></ion-icon>
                        <span>Up to ${space.capacity} person(s)</span>
                    </div>
                    <div class="space-price-row">
                        <div class="space-price">฿${price.toLocaleString()}<span>${period}</span></div>
                        <button class="btn btn-primary btn-add" onclick="window.addToCart('${space.id}')">Add</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // ============================================================
    // CART LOGIC
    // ============================================================
    window.addToCart = function(spaceId) {
        const space = spacesData.find(s => String(s.id) === String(spaceId));
        if (!space) return;

        if (cart.find(item => String(item.space.id) === String(spaceId))) {
            alert('This space is already in your booking list.');
            return;
        }

        cart.push({ space: space, quantity: 1 });
        renderCart();
    };

    function renderCart() {
        const cartItemsContainer = document.getElementById('cart-items');
        const cartSummary = document.getElementById('cart-summary');
        const totalPriceEl = document.getElementById('cart-total-price');

        if (!cartItemsContainer || !cartSummary || !totalPriceEl) return;

        cartItemsContainer.innerHTML = '';

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart" data-i18n="cart_empty">No space selected yet.</p>';
            cartSummary.style.display = 'none';
            return;
        }

        let total = 0;

        cart.forEach((item, index) => {
            const price = Number(item.space.price_per_unit) || 0;
            total += price;

            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.space.name}</h4>
                    <p>1 x ฿${price.toLocaleString()}</p>
                </div>
                <button class="btn-text" onclick="window.removeFromCart(${index})" style="color: red; border: none; background: none; cursor: pointer;">
                    <ion-icon name="trash-outline" style="font-size: 1.2rem;"></ion-icon>
                </button>
            `;
            cartItemsContainer.appendChild(cartItem);
        });

        totalPriceEl.textContent = `฿${total.toLocaleString()}`;
        cartSummary.style.display = 'block';
    }

    window.removeFromCart = function(index) {
        cart.splice(index, 1);
        renderCart();
    };

    // ============================================================
    // CHECKOUT → PAYMENT MODAL
    // ============================================================
    let pendingBookingInserts = [];
    let pendingTotal = 0;

    window.processCheckout = async function() {
        if (!currentUser) {
            showAuthModal(false);
            return;
        }
        if (cart.length === 0) return;

        // Prepare booking rows & calculate total
        let total = 0;
        pendingBookingInserts = cart.map(item => {
            const price = Number(item.space.price_per_unit) || 0;
            total += price;

            let pType = 'day_pass';
            let end = new Date();

            if (['dedicated_desk', 'private_office'].includes(item.space.space_type)) {
                pType = 'monthly';
                end.setMonth(end.getMonth() + 1);
            } else if (item.space.space_type === 'meeting_room') {
                pType = 'hourly';
                end.setHours(end.getHours() + 2);
            } else {
                end.setHours(20, 0, 0, 0);
            }

            const isMock = String(item.space.id).startsWith('mock');

            return {
                user_id: currentUser.id,
                space_id: isMock ? null : item.space.id,
                package_type: pType,
                start_time: new Date().toISOString(),
                end_time: end.toISOString(),
                status: 'pending',
                _isMock: isMock,        // internal flag, stripped before insert
                _price: price           // internal flag
            };
        });

        pendingTotal = total;

        // Show Payment Modal
        const amountEl = document.getElementById('payment-amount');
        const payModal = document.getElementById('payment-modal');
        if (amountEl) amountEl.textContent = `฿${total.toLocaleString()}`;
        if (payModal) payModal.classList.add('active');
    };

    window.cancelPayment = function() {
        const payModal = document.getElementById('payment-modal');
        if (payModal) payModal.classList.remove('active');
        pendingBookingInserts = [];
    };

    // ============================================================
    // CONFIRM PAYMENT → Insert bookings + payments into Supabase
    // ============================================================
    window.submitPayment = async function() {
        const btn = document.getElementById('btn-confirm-payment');
        const methodEl = document.getElementById('payment-method');
        if (!btn || !methodEl) return;

        const method = methodEl.value;
        btn.innerHTML = 'Processing...';
        btn.disabled = true;

        try {
            const hasMock = pendingBookingInserts.some(i => i._isMock);

            if (!hasMock) {
                // Strip internal flags before sending to Supabase
                const cleanInserts = pendingBookingInserts.map(({ _isMock, _price, ...rest }) => rest);

                // Step 1: Insert Bookings (status = pending)
                const { data: bookingsData, error: bookingError } = await supabase
                    .from('bookings')
                    .insert(cleanInserts)
                    .select();

                if (bookingError) throw bookingError;
                if (!bookingsData || bookingsData.length === 0) throw new Error('No booking data returned.');

                // Step 2: Insert Payments (one per booking)
                const paymentInserts = bookingsData.map((b, idx) => ({
                    booking_id: b.id,
                    amount: pendingBookingInserts[idx]._price,
                    payment_method: method,
                    payment_status: 'completed',
                    transaction_ref: 'mock_txn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
                }));

                const { error: paymentError } = await supabase
                    .from('payments')
                    .insert(paymentInserts);
                if (paymentError) throw paymentError;

                // Step 3: Update Bookings to active
                const bookingIds = bookingsData.map(b => b.id);
                const { error: updateError } = await supabase
                    .from('bookings')
                    .update({ status: 'active' })
                    .in('id', bookingIds);

                if (updateError) throw updateError;

            } else {
                // Mock checkout simulation
                await new Promise(r => setTimeout(r, 1500));
            }

            alert('Payment successful! Your booking is confirmed.');
            const payModal = document.getElementById('payment-modal');
            if (payModal) payModal.classList.remove('active');
            cart = [];
            renderCart();

            // Redirect to dashboard
            window.location.href = 'dashboard.html';

        } catch (err) {
            console.error('Payment error:', err);
            alert('Payment failed: ' + err.message);
        } finally {
            btn.innerHTML = 'Confirm Payment';
            btn.disabled = false;
        }
    };
});
