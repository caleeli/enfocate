<?php

namespace App\Controllers;

class TasksController
{
    public function options()
    {
        return "";
    }

    public function get()
    {
        // Get saved tasks
        $file = __DIR__ . '/../../resources/tasks.json';
        if (file_exists($file)) {
            $tasks = json_decode(file_get_contents($file), true);
        } else {
            $tasks = [];
        }
        return $tasks;
    }
}