<?php

namespace App\Controllers;

class SyncController
{
    public function options()
    {
        return "";
    }

    public function post($userId)
    {
        // Get json from body
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        error_log(\json_encode($data));
        // Get saved tasks
        $file = __DIR__ . '/../../resources/tasks.json';
        if (file_exists($file)) {
            $tasks = json_decode(file_get_contents($file), true);
        } else {
            $tasks = [];
        }
        // Update tasks
        foreach ($data['tasks'] as $task) {
            $index = -1;
            foreach ($tasks as $i => $t) {
                if ($t['id'] == $task['id']) {
                    $index = $i;
                    break;
                }
            }
            if ($index >= 0) {
                $tasks[$index] = $task;
            } else {
                $tasks[] = $task;
            }
        }
        // Save tasks
        file_put_contents($file, json_encode($tasks));
    }
}
