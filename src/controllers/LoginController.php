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
        $connection = $this->getConnection();
        $statement = $connection->prepare('SELECT * FROM users WHERE email = :email and password = :password');
        $statement->execute([
            'email' => $_POST['email'],
            'password' => password_hash($_POST['password'], PASSWORD_DEFAULT),
        ]);
        $user = $statement->fetch();
        if ($user) {
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
