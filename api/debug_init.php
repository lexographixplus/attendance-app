<?php
ini_set('display_errors', '1');
error_reporting(E_ALL);
require_once __DIR__ . '/config.php';

echo "Start init debug...
";

try {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    echo "Connected.
";
    
    echo "Creating users table...
";
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
    echo "Users table OK.
";

    echo "Checking migration...
";
    try {
        $pdo->query("SELECT api_token FROM users LIMIT 1");
        echo "Token column OK.
";
    } catch (Exception $e) {
        echo "Token column missing, altering...
";
        $pdo->exec("ALTER TABLE users ADD COLUMN api_token VARCHAR(64) NULL AFTER parent_admin_id");
        $pdo->exec("CREATE INDEX idx_users_token ON users(api_token)");
        echo "Alter OK.
";
    }
    
    echo "Done.
";

} catch (Throwable $e) {
    echo "FATAL: " . $e->getMessage();
}
