import type { RequestHandler } from '@sveltejs/kit';
import { findCertificateError, parse_any } from '$lib/detect_certificate';
import { ApiKeys } from '$lib/database';

const ACCEPTED_KEYS = new Set((process.env['ACCEPTED_KEYS'] || '').split(','));

interface Input {
	code: string;
	key: string;
}

type Output = {
	validated?: boolean;
	error?: string;
};

interface Endpoint extends RequestHandler<any, Input, Output> {}

export const post: Endpoint = async ({ body: { code, key } }) => {
	if (!code || !key)
		return {
			status: 400,
			body: {
				error: `Expected JSON body parameters: {code: string, key: string }`
			}
		};

	if (!ACCEPTED_KEYS.has(key)) {
		console.log(`API key '${key}' not accepted`);
		return {
			status: 403,
			body: { error: `Invalid API key '${key}'. contact@ophir.dev to get an API key.` }
		};
	}

	save_request(key); // Do not await on the db operation, proceed immediately.

	let validated = false;
	let error: string | undefined;
	let person:
		| { first_name: string; last_name: string; date_of_birth: Date }
		| undefined = undefined;
	try {
		const parsed = await parse_any(code); // Will resolve as an error if the signature is invalid
		person = {
			first_name: parsed.first_name,
			last_name: parsed.last_name,
			date_of_birth: parsed.date_of_birth
		};
		error = findCertificateError(parsed);
	} catch (err) {
		error = err.message;
	}
	if (!error) validated = true;
	return { status: 200, body: { validated, error, person } };
};

async function save_request(api_key: string) {
	const used_at = new Date();
	const usage_record = { api_key, used_at };
	await (await ApiKeys).create(usage_record);
	console.log(`Recorded usage of API key '${api_key}'`);
}
