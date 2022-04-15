import debounce from 'lodash.debounce';
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
const storedUser = JSON.parse(localStorage.getItem('user')) || { id: "", email: "" };
export const userStore = writable(storedUser);

// ACTIONS //
// Add new task
export function addNewTask(task) {
	task = Object.assign({
		id: uuid(),
		title: _("New task"),
		status: INACTIVE_STATUS,
		time: 0,
		aspects: [],
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
		// Stop all the active tasks
		value.forEach(t => {
			if (t.status === ACTIVE_STATUS) {
				t.status = INACTIVE_STATUS;
			}
		});
		// Start task
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
// Stop task
export function stopTask(task) {
	let currentTask;
	tasksStore.update(value => {
		currentTask = value.find(t => t.id === task.id);
		currentTask.status = "inactive";
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
// Set aspects
export function setAspects(task, aspects) {
	let currentTask;
	tasksStore.update(value => {
		currentTask = value.find(t => t.id === task.id);
		currentTask.aspects = aspects;
		return value;
	});
	return currentTask;
}
// Login user
export function login(user) {
	userStore.update(value => {
		value.id = user.id;
		value.email = user.email;
		if (user.tasks) {
			localStorage.setItem('lastSyncTasks', JSON.stringify(user.tasks));
			mergeTasks(user.tasks);
		}
		return value;
	});
	return user;
}
export function logout() {
	userStore.update(value => {
		value.id = "";
		value.email = "";
		return value;
	});
}
function mergeTasks(newTasks) {
	tasksStore.update(value => {
		newTasks.forEach(newTask => {
			let currentTask = value.find(t => t.id === newTask.id);
			if (currentTask) {
				// skip already existing tasks
			} else {
				value.push(newTask);
			}
		});
		return value;
	});
}
// sync function
function syncTasks(currentTasks) {
	userStore.update(currentUser => {
		if (!currentUser.id) {
			return currentUser;
		}
		const server_api = SERVER_API;
		const sync_endpoint = `${server_api}/sync/${currentUser.id}`;
		const lastSyncTasks = JSON.parse(localStorage.getItem('lastSyncTasks')) || [];
		// filter tasks to sync, only tasks that changed
		const syncTasks = currentTasks.filter(task => {
			const last = lastSyncTasks.find(t => t.id === task.id);
			if (JSON.stringify(task) !== JSON.stringify(last)) {
				return true;
			}
		});
		// send to api
		fetch(sync_endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				tasks: syncTasks
			})
		}).then(() => {
			localStorage.setItem('lastSyncTasks', JSON.stringify(currentTasks));
		});
		return currentUser;
	});
}

// PERSISTANCE //
let lastSyncTasks = [];
// debounce sync function 30 seconds
const debounceSyncTasks = debounce(syncTasks, 30000, {
	maxWait: 30000
});
tasksStore.subscribe(value => {
	localStorage.setItem('tasks', JSON.stringify(value));
	debounceSyncTasks(value);
});
userStore.subscribe(value => {
	localStorage.setItem('user', JSON.stringify(value));
});
