<?php

namespace App\Controllers;

class TasksController extends Controller
{
    public function options()
    {
        return "";
    }

    public function get($userId)
    {
        $token = $this->getToken();
        $connection = $this->getConnection();
        $statement = $connection->prepare('SELECT id FROM users WHERE token = :token and is_admin=1');
        $statement->execute([
            'token' => $token,
        ]);
        $user = $statement->fetch();
        if ($user) {
            $statement = $connection->prepare('SELECT * FROM users WHERE id = :id');
            $statement->execute([
                'id' => $userId,
            ]);
            $user = $statement->fetch();
            return json_decode($user['tasks']) ?: [];
        } else {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
    }
}
