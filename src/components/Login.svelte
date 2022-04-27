<script>
	import { push } from "svelte-spa-router";
	import { userStore, login, logout } from "../store.js";
	import { translation as _ } from "../translation.js";

	let email;
	let password;

	let user = {};
	userStore.subscribe((value) => {
		user = value;
		if (user.email) {
			email = user.email;
		}
	});

	async function onsubmit() {
		try {
			await login(email, password);
			push("/");
		} catch (err) {
			console.log(err);
		}
	}

	function onlogout() {
		logout();
		push("/");
	}

	function back() {
		push("/");
	}
</script>

<g id="Login">
	<foreignObject x="41" y="200" width="350" height="400">
		<form on:submit|preventDefault={onsubmit}>
			<input
				placeholder={_("email")}
				bind:value={email}
				autocorrect="off"
				autocapitalize="none"
			/>
			<input
				placeholder={_("password")}
				type="password"
				bind:value={password}
			/>
			<button type="submit">{_("Ingresar")}</button>
			{#if user.email}
				<button type="reset" on:click={onlogout}>{_("Salir")}</button>
			{/if}
		</form>
	</foreignObject>
	<g id="check" opacity="0.75">
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
	<g opacity="0.75" on:click={back}>
		<circle
			id="Ellipse 3"
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
</g>
