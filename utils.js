// utils.js - Common utility functions for both admin and user interfaces

// ========== LOADING & UI UTILITY FUNCTIONS ==========

// Enhanced showToast function with better error handling and more options
window.showToast = function showToast(message, type = 'info', duration = 4000, options = {}) {
  console.log('showToast called with:', { message, type, duration, options });
  const container = document.getElementById('toastContainer');
  if (!container) return;

  // Create unique ID for toast
  const toastCount = (window.toastCount || 0) + 1;
  window.toastCount = toastCount;
  const toastId = `toast-${toastCount}`;
  
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `toast ${type}`;
  
  // Add icon based on type
  const iconClass = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  }[type] || 'fa-info-circle';
  
  // Add close button for persistent toasts
  const closeButton = options.persistent ? 
    `<button class="toast-close" onclick="dismissToast('${toastId}')" aria-label="Close notification">
      <i class="fas fa-times"></i>
    </button>` : '';
  
  toast.innerHTML = `
    <i class="fas ${iconClass}"></i>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
      ${options.details ? `<div class="toast-details">${options.details}</div>` : ''}
    </div>
    ${closeButton}
  `;
  
  container.appendChild(toast);
  
  // Add animation class after a small delay to ensure proper rendering
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Auto-dismiss unless it's persistent
  if (!options.persistent) {
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          container.removeChild(toast);
          if (container.children.length === 0) window.toastCount = 0;
        }
      }, 300);
    }, duration);
  }
  
  return toastId;
}

// Function to manually dismiss a toast
window.dismissToast = function dismissToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
        const container = document.getElementById('toastContainer');
        if (container && container.children.length === 0) window.toastCount = 0;
      }
    }, 300);
  }
}

// Enhanced loading overlay with progress indication
function showLoadingOverlay(text = 'Loading...', showProgress = false) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    const textElement = overlay.querySelector('.loading-text');
    const spinnerElement = overlay.querySelector('.loading-spinner');
    
    if (textElement) textElement.textContent = text;
    
    // Add progress indicator if requested
    if (showProgress) {
      let progressElement = overlay.querySelector('.loading-progress');
      if (!progressElement) {
        progressElement = document.createElement('div');
        progressElement.className = 'loading-progress';
        progressElement.innerHTML = `
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <div class="progress-text">0%</div>
        `;
        overlay.querySelector('.loading-container').appendChild(progressElement);
      }
      progressElement.style.display = 'block';
    } else {
      const progressElement = overlay.querySelector('.loading-progress');
      if (progressElement) progressElement.style.display = 'none';
    }
    
    // Add a small delay to prevent flickering for fast operations
    setTimeout(() => {
      if (overlay) overlay.classList.add('active');
    }, 100);
  }
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    // Add a small delay for smooth transition
    setTimeout(() => {
      if (overlay) overlay.classList.remove('active');
    }, 150);
  }
}

// Enhanced loading progress update
function updateLoadingProgress(percent) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    const progressElement = overlay.querySelector('.loading-progress');
    if (progressElement) {
      const fillElement = progressElement.querySelector('.progress-fill');
      const textElement = progressElement.querySelector('.progress-text');
      if (fillElement) fillElement.style.width = `${percent}%`;
      if (textElement) textElement.textContent = `${Math.round(percent)}%`;
    }
  }
}

// Button loading state management
window.setButtonLoading = function setButtonLoading(button, loading, originalText = '') {
  if (!button) return;
  
  if (loading) {
    // Save original text if not already saved
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.innerHTML;
    }
    
    // Show loading state
    button.disabled = true;
    button.innerHTML = `
      <i class="fas fa-spinner fa-spin"></i>
      ${originalText || 'Loading...'}
    `;
    button.classList.add('loading');
  } else {
    // Restore original state
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || originalText || button.innerHTML;
    button.classList.remove('loading');
    delete button.dataset.originalText;
  }
}

// ========== FORM VALIDATION FUNCTIONS ==========

