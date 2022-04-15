<?php

use App\Controllers\LoginController;
use App\Controllers\SyncController;
use App\Controllers\TasksController;

require __DIR__ . '/../vendor/autoload.php';

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

$path = explode('/', $_SERVER['PATH_INFO']);
array_shift($path);
$controller = array_shift($path);

$controllers = [
    'login' => LoginController::class,
    'sync' => SyncController::class,
    'tasks' => TasksController::class,
];

if (!isset($controllers[$controller])) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Not found']);
    exit;
}

$controller = new $controllers[$controller]();
$method = $_SERVER['REQUEST_METHOD'];
if (!method_exists($controller, $method)) {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}
$response = $controller->$method(...$path);

// Return json response
header('Content-Type: application/json');
echo json_encode($response);
