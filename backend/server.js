// HR Manager & Salary Analytics API (Express.js + MySQL on cloud server)
// Reads DB settings from .env: PORT, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
try {
  require('dotenv').config();
} catch (e) {
  /* dotenv not installed: use real environment variables */
}

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { kMeans1D } = require('./kmeans');

const app = express();
app.use(cors());
app.use(express.json());

const VALID_USER = { username: 'admin', password: 'password123' };
const TOKEN = 'mock-jwt-token';

// ---------------- Database ----------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Table + column naming convention
const TABLE = 'ChanathipSai_Employee';
const COL = {
  id: 'ChanathipSai_ID_Employee',
  name: 'ChanathipSai_Name_Employee',
  position: 'ChanathipSai_Position_Employee',
  status: 'ChanathipSai_Status_Employee',
  salary: 'ChanathipSai_Salary_Employee',
};
const q = (n) => '`' + n + '`';
const T = q(TABLE);

function toEmployee(row) {
  return {
    id: String(row[COL.id]),
    name: row[COL.name],
    position: row[COL.position],
    status: row[COL.status],
    salary: Number(row[COL.salary]),
  };
}

const SEED = [
  ['John Doe', 'Software Engineer', 'Active', 45000],
  ['Jane Smith', 'HR Officer', 'Active', 18000],
  ['Somchai Jaidee', 'Accountant', 'On Leave', 22000],
  ['Anna Lee', 'Project Manager', 'Active', 85000],
  ['Mike Brown', 'Developer', 'Active', 48000],
  ['Suda Kaewmanee', 'CTO', 'Active', 92000],
  ['Peter Tan', 'Admin Staff', 'On Leave', 16000],
];

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${T} (
      ${q(COL.id)} INT AUTO_INCREMENT PRIMARY KEY,
      ${q(COL.name)} VARCHAR(255) NOT NULL,
      ${q(COL.position)} VARCHAR(255) NOT NULL,
      ${q(COL.status)} ENUM('Active','On Leave') NOT NULL DEFAULT 'Active',
      ${q(COL.salary)} DECIMAL(12,2) NOT NULL
    ) CHARACTER SET utf8mb4
  `);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${T}`);
  if (Number(total) === 0) {
    await pool.query(
      `INSERT INTO ${T} (${q(COL.name)}, ${q(COL.position)}, ${q(COL.status)}, ${q(COL.salary)}) VALUES ?`,
      [SEED]
    );
    console.log(`Seeded ${SEED.length} mock employees`);
  }
}

async function findById(id) {
  const [rows] = await pool.query(`SELECT * FROM ${T} WHERE ${q(COL.id)} = ?`, [id]);
  return rows[0] ? toEmployee(rows[0]) : null;
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/', (req, res) => res.json({ success: true, message: 'HR Manager API is running' }));

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

// ---------------- Phase 2: K-Means (declared before /:id routes) ----------------
app.get(
  '/api/employees/salary-clusters',
  wrap(async (req, res) => {
    const [rows] = await pool.query(`SELECT ${q(COL.salary)} AS salary FROM ${T}`);
    const salaries = rows.map((r) => Number(r.salary)).filter((s) => Number.isFinite(s));
    res.status(200).json({ success: true, clusters: kMeans1D(salaries, 3) });
  })
);

// ---------------- Phase 1: CRUD ----------------
app.get(
  '/api/employees',
  wrap(async (req, res) => {
    const [rows] = await pool.query(`SELECT * FROM ${T} ORDER BY ${q(COL.id)}`);
    res.status(200).json(rows.map(toEmployee));
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

    const [result] = await pool.query(
      `INSERT INTO ${T} (${q(COL.name)}, ${q(COL.position)}, ${q(COL.status)}, ${q(COL.salary)}) VALUES (?, ?, 'Active', ?)`,
      [cleanName, cleanPosition, salaryNum]
    );
    res.status(201).json(await findById(result.insertId));
  })
);

// Validate name / position / salary (used by add + edit)
function validateEmployee(body) {
  const { name, position, salary } = body || {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanPosition = typeof position === 'string' ? position.trim() : '';
  const salaryStr = salary === undefined || salary === null ? '' : String(salary).trim();
  if (!cleanName || !cleanPosition || !salaryStr) {
    return { error: 'name, position and salary are required' };
  }
  const salaryNum = Number(salaryStr);
  if (!Number.isFinite(salaryNum) || salaryNum < 0) {
    return { error: 'salary must be a valid non-negative number' };
  }
  return { value: { name: cleanName, position: cleanPosition, salary: salaryNum } };
}

// Edit employee details
app.put(
  '/api/employees/:id',
  wrap(async (req, res) => {
    const existing = await findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    const { error, value } = validateEmployee(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    await pool.query(
      `UPDATE ${T} SET ${q(COL.name)} = ?, ${q(COL.position)} = ?, ${q(COL.salary)} = ? WHERE ${q(COL.id)} = ?`,
      [value.name, value.position, value.salary, req.params.id]
    );
    res.status(200).json(await findById(req.params.id));
  })
);

app.put(
  '/api/employees/:id/status',
  wrap(async (req, res) => {
    const [result] = await pool.query(
      `UPDATE ${T} SET ${q(COL.status)} = IF(${q(COL.status)} = 'Active', 'On Leave', 'Active') WHERE ${q(COL.id)} = ?`,
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.status(200).json(await findById(req.params.id));
  })
);

app.delete(
  '/api/employees/:id',
  wrap(async (req, res) => {
    const existing = await findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    await pool.query(`DELETE FROM ${T} WHERE ${q(COL.id)} = ?`, [req.params.id]);
    res.status(200).json({ success: true, deleted: existing });
  })
);

// ---------------- Fallbacks ----------------
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Database/server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`HR backend running on port ${PORT}`);
  try {
    await initDb();
    console.log(`Connected to MySQL ${process.env.DB_HOST}/${process.env.DB_NAME}, table ${TABLE} ready`);
  } catch (err) {
    console.error('WARNING: database not reachable ->', err.message);
  }
});
