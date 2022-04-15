<script>
	import { translation as _ } from "./translation.js";
	import Login from "./components/Login.svelte";
	import Home from "./components/Home.svelte";
	import Router from "svelte-spa-router";

	let routes = {
		"/": Home,
		"/login": Login,
	};

</script>

<svg
	width="100%"
	height="100%"
	xmlns="http://www.w3.org/2000/svg"
	xmlns:xlink="http://www.w3.org/1999/xlink"
	class="background"
>
	<filter id="blurMe">
		<feGaussianBlur in="SourceGraphic" stdDeviation="2" />
	</filter>

	<image href="background.jpg" filter="url(#blurMe)" height="100%" />
</svg>

<div
	class="main"
>
	<svg
		height="100%"
		viewBox="0 0 432 768"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		xmlns:xlink="http://www.w3.org/1999/xlink"
	>
		<Router {routes} />
	</svg>
</div>

