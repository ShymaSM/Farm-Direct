// --- Utilities ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : 'ℹ️'}</span> <p>${message}</p>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
window.showToast = showToast; 

// --- Firebase Mock (LocalStorage) ---
const auth = {
  onAuthStateChanged: (callback) => {
    const userStr = localStorage.getItem('currentUser');
    callback(userStr ? JSON.parse(userStr) : null);
  },
  signInWithEmailAndPassword: async (email, password) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error("Invalid email or password");
    const userObj = { uid: user.uid, email: user.email };
    localStorage.setItem('currentUser', JSON.stringify(userObj));
    return { user: userObj };
  },
  createUserWithEmailAndPassword: async (email, password) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.find(u => u.email === email)) {
      throw { code: 'auth/email-already-in-use', message: "Email already in use" };
    }
    const uid = 'user_' + Date.now();
    users.push({ uid, email, password });
    localStorage.setItem('users', JSON.stringify(users));
    const userObj = { uid, email };
    localStorage.setItem('currentUser', JSON.stringify(userObj));
    return { user: userObj };
  },
  signOut: async () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  }
};

const db = {
  collection: (colName) => ({
    doc: (docId) => ({
      get: async () => {
        const items = JSON.parse(localStorage.getItem(colName) || '[]');
        const item = items.find(i => i.uid === docId || i.id === docId);
        return { exists: !!item, data: () => item };
      },
      set: async (data) => {
        const items = JSON.parse(localStorage.getItem(colName) || '[]');
        const index = items.findIndex(i => i.uid === docId || i.id === docId);
        if (index > -1) items[index] = { ...items[index], ...data };
        else items.push({ uid: docId, id: docId, ...data });
        localStorage.setItem(colName, JSON.stringify(items));
      }
    }),
    add: async (data) => {
      const items = JSON.parse(localStorage.getItem(colName) || '[]');
      const id = 'doc_' + Date.now() + Math.random().toString(36).substr(2, 9);
      items.push({ id, ...data });
      localStorage.setItem(colName, JSON.stringify(items));
      return { id };
    },
    where: (field, op, value) => ({
      onSnapshot: (callback) => {
        const runCallback = () => {
           const items = JSON.parse(localStorage.getItem(colName) || '[]');
           const filtered = items.filter(i => {
              if (op === '==') return i[field] === value;
              return false;
           });
           const snapshot = {
             empty: filtered.length === 0,
             forEach: (cb) => {
               filtered.forEach(item => cb({ id: item.id, data: () => item }));
             }
           };
           callback(snapshot);
        };
        runCallback();
        // Simple polling to simulate realtime updates across the app
        setInterval(runCallback, 2000);
      }
    })
  })
};

const firebase = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => Date.now()
    }
  }
};

// --- Auth State Observer ---
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // update index.html nav
    const navActions = document.getElementById('navActions');
    if (navActions) {
      navActions.innerHTML = `<button class="nav-btn" style="background:#ef4444; margin-right: 10px; font-family: inherit; border: none; cursor: pointer;" onclick="logout()">Log Out</button><a href="login.html" class="nav-btn">Dashboard</a>`;
    }

    // User is signed in. Let's make sure they are on the right dashboard if on the login page.
    if (window.location.pathname.includes('login.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const role = userDoc.data().role;
        if (role === 'farmer') window.location.href = 'farmer-dashboard.html';
        else if (role === 'business') window.location.href = 'business-dashboard.html';
      }
    }
  } else {
    // User is signed out. If they are on a dashboard, kick them to login.
    if (window.location.pathname.includes('dashboard')) {
      window.location.href = 'login.html';
    }
  }
});

// --- Login & Registration Logic ---

// Email Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      
      const userDoc = await db.collection("users").doc(userCredential.user.uid).get();
      if (userDoc.exists) {
        const role = userDoc.data().role;
        showToast('Login successful!');
        setTimeout(() => {
          if (role === 'farmer') window.location.href = 'farmer-dashboard.html';
          else window.location.href = 'business-dashboard.html';
        }, 1000);
      } else {
        showToast('User profile not found in database.', 'error');
      }
    } catch (err) {
      console.error("Firebase login error:", err.code, err.message);
      showToast(err.message, 'error');
    }
  });
}

