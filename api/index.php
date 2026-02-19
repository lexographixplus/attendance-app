<?php

ini_set('display_errors', '1');
error_reporting(E_ALL);
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/error.log');

function trace(string $msg): void {
    file_put_contents(__DIR__ . '/error.log', date('[Y-m-d H:i:s] ') . $msg . "\n", FILE_APPEND);
}

trace("Request received: " . ($_GET['action'] ?? 'no action'));

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization'); // Added Authorization
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    require_once __DIR__ . '/config.php';
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Config load failed: ' . $e->getMessage()]);
    exit;
}

function respond($data = null, int $status = 200): void {
    http_response_code($status);
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $status = 400): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function normalize_email(string $email): string {
    return strtolower(trim($email));
}

function gen_id(string $prefix): string {
    try {
        return $prefix . '_' . bin2hex(random_bytes(8));
    } catch (Throwable $e) {
        return $prefix . '_' . uniqid();
    }
}

function now_iso(): string {
    return gmdate('c');
}

function request_data(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function get_bearer_token(): ?string {
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }
    if (!empty($headers)) {
        if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

function authenticate(PDO $pdo): array {
    $token = get_bearer_token();
    if (!$token) fail('Unauthorized: Missing token.', 401);

    $stmt = $pdo->prepare("SELECT * FROM users WHERE api_token = ?");
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    if (!$user) fail('Unauthorized: Invalid token.', 401);
    return $user;
}

function pdo(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function ensure_schema(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(190) NOT NULL,
            email VARCHAR(190) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('super_admin', 'admin', 'sub_admin') NOT NULL,
            workspace_id VARCHAR(64) NOT NULL,
            parent_admin_id VARCHAR(64) NULL,
            api_token VARCHAR(64) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_users_workspace (workspace_id),
            INDEX idx_users_role (role),
            INDEX idx_users_token (api_token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    
    // Auto-migration: Check for api_token column in users table
    try {
        $pdo->query("SELECT api_token FROM users LIMIT 1");
    } catch (Exception $e) {
        // Only alter if table exists but column missing
        try {
            $pdo->exec("ALTER TABLE users ADD COLUMN api_token VARCHAR(64) NULL AFTER parent_admin_id");
            $pdo->exec("CREATE INDEX idx_users_token ON users(api_token)");
        } catch (Exception $ex) {
             // Ignore error if column exists or table issues (failsafe)
        }
    }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS trainings (
            id VARCHAR(64) PRIMARY KEY,
            workspace_id VARCHAR(64) NOT NULL,
            admin_id VARCHAR(64) NOT NULL,
            title VARCHAR(255) NOT NULL,
            type ENUM('in_person', 'virtual') NOT NULL,
            location TEXT NOT NULL,
            dates_json TEXT NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            description TEXT NOT NULL,
            resources_link TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_trainings_workspace (workspace_id),
            INDEX idx_trainings_admin (admin_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS trainees (
            id VARCHAR(64) PRIMARY KEY,
            workspace_id VARCHAR(64) NOT NULL,
            training_id VARCHAR(64) NOT NULL,
            name VARCHAR(190) NOT NULL,
            email VARCHAR(190) NOT NULL,
            phone VARCHAR(64) NULL,
            unique_code VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_trainee (workspace_id, training_id, email),
            INDEX idx_trainees_workspace (workspace_id),
            INDEX idx_trainees_training (training_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS attendance (
            id VARCHAR(64) PRIMARY KEY,
            workspace_id VARCHAR(64) NOT NULL,
            training_id VARCHAR(64) NOT NULL,
            trainee_id VARCHAR(64) NOT NULL,
            timestamp_iso VARCHAR(64) NOT NULL,
            session_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_attendance (workspace_id, training_id, trainee_id, session_date),
            INDEX idx_att_workspace (workspace_id),
            INDEX idx_att_training (training_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
}

function enforce_single_super_admin(PDO $pdo): void {
    $rows = $pdo->query("SELECT id FROM users WHERE role='super_admin' ORDER BY created_at ASC")->fetchAll();
    if (count($rows) <= 1) {
        return;
    }

    $primaryId = $rows[0]['id'];
    $stmt = $pdo->prepare("UPDATE users SET role='admin' WHERE role='super_admin' AND id <> ?");
    $stmt->execute([$primaryId]);
}

function map_user(array $row): array {
    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'passwordHash' => '',
        'role' => $row['role'],
        'workspaceId' => $row['workspace_id'],
        'parentAdminId' => $row['parent_admin_id'],
    ];
}

function map_training(array $row): array {
    $dates = json_decode($row['dates_json'], true);
    if (!is_array($dates)) {
        $dates = [];
    }

    return [
        'id' => $row['id'],
        'workspaceId' => $row['workspace_id'],
        'adminId' => $row['admin_id'],
        'title' => $row['title'],
        'type' => $row['type'],
        'location' => $row['location'],
        'dates' => $dates,
        'startDate' => $row['start_date'],
        'endDate' => $row['end_date'],
        'description' => $row['description'],
        'resourcesLink' => $row['resources_link'],
    ];
}

function map_trainee(array $row): array {
    return [
        'id' => $row['id'],
        'trainingId' => $row['training_id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'phone' => $row['phone'],
        'uniqueCode' => $row['unique_code'],
    ];
}

function map_attendance(array $row): array {
    return [
        'id' => $row['id'],
        'trainingId' => $row['training_id'],
        'traineeId' => $row['trainee_id'],
        'timestamp' => $row['timestamp_iso'],
        'sessionDate' => $row['session_date'],
    ];
}

function fetch_user(PDO $pdo, string $id): ?array {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

try {
    trace("Connecting to PDO...");
    $pdo = pdo();
    $action = $_GET['action'] ?? '';
    trace("Action: $action");

    if ($action === 'init') {
        trace("Ensuring schema...");
        ensure_schema($pdo);
        trace("Enforcing super admin...");
        enforce_single_super_admin($pdo);
        respond(['ok' => true]);
    }

    ensure_schema($pdo);
    enforce_single_super_admin($pdo);

    if ($action === 'signup') {
        $input = request_data();
        $name = trim((string)($input['name'] ?? ''));
        $email = normalize_email((string)($input['email'] ?? ''));
        $password = (string)($input['password'] ?? '');

        if ($name === '' || $email === '' || trim($password) === '') {
            fail('Name, email, and password are required.');
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            fail('An account with this email already exists.');
        }

        $superCount = (int)$pdo->query("SELECT COUNT(*) AS c FROM users WHERE role='super_admin'")->fetch()['c'];
        $role = $superCount === 0 ? 'super_admin' : 'admin';

        $userId = gen_id('u');
        $workspaceId = gen_id('ws');
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $token = bin2hex(random_bytes(32));

        $stmt = $pdo->prepare("
            INSERT INTO users (id, name, email, password_hash, role, workspace_id, parent_admin_id, api_token)
            VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
        ");
        $stmt->execute([$userId, $name, $email, $hash, $role, $workspaceId, $token]);

        $created = fetch_user($pdo, $userId);
        $mapped = map_user($created);
        $mapped['apiToken'] = $token;
        respond($mapped);
    }

    if ($action === 'login') {
        $input = request_data();
        $email = normalize_email((string)($input['email'] ?? ''));
        $password = (string)($input['password'] ?? '');

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            fail('Invalid email or password.', 401);
        }

        $token = bin2hex(random_bytes(32));
        $stmt = $pdo->prepare("UPDATE users SET api_token = ? WHERE id = ?");
        $stmt->execute([$token, $user['id']]);

        $mapped = map_user($user);
        $mapped['apiToken'] = $token;
        respond($mapped);
    }

    if ($action === 'user_get') {
        $user = authenticate($pdo);
        $id = trim((string)($_GET['id'] ?? ''));
        if ($id === '') fail('id is required.');
        
        // Users can see themselves. Admins can see users in their workspace?
        // For simplicity: if you are authenticated, you can fetch user by ID if you have rights.
        // Actually, user_get is mostly used for "me" check.
        
        $target = fetch_user($pdo, $id);
        if (!$target) fail('User not found.', 404);

        // Access check
        if ($user['role'] === 'super_admin') {
            // OK
        } elseif ($user['id'] === $target['id']) {
            // OK (Self)
        } elseif ($user['workspace_id'] === $target['workspace_id']) {
            // Same workspace members can see each other?
            // Yes, admins need to see sub_admins.
        } else {
             fail('Access denied.', 403);
        }

        respond(map_user($target));
    }

    if ($action === 'users') {
        $user = authenticate($pdo);
        $workspaceId = trim((string)($_GET['workspaceId'] ?? ''));
        
        if ($user['role'] === 'super_admin') {
             // Super admin can see all users or filter by workspace
             if ($workspaceId !== '') {
                 $stmt = $pdo->prepare("SELECT * FROM users WHERE workspace_id = ? ORDER BY created_at ASC");
                 $stmt->execute([$workspaceId]);
                 $rows = $stmt->fetchAll();
             } else {
                 $rows = $pdo->query("SELECT * FROM users ORDER BY created_at ASC")->fetchAll();
             }
        } else {
             // Regular admins can only see their own workspace users
             if ($workspaceId !== '' && $workspaceId !== $user['workspace_id']) {
                 fail('Access denied: Workspace mismatch.', 403);
             }
             $stmt = $pdo->prepare("SELECT * FROM users WHERE workspace_id = ? ORDER BY created_at ASC");
             $stmt->execute([$user['workspace_id']]);
             $rows = $stmt->fetchAll();
        }

        respond(array_map('map_user', $rows));
    }

    if ($action === 'users_create') {
        $actor = authenticate($pdo);
        $input = request_data();
        $name = trim((string)($input['name'] ?? ''));
        $email = normalize_email((string)($input['email'] ?? ''));
        $password = (string)($input['password'] ?? '');

        if (!in_array($actor['role'], ['super_admin', 'admin'], true)) fail('Not allowed.', 403);

        if ($name === '' || $email === '' || trim($password) === '') {
            fail('Name, email, and password are required.');
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            fail('A user with this email already exists.');
        }

        $role = $actor['role'] === 'super_admin' ? 'admin' : 'sub_admin';
        $id = gen_id('u');
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $token = bin2hex(random_bytes(32));

        $stmt = $pdo->prepare("
            INSERT INTO users (id, name, email, password_hash, role, workspace_id, parent_admin_id, api_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$id, $name, $email, $hash, $role, $actor['workspace_id'], $actor['id'], $token]);

        $created = fetch_user($pdo, $id);
        respond(map_user($created));
    }

    if ($action === 'users_delete') {
        $actor = authenticate($pdo);
        $input = request_data();
        $workspaceId = (string)($input['workspaceId'] ?? '');
        $id = (string)($input['id'] ?? '');

        $target = fetch_user($pdo, $id);
        if (!$target) fail('User not found.', 404);

        if ($target['role'] === 'super_admin') {
            fail('The super admin account cannot be deleted.', 403);
        }
        
        // Super admin can delete anyone (except self/other super admins check above)
        if ($actor['role'] === 'super_admin') {
            // workspace check not strictly needed for super admin if they want to manage globally, 
            // but if passed, check it.
             if ($workspaceId !== '' && $target['workspace_id'] !== $workspaceId) {
                fail('Workspace mismatch.', 403);
             }
        } elseif ($actor['role'] === 'admin') {
             // Admin can only delete users in their workspace
             if ($target['workspace_id'] !== $actor['workspace_id']) {
                 fail('Access denied: Workspace mismatch.', 403);
             }
             // Admin can only delete sub_admins they created (or all sub_admins in their workspace?)
             // Original logic: $target['parent_admin_id'] === $actor['id']
             if ($target['role'] !== 'sub_admin') {
                 fail('Admins can only delete sub-admins.', 403);
             }
        } else {
            fail('Not allowed.', 403);
        }

        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        respond(['ok' => true]);
    }

    if ($action === 'users_promote') {
        $actor = authenticate($pdo);
        $input = request_data();
        $workspaceId = (string)($input['workspaceId'] ?? '');
        $id = (string)($input['id'] ?? '');
        $newRole = (string)($input['newRole'] ?? '');

        if ($newRole === 'super_admin') {
            fail('Only one super admin is allowed.');
        }
        if (!in_array($newRole, ['admin', 'sub_admin'], true)) {
            fail('Invalid role.');
        }

        $target = fetch_user($pdo, $id);
        if (!$target) fail('User not found.', 404);
        if ($actor['role'] !== 'super_admin') fail('Only super admin can promote.', 403);
        if ($target['role'] === 'super_admin') fail('Super admin role cannot be changed.', 403);
        if ($workspaceId !== '' && $target['workspace_id'] !== $workspaceId) fail('Workspace mismatch.', 403);

        $stmt = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
        $stmt->execute([$newRole, $id]);
        respond(['ok' => true]);
    }

    if ($action === 'trainings') {
        $user = authenticate($pdo);
        $workspaceId = trim((string)($_GET['workspaceId'] ?? ''));
        $adminId = trim((string)($_GET['adminId'] ?? ''));
        
        if ($workspaceId === '') fail('workspaceId is required.');
        if ($user['role'] !== 'super_admin' && $user['workspace_id'] !== $workspaceId) {
             fail('Access denied.', 403);
        }

        if ($adminId !== '') {
            $stmt = $pdo->prepare("SELECT * FROM trainings WHERE workspace_id = ? AND admin_id = ? ORDER BY created_at DESC");
            $stmt->execute([$workspaceId, $adminId]);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM trainings WHERE workspace_id = ? ORDER BY created_at DESC");
            $stmt->execute([$workspaceId]);
        }

        $rows = $stmt->fetchAll();
        respond(array_map('map_training', $rows));
    }

    if ($action === 'trainings_create') {
        $user = authenticate($pdo);
        $input = request_data();
        $workspaceId = (string)($input['workspaceId'] ?? '');
        
        if ($user['role'] !== 'super_admin' && $user['workspace_id'] !== $workspaceId) {
             fail('Access denied.', 403);
        }

        $training = $input['training'] ?? null;
        if ($workspaceId === '' || !is_array($training)) fail('Invalid payload.');

        $dates = isset($training['dates']) && is_array($training['dates']) ? $training['dates'] : [];
        sort($dates);
        if (count($dates) === 0) fail('At least one training date is required.');

        $id = gen_id('t');
        $title = trim((string)($training['title'] ?? ''));
        $type = (string)($training['type'] ?? 'in_person');
        $location = trim((string)($training['location'] ?? ''));
        $description = trim((string)($training['description'] ?? ''));
        $resourcesLink = trim((string)($training['resourcesLink'] ?? ''));
        
        // Admin ID must be the creator, unless super admin assigns someone else?
        // For simplicity, force adminId to be the creator if not super admin.
        $assignedAdminId = (string)($training['adminId'] ?? '');
        if ($user['role'] !== 'super_admin' || $assignedAdminId === '') {
             $assignedAdminId = $user['id'];
        }

        $startDate = (string)($training['startDate'] ?? $dates[0]);
        $endDate = (string)($training['endDate'] ?? $dates[count($dates) - 1]);

        $stmt = $pdo->prepare("
            INSERT INTO trainings (id, workspace_id, admin_id, title, type, location, dates_json, start_date, end_date, description, resources_link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id,
            $workspaceId,
            $assignedAdminId,
            $title,
            $type,
            $location,
            json_encode(array_values($dates), JSON_UNESCAPED_UNICODE),
            $startDate,
            $endDate,
            $description,
            $resourcesLink !== '' ? $resourcesLink : null
        ]);

        $stmt = $pdo->prepare("SELECT * FROM trainings WHERE id = ?");
        $stmt->execute([$id]);
        respond(map_training($stmt->fetch()));
    }

    if ($action === 'trainings_update') {
        $user = authenticate($pdo);
        $input = request_data();
        $workspaceId = (string)($input['workspaceId'] ?? '');
        $id = (string)($input['id'] ?? '');
        
        if ($user['role'] !== 'super_admin' && $user['workspace_id'] !== $workspaceId) {
             fail('Access denied.', 403);
        }

        $data = $input['data'] ?? null;
        if ($workspaceId === '' || $id === '' || !is_array($data)) fail('Invalid payload.');

        $stmt = $pdo->prepare("SELECT * FROM trainings WHERE workspace_id = ? AND id = ?");
        $stmt->execute([$workspaceId, $id]);
        $current = $stmt->fetch();
        if (!$current) fail('Training not found.', 404);
        
        if ($user['role'] !== 'super_admin' && $current['admin_id'] !== $user['id']) {
            fail('You can only update your own trainings.', 403);
        }

        $currentMapped = map_training($current);
        $merged = array_merge($currentMapped, $data);
        $dates = isset($merged['dates']) && is_array($merged['dates']) ? $merged['dates'] : [];
        sort($dates);
        if (count($dates) === 0) fail('At least one training date is required.');

        $stmt = $pdo->prepare("
            UPDATE trainings
            SET admin_id = ?, title = ?, type = ?, location = ?, dates_json = ?, start_date = ?, end_date = ?, description = ?, resources_link = ?
            WHERE workspace_id = ? AND id = ?
        ");
        $stmt->execute([
            (string)$merged['adminId'],
            trim((string)$merged['title']),
            (string)$merged['type'],
            trim((string)$merged['location']),
            json_encode(array_values($dates), JSON_UNESCAPED_UNICODE),
            (string)$merged['startDate'],
            (string)$merged['endDate'],
            trim((string)$merged['description']),
            !empty($merged['resourcesLink']) ? (string)$merged['resourcesLink'] : null,
            $workspaceId,
            $id
        ]);

        respond(['ok' => true]);
    }

    if ($action === 'trainings_delete') {
        $user = authenticate($pdo);
        $input = request_data();
        $workspaceId = (string)($input['workspaceId'] ?? '');
        $id = (string)($input['id'] ?? '');

        if ($user['role'] !== 'super_admin' && $user['workspace_id'] !== $workspaceId) {
             fail('Access denied.', 403);
        }
        
        $stmt = $pdo->prepare("SELECT * FROM trainings WHERE workspace_id = ? AND id = ?");
        $stmt->execute([$workspaceId, $id]);
        $current = $stmt->fetch();
        if (!$current) fail('Training not found.', 404);

        if ($user['role'] !== 'super_admin' && $current['admin_id'] !== $user['id']) {
            fail('You can only delete your own trainings.', 403);
        }

        $stmt = $pdo->prepare("DELETE FROM attendance WHERE workspace_id = ? AND training_id = ?");
        $stmt->execute([$workspaceId, $id]);
        $stmt = $pdo->prepare("DELETE FROM trainees WHERE workspace_id = ? AND training_id = ?");
        $stmt->execute([$workspaceId, $id]);
        $stmt = $pdo->prepare("DELETE FROM trainings WHERE workspace_id = ? AND id = ?");
        $stmt->execute([$workspaceId, $id]);

        respond(['ok' => true]);
    }

    if ($action === 'training_get') {
        $workspaceId = trim((string)($_GET['workspaceId'] ?? ''));
        $id = trim((string)($_GET['id'] ?? ''));
        if ($workspaceId === '' || $id === '') fail('workspaceId and id are required.');

        $stmt = $pdo->prepare("SELECT * FROM trainings WHERE workspace_id = ? AND id = ?");
        $stmt->execute([$workspaceId, $id]);
        $row = $stmt->fetch();
        respond($row ? map_training($row) : null);
    }

    if ($action === 'trainees') {
        $user = authenticate($pdo);
        $workspaceId = trim((string)($_GET['workspaceId'] ?? ''));
        $trainingId = trim((string)($_GET['trainingId'] ?? ''));
        
        if ($user['role'] !== 'super_admin' && $user['workspace_id'] !== $workspaceId) {
             fail('Access denied.', 403);
        }
        
        if ($workspaceId === '' || $trainingId === '') fail('workspaceId and trainingId are required.');

        $stmt = $pdo->prepare("SELECT * FROM trainees WHERE workspace_id = ? AND training_id = ? ORDER BY created_at ASC");
        $stmt->execute([$workspaceId, $trainingId]);
        respond(array_map('map_trainee', $stmt->fetchAll()));
    }

    if ($action === 'trainees_add') {
        // Public endpoint
        $input = request_data();
        $workspaceId = (string)($input['workspaceId'] ?? '');
        $trainee = $input['trainee'] ?? null;
        if ($workspaceId === '' || !is_array($trainee)) fail('Invalid payload.');

        $trainingId = (string)($trainee['trainingId'] ?? '');
        $name = trim((string)($trainee['name'] ?? ''));
        $email = normalize_email((string)($trainee['email'] ?? ''));
        $phone = trim((string)($trainee['phone'] ?? ''));

        if ($trainingId === '' || $name === '' || $email === '') {
            fail('trainingId, name, and email are required.');
        }

        $check = $pdo->prepare("SELECT id FROM trainees WHERE workspace_id = ? AND training_id = ? AND LOWER(email) = LOWER(?)");
        $check->execute([$workspaceId, $trainingId, $email]);
        if ($check->fetch()) {
            fail('This email is already registered for this training.');
        }

        $id = gen_id('tr');
        $uniqueCode = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));

        $stmt = $pdo->prepare("
            INSERT INTO trainees (id, workspace_id, training_id, name, email, phone, unique_code)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$id, $workspaceId, $trainingId, $name, $email, $phone !== '' ? $phone : null, $uniqueCode]);

        $stmt = $pdo->prepare("SELECT * FROM trainees WHERE id = ?");
        $stmt->execute([$id]);
        respond(map_trainee($stmt->fetch()));
    }

    if ($action === 'trainees_remove') {
        $user = authenticate($pdo);
        $input = request_data();
        $workspaceId = (string)($input['workspaceId'] ?? '');
        $id = (string)($input['id'] ?? '');

        if ($user['role'] !== 'super_admin' && $user['workspace_id'] !== $workspaceId) {
             fail('Access denied.', 403);
        }

        // Optional: Check if user owns the training this trainee belongs to.
        // For now, workspace check is enough for admins.

        if ($workspaceId === '' || $id === '') fail('Invalid payload.');

        $stmt = $pdo->prepare("DELETE FROM attendance WHERE workspace_id = ? AND trainee_id = ?");
        $stmt->execute([$workspaceId, $id]);
        $stmt = $pdo->prepare("DELETE FROM trainees WHERE workspace_id = ? AND id = ?");
        $stmt->execute([$workspaceId, $id]);
        respond(['ok' => true]);
    }

    if ($action === 'attendance') {
        $user = authenticate($pdo);
        $workspaceId = trim((string)($_GET['workspaceId'] ?? ''));
        $trainingId = trim((string)($_GET['trainingId'] ?? ''));
        
        if ($user['role'] !== 'super_admin' && $user['workspace_id'] !== $workspaceId) {
             fail('Access denied.', 403);
        }

        if ($workspaceId === '' || $trainingId === '') fail('workspaceId and trainingId are required.');

        $stmt = $pdo->prepare("SELECT * FROM attendance WHERE workspace_id = ? AND training_id = ? ORDER BY created_at ASC");
        $stmt->execute([$workspaceId, $trainingId]);
        respond(array_map('map_attendance', $stmt->fetchAll()));
    }

    if ($action === 'attendance_all') {
        $user = authenticate($pdo);
        $workspaceId = trim((string)($_GET['workspaceId'] ?? ''));
        
        if ($user['role'] !== 'super_admin' && $user['workspace_id'] !== $workspaceId) {
             fail('Access denied.', 403);
        }

        if ($workspaceId === '') fail('workspaceId is required.');

        $stmt = $pdo->prepare("SELECT * FROM attendance WHERE workspace_id = ? ORDER BY created_at ASC");
        $stmt->execute([$workspaceId]);
        respond(array_map('map_attendance', $stmt->fetchAll()));
    }

    if ($action === 'attendance_mark') {
        $input = request_data();
        $workspaceId = (string)($input['workspaceId'] ?? '');
        $trainingId = (string)($input['trainingId'] ?? '');
        $email = normalize_email((string)($input['email'] ?? ''));

        if ($workspaceId === '' || $trainingId === '' || $email === '') {
            fail('workspaceId, trainingId, and email are required.');
        }

        $stmt = $pdo->prepare("SELECT * FROM trainings WHERE workspace_id = ? AND id = ?");
        $stmt->execute([$workspaceId, $trainingId]);
        $training = $stmt->fetch();
        if (!$training) {
            respond(['success' => false, 'message' => 'Training not found']);
        }

        $dates = json_decode($training['dates_json'], true);
        if (!is_array($dates)) $dates = [];
        $today = gmdate('Y-m-d');

        if (!in_array($today, $dates, true)) {
            respond(['success' => false, 'message' => "No training session scheduled for today ({$today})."]);
        }

        $stmt = $pdo->prepare("SELECT * FROM trainees WHERE workspace_id = ? AND training_id = ? AND LOWER(email) = LOWER(?)");
        $stmt->execute([$workspaceId, $trainingId, $email]);
        $trainee = $stmt->fetch();
        if (!$trainee) {
            respond(['success' => false, 'message' => 'Email not found in the registration list for this training.']);
        }

        $stmt = $pdo->prepare("
            SELECT id FROM attendance
            WHERE workspace_id = ? AND training_id = ? AND trainee_id = ? AND session_date = ?
            LIMIT 1
        ");
        $stmt->execute([$workspaceId, $trainingId, $trainee['id'], $today]);
        if ($stmt->fetch()) {
            respond(['success' => false, 'message' => 'You are already checked in for today.', 'traineeName' => $trainee['name']]);
        }

        $id = gen_id('att');
        $stmt = $pdo->prepare("
            INSERT INTO attendance (id, workspace_id, training_id, trainee_id, timestamp_iso, session_date)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$id, $workspaceId, $trainingId, $trainee['id'], now_iso(), $today]);

        respond(['success' => true, 'message' => 'Check-in successful!', 'traineeName' => $trainee['name']]);
    }

    fail('Unknown action.', 400);
} catch (Throwable $e) {
    fail($e->getMessage(), 500);
}
