<script>
	import { push } from "svelte-spa-router";
	import {
		tasksStore,
		CANCELED_STATUS,
		COMPLETED_STATUS,
		removeTask,
		reopenTask,
	} from "../store.js";
	import { translation as _ } from "../translation.js";

	let tasks = [];
	tasksStore.subscribe((value) => {
		tasks = value.filter(
			(task) =>
				task.status === CANCELED_STATUS ||
				task.status === COMPLETED_STATUS
		);
		// reverse array
		tasks.reverse();
	});

	function backhome() {
		push("/");
	}
	function remove(task) {
		removeTask(task);
	}
	function reopen(task) {
		reopenTask(task);
	}
</script>

<g id="CompletedList">
	<foreignObject x="20" y="20" width="432" height="612">
		<div class="scrollable">
			{#each tasks as task}
				<svg
					width="392"
					height="82"
					viewBox="0 0 392 82"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<filter id="blurTask">
						<feGaussianBlur in="SourceAlpha" stdDeviation="64" />
					</filter>
					<rect
						width="392"
						height="82"
						fill={task.status === COMPLETED_STATUS
							? "#2CC99040"
							: "#FC604240"}
					/>
					<foreignObject
						id="title"
						x="50"
						y="10"
						width="268"
						height="62"
					>
						<div
							xmlns="http://www.w3.org/1999/xhtml"
							class="completed-title"
						>
							<div>
								{task.title}
							</div>
						</div>
					</foreignObject>
					<g id="remove-task" opacity="0.75" on:click={remove(task)}>
						<circle
							cx="368"
							cy="41"
							r="15.5"
							fill="#FC6042"
							stroke="black"
						/>
						<path
							d="M365.1 31.313V33.6645H370.869V31.313L370.716 30.8346L370.147 30.6815H365.841L365.273 30.9111L365.1 31.313Z"
							fill="white"
						/>
						<path
							d="M370.869 33.6645H365.1H361.306L362.218 49.2544L362.775 50.5373L363.798 50.9092H372.369L373.429 50.3514L373.745 49.2544L374.786 33.6645H370.869Z"
							fill="white"
						/>
						<path
							d="M359.655 33.6645H361.306M365.1 33.6645V31.313L365.273 30.9111L365.841 30.6815H370.147L370.716 30.8346L370.869 31.313V33.6645M365.1 33.6645H370.869M365.1 33.6645H361.306M370.869 33.6645H374.786M376.385 33.6645H374.786M374.786 33.6645L373.745 49.2544L373.429 50.3514L372.369 50.9092H363.798L362.775 50.5373L362.218 49.2544L361.306 33.6645M364.449 36.2393L365.137 48.3433M367.981 48.3433V36.2393M371.57 36.2393L370.863 48.3433"
							stroke="black"
						/>
					</g>
					<g id="reopen-task" opacity="0.75" on:click={reopen(task)}>
						<circle
							cx="334"
							cy="41"
							r="15.5"
							fill="#2C82C9"
							stroke="black"
						/>
						<path
							d="M323.892 40.93C323.884 40.3828 323.892 39.5375 323.892 39.5375H327.767V40.9198C327.767 44.8798 331.072 47.2613 333.939 47.2613C337.394 47.2613 339.188 44.5134 339.188 44.5134L338.286 43.7677C338.286 43.7677 338.226 43.689 338.256 43.6335C338.286 43.5781 338.394 43.5981 338.394 43.5981H343.009V48.1387C343.009 48.1387 342.967 48.2977 342.889 48.3021C342.811 48.3066 342.675 48.1387 342.675 48.1387L341.899 47.2613C341.899 47.2613 339.192 51.0794 333.939 51.0794C328.575 51.0794 323.981 46.727 323.892 40.93Z"
							fill="white"
							stroke="black"
						/>
						<path
							d="M344.148 41.047C344.156 41.5942 344.148 42.4394 344.148 42.4394H340.273V41.0572C340.273 37.0972 336.968 34.7156 334.101 34.7156C330.646 34.7156 328.852 37.4635 328.852 37.4635L329.754 38.2093C329.754 38.2093 329.814 38.288 329.784 38.3434C329.754 38.3988 329.646 38.3789 329.646 38.3789L325.031 38.3789V33.8383C325.031 33.8383 325.073 33.6793 325.151 33.6748C325.229 33.6704 325.365 33.8383 325.365 33.8383L326.141 34.7156C326.141 34.7156 328.848 30.8975 334.101 30.8975C339.465 30.8975 344.058 35.25 344.148 41.047Z"
							fill="white"
							stroke="black"
						/>
					</g>
					{#if task.status === CANCELED_STATUS}
						<g id="canceled-task" opacity="0.75">
							<circle
								cx="26"
								cy="41"
								r="15"
								stroke="#FC6042"
								stroke-width="2"
							/>
							<path
								d="M21.0399 33.64C20.8429 33.6552 20.5599 33.8 20.5599 33.8L18.7999 35.56C18.7999 35.56 18.6399 35.8424 18.6399 36.04C18.6399 36.2376 18.7999 36.52 18.7999 36.52L23.1199 41L18.7999 45.32C18.7999 45.32 18.5027 45.5759 18.4799 45.8C18.46 45.9966 18.6399 46.28 18.6399 46.28L20.5599 48.2C20.5599 48.2 20.8164 48.4921 21.0399 48.52C21.3172 48.5547 21.6799 48.2 21.6799 48.2L25.9999 44.04L30.3199 48.2C30.3199 48.2 30.7031 48.3798 30.9599 48.36C31.1569 48.3449 31.4399 48.2 31.4399 48.2L33.3599 46.28C33.3599 46.28 33.5479 45.9956 33.5199 45.8C33.5002 45.6617 33.3599 45.48 33.3599 45.48L28.8799 41L33.3599 36.52C33.3599 36.52 33.5479 36.2356 33.5199 36.04C33.5002 35.9017 33.3599 35.72 33.3599 35.72L31.4399 33.8C31.4399 33.8 31.1575 33.64 30.9599 33.64C30.7623 33.64 30.4799 33.8 30.4799 33.8L25.9999 38.12L21.6799 33.8C21.6799 33.8 21.2968 33.6202 21.0399 33.64Z"
								fill="white"
								stroke="#FC6042"
								stroke-width="2"
							/>
						</g>
					{:else if task.status === COMPLETED_STATUS}
						<g id="completed-task" opacity="0.75">
							<circle
								cx="26.0006"
								cy="41"
								r="15"
								stroke="#2CC990"
								stroke-width="2"
							/>
							<path
								d="M31.9962 33.4695L23.2247 42.3405L19.8235 38.8103C19.8235 38.8103 18.0334 37.2714 16.3328 38.8103C14.6322 40.3491 15.8853 42.3405 15.8853 42.3405L21.4346 47.9528C21.4346 47.9528 22.5874 48.7344 23.4037 48.677C24.0906 48.6287 25.0148 47.9528 25.0148 47.9528L35.7554 37.0904C35.7554 37.0904 37.0085 35.461 35.4869 33.8316C33.9653 32.2023 31.9962 33.4695 31.9962 33.4695Z"
								fill="white"
								stroke="#2CC990"
								stroke-width="2"
							/>
						</g>
					{/if}
					<text
						id="title"
						x="304"
						y="78"
						font-size="22"
						fill="white"
					>
						{task
							? new Date(task.time)
									.toISOString()
									.substring(11, 11 + 8)
							: ""}
					</text>
				</svg>
			{/each}
		</div>
	</foreignObject>
	<g id="back_home" opacity="0.75" on:click={backhome}>
		<circle
			id="Ellipse 3"
			cx="71"
			cy="696"
			r="49.5"
			fill="#FCB941"
			stroke="black"
		/>
		<path
			id="Vector 21"
			d="M107.473 696.106C107.473 687.41 99.8757 688.142 99.8757 688.142H72.5053V673.129L32.6855 696.106L72.5053 719.357V704.802H99.8757C99.8757 704.802 107.473 704.802 107.473 696.106Z"
			fill="white"
			stroke="black"
		/>
	</g>
</g>
