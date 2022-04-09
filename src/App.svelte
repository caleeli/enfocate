<script>
	import { tick } from "svelte";
	import recognition from "./recognition.js";
	import { translation as _ } from "./translation.js";
	import {
		INACTIVE_STATUS,
		tasksStore,
		addNewTask,
		completeTask,
		startTask,
		updateTime,
		pauseTask,
		COMPLETED_STATUS,
		cancelTask,
		CANCELED_STATUS,
	} from "./store.js";

	let tasks = [];
	tasksStore.subscribe((value) => {
		tasks = value;
	});
	let focusTasks = [];
	let currentTask = getNextPendingTaskAfter(-1);
	let nextTask = null;
	let previousTask = null;
	let taskStatus = currentTask?.status || INACTIVE_STATUS;
	let flickStartX;
	let flickStartY;
	let speed = 1000;
	let t0 = 0;
	let delta = 0;
	let swipe = "";
	let textarea;
	let enlapsedTime = 0; // in seconds
	let maxTime = 1800; // 30 minutes in seconds

	function onaspect() {}
	function onplay() {
		currentTask = startTask(currentTask);
		taskStatus = currentTask.status;
		enlapsedTime = 0;
	}
	function onpause() {
		currentTask = pauseTask(currentTask);
		taskStatus = currentTask.status;
	}
	function onrecord() {}
	function onreopen() {}
	function onstop() {
		taskStatus = INACTIVE_STATUS;
		currentTask.status = taskStatus;
	}
	function oncheck() {
		completeCurrentTask();
	}
	function oncheckadd() {
		addTask();
	}
	function onbackadd() {
		taskStatus = INACTIVE_STATUS;
	}
	function oncancel() {
		cancelCurrentTask();
	}
	function unpause() {
		taskStatus = INACTIVE_STATUS;
	}
	async function onadd() {
		taskStatus = "creating-task";
		await tick();
		setTimeout(async () => {
			taskStatus = "creating";
			await tick();
			textarea.focus();
			recognition.start({
				onchange(value) {
					console.log("value from recognition:", value);
					textarea.value = value;
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
		taskStatus = currentTask.status;
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
		taskStatus = "inactive complete-task";
		await tick();
		setTimeout(() => {
			currentTask = nextTask;
			taskStatus = INACTIVE_STATUS;
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
		taskStatus = "inactive next-task";
		await tick();
		setTimeout(() => {
			previousTask = currentTask;
			currentTask = nextTask;
			taskStatus = INACTIVE_STATUS;
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
		taskStatus = "inactive previous-task";
		setTimeout(() => {
			nextTask = currentTask;
			currentTask = previousTask;
			taskStatus = INACTIVE_STATUS;
			speed = 1000;
		}, speed);
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
		}
	}
	$: {
		focusTasks = [previousTask, currentTask, nextTask];
	}
	setInterval(() => {
		if (taskStatus === "active") {
			enlapsedTime = Math.min(maxTime, enlapsedTime + 1);
			currentTask = updateTime(currentTask);
			if (enlapsedTime === maxTime) {
				onpause();
			}
		}
	}, 1000);
</script>

<svg
	width="100%"
	height="100%"
	xmlns="http://www.w3.org/2000/svg"
	xmlns:xlink="http://www.w3.org/1999/xlink"
	class="background"
>
	<filter id="blurMe">
		<feGaussianBlur in="SourceGraphic" stdDeviation="5" />
	</filter>

	<image
		href="https://yari-demos.prod.mdn.mozit.cloud/en-US/docs/Web/SVG/Element/image/mdn_logo_only_color.png"
		filter="url(#blurMe)"
		width="100%"
		height="100%"
	/>
</svg>

<div
	class="main"
	on:touchstart={flickStart}
	on:touchmove={flickDetect}
	on:touchend={flickEnd}
>
	<svg
		height="100%"
		viewBox="0 0 432 768"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		xmlns:xlink="http://www.w3.org/1999/xlink"
		class={`${taskStatus}`}
		style={`
			--speed: ${speed * 0.001}s;
			--speed05: ${speed * 0.0005}s;
			--speed025: ${speed * 0.00025}s;
			--speed075: ${speed * 0.00075}s;
		`}
	>
		{#each focusTasks as task, index}
			<g id={`g${index}`}>
				<text
					id="title"
					x="146"
					y="120"
					font-size="35"
					font-weight="800"
					stroke="black"
					fill="white"
				>
					{task
						? new Date(task.time).toISOString().substr(11, 8)
						: ""}
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
				<foreignObject
					id="title"
					x="41"
					y="200"
					width="350"
					height="300"
				>
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
						cy="596"
						r="49.5"
						fill="#2C82C9"
						stroke="black"
					/>
					<path
						id="Vector 14"
						d="M204 631.075V620.356C204 620.356 194.649 618.139 189.911 612.504C185.435 607.181 182.996 594.708 182.996 594.708C182.996 594.708 183.795 593 186.558 593C189.911 593 190.899 594.708 190.899 594.708C190.899 594.708 192.009 602.675 195.453 606.898C199.711 612.117 203.273 613.352 210.008 613.349C216.738 613.346 220.307 612.124 224.546 606.898C228.013 602.623 229.037 594.771 229.037 594.771C229.037 594.771 230.057 593 233.568 593C236.354 593 236.972 594.771 236.972 594.771C236.972 594.771 234.504 607.172 230.057 612.472C225.33 618.105 216 620.356 216 620.356V631.075C216 631.075 215.537 632.894 210 632.894C204.463 632.894 204 631.075 204 631.075Z"
						fill="white"
						stroke="black"
					/>
					<path
						id="Vector 15"
						d="M195.107 573.475V596.416C195.107 596.416 195.04 609.9 209.985 609.9C224.93 609.9 224.934 596.416 224.934 596.416V573.475C224.934 573.475 224.934 560 209.985 560C195.036 560 195.107 573.475 195.107 573.475Z"
						fill="white"
						stroke="black"
					/>
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
				<g id="aspect" opacity="0.75" on:click={onaspect}>
					<circle
						id="Ellipse 1_3"
						cx="82"
						cy="108"
						r="49.5"
						fill="white"
						stroke="black"
					/>
					<path
						id="chompa"
						d="M69.7654 123.057H91.6387C91.6387 123.057 91.0468 122.168 90.535 121.728C89.7693 121.07 88.9671 120.824 88.152 120.424C87.1331 119.923 85.7439 119.395 85.7439 119.395C85.7439 119.395 83.0692 121.586 81.0532 121.552C79.1082 121.52 76.5632 119.395 76.5632 119.395C76.5632 119.395 75.2474 120.054 74.3809 120.424C73.2093 120.924 72.5448 121.005 71.4962 121.728C70.8005 122.208 69.7654 123.057 69.7654 123.057Z"
						fill="white"
						stroke="black"
					/>
					<g id="Vector 5">
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M71.606 104.772C71.9672 104.915 72.5875 104.935 72.5875 104.935C72.5875 104.935 73.294 104.363 73.6672 103.921C74.1154 103.39 74.616 102.416 74.616 102.416C74.616 102.416 76.403 102.851 77.5605 103.07C78.9063 103.325 79.6666 103.448 81.0285 103.594C83.6082 103.87 87.6701 103.757 87.6701 103.757C87.6701 103.757 88.253 104.162 88.6516 104.379C89.1188 104.633 89.8948 104.935 89.8948 104.935C89.8948 104.935 90.5217 105.296 90.8763 105.131C91.1946 104.984 91.3671 104.379 91.3671 104.379C91.3671 104.379 91.6569 101.659 90.8763 100.224C90.4433 99.4276 90.0526 99.055 89.3713 98.4571C88.2409 97.465 87.166 97.2262 85.9349 96.9527C85.3556 96.824 84.7417 96.6876 84.0712 96.4614C81.5617 95.615 77.5605 94.5638 77.5605 94.5638C77.5605 94.5638 76.85 94.2928 76.579 94.5638C76.4076 94.7352 76.3827 95.1527 76.3827 95.1527V96.2978C76.3827 96.2978 75.567 96.6846 75.074 96.9849C75.0501 96.9994 75.0265 97.0138 75.003 97.0281C73.8597 97.7243 73.1397 98.1627 72.3585 99.2751C71.7337 100.165 71.5224 100.776 71.2461 101.827C70.9911 102.797 70.9517 104.379 70.9517 104.379C70.9517 104.379 71.329 104.662 71.606 104.772Z"
							fill="white"
						/>
						<path
							d="M89.8948 104.935C89.8948 104.935 90.3215 108.033 89.8948 109.941C89.4557 111.904 89.0136 113.089 87.6701 114.587C85.7646 116.71 83.8788 117.751 81.0285 117.629C78.4195 117.518 76.8688 116.483 75.074 114.587C73.6596 113.092 73.0752 111.94 72.5875 109.941C72.1242 108.042 72.5875 104.935 72.5875 104.935M89.8948 104.935C89.8948 104.935 90.5217 105.296 90.8763 105.131C91.1946 104.984 91.3671 104.379 91.3671 104.379C91.3671 104.379 91.6569 101.659 90.8763 100.224C90.4433 99.4276 90.0526 99.055 89.3713 98.4571C88.2409 97.465 87.166 97.2262 85.9349 96.9527C85.3556 96.824 84.7417 96.6876 84.0712 96.4614C81.5617 95.615 77.5605 94.5638 77.5605 94.5638C77.5605 94.5638 76.85 94.2928 76.579 94.5638C76.4076 94.7352 76.3827 95.1527 76.3827 95.1527V96.2978C76.3827 96.2978 75.567 96.6846 75.074 96.9849C75.0501 96.9994 75.0265 97.0138 75.003 97.0281C73.8597 97.7243 73.1397 98.1627 72.3585 99.2751C71.7337 100.165 71.5224 100.776 71.2461 101.827C70.9911 102.797 70.9517 104.379 70.9517 104.379C70.9517 104.379 71.329 104.662 71.606 104.772C71.9672 104.915 72.5875 104.935 72.5875 104.935M89.8948 104.935C89.8948 104.935 89.1188 104.633 88.6516 104.379C88.253 104.162 87.6701 103.757 87.6701 103.757C87.6701 103.757 83.6082 103.87 81.0285 103.594C79.6666 103.448 78.9063 103.325 77.5605 103.07C76.403 102.851 74.616 102.416 74.616 102.416C74.616 102.416 74.1154 103.39 73.6672 103.921C73.294 104.363 72.5875 104.935 72.5875 104.935"
							stroke="black"
						/>
					</g>
					<path
						id="Vector 4"
						d="M77.3659 118.241C77.1648 118.733 76.6886 119.42 76.6886 119.42C76.6886 119.42 79.0957 121.741 81.0281 121.803C83.0818 121.869 85.7189 119.42 85.7189 119.42C85.7189 119.42 85.176 118.708 84.9413 118.116C84.7223 117.564 84.7406 116.761 84.7406 116.761C84.7406 116.761 82.4569 117.59 81.0281 117.564C79.6837 117.539 77.7421 116.536 77.7421 116.536C77.7421 116.536 77.6242 117.61 77.3659 118.241Z"
						fill="white"
						stroke="black"
					/>
					<path
						id="Subtract"
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M47.0001 94.5L80.5001 71.5C80.5001 71.5 81.3826 71 82.0001 71C82.6175 71 83.5001 71.5 83.5001 71.5L116.5 94.5C116.5 94.5 119.5 96.8714 117 100C115.637 101.705 111.5 101 111.5 101V135H52.0001V101.148C52.0001 101.148 48.5001 102.5 46.5 99.5C44.5 96.5 47.0001 94.5 47.0001 94.5ZM82 82L54.5 100V132.5H109V100L82 82Z"
						fill="#2C82C9"
						stroke="black"
					/>
					<path
						id="Vector 3"
						d="M96.2823 124.477V131.962L65.7554 131.981V124.45C65.7554 124.45 65.9145 123.795 66.2161 123.529C66.4896 123.288 67.0847 123.186 67.0847 123.186H95.009C95.009 123.186 95.6455 123.36 95.9124 123.655C96.1489 123.916 96.2823 124.477 96.2823 124.477Z"
						fill="#2C82C9"
						stroke="black"
					/>
					<circle
						id="Ellipse 5"
						cx="80.8735"
						cy="130.582"
						r="1.34626"
						fill="white"
						stroke="black"
					/>
					<circle
						id="Ellipse 6"
						cx="76.9983"
						cy="108.398"
						r="1.06737"
						fill="black"
					/>
					<circle
						id="Ellipse 7"
						cx="85.4218"
						cy="108.398"
						r="1.06737"
						fill="black"
					/>
					<path
						id="Vector 6"
						d="M78.8542 112.369C78.8542 112.369 80.0994 113.22 81.0081 113.254C82.0078 113.291 83.4121 112.369 83.4121 112.369"
						stroke="black"
					/>
				</g>
			</g>
		{/each}
		<foreignObject
			id="add-task-form"
			x="41"
			y="200"
			width="350"
			height="300"
		>
			<textarea bind:this={textarea} />
		</foreignObject>
	</svg>
</div>

<style>
	:global(body) {
		background-color: black;
	}

	#check,
	#playing,
	#play,
	#pause,
	#record,
	#stop,
	#cancel,
	#back,
	#add,
	#reopen,
	#aspect,
	#completed,
	#canceled,
	#add-task-form,
	#check_add {
		display: none;
	}
	.inactive #add,
	.inactive #play,
	.inactive #cancel {
		display: block;
	}
	.active #stop,
	.active #playing,
	.active #pause,
	.active #check,
	.active #cancel {
		display: block;
	}
	.paused #stop,
	.paused #play {
		display: block;
	}
	.paused #status {
		animation: blink var(--speed) infinite;
	}
	.creating #add-task-form,
	.creating #record,
	.creating #check_add,
	.creating #back {
		display: block;
	}
	.creating #title,
	.creating #status {
		display: none;
	}
	.canceled #reopen,
	.canceled #canceled {
		display: block;
	}
	.completed #reopen,
	.completed #completed {
		display: block;
	}

	div.main {
		position: absolute;
		left: 0px;
		top: 0px;
		display: flex;
		justify-content: center;
		width: 100vw;
		height: 100vh;
	}
	.background {
		opacity: 0.7;
	}
	.title {
		color: white;
		text-align: center;
		font-size: 3em;
	}
	#add-task-form textarea {
		width: 100%;
		height: 100%;
		background-color: transparent;
		border: none;
		outline: none;
		color: white;
		text-align: center;
		font-size: 3em;
	}
	#record {
		animation: blink var(--speed) infinite;
	}
	@keyframes blink {
		0% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.6;
		}
	}
	/* move to left effect */
	#g0 {
		transform: translateX(-432px);
	}
	#g1 {
		transform: translateX(0px);
	}
	#g2 {
		transform: translateX(432px);
	}
	.complete-task #g1 {
		animation: moveToBottom var(--speed05) forwards;
	}
	.complete-task #g2 {
		animation: moveToLeft2 var(--speed075) forwards;
		animation-delay: var(--speed025);
	}
	.next-task #g1 {
		animation: moveToLeft1 var(--speed) forwards;
	}
	.next-task #g2 {
		animation: moveToLeft2 var(--speed) forwards;
	}
	.previous-task #g1 {
		animation: moveToRight1 var(--speed) forwards;
	}
	.previous-task #g0 {
		animation: moveToRight0 var(--speed) forwards;
	}
	.creating-task #g1 {
		animation: moveToBottom var(--speed05) forwards;
	}
	.creating-task #add-task-form {
		animation: fadeIn var(--speed05) forwards;
	}
	@keyframes moveToLeft1 {
		0% {
			transform: translateX(0px);
		}
		100% {
			transform: translateX(-432px);
		}
	}
	@keyframes moveToLeft2 {
		0% {
			transform: translateX(432px);
		}
		100% {
			transform: translateX(0px);
		}
	}
	@keyframes moveToRight1 {
		0% {
			transform: translateX(0px);
		}
		100% {
			transform: translateX(432px);
		}
	}
	@keyframes moveToRight0 {
		0% {
			transform: translateX(-432px);
		}
		100% {
			transform: translateX(0px);
		}
	}
	@keyframes moveToBottom {
		0% {
			transform: translateY(0px);
		}
		100% {
			transform: translateY(768px);
		}
	}
	@keyframes fadeIn {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}
</style>
