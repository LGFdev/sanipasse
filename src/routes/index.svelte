<script lang="ts">
	import invitedTo from './_invitedToStore';
	import { Row } from 'sveltestrap';
	import Wallet from './wallet.svelte';
	import ShowPromiseError from './_showPromiseError.svelte';
	let links = [
		{ href: '/import/video', text: '📸 Scanner un certificat' },
		{ href: '/ticketConfig', text: '🎫 Configurer le ticket à imprimer' },
		{ href: '/import/file', text: '📁 Importer un fichier' },
		{ href: '/import/text', text: '🔗 Entrer un lien TousAntiCovid' }
	];
	if ($invitedTo.eventId)
		links = links.map((l) => ({ ...l, href: `${l.href}#${$invitedTo.eventId}` }));
</script>

<svelte:head>
	{#if $invitedTo.event}
		<title>Sanipasse: “{$invitedTo.event.name}”</title>
	{:else}
		<title>Sanipasse: Vérification de pass sanitaire</title>
	{/if}
	<meta
		name="description"
		content="Sanipasse permet de vérifier les certificats de test et de vaccination,
et d’organiser des évènements en toute sécurité."
	/>
</svelte:head>

<header>
	<h1>Bienvenue sur Sanipasse</h1>

	<ShowPromiseError promise={$invitedTo.promise} />

	{#if $invitedTo.eventId}
		<p>
			Ceci est une invitation à l’évènement
			<i class="bg-light">{$invitedTo.event?.name || '...'}</i>, qui aura lieu le
			{$invitedTo.event ? new Date($invitedTo.event.date).toLocaleString('fr') : '...'}.
		</p>
		<p>
			Pour confirmer votre participation, vous devez scanner un certificat de test de moins de 72h,
			ou un certificat de vaccination (de seconde dose si le vaccin en demande deux).
		</p>
		<p>
			Votre passe sanitaire est <a href="apropos#donnees">strictement privée</a>. Il ne sera
			<b>pas conservé</b>
			sur notre serveur, <b>ni visible</b> par l’organisateur de l’événement.
		</p>
	{:else}
		<p>
			Sanipasse est un logiciel libre de vérification des certificats de test ou de vaccination, et
			d’organisation d’événements respectueux des règles sanitaires.
		</p>
		<p>
			La vérification proposée ci-dessous est <a href="apropos#donnees">strictement privée</a>, et
			vos données ne quittent jamais votre appareil.
		</p>
	{/if}
</header>

{#each links as { href, text }, i (href)}
	<Row>
		<a {href} class="btn" class:btn-primary={i == 0}>{text}</a>
	</Row>
{/each}

<footer class="mb-2">
	{#if !$invitedTo.eventId}
		<p>
			Vous pouvez également <i>Créer un événement</i>, pour construire une
			<a href="apropos#liste">liste d’invités zéro-COVID</a>. Sanipasse générera un lien privé à
			envoyer à vos invités, depuis lequel ils pourront confirmer leur participation en validant
			leur passe sanitaire.
		</p>
		<Row>
			<a href="events" class="btn btn-primary">📅 Créer un évènement</a>
		</Row>
	{/if}
	<Wallet />
</footer>

<style>
	a,
	header,
	footer {
		max-width: 512px;
		margin: 1em auto;
	}
</style>
