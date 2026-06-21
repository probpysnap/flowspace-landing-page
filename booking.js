// booking.js
document.addEventListener('DOMContentLoaded', () => {
    // Check if Supabase client is available
    if (!window.supabase) {
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
            // Not logged in -> Show Auth Modal and prevent closing
            showAuthModal(false);
            const modal = document.getElementById('auth-modal');
            // Remove click outside to close for this page
            const newModal = modal.cloneNode(true);
            modal.parentNode.replaceChild(newModal, modal);
            newModal.classList.add('active');
            
            // Add event listener for login success
            const authForm = document.getElementById('auth-form');
            if(authForm) authForm.addEventListener('submit', handleAuthSubmit);
        } else {
            // Logged in -> Load spaces
            const modal = document.getElementById('auth-modal');
            if(modal) modal.classList.remove('active');
            loadSpaces();
        }
    });

    // Fallback if auth check is too slow (user might not be logged in)
    setTimeout(() => {
        if (!isAuthChecked) {
            loadSpaces();
        }
    }, 1500);

    // Filter Listeners
    const typeFilter = document.getElementById('type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', renderSpaces);
    }

    async function loadSpaces() {
        const container = document.getElementById('spaces-container');
        container.innerHTML = '<div class="loading-spinner">Loading spaces from database...</div>';

        try {
            // Try fetching from real Supabase table
            const { data, error } = await supabase.from('spaces').select('*').eq('status', 'available');
            
            if (error) {
                throw error;
            }

            if (data && data.length > 0) {
                spacesData = data;
            } else {
                throw new Error("No spaces found (Did you run the SQL script?)");
            }
        } catch (err) {
            console.warn("Supabase fetch failed, using mock data for UI demonstration.", err);
            // Fallback mock data if the user hasn't created the tables yet
            spacesData = [
                { id: 'mock-1', name: 'Hot Desk Zone A', space_type: 'hot_desk', capacity: 1, price_per_unit: 400 },
                { id: 'mock-2', name: 'Meeting Room 1', space_type: 'meeting_room', capacity: 6, price_per_unit: 1500 },
                { id: 'mock-3', name: 'Dedicated Desk B', space_type: 'dedicated_desk', capacity: 1, price_per_unit: 6500 },
                { id: 'mock-4', name: 'Private Office C', space_type: 'private_office', capacity: 4, price_per_unit: 25000 },
                { id: 'mock-5', name: 'Hot Desk Zone B (Silent)', space_type: 'hot_desk', capacity: 1, price_per_unit: 450 }
            ];
        }

        renderSpaces();
    }

    function renderSpaces() {
        const container = document.getElementById('spaces-container');
        const filterVal = document.getElementById('type-filter').value;
        
        container.innerHTML = '';

        const filtered = filterVal === 'all' 
            ? spacesData 
            : spacesData.filter(s => s.space_type === filterVal);

        if (filtered.length === 0) {
            container.innerHTML = '<p>No spaces match your filter.</p>';
            return;
        }

        filtered.forEach(space => {
            const card = document.createElement('div');
            card.className = 'space-card';
            
            // Format type label
            const typeLabel = space.space_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            // Determine price display based on type (mock logic)
            let period = '/day';
            let price = space.price_per_unit || 400;
            if (space.space_type === 'monthly' || space.space_type === 'dedicated_desk' || space.space_type === 'private_office') {
                period = '/mo';
            } else if (space.space_type === 'meeting_room') {
                period = '/hr';
            }

            card.innerHTML = `
                <div class="space-image" style="background-image: url('https://source.unsplash.com/random/400x300/?office,workspace&sig=${space.id}')"></div>
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

    // Expose Add to Cart to global window object so inline onclick works
    window.addToCart = function(spaceId) {
        const space = spacesData.find(s => s.id === spaceId);
        if (!space) return;

        // Check if already in cart
        if (cart.find(item => item.space.id === spaceId)) {
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
        
        cartItemsContainer.innerHTML = '';

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart" data-i18n="cart_empty">No space selected yet.</p>';
            cartSummary.style.display = 'none';
            return;
        }

        let total = 0;

        cart.forEach((item, index) => {
            const price = item.space.price_per_unit || (item.space.space_type === 'dedicated_desk' ? 6500 : 400);
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

    window.processCheckout = async function() {
        if (!currentUser) {
            alert("Please login first.");
            return;
        }

        if (cart.length === 0) return;

        const btn = document.getElementById('btn-checkout');
        btn.innerHTML = 'Processing...';
        btn.disabled = true;

        try {
            // Attempt to insert into bookings table
            const inserts = cart.map(item => {
                let pType = 'day_pass';
                let end = new Date();
                
                if (item.space.space_type === 'dedicated_desk' || item.space.space_type === 'private_office') {
                    pType = 'monthly';
                    end.setMonth(end.getMonth() + 1);
                } else if (item.space.space_type === 'meeting_room') {
                    pType = 'hourly';
                    end.setHours(end.getHours() + 2);
                } else {
                    end.setHours(20, 0, 0, 0); // Day pass ends at 8PM
                }

                return {
                    user_id: currentUser.id,
                    space_id: item.space.id.startsWith('mock') ? '00000000-0000-0000-0000-000000000000' : item.space.id, // Supabase expects UUID, mock uses strings
                    package_type: pType,
                    start_time: new Date().toISOString(),
                    end_time: end.toISOString(),
                    status: 'pending'
                };
            });

            // Filter out mock IDs if user hasn't setup DB to prevent error crash loop, just simulate success
            const hasMock = inserts.some(i => i.space_id === '00000000-0000-0000-0000-000000000000');
            
            if (!hasMock) {
                const { data, error } = await supabase.from('bookings').insert(inserts);
                if (error) throw error;
            } else {
                // Simulate network delay for mock checkout
                await new Promise(r => setTimeout(r, 1000));
            }

            alert("Checkout successful! (Simulated). Your booking has been confirmed.");
            cart = [];
            renderCart();
            
            // Redirect to dashboard (if it exists) or index
            window.location.href = 'index.html';

        } catch (err) {
            alert('Checkout failed. Error: ' + err.message);
        } finally {
            btn.innerHTML = 'Proceed to Checkout';
            btn.disabled = false;
        }
    };
});
