const API_URL = 'https://links-7wqo.onrender.com/api' || 'http://localhost:5000/api';

// State
let currentUser = null;
let groups = [];
let editingLinkId = null;

// DOM Elements
const authSection = document.getElementById('authSection');
const mainContent = document.getElementById('mainContent');
const userInfo = document.getElementById('userInfo');
const userEmail = document.getElementById('userEmail');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const newGroupName = document.getElementById('newGroupName');
const createGroupBtn = document.getElementById('createGroupBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const groupsContainer = document.getElementById('groupsContainer');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('email');

    if (token && email) {
        currentUser = { email, token };
        showMainContent();
        fetchGroups();
    }

    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    registerBtn.addEventListener('click', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);
    createGroupBtn.addEventListener('click', createGroup);
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importData);

    // Enter key for auth
    authPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Enter key for create group
    newGroupName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createGroup();
    });
}

// Show Message
function showMessage(text, type = 'info') {
    toast.textContent = text;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Authentication
async function handleRegister() {
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();

    if (!email || !password) {
        showMessage('Please enter email and password', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Registration successful! Please login.', 'success');
            authPassword.value = '';
        } else {
            showMessage(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('Server error. Please try again.', 'error');
        console.error('Register error:', error);
    }
}

async function handleLogin() {
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();

    if (!email || !password) {
        showMessage('Please enter email and password', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('email', data.email);
            currentUser = { email: data.email, token: data.token };
            showMessage('Login successful!', 'success');
            showMainContent();
            fetchGroups();
            authPassword.value = '';
        } else {
            showMessage(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Server error. Please try again.', 'error');
        console.error('Login error:', error);
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    currentUser = null;
    groups = [];
    showMessage('Logged out successfully', 'info');
    showAuthSection();
}

function showMainContent() {
    authSection.style.display = 'none';
    mainContent.style.display = 'block';
    userInfo.style.display = 'flex';
    userEmail.textContent = currentUser.email;
}

function showAuthSection() {
    authSection.style.display = 'flex';
    mainContent.style.display = 'none';
    userInfo.style.display = 'none';
    authEmail.value = '';
    authPassword.value = '';
}

// Groups
async function fetchGroups() {
    try {
        const response = await fetch(`${API_URL}/links`, {
            headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });

        if (response.ok) {
            groups = await response.json();
            renderGroups();
        } else if (response.status === 401 || response.status === 403) {
            handleLogout();
            showMessage('Session expired. Please login again.', 'error');
        }
    } catch (error) {
        showMessage('Failed to fetch collections', 'error');
        console.error('Fetch groups error:', error);
    }
}

async function createGroup() {
    const title = newGroupName.value.trim();

    if (!title) {
        showMessage('Please enter a collection name', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/links`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ title })
        });

        const data = await response.json();

        if (response.ok) {
            groups.push(data);
            newGroupName.value = '';
            showMessage('Collection created!', 'success');
            renderGroups();
        } else {
            showMessage(data.message || 'Failed to create collection', 'error');
        }
    } catch (error) {
        showMessage('Failed to create collection', 'error');
        console.error('Create group error:', error);
    }
}

async function deleteGroup(groupId) {
    if (!confirm('Are you sure you want to delete this collection?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/links/${groupId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });

        if (response.ok) {
            groups = groups.filter(g => g._id !== groupId);
            showMessage('Collection deleted', 'success');
            renderGroups();
        } else {
            showMessage('Failed to delete collection', 'error');
        }
    } catch (error) {
        showMessage('Failed to delete collection', 'error');
        console.error('Delete group error:', error);
    }
}

// Links
async function addLink(groupId, name, url) {
    try {
        const response = await fetch(`${API_URL}/links/${groupId}/link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ name, url })
        });

        const data = await response.json();

        if (response.ok) {
            const groupIndex = groups.findIndex(g => g._id === groupId);
            if (groupIndex !== -1) {
                groups[groupIndex] = data;
            }
            showMessage('Link added!', 'success');
            renderGroups();
        } else {
            showMessage('Failed to add link', 'error');
        }
    } catch (error) {
        showMessage('Failed to add link', 'error');
        console.error('Add link error:', error);
    }
}

async function updateLink(groupId, linkId, name, url) {
    if (!name.trim() || !url.trim()) {
        showMessage('Name and URL cannot be empty', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/links/${groupId}/link/${linkId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ name, url })
        });

        const data = await response.json();

        if (response.ok) {
            const groupIndex = groups.findIndex(g => g._id === groupId);
            if (groupIndex !== -1) {
                groups[groupIndex] = data;
            }
            editingLinkId = null;
            showMessage('Link updated!', 'success');
            renderGroups();
        } else {
            showMessage('Failed to update link', 'error');
        }
    } catch (error) {
        showMessage('Failed to update link', 'error');
        console.error('Update link error:', error);
    }
}

async function deleteLink(groupId, linkId) {
    try {
        const response = await fetch(`${API_URL}/links/${groupId}/link/${linkId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });

        const data = await response.json();

        if (response.ok) {
            const groupIndex = groups.findIndex(g => g._id === groupId);
            if (groupIndex !== -1) {
                groups[groupIndex] = data;
            }
            showMessage('Link deleted', 'success');
            renderGroups();
        } else {
            showMessage('Failed to delete link', 'error');
        }
    } catch (error) {
        showMessage('Failed to delete link', 'error');
        console.error('Delete link error:', error);
    }
}

// Import/Export
function exportData() {
    const dataStr = JSON.stringify(groups, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `linkvault-export-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showMessage('Data exported successfully!', 'success');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imported = JSON.parse(event.target.result);

            if (!Array.isArray(imported)) {
                showMessage('Invalid file format', 'error');
                return;
            }

            for (const group of imported) {
                await fetch(`${API_URL}/links`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    },
                    body: JSON.stringify(group)
                });
            }

            await fetchGroups();
            showMessage('Data imported successfully!', 'success');
        } catch (error) {
            showMessage('Failed to import data. Invalid file format.', 'error');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// Render
function renderGroups() {
    if (groups.length === 0) {
        groupsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No Collections Yet</h3>
                <p>Create your first link collection to get started!</p>
            </div>
        `;
        return;
    }

    groupsContainer.innerHTML = groups.map(group => `
        <div class="group-card">
            <div class="group-header">
                <h3>${escapeHtml(group.title)}</h3>
                <i class="fas fa-trash" onclick="deleteGroup('${group._id}')"></i>
            </div>
            <div class="links-list" id="links-${group._id}">
                ${renderLinks(group)}
            </div>
            <div class="add-link-section">
                <div class="add-link-form" id="add-form-${group._id}">
                    <input type="text" id="link-name-${group._id}" placeholder="Link Name" />
                    <input type="text" id="link-url-${group._id}" placeholder="URL (e.g., https://example.com)" />
                    <div class="add-link-buttons">
                        <button class="btn btn-save" onclick="handleAddLink('${group._id}')">
                            <i class="fas fa-check"></i> Add
                        </button>
                        <button class="btn btn-cancel" onclick="toggleAddForm('${group._id}')">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
                <button class="add-link-trigger" onclick="toggleAddForm('${group._id}')">
                    <i class="fas fa-plus"></i> Add Link
                </button>
            </div>
        </div>
    `).join('');
}

function renderLinks(group) {
    if (!group.links || group.links.length === 0) {
        return '<p style="text-align: center; color: var(--gray); padding: 20px;">No links yet</p>';
    }

    return group.links.map(link => {
        if (editingLinkId === `${group._id}-${link.id}`) {
            return `
                <div class="link-item">
                    <div class="edit-form">
                        <input type="text" id="edit-name-${group._id}-${link.id}" value="${escapeHtml(link.name)}" />
                        <input type="text" id="edit-url-${group._id}-${link.id}" value="${escapeHtml(link.url)}" />
                        <div class="edit-buttons">
                            <button class="btn btn-save" onclick="handleUpdateLink('${group._id}', ${link.id})">
                                <i class="fas fa-check"></i> Save
                            </button>
                            <button class="btn btn-cancel" onclick="cancelEdit()">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="link-item">
                <div class="link-header">
                    <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                        ${escapeHtml(link.name)}
                    </a>
                    <div class="link-actions">
                        <i class="fas fa-edit" onclick="startEdit('${group._id}', ${link.id})"></i>
                        <i class="fas fa-trash" onclick="deleteLink('${group._id}', ${link.id})"></i>
                    </div>
                </div>
                <div class="link-url">${escapeHtml(link.url)}</div>
            </div>
        `;
    }).join('');
}

// UI Helpers
function toggleAddForm(groupId) {
    const form = document.getElementById(`add-form-${groupId}`);
    const trigger = form.nextElementSibling;

    if (form.classList.contains('active')) {
        form.classList.remove('active');
        trigger.style.display = 'flex';
        document.getElementById(`link-name-${groupId}`).value = '';
        document.getElementById(`link-url-${groupId}`).value = '';
    } else {
        form.classList.add('active');
        trigger.style.display = 'none';
        document.getElementById(`link-name-${groupId}`).focus();
    }
}

function handleAddLink(groupId) {
    const nameInput = document.getElementById(`link-name-${groupId}`);
    const urlInput = document.getElementById(`link-url-${groupId}`);
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name || !url) {
        showMessage('Please enter both name and URL', 'error');
        return;
    }

    addLink(groupId, name, url);
    toggleAddForm(groupId);
}

function startEdit(groupId, linkId) {
    editingLinkId = `${groupId}-${linkId}`;
    renderGroups();
}

function cancelEdit() {
    editingLinkId = null;
    renderGroups();
}

function handleUpdateLink(groupId, linkId) {
    const nameInput = document.getElementById(`edit-name-${groupId}-${linkId}`);
    const urlInput = document.getElementById(`edit-url-${groupId}-${linkId}`);
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    updateLink(groupId, linkId, name, url);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}