<script lang="ts">
import { onMount, afterUpdate } from 'svelte';
import { writable } from "svelte/store";

let header: String;
let footer: String;

let type: String;
let first_name: String;
let last_name: String;
let date_of_birth: Date;
onMount(() => {
  const urlParams = new URLSearchParams(window.location.search);
  type = urlParams.get('type');
  first_name = urlParams.get('first_name');
  last_name = urlParams.get('last_name');
  date_of_birth = urlParams.get('date_of_birth');

  header = writable(localStorage.getItem("header") || undefined);
  footer = writable(localStorage.getItem("footer") || undefined);
})

afterUpdate(() => {
  setTimeout(()=>{
    window.print()
    window.close()
  }, 500)
})
</script>

<body>
{#if undefined != $header}
<header>
  <pre>{$header}</pre>
</header>
{/if}
<article>
  <p>👤 {first_name} {last_name}</p>
  <p>🎂 Né(e) le {date_of_birth}</p>
  <p>✓ Vérifié le {new Date().toLocaleString('fr-FR')}</p>
  <p>📱 Tél: <input></p>
</article>
{#if undefined != $footer}
<footer>
  <pre>{$footer}</pre>
</footer>
{/if}
</body>

<style>
body{
  width: 70mm;
  position: absolute;
  top: 5mm;
  left: 5mm;
}
p{
  padding: 0;
  margin: 1mm;
}
input{
  border: none;
  border-bottom: 0.5mm dotted black;
  width: 50mm;
}
article{
  margin: 2mm 0;
}
header pre,
footer pre{
  text-align: center;
}
</style>