// Farmer Registration
const farmerRegForm = document.getElementById('farmerRegForm');
if (farmerRegForm) {
  farmerRegForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      console.log("Starting Farmer registration...");
      const email = document.getElementById('f_email').value;
      const password = document.getElementById('f_password').value;
      const confirmPassword = document.getElementById('f_confirm_password').value;

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      console.log("Firebase Auth account created:", userCredential.user.uid);
      
      const userData = {
        uid: userCredential.user.uid,
        role: 'farmer',
        name: document.getElementById('f_name').value,
        email: email,
        phone: document.getElementById('f_phone').value,
        farmName: document.getElementById('f_farmName').value,
        location: document.getElementById('f_location').value,
        district: document.getElementById('f_district').value,
        state: document.getElementById('f_state').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      console.log("Saving user profile to Firestore...");
      await db.collection("users").doc(userCredential.user.uid).set(userData);
      
      console.log("Registration completed successfully.");
      showToast('Registration successful!');
      setTimeout(() => window.location.href = 'farmer-dashboard.html', 1000);
    } catch (err) {
      console.error("Firebase registration error:", err.code || err.message, err.message);
      
      let friendlyMessage = err.message;
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = "This email is already registered! Please go to the Login page to sign in, or use a different email.";
      } else if (err.code === 'permission-denied') {
        friendlyMessage = "Database permission denied. Make sure you created the Firestore database!";
      }
      
      showToast(friendlyMessage, 'error');
    }
  });
}

// Business Registration
const buyerRegForm = document.getElementById('buyerRegForm');
if (buyerRegForm) {
  buyerRegForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      console.log("Starting Business registration...");
      const email = document.getElementById('b_email').value;
      const password = document.getElementById('b_password').value;
      const confirmPassword = document.getElementById('b_confirm_password').value;

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      console.log("Firebase Auth account created:", userCredential.user.uid);
      
      const userData = {
        uid: userCredential.user.uid,
        role: 'business',
        name: document.getElementById('b_name').value,
        businessName: document.getElementById('b_businessName').value,
        businessType: document.getElementById('b_businessType').value,
        email: email,
        phone: document.getElementById('b_phone').value,
        location: document.getElementById('b_location').value,
        district: document.getElementById('b_district').value,
        state: document.getElementById('b_state').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      console.log("Saving user profile to Firestore...");
      await db.collection("users").doc(userCredential.user.uid).set(userData);
      
      console.log("Registration completed successfully.");
      showToast('Registration successful!');
      setTimeout(() => window.location.href = 'business-dashboard.html', 1000);
    } catch (err) {
      console.error("Firebase registration error:", err.code || err.message, err.message);
      
      let friendlyMessage = err.message;
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = "This email is already registered! Please go to the Login page to sign in, or use a different email.";
      } else if (err.code === 'permission-denied') {
        friendlyMessage = "Database permission denied. Make sure you created the Firestore database!";
      }
      
      showToast(friendlyMessage, 'error');
    }
  });
}


// --- Farmer Dashboard Logic ---
if (window.location.pathname.includes('farmer-dashboard.html')) {
  document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth state
    auth.onAuthStateChanged(async (user) => {
      if(user) {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists && userDoc.data().role !== 'farmer') {
          window.location.href = 'business-dashboard.html';
          return;
        }
        if (userDoc.exists) {
          document.getElementById('userName').textContent = userDoc.data().name;
          setupFarmerListeners(user, userDoc.data());
        }
      }
    });
  });
}

