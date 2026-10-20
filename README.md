# HR Manager & Salary Analytics System
Internet Programming Final Exam 2026

```
Std6xxxxxxIPFinal2026
├── backend   (Express.js API, MySQL on cloud server, 1D K-Means k=3)
└── frontend  (React Native / Expo app)
```

## 1. Run the backend
```bash
cd backend
npm install
npm start
```
Server: `http://localhost:3000`
Run K-Means unit test: `npm test`

Login: **admin / password123**

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/login | Returns `{ success: true, token: "mock-jwt-token" }` or 401 |
| GET | /api/employees | List all employees |
| POST | /api/employees | Add employee (`name`, `position`, `salary`) — 400 if any field is empty |
| PUT | /api/employees/:id | Edit name / position / salary — 400 if any field is empty |
| PUT | /api/employees/:id/status | Toggle Active ↔ On Leave |
| DELETE | /api/employees/:id | Delete employee |
| GET | /api/employees/salary-clusters | K-Means (k=3) salary tiers |

All `/api/employees*` routes require header `Authorization: Bearer mock-jwt-token` (otherwise 401).

## 2. Run the frontend
```bash
cd frontend
npm install
npx expo install --fix
npx expo start
```
- Press **w** for web, **a** for Android emulator, or scan the QR code with Expo Go.
- The API address is detected automatically (same IP as the Metro server).
  To set it manually:
  `EXPO_PUBLIC_API_URL=http://<your-ip>:3000 npx expo start`
