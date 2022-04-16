<?php

namespace App\Controllers;

use PDO;

class Controller
{
    protected function getConnection()
    {
        $connection = new PDO($_ENV['dns'], $_ENV['user'], $_ENV['password']);
        $connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $connection;
    }

    /**
     * Get token from header
     *
     * @return string
     */
    protected function getToken()
    {
        // GET AUTHENTICATION HEADER
        $headers = getallheaders();
        $token = $headers['Authorization'] ?? "";
        if (strpos($token, 'Bearer ') !== false) {
            $token = str_replace('Bearer ', '', $token);
        }
        return $token;
    }
}
