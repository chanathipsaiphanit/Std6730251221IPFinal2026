const express = require('express');
const cors = require('cors');
const { kMeans1D } = require('./kmeans');
const { BRIDGE } = require('./dbconfig');

const app = express();
app.use(cors());
app.use(express.json());

const VALID_USER = { username: 'admin', password: 'password123' };
const TOKEN = 'mock-jwt-token';

// ---------------- Database (via PHP bridge on cloud server) ----------------
async function db(action, payload = {}) {
  const res = await fetch(BRIDGE.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: BRIDGE.key, action, ...payload }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Database bridge returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || !data.ok) throw new Error(data.error || `Database bridge error (HTTP ${res.status})`);
  return data.data;
}

// wrap async handlers so DB errors return 500 instead of crashing
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------------- Auth ----------------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === VALID_USER.username && password === VALID_USER.password) {
    return res.status(200).json({ success: true, token: TOKEN });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (header !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized: please log in first' });
  }
  next();
}
app.use('/api/employees', requireAuth);

// ---------------- Phase 2: K-Means (before /:id routes) ----------------
app.get(
  '/api/employees/salary-clusters',
  wrap(async (req, res) => {
    const rows = await db('list');
    const salaries = rows.map((r) => Number(r.salary)).filter((s) => Number.isFinite(s));
    const clusters = kMeans1D(salaries, 3);
    res.status(200).json({ success: true, clusters });
  })
);

// ---------------- Phase 1: CRUD ----------------
app.get(
  '/api/employees',
  wrap(async (req, res) => {
    const rows = await db('list');
    res.status(200).json(rows);
  })
);

app.post(
  '/api/employees',
  wrap(async (req, res) => {
    const { name, position, salary } = req.body || {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanPosition = typeof position === 'string' ? position.trim() : '';
    const salaryStr = salary === undefined || salary === null ? '' : String(salary).trim();

    if (!cleanName || !cleanPosition || !salaryStr) {
      return res
        .status(400)
        .json({ success: false, message: 'name, position and salary are required' });
    }
    const salaryNum = Number(salaryStr);
    if (!Number.isFinite(salaryNum) || salaryNum < 0) {
      return res
        .status(400)
        .json({ success: false, message: 'salary must be a valid non-negative number' });
    }

    const created = await db('add', { name: cleanName, position: cleanPosition, salary: salaryNum });
    res.status(201).json(created);
  })
);

app.put(
  '/api/employees/:id/status',
  wrap(async (req, res) => {
    const updated = await db('toggle', { id: req.params.id });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.status(200).json(updated);
  })
);

app.delete(
  '/api/employees/:id',
  wrap(async (req, res) => {
    const deleted = await db('delete', { id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.status(200).json({ success: true, deleted });
  })
);

// ---------------- Fallbacks ----------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Database/server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`HR backend running on http://localhost:${PORT}`);
  try {
    const rows = await db('list');
    console.log(`Connected to cloud database: ${rows.length} employees in NinSom_Employee`);
  } catch (err) {
    console.error('WARNING: cannot reach cloud database ->', err.message);
  }
});
