// ============================================================
// TeamAg Materials Review Database — Firebase Auth & Admin
// ============================================================

// Firebase Configuration — replace with your project's config
const firebaseConfig = {
  apiKey: "AIzaSyAYGlsW8Cu7qFsHM8U3-haUVVnyqp-v-rc",
  authDomain: "teamag-materials-db.firebaseapp.com",
  projectId: "teamag-materials-db",
  storageBucket: "teamag-materials-db.firebasestorage.app",
  messagingSenderId: "374179811681",
  appId: "1:374179811681:web:9243c4e551c59c45a9b520"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Current user profile (Firestore doc)
let currentUserProfile = null;

// ---- Auth State Listener (Auth Gate) ----
auth.onAuthStateChanged(async (user) => {
  const loginOverlay = document.getElementById('loginOverlay');
  const appContainer = document.getElementById('appContainer');

  if (user) {
    try {
      // Load or create Firestore user profile
      const userRef = db.collection('users').doc(user.uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        currentUserProfile = userDoc.data();

        // Check if user is inactive
        if (currentUserProfile.status === 'inactive') {
          await auth.signOut();
          currentUserProfile = null;
          showLoginError('Your account has been deactivated. Contact an administrator.');
          return;
        }

        // Update lastLogin
        await userRef.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
        currentUserProfile.lastLogin = new Date();
      } else {
        // First login — create profile (first user becomes admin)
        const usersSnapshot = await db.collection('users').get();
        const isFirstUser = usersSnapshot.empty;
        const profile = {
          uid: user.uid,
          email: user.email,
          name: user.email.split('@')[0],
          role: isFirstUser ? 'admin' : 'viewer',
          status: 'active',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: isFirstUser ? 'self' : 'unknown'
        };
        await userRef.set(profile);
        currentUserProfile = { ...profile, lastLogin: new Date(), createdAt: new Date() };
      }

      // Show app, hide login
      loginOverlay.style.display = 'none';
      appContainer.style.display = '';
      document.body.style.overflow = '';

      // Update UI for role
      updateUIForRole();

    } catch (err) {
      console.error('Auth state error:', err);
      showLoginError('Error loading user profile. Please try again.');
    }
  } else {
    // Not signed in — show login, hide app
    currentUserProfile = null;
    loginOverlay.style.display = 'flex';
    appContainer.style.display = 'none';
    document.body.style.overflow = 'hidden';
  }
});

// ---- Login ----
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    })
    .catch((err) => {
      btn.disabled = false;
      btn.textContent = 'Sign In';
      let msg = 'Invalid email or password.';
      if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
      if (err.code === 'auth/wrong-password') msg = 'Incorrect password.';
      if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Please try again later.';
      if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
      showLoginError(msg);
    });
}

function showLoginError(msg) {
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
}

// ---- Logout ----
function handleLogout() {
  auth.signOut();
  closeSettings();
}

