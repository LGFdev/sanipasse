<script type="ts">
	import { Alert, Icon, Row, Col } from 'sveltestrap';
	import { findCertificateError } from '$lib/detect_certificate';
	import { printTicket } from '$lib/ticket';
	import type { CommonCertificateInfo } from '$lib/common_certificate_info';
	import Certificate2ddocDetails from './_Certificate2ddocDetails.svelte';
	import CertificateDgcDetails from './_CertificateDGCDetails.svelte';
	import { afterUpdate, createEventDispatcher } from 'svelte';
	import { assets } from '$app/paths';
	export let info: CommonCertificateInfo;
	export let with_fullscreen = false;
	export let allreadyPrinted = false;
	const dispatch = createEventDispatcher();
	$: error = findCertificateError(info);
	$: source = info.source;
	async function launchPrint(){
		// check if allready printed or not
		if(allreadyPrinted){
			console.log("Allready printed");
		}else{
			console.log("Printing");
			printTicket(
				info.first_name.toLocaleLowerCase() + " " + info.last_name,
  			info.date_of_birth.toLocaleDateString('fr')
			)
		}
	}
	async function scheduleAutoCloseResult(delay: number){
		setTimeout(()=>{
			dispatch('close');
		}, delay);
	}
	afterUpdate(() => {
		// if there is no error, certificat is valid, so printing.
		if(undefined == error){
			launchPrint();
			scheduleAutoCloseResult(4000);
		}else{
			scheduleAutoCloseResult(5000);
		}
	})
</script>

<Alert color={error ? 'warning' : 'info'} fade={false}>
	{#if with_fullscreen}
		<a style="float:right" href="/fullscreen#{encodeURIComponent(info.code)}">
			<Icon name="arrows-fullscreen" />
		</a>
	{/if}
	<Row>
		<div class="col-sm-0 col-md-3 text-center align-middle emoji">
			{info.type === 'vaccination' ? '💉' : '🧪'}
		</div>
		<Col sm="12" md="9" class="printed">
			<h4>
				{info.type === 'vaccination'
					? 'Vaccin'
					: info.type === 'test'
					? 'Test de dépistage'
					: 'Certificat de rétablissement'}
			</h4>
			<p>
				👤
				<span class="first_name">{info.first_name.toLocaleLowerCase()}</span>
				<span class="last_name">{info.last_name}</span>
			</p>
			<p>🎂 Né(e) le {info.date_of_birth.toLocaleDateString('fr')}</p>
		</Col>
	</Row>
	<Row>
		{#if error}
			<div class="error">
				<!-- svelte-ignore a11y-media-has-caption -->
				<audio autoplay src="{assets}/invalid.mp3" />
				<p class="ronded_icon">✖</p>
				<p>⚠️ <strong>{error}</strong></p>
			</div>
		{:else}
			<div class="valid">
				<!-- svelte-ignore a11y-media-has-caption -->
				<audio autoplay src="{assets}/valid.mp3" />
				<p class="ronded_icon">✓</p>
				<p>Passe valide. Prener votre ticket.</p>
			</div>
		{/if}
		<details>
			{#if source.format === '2ddoc'}
				<Certificate2ddocDetails certificate={source.cert} />
			{:else}
				<CertificateDgcDetails certificate={source.cert} />
			{/if}
		</details>
	</Row>
</Alert>

<style>
	.first_name {
		text-transform: capitalize;
	}
	p {
		margin-bottom: 0.5rem;
	}
	.emoji {
		font-size: 3.5em;
		margin: auto;
	}

	.ronded_icon{
		width: 20rem;
		height: 20rem;
		border-radius: 50%;
		text-align: center;
		display: block;
		margin: 0 auto;
	}
	.error p.ronded_icon{
		background-color: #ff0000;
		font-size: 12rem;
	}
	.error p{
		background-color: #ffa100;
		color: black;
		font-size: 1.5rem;
		text-align: center;
	}
	.valid p.ronded_icon{
		background-color: #0dff00;
		font-size: 12rem;
	}
	.valid p{
		font-size: 1.5rem;
		text-align: center;
	}
</style>
