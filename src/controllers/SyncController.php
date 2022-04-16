<?php

namespace App\Controllers;

class SyncController extends Controller
{
    public function options()
    {
        return "";
    }

    public function post()
    {
        // Get json from body
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        // token from header
        $token = $this->getToken();
        // Get task list for logged user
        $connection = $this->getConnection();
        $statement = $connection->prepare('SELECT * FROM users WHERE token = :token');
        $statement->execute([
            'token' => $token,
        ]);
        $user = $statement->fetch();
        if ($user) {
            // Update tasks for logged user
            $statement = $connection->prepare('UPDATE users SET tasks = :tasks WHERE id = :id');
            $statement->execute([
                'tasks' => json_encode($data),
                'id' => $user['id'],
            ]);
            return [
                'status' => 'success',
            ];
        } else {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Invalid credentials']);
            exit;
        }
    }
}