function setupFarmerListeners(user, userData) {
  // Listen for active crops
  const cropsGrid = document.getElementById('myCropsGrid');
  const qCrops = db.collection("crops").where("farmerId", "==", user.uid);
  
  qCrops.onSnapshot((snapshot) => {
    if (snapshot.empty) {
      cropsGrid.innerHTML = '<p>You have no active crop listings.</p>';
      return;
    }
    let html = '';
    snapshot.forEach((doc) => {
      const c = doc.data();
      html += `
        <div class="business-card">
          <div class="business-header">
            <div class="business-icon">🌾</div>
            <div class="business-info">
              <h4>${c.cropName}</h4>
              <p class="business-type">Status: ${c.status}</p>
            </div>
          </div>
          <div class="business-meta">
            <div><p style="color:#666; font-size:11px;">Quantity</p><strong>${c.quantity} KG</strong></div>
            <div><p style="color:#666; font-size:11px;">Price</p><strong>₹${c.pricePerKg}/KG</strong></div>
          </div>
        </div>
      `;
    });
    cropsGrid.innerHTML = html;
  }, (err) => {
    console.error(err);
    cropsGrid.innerHTML = '<p>Error loading crops.</p>';
  });

  // Sell Crop Form
  const sellCropForm = document.getElementById('sellCropForm');
  if(sellCropForm) {
    sellCropForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const cropData = {
          farmerId: user.uid,
          farmerName: userData.name,
          farmerEmail: userData.email,
          cropName: document.getElementById('cropName').value,
          quantity: parseInt(document.getElementById('cropQuantity').value),
          pricePerKg: parseFloat(document.getElementById('cropPrice').value),
          quality: document.getElementById('cropQuality').value,
          description: document.getElementById('cropDescription').value,
          location: userData.location,
          status: 'Available',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection("crops").add(cropData);
        showToast('Crop listing published successfully!');
        e.target.reset();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Listen for notifications
  const notifGrid = document.getElementById('notificationsGrid');
  const qNotif = db.collection("notifications").where("recipientId", "==", user.uid);
  qNotif.onSnapshot((snapshot) => {
    if (snapshot.empty) {
      notifGrid.innerHTML = '<p>No notifications.</p>';
      return;
    }
    let html = '';
    snapshot.forEach((docSnap) => {
      const n = docSnap.data();
      html += `
        <div class="business-card" style="margin-bottom: 15px;">
          <h4 style="color:var(--primary-color)">${n.title}</h4>
          <p style="margin-top:5px; font-size:14px;">${n.message}</p>
        </div>
      `;
    });
    notifGrid.innerHTML = html;
  });
}


// --- Business Dashboard Logic ---
if (window.location.pathname.includes('business-dashboard.html')) {
  document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth state
    auth.onAuthStateChanged(async (user) => {
      if(user) {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists && userDoc.data().role !== 'business') {
          window.location.href = 'farmer-dashboard.html';
          return;
        }
        if (userDoc.exists) {
          document.getElementById('userName').textContent = userDoc.data().businessName || userDoc.data().name;
          setupBusinessListeners(user, userDoc.data());
        }
      }
    });
  });
}

