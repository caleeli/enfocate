<?php

namespace App\Controllers;

class LoginController
{
    public function options()
    {
        return "";
    }

    public function post()
    {
        $file = __DIR__ . '/../../resources/tasks.json';
        if (file_exists($file)) {
            $tasks = json_decode(file_get_contents($file), true);
        } else {
            $tasks = [];
        }
        return [
            'status' => 'success',
            'user' => [
                'id' => 1,
                'email' => 'john@example.com',
                'tasks' => $tasks,
            ],
        ];
    }
}
