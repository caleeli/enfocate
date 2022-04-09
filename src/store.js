import { writable } from 'svelte/store';
import { v4 as uuid } from 'uuid';
import { translation as _ } from "./translation.js";

// CONSTANTS //
export const INACTIVE_STATUS = "inactive";
export const PAUSED_STATUS = "paused";
export const ACTIVE_STATUS = "active";
export const COMPLETED_STATUS = "completed";
export const CANCELED_STATUS = "canceled";

// STORE //
const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
export const tasksStore = writable(storedTasks);

// PERSISTANCE //
tasksStore.subscribe(value => {
	localStorage.setItem('tasks', JSON.stringify(value));
});

// ACTIONS //
// Add new task
export function addNewTask(task) {
	task = Object.assign({
		id: uuid(),
		title: _("New task"),
		status: INACTIVE_STATUS,
		time: 0,
	}, task);
	tasksStore.update(value => {
		value.push(task);
		return value;
	});
	return task;
}
// Complete a task
export function completeTask(task) {
	let currentTask;
	tasksStore.update(value => {
		currentTask = value.find(t => t.id === task.id);
		currentTask.status = "completed";
		currentTask.completed_at = new Date().getTime();
		return value;
	});
	return currentTask;
}
// Start a task
export function startTask(task) {
	let currentTask;
	tasksStore.update(value => {
		currentTask = value.find(t => t.id === task.id);
		currentTask.status = "active";
		currentTask.completed_at = new Date().getTime();
		// set timestamp
		if (!currentTask.started_at) {
			currentTask.started_at = new Date().getTime();
		}
		currentTask.continue_at = new Date().getTime();
		currentTask.continue_time = currentTask.time;
		return value;
	});
	return currentTask;
}
// Update time
export function updateTime(task, time = new Date().getTime()) {
	let currentTask;
	tasksStore.update(value => {
		currentTask = value.find(t => t.id === task.id);
		currentTask.time = currentTask.continue_time + (time - currentTask.continue_at);
		return value;
	});
	return currentTask;
}
// Pause task
export function pauseTask(task) {
	let currentTask;
	tasksStore.update(value => {
		currentTask = value.find(t => t.id === task.id);
		currentTask.status = "paused";
		return value;
	});
	return currentTask;
}
// Cancel task
export function cancelTask(task) {
	let currentTask;
	tasksStore.update(value => {
		currentTask = value.find(t => t.id === task.id);
		currentTask.status = "canceled";
		return value;
	});
	return currentTask;
}
