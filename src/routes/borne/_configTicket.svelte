<script lang="ts">
	import type { TicketConfig } from '$lib/borne_config';

	export let config:TicketConfig;
</script>

<fieldset class="col-md-12">
	<div class="row">
		<div class="form-label col-12 mb-0">
			<div class="input-group">
				<label class="col-12">
					<input type="checkbox" bind:checked={config.print} />
					Imprimer un ticket en cas de présentation d'un passe valide.
				</label>
				<div class="form-floating col-12  font-monospace text-muted">
					<textarea
						bind:value={config.header}
						class="form-control"
						placeholder={'Bienvenue dans notre établissement.'}
						id="ticket_header"
						style="height: 7em"
					/>
					<label for="ticket_header">Entête</label>
				</div>
				<div class="form-floating col-12  font-monospace text-muted">
					<textarea
						bind:value={config.footer}
						class="form-control"
						placeholder={'Merci de votre visite.'}
						id="ticket_footer"
						style="height: 7em"
					/>
					<label for="ticket_footer">Pied de page</label>
				</div>
			</div>
		</div>
	</div>
</fieldset>
