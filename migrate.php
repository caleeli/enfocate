<?php

if (file_exists(__DIR__ . '/.env')) {
    foreach (parse_ini_file(__DIR__ . '/.env') as $key=>$value) {
        $_ENV[$key] = $value;
    }
}

$connection = new PDO($_ENV['dns'], $_ENV['user'], $_ENV['password']);
$connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Create users table
$statement = $connection->prepare('CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    tasks TEXT NOT NULL,
    token VARCHAR(84) NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0
)');
$statement->execute();

// Create test user
$userEmail = $_ENV['test_user_email'];
$userPassword = $_ENV['test_user_password'];
$statement = $connection->prepare('SELECT * FROM users WHERE email = :email');
$statement->execute([
    'email' => $userEmail,
]);
$user = $statement->fetch();
if (!$user) {
    $token = bin2hex(random_bytes(32));
    $statement = $connection->prepare('INSERT INTO users (email, password, tasks, token, is_admin) VALUES (:email, :password, :tasks, :token, 1)');
    $statement->execute([
        'email' => $userEmail,
        'password' => password_hash($userPassword, PASSWORD_DEFAULT),
        'tasks' => json_encode([]),
        'token' => $token,
    ]);
    echo "token: " . $token . PHP_EOL;
} else {
    echo "token: " . $user['token'] . PHP_EOL;
}