// Field validation with visual feedback
function validateField(field, validator, errorMessage, successMessage = '') {
  if (!field) return false;
  
  const value = field.value.trim();
  const isValid = validator(value);
  const errorElement = field.parentNode.querySelector('.error-message');
  const successElement = field.parentNode.querySelector('.success-message');
  
  // Clear previous messages
  if (errorElement) errorElement.textContent = '';
  if (successElement) successElement.textContent = '';
  
  if (isValid) {
    field.classList.remove('invalid');
    field.classList.add('valid');
    if (successElement && successMessage) {
      successElement.textContent = successMessage;
    }
    return true;
  } else {
    field.classList.remove('valid');
    field.classList.add('invalid');
    if (errorElement) {
      errorElement.textContent = errorMessage;
    }
    return false;
  }
}

// Form validation with multiple field validations
function validateForm(formElement, validations) {
  if (!formElement || !validations) return false;
  
  let isFormValid = true;
  
  validations.forEach(({ fieldSelector, validator, errorMessage, successMessage }) => {
    const field = formElement.querySelector(fieldSelector);
    if (field) {
      const isFieldValid = validateField(field, validator, errorMessage, successMessage);
      if (!isFieldValid) isFormValid = false;
    }
  });
  
  return isFormValid;
}

// ========== DATA FETCHING FUNCTIONS ==========

// Enhanced data fetching with retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Default fetch options
const DEFAULT_FETCH_OPTIONS = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'same-origin'
};

// Global error handler for fetch operations
window.handleFetchError = function handleFetchError(error, operation) {
    console.error(`Error during ${operation}:`, error);
    
    // Check if we're running via file:// protocol (common issue in local development)
    if (window.location.protocol === 'file:') {
        showToast('Please access this page through a web server (http://localhost:3000) rather than opening the file directly.', 'error', 8000);
        return;
    }
    
    showToast(`Failed to ${operation}. Please check your connection and try again.`, 'error');
};

// Enhanced fetchData function with environment awareness
window.fetchData = async function fetchData(endpoint, options = {}, retries = MAX_RETRIES, backoff = RETRY_DELAY) {
    try {
        // Handle different endpoint formats correctly
        let url;
        
        // Determine base URL based on environment
        // Fix for file:// protocol access - check if we're running via file protocol
        const isFileProtocol = window.location.protocol === 'file:';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isProduction = !isFileProtocol && !isLocalhost;
        
        // Always use localhost:3000 for API calls in development
        const baseURL = 'http://localhost:3000';
        
        if (endpoint.startsWith('http')) {
            // Full URL - use as is
            url = endpoint;
        } else if (endpoint.startsWith('/api/')) {
            // Absolute API endpoint
            url = `${baseURL}${endpoint}`;
        } else {
            // Relative endpoint
            url = `${baseURL}/api/${endpoint}`;
        }
        
        // Add cache-busting parameter for GET requests
        if (!options.method || options.method.toLowerCase() === 'get') {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}_t=${Date.now()}`;
        }
        
        console.log('Making fetch request to:', url);
        console.log('Fetch options:', options);
        
        const response = await fetch(url, {
            ...DEFAULT_FETCH_OPTIONS,
            ...options
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error text:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        if (retries > 0) {
            console.warn(`Fetch failed, retrying in ${backoff}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchData(endpoint, options, retries - 1, backoff * 2);
        }
        
        handleFetchError(error, `fetch data from ${endpoint}`);
        throw error;
    }
}

// ========== ERROR HANDLING FUNCTIONS ==========

// Wrapper for operations with error handling
function withErrorHandling(operation, errorMessage = 'Operation failed') {
  return async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      showToast(`${errorMessage}: ${error.message}`, 'error', 5000);
      throw error;
    }
  };
}

// ========== CONFIRMATION DIALOG FUNCTIONS ==========

