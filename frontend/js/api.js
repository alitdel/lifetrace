/**
 * LifeTrace Global API Client & Notification System
 * Automatically detects whether served via HTTP/S server (production cloud or local)
 * or opened directly from disk via file:// protocol.
 */

const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
const API_BASE = isFileProtocol ? 'http://localhost:5000/api' : '/api';
const SERVER_HOST = isFileProtocol ? 'http://localhost:5000' : '';

class ApiClient {
  /**
   * Resolve URL for media/uploads
   */
  resolveUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    if (path.startsWith('/')) {
      return `${SERVER_HOST}${path}`;
    }
    return `${SERVER_HOST}/${path}`;
  }

  /**
   * Request helper with session credential handling
   */
  async request(endpoint, options = {}) {
    let url = endpoint;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const dummyBase = isFileProtocol
        ? 'http://localhost:5000'
        : (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
          ? window.location.origin
          : 'http://localhost');
      const basePath = new URL(API_BASE, dummyBase).pathname.replace(/\/$/, '');
      const endpointPath = endpoint.split('?')[0];
      const normalizedEndpoint = (endpointPath === basePath || endpointPath.startsWith(`${basePath}/`))
        ? endpoint.slice(basePath.length)
        : endpoint;
      url = `${API_BASE}${normalizedEndpoint.startsWith('/') ? normalizedEndpoint : '/' + normalizedEndpoint}`;
    }

    const config = {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        const targetHost = SERVER_HOST || (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'server');
        console.error(`[API Connection Error] LifeTrace backend server at ${targetHost} is not reachable.`);
        const customErr = new Error(`Cannot connect to LifeTrace server at ${targetHost}. Please ensure the backend server is running.`);
        customErr.status = 0;
        throw customErr;
      }
      console.error(`[API Error] ${endpoint}:`, err.message);
      throw err;
    }
  }

  get(endpoint, params = {}) {
    const isAbsolute = endpoint.startsWith('http://') || endpoint.startsWith('https://');
    let urlStr = isAbsolute ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const dummyBase = isFileProtocol
      ? 'http://localhost:5000'
      : (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
        ? window.location.origin
        : 'http://localhost');
    const parsed = new URL(urlStr, dummyBase);

    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        parsed.searchParams.append(k, params[k]);
      }
    });

    const finalUrl = isAbsolute
      ? parsed.toString()
      : `${parsed.pathname}${parsed.search}`;

    return this.request(finalUrl, { method: 'GET' });
  }

  post(endpoint, body = {}) {
    return this.request(endpoint, { method: 'POST', body });
  }

  put(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set multipart boundary
    });
  }

  /**
   * UI Toast alerts
   */
  toast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
      </div>
      <button style="background:none;border:none;color:white;cursor:pointer;font-size:1.1rem;margin-left:12px;" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }
}

window.api = new ApiClient();
