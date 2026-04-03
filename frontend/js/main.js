// API Configuration
const API_URL = 'http://localhost:5000/api';

// Check if user is authenticated
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    return false;
  }
  return true;
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!checkAuth()) {
    window.location.href = 'login.html';
  }
}

// Get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Format date
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Show error notification
function showNotification(message, type = 'error') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg font-semibold z-50 ${
    type === 'success'
      ? 'bg-green-500 text-white'
      : 'bg-red-500 text-white'
  }`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}
