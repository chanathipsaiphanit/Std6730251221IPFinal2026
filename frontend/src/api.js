import { API_URL } from './config';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (e) {
    throw new Error(`Cannot connect to server (${API_URL}). Is the backend running?`);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const err = new Error((data && data.message) || `Request failed (status ${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getEmployees: () => request('/api/employees'),
  addEmployee: (employee) =>
    request('/api/employees', { method: 'POST', body: JSON.stringify(employee) }),
  updateEmployee: (id, employee) =>
    request(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(employee) }),
  toggleStatus: (id) => request(`/api/employees/${id}/status`, { method: 'PUT' }),
  deleteEmployee: (id) => request(`/api/employees/${id}`, { method: 'DELETE' }),
  getSalaryClusters: () => request('/api/employees/salary-clusters'),
};
