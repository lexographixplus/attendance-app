<?php
ini_set('display_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/api/config.php';

echo "Connecting to DB...\n";

try {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    echo "Connected successfully.\n";

    echo "Attempting to create users table...\n";
    $sql = "
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
    ";
    
    try {
        $pdo->exec($sql);
        echo "users table created/exists (Standard Create).\n";
    } catch (PDOException $e) {
        echo "Standard CREATE TABLE FAILED: " . $e->getMessage() . "\n";
    }

    echo "Checking for api_token column...\n";
    try {
        $stmt = $pdo->query("SELECT api_token FROM users LIMIT 1");
        echo "api_token column FOUND.\n";
    } catch (PDOException $e) {
        echo "api_token column MISSING or query failed: " . $e->getMessage() . "\n";
        
        echo "Attempting ALTER TABLE to add api_token...\n";
        try {
            $pdo->exec("ALTER TABLE users ADD COLUMN api_token VARCHAR(64) NULL AFTER parent_admin_id");
            $pdo->exec("CREATE INDEX idx_users_token ON users(api_token)");
            echo "ALTER TABLE SUCCESS.\n";
        } catch (PDOException $altE) {
            echo "ALTER TABLE FAILED: " . $altE->getMessage() . "\n";
        }
    }

} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