function setupBusinessListeners(user, userData) {
  const mktGrid = document.getElementById('marketplaceGrid');
  const qMkt = db.collection("crops").where("status", "==", "Available");
  
  qMkt.onSnapshot((snapshot) => {
    window.currentMarketCrops = [];
    if (snapshot.empty) {
      mktGrid.innerHTML = '<p>No crops currently available in the marketplace.</p>';
      return;
    }
    
    let html = '';
    snapshot.forEach((docSnap) => {
      const c = docSnap.data();
      c.id = docSnap.id;
      window.currentMarketCrops.push(c);
      
      html += `
        <div class="business-card">
          <div class="business-header">
            <div class="business-icon">🌾</div>
            <div class="business-info">
              <h4>${c.cropName}</h4>
              <p class="business-type">Farmer: ${c.farmerName} • 📍 ${c.location}</p>
            </div>
          </div>
          <div class="business-meta">
            <div><p style="color:#666; font-size:11px;">Available</p><strong>${c.quantity} KG</strong></div>
            <div><p style="color:#666; font-size:11px;">Price</p><strong>₹${c.pricePerKg}/KG</strong></div>
          </div>
          <p style="font-size:12px; margin: 10px 0; color:#555">Quality: ${c.quality}</p>
          <div class="card-actions">
            <button class="primary-btn full-width" onclick="openRequirementModal('${c.id}')">Send Requirement</button>
          </div>
        </div>
      `;
    });
    mktGrid.innerHTML = html;
  });

  const reqGrid = document.getElementById('buyerRequestsGrid');
  const qReq = db.collection("requests").where("buyerId", "==", user.uid);
  
  qReq.onSnapshot((snapshot) => {
    if (snapshot.empty) {
      reqGrid.innerHTML = '<p>You have not sent any requests yet.</p>';
      return;
    }
    
    let html = '';
    snapshot.forEach((docSnap) => {
      const r = docSnap.data();
      html += `
        <div class="business-card" style="margin-bottom: 15px;">
          <h4 style="color:var(--primary-color)">Request for ${r.cropName}</h4>
          <p style="margin-top:5px; font-size:14px;">Offered ₹${r.offeredPrice}/KG for ${r.requestedQuantity}KG</p>
          <p style="color:#888; font-size:12px; margin-top:10px;">Status: <strong>${r.status}</strong></p>
        </div>
      `;
    });
    reqGrid.innerHTML = html;
  });

  // Modal logic attachment
  window.openRequirementModal = function(cropId) {
    const crop = window.currentMarketCrops.find(c => c.id === cropId);
    if (!crop) return;
    
    const modal = document.getElementById('actionModal');
    const overlay = document.getElementById('modalOverlay');
    
    modal.innerHTML = `
      <h3 class="modal-title">Send Requirement to ${crop.farmerName}</h3>
      <div class="deal-summary">
        <div class="deal-row"><span>Crop:</span> <strong>${crop.cropName}</strong></div>
        <div class="deal-row"><span>Available Qty:</span> <strong>${crop.quantity} KG</strong></div>
        <div class="deal-row"><span>Asking Price:</span> <strong>₹${crop.pricePerKg} / KG</strong></div>
      </div>
      <form id="sendReqForm">
        <div class="input-group">
          <label for="reqQty">Required Quantity (KG)</label>
          <input type="number" id="reqQty" max="${crop.quantity}" required>
        </div>
        <div class="input-group">
          <label for="reqPrice">Offer Price (₹ / KG)</label>
          <input type="number" id="reqPrice" required>
        </div>
        <div class="input-group">
          <label for="reqDate">Required Delivery Date</label>
          <input type="date" id="reqDate" required>
        </div>
        <div class="input-group">
          <label for="reqMsg">Message to Farmer</label>
          <textarea id="reqMsg" rows="2" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;"></textarea>
        </div>
        <div class="modal-actions" style="margin-top:20px;">
          <button type="button" class="secondary-btn" onclick="closeModal()">Cancel</button>
          <button type="submit" class="primary-btn">Submit Requirement</button>
        </div>
      </form>
    `;
    
    document.getElementById('sendReqForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const reqDoc = await db.collection("requests").add({
          cropId: crop.id,
          farmerId: crop.farmerId,
          buyerId: user.uid,
          buyerName: userData.businessName,
          buyerEmail: userData.email,
          cropName: crop.cropName,
          requestedQuantity: parseInt(document.getElementById('reqQty').value),
          offeredPrice: parseFloat(document.getElementById('reqPrice').value),
          deliveryDate: document.getElementById('reqDate').value,
          message: document.getElementById('reqMsg').value,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await db.collection("notifications").add({
          recipientId: crop.farmerId,
          senderId: user.uid,
          type: "buyer_request",
          title: "New Buyer Request",
          message: `${userData.businessName} is interested in your ${crop.cropName} crop.`,
          relatedRequestId: reqDoc.id,
          isRead: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Requirement sent to farmer!', 'success');
        closeModal();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    overlay.classList.add('active');
  }

  window.closeModal = function() {
    const overlay = document.getElementById('modalOverlay');
    if(overlay) overlay.classList.remove('active');
  }
}

// Global logout
async function logout() {
  try {
    await auth.signOut();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.logout = logout;