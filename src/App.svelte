<script>
	import { tick } from "svelte";
	import recognition from "./recognition.js";

	let tasks = [
		{
			id: 1,
			title: "Plan Anual ajustar responsable en tabla",
			completed: false,
			paused: false,
			canceled: false,
		},
		{
			id: 2,
			title: "Task 2",
			completed: false,
			paused: false,
			canceled: false,
		},
		{
			id: 3,
			title: "Task 3",
			completed: false,
			paused: false,
			canceled: false,
		},
	];
	let currentTask = tasks[0];
	let nextTask = tasks[1];
	let previousTask = null;
	let taskEffect = "";
	let flickStartX;
	let flickStartY;
	let speed = 1000;
	let t0 = 0;
	let delta = 0;
	let swipe = "";
	let cards = ["previousTask", "currentTask", "nextTask"];
	let textarea;

	function onaspect() {}
	function onplay() {
		taskEffect = "playing";
		currentTask.playing = true;
	}
	function onpause() {
		taskEffect = "";
		currentTask.playing = false;
	}
	function oncheck() {
		speed = 1000;
		completeTask();
	}
	function oncancel() {
		currentTask.canceled = true;
		completeTask();
	}
	function unpause() {
		taskEffect = "";
		currentTask.paused = false;
	}
	async function onaddtask() {
		taskEffect = "add-task";
		await tick();
		textarea.focus();
		console.log(recognition);
		recognition.start({
			onchange(value) {
				console.log("value from recognition:", value);
				textarea.value = value;
			},
			completed() {},
		});
	}
	async function oncheckadd() {
		taskEffect = "";
		await tick();
		let task = {
			id: tasks.length + 1,
			title: textarea.value,
			completed: false,
			paused: false,
			canceled: false,
		};
		tasks.push(task);
		textarea.value = "";
		recognition.stop();
	}
	async function completeTask() {
		const currentIndex = tasks.indexOf(currentTask);
		currentTask.completed = true;
		let task = tasks.find(
			(task, index) =>
				!task.completed &&
				!task.paused &&
				!task.canceled &&
				index > currentIndex
		);
		if (!task) {
			task = tasks.find(
				(task) => !task.completed && !task.paused && !task.canceled
			);
		}
		nextTask = task;
		taskEffect = "complete-task";
		await tick();
		setTimeout(() => {
			currentTask = nextTask;
			taskEffect = "";
		}, speed);
	}
	async function goNextTask() {
		const currentIndex = tasks.indexOf(currentTask);
		const task = tasks.find(
			(task, index) =>
				!task.completed &&
				!task.paused &&
				!task.canceled &&
				index > currentIndex
		);
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
		}, speed);
	}
	async function goPreviousTask() {
		const currentIndex = tasks.indexOf(currentTask);
		nextTask = currentTask;
		let pTask = null;
		for (let i = currentIndex - 1; i >= 0; i--) {
			const task = tasks[i];
			if (!task.completed && !task.paused && !task.canceled) {
				pTask = task;
				break;
			}
		}
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
		}, speed);
	}
	function _(text) {
		return text;
	}
	function getTransitionEndEventName() {
		var transitions = {
			transition: "transitionend",
			OTransition: "oTransitionEnd",
			MozTransition: "transitionend",
			WebkitTransition: "webkitTransitionEnd",
		};
		let bodyStyle = document.body.style;
		for (let transition in transitions) {
			if (bodyStyle[transition] != undefined) {
				return transitions[transition];
			}
		}
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
	function taskInCard(card) {
		if (card === "currentTask") {
			return currentTask;
		}
		if (card === "nextTask") {
			return nextTask;
		}
		if (card === "previousTask") {
			return previousTask;
		}
	}
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
		class={`${taskEffect}`}
		style={`
			--speed: ${speed * 0.001}s;
			--speed05: ${speed * 0.0005}s;
			--speed025: ${speed * 0.00025}s;
			--speed075: ${speed * 0.00075}s;
		`}
	>
		{#each cards as card, index}
			<g id={`g${index}`}>
				<foreignObject
					id="title"
					x="41"
					y="200"
					width="350"
					height="300"
				>
					<p xmlns="http://www.w3.org/1999/xhtml" class="title">
						{#if index === 0}
							{previousTask?.title || ""}
						{:else if index === 1}
							{currentTask?.title || "Sin tareas pendientes"}
						{:else if index === 2}
							{nextTask?.title || ""}
						{/if}
					</p>
				</foreignObject>
				{#if taskInCard(card, previousTask, currentTask, nextTask)}
					<g id="check" opacity="0.75" on:click={oncheck}>
						<circle
							cx="304"
							cy="600"
							r="49.5"
							fill="#2CC990"
							stroke="black"
						/>
						<path
							d="M322.736 576.467L295.325 604.189L284.697 593.157C284.697 593.157 279.103 588.348 273.788 593.157C268.474 597.966 272.39 604.189 272.39 604.189L289.731 621.728C289.731 621.728 293.334 624.17 295.885 623.991C298.031 623.84 300.92 621.728 300.92 621.728L334.484 587.782C334.484 587.782 338.4 582.691 333.645 577.599C328.89 572.507 322.736 576.467 322.736 576.467Z"
							fill="white"
							stroke="black"
						/>
					</g>
					<g id="pause" opacity="0.75" on:click={onpause}>
						<circle
							cx="127"
							cy="600"
							r="49.5"
							fill="#FCB941"
							stroke="black"
						/>
						<rect
							x="108.5"
							y="581.5"
							width="12"
							height="37"
							fill="white"
							stroke="black"
						/>
						<rect
							x="133.5"
							y="581.5"
							width="12"
							height="37"
							fill="white"
							stroke="black"
						/>
					</g>
					<g id="cancel" opacity="0.75" on:click={oncancel}>
						<circle
							cx="216"
							cy="700"
							r="49.5"
							fill="#FC6042"
							stroke="black"
						/>
						<path
							d="M200.5 677C199.884 677.047 199 677.5 199 677.5L193.5 683C193.5 683 193 683.883 193 684.5C193 685.117 193.5 686 193.5 686L207 700L193.5 713.5C193.5 713.5 192.571 714.3 192.5 715C192.438 715.614 193 716.5 193 716.5L199 722.5C199 722.5 199.801 723.413 200.5 723.5C201.366 723.608 202.5 722.5 202.5 722.5L216 709.5L229.5 722.5C229.5 722.5 230.697 723.062 231.5 723C232.116 722.953 233 722.5 233 722.5L239 716.5C239 716.5 239.587 715.611 239.5 715C239.438 714.568 239 714 239 714L225 700L239 686C239 686 239.587 685.111 239.5 684.5C239.438 684.068 239 683.5 239 683.5L233 677.5C233 677.5 232.117 677 231.5 677C230.883 677 230 677.5 230 677.5L216 691L202.5 677.5C202.5 677.5 201.303 676.938 200.5 677Z"
							fill="white"
							stroke="black"
						/>
					</g>
					<g id="add_task" opacity="0.75" on:click={onaddtask}>
						<circle
							cx="350"
							cy="108"
							r="49.5"
							fill="#2C82C9"
							stroke="black"
						/>
						<path
							d="M322.599 102.772C322.197 103.241 321.892 104.186 321.892 104.186L321.892 111.964C321.892 111.964 322.163 112.942 322.599 113.378C323.036 113.815 324.013 114.085 324.013 114.085L343.459 114.439L343.459 133.531C343.459 133.531 343.367 134.753 343.812 135.299C344.203 135.777 345.227 136.006 345.227 136.006L353.712 136.006C353.712 136.006 354.924 136.084 355.48 135.652C356.169 135.116 356.187 133.531 356.187 133.531L356.54 114.793L375.279 114.439C375.279 114.439 376.523 113.99 377.046 113.378C377.448 112.91 377.754 111.964 377.754 111.964V103.479C377.754 103.479 377.54 102.435 377.046 102.065C376.697 101.803 375.986 101.711 375.986 101.711H356.187V81.9121C356.187 81.9121 355.974 80.8684 355.48 80.4979C355.13 80.2359 354.419 80.1443 354.419 80.1443L345.934 80.1443C345.934 80.1443 344.956 80.4148 344.52 80.8514C344.083 81.288 343.812 82.2656 343.812 82.2656L343.459 101.711L324.367 101.711C324.367 101.711 323.123 102.16 322.599 102.772Z"
							fill="white"
							stroke="black"
						/>
					</g>
					<g id="aspect" opacity="0.75" on:click={onaspect}>
						<circle
							cx="82"
							cy="108"
							r="49.5"
							fill="white"
							stroke="black"
						/>
						<path
							d="M69.7654 123.057H91.6387C91.6387 123.057 91.0468 122.168 90.535 121.728C89.7693 121.07 88.9671 120.824 88.152 120.424C87.1331 119.923 85.7439 119.395 85.7439 119.395C85.7439 119.395 83.0692 121.586 81.0532 121.552C79.1082 121.52 76.5632 119.395 76.5632 119.395C76.5632 119.395 75.2474 120.054 74.3809 120.424C73.2093 120.924 72.5448 121.005 71.4962 121.728C70.8005 122.208 69.7654 123.057 69.7654 123.057Z"
							fill="white"
							stroke="black"
						/>
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
						<path
							d="M77.3659 118.241C77.1648 118.733 76.6886 119.42 76.6886 119.42C76.6886 119.42 79.0957 121.741 81.0281 121.803C83.0818 121.869 85.7189 119.42 85.7189 119.42C85.7189 119.42 85.176 118.708 84.9413 118.116C84.7223 117.564 84.7406 116.761 84.7406 116.761C84.7406 116.761 82.4569 117.59 81.0281 117.564C79.6837 117.539 77.7421 116.536 77.7421 116.536C77.7421 116.536 77.6242 117.61 77.3659 118.241Z"
							fill="white"
							stroke="black"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M47.0001 94.5L80.5001 71.5C80.5001 71.5 81.3826 71 82.0001 71C82.6175 71 83.5001 71.5 83.5001 71.5L116.5 94.5C116.5 94.5 119.5 96.8714 117 100C115.637 101.705 111.5 101 111.5 101V135H52.0001V101.148C52.0001 101.148 48.5001 102.5 46.5 99.5C44.5 96.5 47.0001 94.5 47.0001 94.5ZM82 82L54.5 100V132.5H109V100L82 82Z"
							fill="#2C82C9"
							stroke="black"
						/>
						<path
							d="M96.2823 124.477V131.962L65.7554 131.981V124.45C65.7554 124.45 65.9145 123.795 66.2161 123.529C66.4896 123.288 67.0847 123.186 67.0847 123.186H95.009C95.009 123.186 95.6455 123.36 95.9124 123.655C96.1489 123.916 96.2823 124.477 96.2823 124.477Z"
							fill="#2C82C9"
							stroke="black"
						/>
						<circle
							cx="80.8735"
							cy="130.582"
							r="1.34626"
							fill="white"
							stroke="black"
						/>
						<circle
							cx="76.9983"
							cy="108.398"
							r="1.06737"
							fill="black"
						/>
						<circle
							cx="85.4218"
							cy="108.398"
							r="1.06737"
							fill="black"
						/>
						<path
							d="M78.8542 112.369C78.8542 112.369 80.0994 113.22 81.0081 113.254C82.0078 113.291 83.4121 112.369 83.4121 112.369"
							stroke="black"
						/>
					</g>
					<g id="play" opacity="0.75" on:click={onplay}>
						<circle
							cx="304.893"
							cy="600"
							r="49.5"
							fill="#2CC990"
							stroke="black"
						/>
						<path
							d="M284.063 567.791C280.737 570.211 280.737 573.563 280.737 573.563V626.881C280.737 626.881 281.24 630.889 285.433 632.848C289.626 634.808 292.575 632.848 292.575 632.848L335.131 606.434C335.131 606.434 337.82 604.282 337.773 600.075C337.725 595.868 335.131 593.912 335.131 593.912L292.575 567.791C292.575 567.791 287.798 565.074 284.063 567.791Z"
							fill="white"
							stroke="black"
						/>
					</g>
				{/if}
			</g>
		{/each}

		{#if currentTask && currentTask.paused}
			<g id="paused" opacity="0.65" on:click={unpause}>
				<circle
					cx="217.785"
					cy="327.5"
					r="99.5"
					fill="#FCB941"
					stroke="black"
				/>
				<rect
					x="180.285"
					y="290"
					width="25"
					height="75"
					fill="white"
					stroke="black"
				/>
				<rect
					x="230.285"
					y="290"
					width="25"
					height="75"
					fill="white"
					stroke="black"
				/>
			</g>
		{/if}
		<foreignObject
			id="add-task-form"
			x="41"
			y="200"
			width="350"
			height="300"
		>
			<textarea bind:this={textarea} />
		</foreignObject>
		<g id="check_add" opacity="0.75" on:click={oncheckadd}>
			<circle cx="304" cy="600" r="49.5" fill="#2CC990" stroke="black" />
			<path
				d="M322.736 576.467L295.325 604.189L284.697 593.157C284.697 593.157 279.103 588.348 273.788 593.157C268.474 597.966 272.39 604.189 272.39 604.189L289.731 621.728C289.731 621.728 293.334 624.17 295.885 623.991C298.031 623.84 300.92 621.728 300.92 621.728L334.484 587.782C334.484 587.782 338.4 582.691 333.645 577.599C328.89 572.507 322.736 576.467 322.736 576.467Z"
				fill="white"
				stroke="black"
			/>
		</g>
	</svg>
</div>

<style>
	:global(body) {
		background-color: black;
	}

	#check, #playing, #play, #pause, #record, #stop, #cancel, #add, #reopen, #aspect {
		display: none;
	}
	.inactive #add, .inactive #play, .inactive #cancel {
		display: block;
	}
	.active #stop, .active #playing, .active #pause, .active #check, .active #cancel {
		display: block;
	}
	.rest #stop, .rest #play {
		display: block;
	}
	.creating #add-task-form, .creating #record, .creating #check, .creating #cancel {
		display: block;
	}
	.canceled #reopen, .canceled #canceled {
		display: block;
	}
	.completed #reopen, .completed #completed {
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
	.paused #aspect {
		opacity: 0.65;
	}
	.paused #title {
		opacity: 0.65;
	}
	.paused #pause {
		display: none;
	}
	.paused #check {
		display: none;
	}
	.paused #cancel {
		display: none;
	}
	#add-task-form {
		display: none;
	}
	.add-task #add-task-form {
		display: block;
	}
	.add-task #check_add {
		display: block;
	}
	#check_add {
		display: none;
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
	#check {
		display: none;
	}
	.playing #check {
		display: block;
	}
	/* slow blinking effect */
	.paused {
		animation: blink 1s infinite;
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
	.add-task #g1 {
		animation: moveToBottom var(--speed05) forwards;
	}
	.add-task #add-task-form {
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
