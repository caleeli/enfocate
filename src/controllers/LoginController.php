<?php

namespace App\Controllers;

class LoginController extends Controller
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
        // Verify login
        $connection = $this->getConnection();
        $statement = $connection->prepare('SELECT * FROM users WHERE email = :email');
        $statement->execute([
            'email' => $data['email']
        ]);
        $user = $statement->fetch();
        if ($user && password_verify($data['password'], $user['password'])) {
            $token = bin2hex(random_bytes(32));
            $statement = $connection->prepare('UPDATE users SET token = :token WHERE id = :id');
            $statement->execute([
                'token' => $token,
                'id' => $user['id'],
            ]);
            return [
                'status' => 'success',
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'tasks' => json_decode($user['tasks']) ?: [],
                    'token' => $token,
                ],
            ];
        } else {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Invalid credentials']);
            exit;
        }
    }
}
