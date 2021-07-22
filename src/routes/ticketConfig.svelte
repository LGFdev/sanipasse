<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { writable } from "svelte/store";
  import { Row } from 'sveltestrap';

  let header: String;
  let footer: String;

  onMount(() => {
    header = writable(localStorage.getItem("header") || "");
    header.subscribe(val => localStorage.setItem("header", val));
    footer = writable(localStorage.getItem("footer") || "");
    footer.subscribe(val => localStorage.setItem("footer", val));
  })
</script>

<main class="mb-2">
  <h1>Configuration du ticket</h1>
  <p>
    <label for='ticketHeader'>En tête</label> <br>
    <textarea bind:value={$header} id='ticketHeader'></textarea>
  </p>
  <p>
    <label for='ticketFooter'>Pied de page</label> <br>
    <textarea bind:value={$footer} id='ticketFooter'></textarea>
  </p>
</main>

<Row>
  <a href='/import/video' class="btn btn-primary" >📸 Scanner un certificat</a>
</Row>

<style>
	main, a {
		max-width: 512px;
		margin: 1em auto;
	}
</style>