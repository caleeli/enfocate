<script>
	import { tick } from "svelte";
	import { translation as _ } from "../translation.js";
	import Aspectos from "./Aspectos.svelte";
	import recognition from "../recognition.js";
	import { LocalNotifications } from "@capacitor/local-notifications";
	import {
		INACTIVE_STATUS,
		tasksStore,
		userStore,
		addNewTask,
		completeTask,
		startTask,
		updateTime,
		pauseTask,
		COMPLETED_STATUS,
		cancelTask,
		CANCELED_STATUS,
		stopTask,
		ACTIVE_STATUS,
		setAspects,
	} from "../store.js";
	import { push } from "svelte-spa-router";

	let WITHOUT_PAUSE = true;
	let speed = 1000;
	let tasks = [];
	let user = {};
	tasksStore.subscribe((value) => {
		tasks = value;
	});
	userStore.subscribe((value) => {
		user = value;
	});
	let focusTasks = [];
	let currentTask = getNextPendingTaskAfter(-1);
	let nextTask = null;
	let previousTask = null;
	let taskBeforeCreate = null;
	let taskStatus = ""; //currentTask?.status || INACTIVE_STATUS;
	let flickStartX;
	let flickStartY;
	let t0 = 0;
	let delta = 0;
	let swipe = "";
	let textarea;
	let enlapsedTime = 0; // in milliseconds
	let maxTime = 1800000; // 30 minutes in milliseconds
	let last_lap_bell = new Audio("sounds/last_lap_bell.mp3");
	let play_last_lap_bell = true;
	let taskEffect = "";
	let addTaskEffect = "";
	let listeners = {};
	let selectedAspects = [];
	LocalNotifications.addListener(
		"localNotificationReceived",
		() => {
			pleaseTakeARest();
		}
	)

	function onlogin() {
		// route to login
		push("/login");
	}
	async function onplay() {
		currentTask = startTask(currentTask);
		enlapsedTime = 0;
		play_last_lap_bell = true;
		const notifications = [
			{
				id: new Date().getTime(),
				title: _("Enfocate"),
				body: _("Toma un descanso"),
				schedule: {
					at: new Date(new Date().getTime() + maxTime),
					allowWhileIdle: true,
				},
			},
		];
		await LocalNotifications.schedule({ notifications });
	}
	function onpause() {
		currentTask = pauseTask(currentTask);
		// taskStatus = currentTask.status;
	}
	function onrecord() {
		// toggle recording
		recognition.toggle();
		textarea.focus();
	}
	function onreopen() {}
	function onstop() {
		currentTask = stopTask(currentTask);
	}
	function oncheck() {
		completeCurrentTask();
	}
	async function oncheckadd() {
		if (textarea.value.trim() === "") {
			return;
		}
		await addTask();
		setAspects(currentTask, selectedAspects);
		taskEffect = "";
	}
	async function onaddplay() {
		if (textarea.value.trim() === "") {
			return;
		}
		await addTask();
		setAspects(currentTask, selectedAspects);
		onplay();
		taskEffect = "";
	}
	function onbackadd() {
		taskEffect = "";
		recognition.stop();
		textarea.value = "";
		currentTask = taskBeforeCreate;
	}
	function oncancel() {
		cancelCurrentTask();
	}
	function unpause() {
		taskStatus = INACTIVE_STATUS;
	}
	async function onadd() {
		taskEffect = "creating-task";
		taskBeforeCreate = currentTask;
		currentTask = null;
		await tick();
		setTimeout(async () => {
			taskEffect = "creating";
			await tick();
			textarea.focus();
			recognition.start({
				onchange(value) {
					textarea.value =
						(textarea.value ? textarea.value + " " : "") + value;
				},
				completed() {},
			});
		}, speed * 0.5);
	}
	async function addTask() {
		currentTask = addNewTask({
			title: textarea.value,
		});
		textarea.value = "";
		recognition.stop();
		taskEffect = "choose-aspect";
		selectedAspects = [];
		return waitForAction("selected-aspects");
	}
	function waitForAction(eventName) {
		return new Promise((resolve) => {
			listeners[eventName] = resolve;
		});
	}
	function throwAction(actionName) {
		console.log(actionName, listeners[actionName]);
		if (listeners[actionName]) {
			listeners[actionName](actionName);
		}
	}
	function getNextPendingTaskAfter(currentIndex) {
		return (
			tasks.find(
				(task, index) =>
					task.status !== COMPLETED_STATUS &&
					task.status !== CANCELED_STATUS &&
					index > currentIndex
			) || null
		);
	}
	function getPreviousPendingTaskBefore(currentIndex) {
		if (currentIndex === -1) {
			currentIndex = tasks.length;
		}
		for (let i = currentIndex - 1; i >= 0; i--) {
			const task = tasks[i];
			if (
				task.status !== COMPLETED_STATUS &&
				task.status !== CANCELED_STATUS
			) {
				return task;
			}
		}
		return null;
	}
	async function completeCurrentTask() {
		const currentIndex = tasks.indexOf(currentTask);
		currentTask = completeTask(currentTask);
		let task = getNextPendingTaskAfter(currentIndex);
		if (!task) {
			task = getNextPendingTaskAfter(-1);
		}
		nextTask = task;
		taskEffect = "complete-task";
		await tick();
		setTimeout(() => {
			currentTask = nextTask;
			taskEffect = "";
		}, speed);
	}
	async function cancelCurrentTask() {
		const currentIndex = tasks.indexOf(currentTask);
		currentTask = cancelTask(currentTask);
		let task = getNextPendingTaskAfter(currentIndex);
		if (!task) {
			task = getNextPendingTaskAfter(-1);
		}
		nextTask = task;
		taskStatus = "inactive complete-task";
		await tick();
		setTimeout(() => {
			currentTask = nextTask;
			taskStatus = INACTIVE_STATUS;
		}, speed);
	}
	async function goNextTask() {
		const currentIndex = tasks.indexOf(currentTask);
		const task = getNextPendingTaskAfter(currentIndex);
		if (!task) {
			return;
		}
		nextTask = task;
		taskEffect = "next-task";
		await tick();
		setTimeout(() => {
			previousTask = currentTask;
			currentTask = nextTask;
			taskEffect = "";
			speed = 1000;
		}, speed);
	}
	async function goPreviousTask() {
		const currentIndex = tasks.indexOf(currentTask);
		nextTask = currentTask;
		let pTask = getPreviousPendingTaskBefore(currentIndex);
		if (!pTask) {
			return;
		}
		previousTask = pTask;
		await tick();
		taskEffect = "previous-task";
		setTimeout(() => {
			nextTask = currentTask;
			currentTask = previousTask;
			taskEffect = "";
			speed = 1000;
		}, speed);
	}
	async function goCompletedList(direction) {
		taskEffect = `move-${direction}-task`;
		await tick();
		setTimeout(() => {
			taskEffect = "";
			push("/completed");
		}, speed * 0.35);
	}
	function flickStart(event) {
		let touch = event.touches[0];
		flickStartX = touch.pageX;
		flickStartY = touch.pageY;
		t0 = new Date().getTime();
		swipe = "";
	}
	function flickDetect(event) {
		if (!flickStartX && !flickStartY) {
			return;
		}
		let touch = event.touches[0];
		let x = touch.pageX;
		let y = touch.pageY;
		let deltaX = x - flickStartX;
		let deltaY = y - flickStartY;
		let absDeltaX = Math.abs(deltaX);
		let absDeltaY = Math.abs(deltaY);
		if (absDeltaX > 0 && absDeltaX > absDeltaY) {
			delta = deltaX;
			if (deltaX < 0) {
				swipe = "left";
			} else {
				swipe = "right";
			}
		} else if (absDeltaY > 0 && absDeltaY > absDeltaX) {
			delta = deltaY;
			if (deltaY < 0) {
				swipe = "up";
			} else {
				swipe = "down";
			}
		}
	}
	function flickEnd() {
		if (taskEffect !== "") {
			return;
		}
		speed = Math.min(
			1000,
			Math.max(
				100,
				Math.abs(432 / ((delta * 2) / (new Date().getTime() - t0)))
			)
		);
		flickStartX = 0;
		flickStartY = 0;
		switch (swipe) {
			case "left":
				goNextTask();
				break;
			case "right":
				goPreviousTask();
				break;
			case "up":
			case "down":
				goCompletedList(swipe);
				break;
		}
	}
	function pleaseTakeARest() {
		if (play_last_lap_bell) {
			console.log("pleaseTakeARest() take a rest");
			last_lap_bell.play();
			play_last_lap_bell = false;
		}
	}
	$: {
		focusTasks = [previousTask, currentTask, nextTask];
	}
	setInterval(() => {
		if (currentTask && currentTask.status === ACTIVE_STATUS) {
			const time = new Date().getTime();
			enlapsedTime = Math.max(0, time - currentTask.continue_at);
			currentTask = updateTime(currentTask);
			if (enlapsedTime >= maxTime) {
				pleaseTakeARest();
			}
		}
	}, 1000);
	recognition.onstart(() => (addTaskEffect = "recording"));
	recognition.onend(() => (addTaskEffect = ""));
