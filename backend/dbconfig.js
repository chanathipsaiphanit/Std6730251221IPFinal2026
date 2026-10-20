// ===================== EDIT THIS FILE =====================
// The database lives on the cloud server (MySQL, accessed via phpMyAdmin).
// The server only allows web/SFTP access, so the backend talks to the
// database through server-php/ninsom_api.php uploaded to that server.
//
// Table: NinSom_Employee
// Columns: NinSom_ID_Employee, NinSom_Name_Employee, NinSom_Position_Employee,
//          NinSom_Status_Employee, NinSom_Salary_Employee
const BRIDGE = {
  url: process.env.BRIDGE_URL || 'http://nindam.sytes.net/YOUR_FOLDER/ninsom_api.php',
  key: process.env.BRIDGE_KEY || 'ninsom-ipfinal-2026-key', // must match $API_KEY in the PHP file
};
// ==========================================================

module.exports = { BRIDGE };