// ---- Settings Modal ----
function showSettings() {
  renderCurrentUserInfo();
  if (currentUserProfile && currentUserProfile.role === 'admin') {
    document.getElementById('adminSection').style.display = '';
    loadUserList();
  } else {
    document.getElementById('adminSection').style.display = 'none';
  }
  document.getElementById('settingsOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ---- Current User Info ----
function renderCurrentUserInfo() {
  if (!currentUserProfile) return;
  const container = document.getElementById('currentUserInfo');
  const lastLogin = currentUserProfile.lastLogin
    ? (currentUserProfile.lastLogin.toDate ? currentUserProfile.lastLogin.toDate() : currentUserProfile.lastLogin)
    : null;
  const loginStr = lastLogin ? lastLogin.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

  container.innerHTML = `
    <div class="settings-user-card">
      <div class="settings-user-avatar">${(currentUserProfile.name || 'U').charAt(0).toUpperCase()}</div>
      <div class="settings-user-details">
        <div class="settings-user-name">${currentUserProfile.name || '—'}</div>
        <div class="settings-user-email">${currentUserProfile.email}</div>
      </div>
      <span class="role-badge role-${currentUserProfile.role}">${currentUserProfile.role === 'admin' ? 'Admin' : 'Viewer'}</span>
    </div>
    <div class="settings-meta">
      <span>Last login: ${loginStr}</span>
    </div>
  `;
}

// ---- Load User List (Admin) ----
async function loadUserList() {
  const listEl = document.getElementById('userListBody');
  listEl.innerHTML = '<div style="padding:16px;color:#777;text-align:center;">Loading team members...</div>';

  try {
    const snapshot = await db.collection('users').orderBy('createdAt').get();
    const users = [];
    snapshot.forEach(doc => users.push(doc.data()));

    if (users.length === 0) {
      listEl.innerHTML = '<div style="padding:16px;color:#777;">No team members found.</div>';
      return;
    }

    listEl.innerHTML = users.map(u => {
      const lastLogin = u.lastLogin
        ? (u.lastLogin.toDate ? u.lastLogin.toDate() : u.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Never';
      const isCurrentUser = u.uid === auth.currentUser.uid;
      return `
        <div class="user-row ${u.status === 'inactive' ? 'user-inactive' : ''}">
          <div class="user-row-info">
            <div class="user-row-name">${u.name || '—'} ${isCurrentUser ? '<span style="color:#999;font-size:11px;">(you)</span>' : ''}</div>
            <div class="user-row-email">${u.email}</div>
          </div>
          <span class="role-badge role-${u.role}">${u.role === 'admin' ? 'Admin' : 'Viewer'}</span>
          <span class="status-badge status-${u.status}">${u.status === 'active' ? 'Active' : 'Inactive'}</span>
          <span class="user-row-login">${lastLogin}</span>
          <div class="user-row-actions">
            ${!isCurrentUser ? `
              <button class="btn-user-action" onclick="toggleUserRole('${u.uid}')" title="Toggle role">
                ${u.role === 'admin' ? 'Make Viewer' : 'Make Admin'}
              </button>
              <button class="btn-user-action btn-user-status" onclick="toggleUserStatus('${u.uid}')" title="Toggle status">
                ${u.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            ` : '<span style="color:#999;font-size:11px;">—</span>'}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Load users error:', err);
    listEl.innerHTML = '<div style="padding:16px;color:#c62828;">Error loading users. Check Firestore rules.</div>';
  }
}

// ---- Add User (Admin) ----
async function handleAddUser(e) {
  e.preventDefault();
  const name = document.getElementById('newUserName').value.trim();
  const email = document.getElementById('newUserEmail').value.trim();
  const password = document.getElementById('newUserPassword').value;
  const role = document.getElementById('newUserRole').value;
  const btn = document.getElementById('addUserBtn');

  if (!name || !email || !password) return;

  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    // Use secondary app instance to avoid signing out admin
    let secondaryApp;
    try {
      secondaryApp = firebase.app('secondary');
    } catch (_) {
      secondaryApp = firebase.initializeApp(firebaseConfig, 'secondary');
    }
    const secondaryAuth = secondaryApp.auth();

    const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    await secondaryAuth.signOut();

    // Create Firestore profile
    await db.collection('users').doc(cred.user.uid).set({
      uid: cred.user.uid,
      email: email,
      name: name,
      role: role,
      status: 'active',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: null,
      createdBy: auth.currentUser.uid
    });

    // Reset form
    document.getElementById('addUserForm').reset();
    document.getElementById('newUserPassword').value = 'password';
    btn.disabled = false;
    btn.textContent = 'Add Team Member';

    showToast(`${name} added to the team.`, 'success');
    loadUserList();

  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Add Team Member';
    let msg = 'Failed to create user.';
    if (err.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
    if (err.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';
    if (err.code === 'auth/invalid-email') msg = 'Invalid email address.';
    showToast(msg, 'error');
  }
}

// ---- Toggle User Role ----
async function toggleUserRole(uid) {
  try {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) return;
    const newRole = doc.data().role === 'admin' ? 'viewer' : 'admin';
    await userRef.update({ role: newRole });
    showToast(`Role updated to ${newRole}.`, 'success');
    loadUserList();
  } catch (err) {
    console.error('Toggle role error:', err);
    showToast('Failed to update role.', 'error');
  }
}

// ---- Toggle User Status ----
async function toggleUserStatus(uid) {
  try {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) return;
    const newStatus = doc.data().status === 'active' ? 'inactive' : 'active';
    await userRef.update({ status: newStatus });
    showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}.`, 'success');
    loadUserList();
  } catch (err) {
    console.error('Toggle status error:', err);
    showToast('Failed to update status.', 'error');
  }
}

// ---- Update UI for Role ----
function updateUIForRole() {
  const addBtn = document.getElementById('btnAddMaterial');
  if (addBtn) {
    addBtn.style.display = (currentUserProfile && currentUserProfile.role === 'admin') ? '' : 'none';
  }
}
