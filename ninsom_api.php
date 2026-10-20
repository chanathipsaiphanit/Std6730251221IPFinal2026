<?php
// Upload this file to the cloud server (via FileZilla / SFTP).
// It runs next to MySQL, so it connects with host "localhost".
// The Express backend calls this file to read/write the database.

header('Content-Type: application/json; charset=utf-8');

// ====== EDIT ON THE SERVER COPY ONLY (do not push the real password) ======
$DB_HOST = 'localhost';
$DB_USER = 'std6730251221';
$DB_PASS = 'YOUR_DB_PASSWORD';
$DB_NAME = 'ip_std6730251221';
$API_KEY = 'ninsom-ipfinal-2026-key'; // must match BRIDGE.key in backend/dbconfig.js
// ==========================================================================

// Table + column naming convention
$T = 'NinSom_Employee';
$C = array(
    'id'       => 'NinSom_ID_Employee',
    'name'     => 'NinSom_Name_Employee',
    'position' => 'NinSom_Position_Employee',
    'status'   => 'NinSom_Status_Employee',
    'salary'   => 'NinSom_Salary_Employee',
);

function out($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function row_out($r, $C) {
    return array(
        'id'       => (string)$r[$C['id']],
        'name'     => $r[$C['name']],
        'position' => $r[$C['position']],
        'status'   => $r[$C['status']],
        'salary'   => (float)$r[$C['salary']],
    );
}

function find_by_id($db, $T, $C, $id) {
    $st = $db->prepare("SELECT * FROM `$T` WHERE `{$C['id']}` = ?");
    $st->bind_param('i', $id);
    $st->execute();
    $r = $st->get_result()->fetch_assoc();
    return $r ? row_out($r, $C) : null;
}

$raw = file_get_contents('php://input');
$in = json_decode($raw, true);
if (!is_array($in)) $in = array();

if (!isset($in['key']) || $in['key'] !== $API_KEY) {
    out(403, array('ok' => false, 'error' => 'Forbidden'));
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $db = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
    $db->set_charset('utf8mb4');

    // Create table on first use
    $db->query("CREATE TABLE IF NOT EXISTS `$T` (
        `{$C['id']}` INT AUTO_INCREMENT PRIMARY KEY,
        `{$C['name']}` VARCHAR(255) NOT NULL,
        `{$C['position']}` VARCHAR(255) NOT NULL,
        `{$C['status']}` ENUM('Active','On Leave') NOT NULL DEFAULT 'Active',
        `{$C['salary']}` DECIMAL(12,2) NOT NULL
    ) CHARACTER SET utf8mb4");

    // Seed mock data if empty
    $cnt = (int)$db->query("SELECT COUNT(*) AS c FROM `$T`")->fetch_assoc()['c'];
    if ($cnt === 0) {
        $seed = array(
            array('John Doe', 'Software Engineer', 'Active', 45000),
            array('Jane Smith', 'HR Officer', 'Active', 18000),
            array('Somchai Jaidee', 'Accountant', 'On Leave', 22000),
            array('Anna Lee', 'Project Manager', 'Active', 85000),
            array('Mike Brown', 'Developer', 'Active', 48000),
            array('Suda Kaewmanee', 'CTO', 'Active', 92000),
            array('Peter Tan', 'Admin Staff', 'On Leave', 16000),
        );
        $st = $db->prepare("INSERT INTO `$T` (`{$C['name']}`,`{$C['position']}`,`{$C['status']}`,`{$C['salary']}`) VALUES (?,?,?,?)");
        foreach ($seed as $s) {
            $n = $s[0]; $p = $s[1]; $stt = $s[2]; $sal = $s[3];
            $st->bind_param('sssd', $n, $p, $stt, $sal);
            $st->execute();
        }
    }

    $action = isset($in['action']) ? $in['action'] : '';

    switch ($action) {
        case 'list':
            $res = $db->query("SELECT * FROM `$T` ORDER BY `{$C['id']}`");
            $rows = array();
            while ($r = $res->fetch_assoc()) $rows[] = row_out($r, $C);
            out(200, array('ok' => true, 'data' => $rows));

        case 'add':
            $n = (string)$in['name'];
            $p = (string)$in['position'];
            $sal = (float)$in['salary'];
            $st = $db->prepare("INSERT INTO `$T` (`{$C['name']}`,`{$C['position']}`,`{$C['status']}`,`{$C['salary']}`) VALUES (?,?,'Active',?)");
            $st->bind_param('ssd', $n, $p, $sal);
            $st->execute();
            out(200, array('ok' => true, 'data' => find_by_id($db, $T, $C, $db->insert_id)));

        case 'toggle':
            $id = (int)$in['id'];
            $st = $db->prepare("UPDATE `$T` SET `{$C['status']}` = IF(`{$C['status']}`='Active','On Leave','Active') WHERE `{$C['id']}` = ?");
            $st->bind_param('i', $id);
            $st->execute();
            out(200, array('ok' => true, 'data' => find_by_id($db, $T, $C, $id)));

        case 'delete':
            $id = (int)$in['id'];
            $existing = find_by_id($db, $T, $C, $id);
            if ($existing) {
                $st = $db->prepare("DELETE FROM `$T` WHERE `{$C['id']}` = ?");
                $st->bind_param('i', $id);
                $st->execute();
            }
            out(200, array('ok' => true, 'data' => $existing));

        default:
            out(400, array('ok' => false, 'error' => 'Unknown action'));
    }
} catch (Throwable $e) {
    out(500, array('ok' => false, 'error' => $e->getMessage()));
}