// Enhanced confirmation dialog with better UX
function confirmAction(message, details = '') {
  return new Promise((resolve) => {
    // Create confirmation dialog
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.innerHTML = `
      <div class="confirmation-backdrop"></div>
      <div class="confirmation-modal" role="dialog" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <div class="confirmation-header">
          <h3 id="confirm-title">Confirm Action</h3>
          <button class="confirmation-close" onclick="this.closest('.confirmation-dialog').remove()" aria-label="Close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="confirmation-body">
          <p id="confirm-message">${message}</p>
          ${details ? `<div class="confirmation-details">${details}</div>` : ''}
        </div>
        <div class="confirmation-footer">
          <button class="btn btn-secondary" onclick="this.closest('.confirmation-dialog').remove()">Cancel</button>
          <button class="btn btn-danger" id="confirm-yes">Confirm</button>
        </div>
      </div>
    `;
    
    // Add to document
    document.body.appendChild(dialog);
    
    // Focus on confirm button
    const confirmBtn = dialog.querySelector('#confirm-yes');
    confirmBtn.focus();
    
    // Handle confirmation
    confirmBtn.addEventListener('click', () => {
      dialog.remove();
      resolve(true);
    });
    
    // Handle cancel/close
    const cancelBtn = dialog.querySelector('.btn-secondary');
    const closeBtn = dialog.querySelector('.confirmation-close');
    
    const cancelHandler = () => {
      dialog.remove();
      resolve(false);
    };
    
    cancelBtn.addEventListener('click', cancelHandler);
    closeBtn.addEventListener('click', cancelHandler);
    
    // Handle ESC key
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        cancelHandler();
        document.removeEventListener('keydown', keyHandler);
      }
    };
    
    document.addEventListener('keydown', keyHandler);
  });
}

// ========== DATE & TIME FORMATTING FUNCTIONS ==========

// Helper function to format date (YYYY-MM-DD to DD/MM/YYYY)
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    // If not a valid date, try to parse it as DD-MM-YYYY
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      return `${day}/${month}/${year}`;
    }
    return dateString;
  }
  return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
}

// Helper function to format time
function formatTime(timeString) {
  if (!timeString) return '';
  // Convert time format like "11.15am-12.45pm" to "11:15 AM - 12:45 PM"
  return timeString.replace(/\./g, ':').replace(/am/g, ' AM').replace(/pm/g, ' PM');
}

// ========== NAVIGATION FUNCTIONS ==========

// Logout function with confirmation
window.logout = function logout() {
  if (confirm('Are you sure you want to logout?')) {
    window.location.href = '/admin-features/dashboard/dashboard.html';
  }
}

// ========== CURRENT TIME FUNCTIONS ==========

// Core functions
function getCurrentDateTime() {
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
}

// Update current date/time display
function updateCurrentDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  };
  const dateTimeElement = document.getElementById('currentDateTime');
  if (dateTimeElement) {
    dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
  }
}

// ========== CSV UTILITY FUNCTIONS ==========

// Enhanced CSV parser with better error handling and data validation
window.parseCSV = async function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }
        
        // Parse headers
        const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"(.*)"$/, '$1'));
        
        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim() === '') continue;
          
          // Handle quoted values that may contain commas
          const values = parseCSVLine(line);
          
          // Create object with headers as keys
          const entry = {};
          headers.forEach((header, index) => {
            entry[header] = values[index] ? values[index].trim().replace(/^"(.*)"$/, '$1') : '';
          });
          
          data.push(entry);
        }
        
        resolve({ headers, data });
      } catch (error) {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// Utility function to parse a CSV line properly handling quoted values
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      // Check for escaped quotes (double quotes)
      if (i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 2; // Skip both quotes
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
      i++;
      continue;
    } else {
      // Regular character
      current += char;
      i++;
    }
  }
  
  // Add the last value
  values.push(current);
  
  return values;
}

// Enhanced CSV generator with better formatting
window.generateCSV = function generateCSV(data, headers = null) {
  if (!data || data.length === 0) {
    return '';
  }
  
  // Use provided headers or extract from first data object
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create header row
  let csv = csvHeaders.map(header => {
    // Escape headers that contain commas or quotes
    if (typeof header === 'string' && (header.includes(',') || header.includes('"'))) {
      return `"${header.replace(/"/g, '""')}"`;
    }
    return header;
  }).join(',') + '\n';
  
  // Add data rows
  data.forEach(row => {
    const values = csvHeaders.map(header => {
      const value = row[header];
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        return '';
      }
      
      // Convert to string if not already
      const stringValue = String(value);
      
      // Escape values that contain commas, quotes, or newlines
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    });
    
    csv += values.join(',') + '\n';
  });
  
  return csv;
};

// ========== END CSV UTILITY FUNCTIONS ==========