</script>

<svelte:window
	on:touchstart={flickStart}
	on:touchmove={flickDetect}
	on:touchend={flickEnd}
/>

<g
	class={`${taskEffect} ${addTaskEffect}`}
	style={`
	--speed: ${speed * 0.001}s;
	--speed05: ${speed * 0.0005}s;
	--speed025: ${speed * 0.00025}s;
	--speed075: ${speed * 0.00075}s;
	--pause_show: ${WITHOUT_PAUSE ? "none" : "block"};
	--pause_hide: ${WITHOUT_PAUSE ? "block" : "none"};
`}
>
	{#each focusTasks as task, index}
		<g id={`g${index}`} class={task?.status || INACTIVE_STATUS}>
			<text
				id="title"
				x="146"
				y="120"
				font-size="35"
				font-weight="800"
				stroke="black"
				fill="white"
			>
				{task ? new Date(task.time).toISOString().substring(11, 11+8) : ""}
			</text>
			<text
				id="status"
				x="176"
				y="140"
				font-size="25"
				font-weight="800"
				stroke="black"
				fill="white"
			>
				{_(task?.status || "")}
			</text>
			<foreignObject id="title" x="41" y="200" width="350" height="300">
				<p xmlns="http://www.w3.org/1999/xhtml" class="title">
					{task?.title || _("Sin tareas pendientes")}
				</p>
			</foreignObject>
			<g
				id="check"
				opacity="0.75"
				on:click={oncheck}
				style={`${!task ? "display:none" : ""}`}
			>
				<circle
					id="Ellipse 2"
					cx="346"
					cy="596"
					r="49.5"
					fill="#2CC990"
					stroke="black"
				/>
				<path
					id="Vector 1"
					d="M364.736 572.467L337.325 600.189L326.697 589.157C326.697 589.157 321.103 584.348 315.788 589.157C310.474 593.966 314.39 600.189 314.39 600.189L331.731 617.728C331.731 617.728 335.334 620.17 337.885 619.991C340.031 619.84 342.92 617.728 342.92 617.728L376.484 583.782C376.484 583.782 380.4 578.691 375.645 573.599C370.89 568.507 364.736 572.467 364.736 572.467Z"
					fill="white"
					stroke="black"
				/>
			</g>
			<g id="check_add" opacity="0.75" on:click={oncheckadd}>
				<circle
					id="Ellipse 2"
					cx="346"
					cy="596"
					r="49.5"
					fill="#2C82C9"
					stroke="black"
				/>
				<path
					id="Vector 1"
					d="M364.736 572.467L337.325 600.189L326.697 589.157C326.697 589.157 321.103 584.348 315.788 589.157C310.474 593.966 314.39 600.189 314.39 600.189L331.731 617.728C331.731 617.728 335.334 620.17 337.885 619.991C340.031 619.84 342.92 617.728 342.92 617.728L376.484 583.782C376.484 583.782 380.4 578.691 375.645 573.599C370.89 568.507 364.736 572.467 364.736 572.467Z"
					fill="white"
					stroke="black"
				/>
			</g>
			<g id="completed" opacity="0.75">
				<circle
					id="Ellipse 2_2"
					cx="210"
					cy="708"
					r="47"
					stroke="#2CC990"
					stroke-width="6"
				/>
				<path
					id="Vector 1_2"
					d="M228.736 684.467L201.325 712.189L190.697 701.157C190.697 701.157 185.103 696.348 179.788 701.157C174.474 705.966 178.39 712.189 178.39 712.189L195.731 729.728C195.731 729.728 199.334 732.17 201.885 731.991C204.031 731.84 206.92 729.728 206.92 729.728L240.484 695.782C240.484 695.782 244.4 690.691 239.645 685.599C234.89 680.507 228.736 684.467 228.736 684.467Z"
					fill="white"
					stroke="#2CC990"
					stroke-width="6"
				/>
			</g>
			<g id="playing" opacity="0.75">
				<circle
					cx="210"
					cy="596"
					r="56"
					fill="transparent"
					stroke="#2C82C9"
					stroke-width="8"
					stroke-dasharray={`calc(${enlapsedTime / maxTime} * ${
						2 * Math.PI * 56
					}) ${2 * Math.PI * 56}`}
					style="transform: translate(210px, 596px) rotate(-90deg) translate(-210px, -596px);"
				/>
				<text
					id="title"
					x="165"
					y="610"
					font-size="35"
					font-weight="800"
					stroke="black"
					fill="white"
				>
					{task
						? new Date(enlapsedTime).toISOString().substr(14, 5)
						: ""}
				</text>
			</g>
			<g
				id="play"
				opacity="0.75"
				on:click={onplay}
				style={`${!task ? "display:none" : ""}`}
			>
				<circle
					id="Ellipse 2_3"
					cx="210"
					cy="596"
					r="49.5"
					fill="#2C82C9"
					stroke="black"
				/>
				<path
					id="Vector 13"
					d="M189.171 563.791C185.845 566.211 185.845 569.563 185.845 569.563V622.881C185.845 622.881 186.348 626.889 190.541 628.848C194.733 630.808 197.682 628.848 197.682 628.848L240.239 602.434C240.239 602.434 242.927 600.282 242.88 596.075C242.833 591.868 240.239 589.912 240.239 589.912L197.682 563.791C197.682 563.791 192.905 561.074 189.171 563.791Z"
					fill="white"
					stroke="black"
				/>
			</g>
			<g id="add_play" opacity="0.75" on:click={onaddplay}>
				<circle
					id="Ellipse 2_3"
					cx="210"
					cy="596"
					r="49.5"
					fill="#2C82C9"
					stroke="black"
				/>
				<path
					id="Vector 13"
					d="M189.171 563.791C185.845 566.211 185.845 569.563 185.845 569.563V622.881C185.845 622.881 186.348 626.889 190.541 628.848C194.733 630.808 197.682 628.848 197.682 628.848L240.239 602.434C240.239 602.434 242.927 600.282 242.88 596.075C242.833 591.868 240.239 589.912 240.239 589.912L197.682 563.791C197.682 563.791 192.905 561.074 189.171 563.791Z"
					fill="white"
					stroke="black"
				/>
			</g>
			<g id="pause" opacity="0.75" on:click={onpause}>
				<circle
					id="Ellipse 3_2"
					cx="210"
					cy="596"
					r="49.5"
					fill="#2C82C9"
					stroke="black"
				/>
				<rect
					id="Rectangle 1"
					x="191.5"
					y="577.5"
					width="12"
					height="37"
					fill="white"
					stroke="black"
				/>
				<rect
					id="Rectangle 2"
					x="216.5"
					y="577.5"
					width="12"
					height="37"
					fill="white"
					stroke="black"
				/>
			</g>
			<g id="record" opacity="0.75" on:click={onrecord}>
				<circle
					id="Ellipse 3_3"
					cx="210"
					cy="708"
					r="49.5"
					fill="#2C82C9"
					stroke="black"
				/>
				<path
					id="Vector 14"
					d="M204 743.075V732.356C204 732.356 194.649 730.139 189.911 724.504C185.435 719.181 182.996 706.708 182.996 706.708C182.996 706.708 183.795 705 186.558 705C189.911 705 190.899 706.708 190.899 706.708C190.899 706.708 192.009 714.675 195.453 718.898C199.711 724.117 203.273 725.352 210.008 725.349C216.738 725.346 220.307 724.124 224.546 718.898C228.013 714.623 229.037 706.771 229.037 706.771C229.037 706.771 230.057 705 233.568 705C236.354 705 236.972 706.771 236.972 706.771C236.972 706.771 234.504 719.172 230.057 724.472C225.33 730.105 216 732.356 216 732.356V743.075C216 743.075 215.537 744.894 210 744.894C204.463 744.894 204 743.075 204 743.075Z"
					fill="white"
					stroke="black"
				/>
				<path
					id="Vector 15"
					d="M195.107 685.475V708.416C195.107 708.416 195.04 721.9 209.985 721.9C224.93 721.9 224.934 708.416 224.934 708.416V685.475C224.934 685.475 224.934 672 209.985 672C195.036 672 195.107 685.475 195.107 685.475Z"
					fill="white"
					stroke="black"
				/>
			</g>
			<g id="recording" opacity="0.75">
				<circle cx="210" cy="708" fill="transparent" stroke="#2C82C9" />
			</g>
			<g id="stop" opacity="0.75" on:click={onstop}>
				<circle
					id="Ellipse 3_4"
					cx="80"
					cy="596"
					r="49.5"
					fill="#FCB941"
					stroke="black"
				/>
				<rect
					id="Rectangle 1_2"
					x="61.5"
					y="577.5"
					width="37"
					height="37"
					fill="white"
					stroke="black"
				/>
			</g>
			<g id="back" opacity="0.75" on:click={onbackadd}>
				<circle
					id="Ellipse 3_5"
					cx="80"
					cy="596"
					r="49.5"
					fill="#FCB941"
					stroke="black"
				/>
				<path
					id="Vector 21"
					d="M116.473 596.106C116.473 587.41 108.876 588.142 108.876 588.142H81.5053V573.129L41.6855 596.106L81.5053 619.357V604.802H108.876C108.876 604.802 116.473 604.802 116.473 596.106Z"
					fill="white"
					stroke="black"
				/>
			</g>
			<g
				id="cancel"
				opacity="0.75"
				on:click={oncancel}
				style={`${!task ? "display:none" : ""}`}
			>
				<circle
					id="Ellipse 4"
					cx="210"
					cy="708"
					r="49.5"
					fill="#FC6042"
					stroke="black"
				/>
				<path
					id="Vector 2"
					d="M194.5 685C193.884 685.047 193 685.5 193 685.5L187.5 691C187.5 691 187 691.883 187 692.5C187 693.117 187.5 694 187.5 694L201 708L187.5 721.5C187.5 721.5 186.571 722.3 186.5 723C186.438 723.614 187 724.5 187 724.5L193 730.5C193 730.5 193.801 731.413 194.5 731.5C195.366 731.608 196.5 730.5 196.5 730.5L210 717.5L223.5 730.5C223.5 730.5 224.697 731.062 225.5 731C226.116 730.953 227 730.5 227 730.5L233 724.5C233 724.5 233.587 723.611 233.5 723C233.438 722.568 233 722 233 722L219 708L233 694C233 694 233.587 693.111 233.5 692.5C233.438 692.068 233 691.5 233 691.5L227 685.5C227 685.5 226.117 685 225.5 685C224.883 685 224 685.5 224 685.5L210 699L196.5 685.5C196.5 685.5 195.303 684.938 194.5 685Z"
					fill="white"
					stroke="black"
				/>
			</g>
			<g id="canceled" opacity="0.75">
				<circle
					id="Ellipse 4_2"
					cx="210"
					cy="708"
					r="47"
					stroke="#FC6042"
					stroke-width="6"
				/>
				<path
					id="Vector 2_2"
					d="M194.5 685C193.884 685.047 193 685.5 193 685.5L187.5 691C187.5 691 187 691.883 187 692.5C187 693.117 187.5 694 187.5 694L201 708L187.5 721.5C187.5 721.5 186.571 722.3 186.5 723C186.438 723.614 187 724.5 187 724.5L193 730.5C193 730.5 193.801 731.413 194.5 731.5C195.366 731.608 196.5 730.5 196.5 730.5L210 717.5L223.5 730.5C223.5 730.5 224.697 731.062 225.5 731C226.116 730.953 227 730.5 227 730.5L233 724.5C233 724.5 233.587 723.611 233.5 723C233.438 722.568 233 722 233 722L219 708L233 694C233 694 233.587 693.111 233.5 692.5C233.438 692.068 233 691.5 233 691.5L227 685.5C227 685.5 226.117 685 225.5 685C224.883 685 224 685.5 224 685.5L210 699L196.5 685.5C196.5 685.5 195.303 684.938 194.5 685Z"
					fill="white"
					stroke="#FC6042"
					stroke-width="6"
				/>
			</g>
			<g id="add" opacity="0.75" on:click={onadd}>
				<circle
					id="Ellipse 1"
					cx="350"
					cy="108"
					r="49.5"
					fill="#2C82C9"
					stroke="black"
				/>
				<path
					id="Vector 2_3"
					d="M322.599 102.772C322.197 103.241 321.892 104.186 321.892 104.186L321.892 111.964C321.892 111.964 322.163 112.942 322.599 113.378C323.036 113.815 324.013 114.085 324.013 114.085L343.459 114.439L343.459 133.531C343.459 133.531 343.367 134.753 343.812 135.299C344.203 135.777 345.227 136.006 345.227 136.006L353.712 136.006C353.712 136.006 354.924 136.084 355.48 135.652C356.169 135.116 356.187 133.531 356.187 133.531L356.54 114.793L375.279 114.439C375.279 114.439 376.523 113.99 377.046 113.378C377.448 112.91 377.754 111.964 377.754 111.964V103.479C377.754 103.479 377.54 102.435 377.046 102.065C376.697 101.803 375.986 101.711 375.986 101.711H356.187V81.9121C356.187 81.9121 355.974 80.8684 355.48 80.4979C355.13 80.2359 354.419 80.1443 354.419 80.1443L345.934 80.1443C345.934 80.1443 344.956 80.4148 344.52 80.8514C344.083 81.288 343.812 82.2656 343.812 82.2656L343.459 101.711L324.367 101.711C324.367 101.711 323.123 102.16 322.599 102.772Z"
					fill="white"
					stroke="black"
				/>
			</g>
			<g id="reopen" opacity="0.75" on:click={onreopen}>
				<circle
					id="Ellipse 1_2"
					cx="350"
					cy="108"
					r="49.5"
					fill="#2C82C9"
					stroke="black"
				/>
				<path
					id="Vector 17"
					d="M318.414 107.781C318.387 106.071 318.414 103.43 318.414 103.43H330.523V107.749C330.523 120.124 340.85 127.567 349.809 127.567C360.607 127.567 366.214 118.979 366.214 118.979L363.394 116.649C363.394 116.649 363.207 116.403 363.301 116.23C363.394 116.057 363.73 116.119 363.73 116.119H378.154V130.308C378.154 130.308 378.021 130.805 377.778 130.819C377.534 130.833 377.109 130.308 377.109 130.308L374.684 127.567C374.684 127.567 366.224 139.498 349.809 139.498C333.046 139.498 318.692 125.897 318.414 107.781Z"
					fill="white"
					stroke="black"
				/>
				<path
					id="Vector 19"
					d="M381.711 108.147C381.738 109.857 381.711 112.498 381.711 112.498H369.602V108.179C369.602 95.8036 359.275 88.3613 350.316 88.3613C339.518 88.3613 333.911 96.9485 333.911 96.9485L336.731 99.2789C336.731 99.2789 336.917 99.5249 336.824 99.6981C336.731 99.8714 336.394 99.8089 336.394 99.8089H321.971V85.6196C321.971 85.6196 322.104 85.1227 322.347 85.1088C322.591 85.095 323.016 85.6196 323.016 85.6196L325.441 88.3613C325.441 88.3613 333.901 76.4298 350.316 76.4298C367.079 76.4298 381.433 90.0311 381.711 108.147Z"
					fill="white"
					stroke="black"
				/>
			</g>
			<g id="login" opacity="0.75" on:click={onlogin}>
				<circle
					id="Ellipse 1_3"
					cx="82"
					cy="108"
					r="49.5"
					fill="#2C82C9"
					stroke="black"
				/>
				<g id="Union">
					<mask id="path-31-inside-2_1_5" fill="white">
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M89.9573 110.352C95.7814 107.39 99.7715 101.341 99.7715 94.3596C99.7715 84.4572 91.744 76.4298 81.8416 76.4298C71.9393 76.4298 63.9118 84.4572 63.9118 94.3596C63.9118 101.391 67.9597 107.478 73.8524 110.415C70.1911 111.656 66.8258 113.727 64.0408 116.512C59.2777 121.275 56.6019 127.735 56.6019 134.471L82 134.471H107.398C107.398 127.735 104.722 121.275 99.9592 116.512C97.126 113.679 93.6923 111.584 89.9573 110.352Z"
						/>
					</mask>
					<path
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M89.9573 110.352C95.7814 107.39 99.7715 101.341 99.7715 94.3596C99.7715 84.4572 91.744 76.4298 81.8416 76.4298C71.9393 76.4298 63.9118 84.4572 63.9118 94.3596C63.9118 101.391 67.9597 107.478 73.8524 110.415C70.1911 111.656 66.8258 113.727 64.0408 116.512C59.2777 121.275 56.6019 127.735 56.6019 134.471L82 134.471H107.398C107.398 127.735 104.722 121.275 99.9592 116.512C97.126 113.679 93.6923 111.584 89.9573 110.352Z"
						fill="white"
					/>
					<path
						d="M89.9573 110.352L89.504 109.46L87.3633 110.549L89.644 111.301L89.9573 110.352ZM73.8524 110.415L74.1732 111.363L76.4479 110.592L74.2986 109.521L73.8524 110.415ZM64.0408 116.512L63.3337 115.805L63.3337 115.805L64.0408 116.512ZM56.6019 134.471H55.6019V135.471L56.6019 135.471L56.6019 134.471ZM82 134.471L82 135.471H82V134.471ZM107.398 134.471V135.471H108.398V134.471H107.398ZM99.9592 116.512L99.2521 117.219L99.2521 117.219L99.9592 116.512ZM98.7715 94.3596C98.7715 100.95 95.0058 106.663 89.504 109.46L90.4105 111.243C96.557 108.118 100.771 101.732 100.771 94.3596H98.7715ZM81.8416 77.4298C91.1917 77.4298 98.7715 85.0095 98.7715 94.3596H100.771C100.771 83.9049 92.2963 75.4298 81.8416 75.4298V77.4298ZM64.9118 94.3596C64.9118 85.0095 72.4916 77.4298 81.8416 77.4298V75.4298C71.387 75.4298 62.9118 83.9049 62.9118 94.3596H64.9118ZM74.2986 109.521C68.7321 106.745 64.9118 100.998 64.9118 94.3596H62.9118C62.9118 101.785 67.1873 108.21 73.4062 111.31L74.2986 109.521ZM73.5316 109.468C69.7262 110.757 66.2284 112.91 63.3337 115.805L64.7479 117.219C67.4233 114.544 70.656 112.554 74.1732 111.363L73.5316 109.468ZM63.3337 115.805C58.3831 120.756 55.6019 127.47 55.6019 134.471H57.6019C57.6019 128 60.1724 121.795 64.7479 117.219L63.3337 115.805ZM56.6019 135.471L82 135.471L82 133.471L56.6019 133.471L56.6019 135.471ZM82 135.471H107.398V133.471H82V135.471ZM108.398 134.471C108.398 127.47 105.617 120.756 100.666 115.805L99.2521 117.219C103.828 121.795 106.398 128 106.398 134.471H108.398ZM100.666 115.805C97.7215 112.86 94.1526 110.683 90.2706 109.402L89.644 111.301C93.232 112.485 96.5304 114.498 99.2521 117.219L100.666 115.805Z"
						fill="black"
						mask="url(#path-31-inside-2_1_5)"
					/>
				</g>
				<circle
					id="Ellipse 28"
					cx="102.334"
					cy="126.739"
					r="11.5"
					fill="white"
					stroke="black"
				/>
				{#if user.email}
					<path
						id="user-logged"
						d="M96.4768 127.553L98.1792 125.844L100.974 128.591L107.174 122.415L108.889 124.124L100.974 131.996L96.4768 127.553Z"
						fill="black"
					/>
				{:else}
					<path
						id="user-anonymous"
						d="M101.071 130.293V130.088C101.075 129.384 101.138 128.822 101.259 128.404C101.383 127.985 101.564 127.647 101.802 127.39C102.039 127.132 102.325 126.899 102.659 126.689C102.909 126.528 103.132 126.361 103.329 126.188C103.526 126.015 103.683 125.824 103.8 125.615C103.917 125.401 103.975 125.164 103.975 124.902C103.975 124.625 103.909 124.381 103.776 124.172C103.643 123.963 103.464 123.802 103.239 123.689C103.017 123.576 102.772 123.52 102.502 123.52C102.241 123.52 101.993 123.578 101.76 123.695C101.526 123.808 101.335 123.977 101.186 124.202C101.037 124.423 100.957 124.699 100.945 125.029H98.4816C98.5017 124.224 98.6949 123.56 99.0611 123.037C99.4274 122.51 99.9123 122.117 100.516 121.86C101.12 121.598 101.786 121.467 102.514 121.467C103.315 121.467 104.023 121.6 104.639 121.866C105.255 122.127 105.738 122.508 106.088 123.007C106.438 123.506 106.613 124.107 106.613 124.812C106.613 125.283 106.535 125.701 106.378 126.067C106.225 126.43 106.01 126.752 105.732 127.033C105.454 127.311 105.126 127.563 104.748 127.788C104.43 127.977 104.168 128.174 103.963 128.38C103.762 128.585 103.611 128.822 103.51 129.092C103.414 129.362 103.363 129.694 103.359 130.088V130.293H101.071ZM102.267 134.157C101.864 134.157 101.52 134.016 101.234 133.734C100.953 133.449 100.814 133.107 100.818 132.708C100.814 132.314 100.953 131.976 101.234 131.694C101.52 131.412 101.864 131.271 102.267 131.271C102.649 131.271 102.985 131.412 103.275 131.694C103.565 131.976 103.712 132.314 103.716 132.708C103.712 132.974 103.641 133.217 103.504 133.439C103.371 133.656 103.196 133.831 102.979 133.964C102.762 134.093 102.524 134.157 102.267 134.157Z"
						fill="black"
					/>
				{/if}
			</g>
		</g>
	{/each}
	<foreignObject id="add-task-form" x="41" y="200" width="350" height="300">
		<textarea bind:this={textarea} />
	</foreignObject>
	<g id="aspectos">
		<Aspectos bind:checked={selectedAspects} />
		<g opacity="0.75" on:click={() => throwAction("selected-aspects")}>
			<circle
				id="Ellipse 2"
				cx="346"
				cy="596"
				r="49.5"
				fill="#2CC990"
				stroke="black"
			/>
			<path
				id="Vector 1"
				d="M364.736 572.467L337.325 600.189L326.697 589.157C326.697 589.157 321.103 584.348 315.788 589.157C310.474 593.966 314.39 600.189 314.39 600.189L331.731 617.728C331.731 617.728 335.334 620.17 337.885 619.991C340.031 619.84 342.92 617.728 342.92 617.728L376.484 583.782C376.484 583.782 380.4 578.691 375.645 573.599C370.89 568.507 364.736 572.467 364.736 572.467Z"
				fill="white"
				stroke="black"
			/>
		</g>
	</g>
</g>
