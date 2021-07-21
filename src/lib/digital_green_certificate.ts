/**
 * Digital Green Certificate is a standard that was defined by the EU in an attempt
 * to standardize vaccination, tests and recovery proofs across member states.
 * All the specifications are available here: https://ec.europa.eu/health/ehealth/covid-19_en
 *
 * This GitHub repo provides an overview of how it works: https://github.com/ehn-dcc-development/hcert-spec
 *
 * In a nutshell, data is encoded in the following way: QRCode(ZLIB(COSE_signed(CBOR(payload))))
 * (the ZLIB step is optional)
 *
 * The payload schema can be found here: https://github.com/ehn-digital-green-development/ehn-dgc-schema/
 */
import { X509Certificate } from '@peculiar/x509';
import Ajv from 'ajv/dist/2020.js'; // .js extension seems required to build successfully :(
import { decode as decodeb45 } from 'base45-ts';
import { Buffer } from 'buffer';
import { verify } from 'cosette/build/sign.js';
import * as cbor from 'cbor-web';
import { inflate } from 'pako';
import DCCSchema from '../assets/DCC.combined-schema.1.3.0.json';
import DCCCerts from '../assets/dccCerts.json';
import type { HCert } from './digital_green_certificate_types';
import type { CommonCertificateInfo } from './common_certificate_info';
import crypto from 'isomorphic-webcrypto';

interface UnsafeDGC {
	hcert: HCert;
	kid: string;
	issuer: string | null;
	issuedAt: number | null;
	expiresAt: number | null;
}

/**
 * Per specification, a DSC is a certificate that contains
 * a public key used to sign DGCs.
 */
interface DSC {
	serialNumber: string;
	subject: string;
	// This is the CSCA. Per specification, a CSCA is a root
	// certificate authority of a member state.
	issuer: string;
	notBefore: string;
	notAfter: string;
	signatureAlgorithm: string;
	fingerprint: string;
	signature: string;
	publicKeyAlgorithm: string;
	publicKeyFingerprint: string;
	publicKeyPem: string;
}

export class DgcError extends Error {
	dgc: UnsafeDGC;
	constructor(dgc: UnsafeDGC) {
		super(`Ce certificat est invalide: ${JSON.stringify(dgc, null, '\t')}`);
		this.dgc = dgc;
	}
}
export class DgcIssuedInFutureError extends DgcError {
	name = 'Date de signature dans le futur';
}
export class ExpiredDgcError extends DgcError {
	name = 'Signature expirée';
}
export class UnknownKidError extends DgcError {
	name = 'Signataire non reconnu';
}
export class InvalidCertificateError extends DgcError {
	name = 'Certificat de signature invalide';
}

export interface DGC extends UnsafeDGC {
	certificate: DSC;
	code: string;
}

const COSE_HEADERS = Object.freeze({
	KID: 4
});

// As per https://ec.europa.eu/health/sites/default/files/ehealth/docs/digital-green-certificates_v3_en.pdf
// Section 2.6.3
const CWT_CLAIMS = Object.freeze({
	ISSUER: 1,
	EXPIRATION: 4,
	ISSUED_AT: 6,
	HCERT: -260
});

export const DGC_PREFIX = 'HC1:';

async function extractCoseFromQRCode(qrCode: string): Promise<Uint8Array> {
	// Strip prefix
	if (!qrCode.startsWith(DGC_PREFIX)) {
		throw new Error('HCERT must start with HC1:');
	}
	qrCode = qrCode.replace(DGC_PREFIX, '');

	// Base45
	let coseData = decodeb45(qrCode);

	// ZLIB
	try {
		coseData = inflate(coseData);
	} catch (err) {
		// Probably not ZLIBed, that's OK
	}

	return coseData;
}

/**
 * Parse the COSE data without any signature check.
 */
async function unsafeDGCFromCoseData(rawCoseData: Uint8Array): Promise<UnsafeDGC> {
	// COSE is just some CBOR-serialized data.
	const coseData = await cbor.decodeFirst(rawCoseData);
	const coseValue = coseData?.value;
	if (!coseValue || !Array.isArray(coseValue) || coseValue.length !== 4) {
		throw Error('Unexpected COSE data. DGC is probably invalid.');
	}
	const [phdrsData, _uhdrs, cosePayload, _signers] = coseValue;

	// Extract the KID and the payload
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const phdrs: Map<number, any> = await cbor.decodeFirst(phdrsData);
	const rawKid = phdrs.get(COSE_HEADERS.KID);
	if (!rawKid) {
		throw Error('Cannot find a KID in COSE Data. DGC is probably invalid.');
	}
	const kid = Buffer.from(rawKid).toString('base64');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const cborData: Map<number, any> = await cbor.decodeFirst(cosePayload);

	// Validate the payload against the JSON schema.
	const hcert = cborData.get(CWT_CLAIMS.HCERT)?.get(1) || {};
	const ajv = new Ajv();
	// Enhance the validator with their custom properties:
	const dateValidator = (s: string) => !isNaN(Date.parse(s));
	ajv.addFormat('date', dateValidator);
	ajv.addFormat('date-time', dateValidator);
	ajv.addKeyword('valueset-uri'); // We won't validate that.
	const hcertValid = ajv.validate(DCCSchema, hcert);
	if (!hcertValid) {
		const validationErrors = ajv.errors?.map((err) => err.message).join('\n');
		throw Error(`DGC validation failed:\n${validationErrors}.`);
	}

	return {
		hcert,
		kid,
		issuer: cborData.get(CWT_CLAIMS.ISSUER) || null,
		issuedAt: cborData.get(CWT_CLAIMS.ISSUED_AT) || null,
		expiresAt: cborData.get(CWT_CLAIMS.EXPIRATION) || null
	};
}

async function exportPublicKeyToPEM(pk: CryptoKey): Promise<string> {
	const spki = await crypto.subtle.exportKey('spki', pk);

	let pem = Buffer.from(spki).toString('base64');
	// Non-null assertion should be safe here because PEM are never empty.
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	pem = pem.match(/.{1,64}/g)!.join('\n');
	pem = `-----BEGIN PUBLIC KEY-----\n${pem}\n-----END PUBLIC KEY-----`;

	return pem;
}

/**
 * Verifies the CWT claims of the DGC.
 */
async function verifyDGCClaims(dgc: UnsafeDGC): Promise<void> {
	const now = Math.floor(Date.now() / 1000);

	if (dgc.issuedAt !== null && now < dgc.issuedAt) throw new DgcIssuedInFutureError(dgc);

	if (dgc.expiresAt !== null && dgc.expiresAt < now) throw new ExpiredDgcError(dgc);
}

/**
 * Find the DSC that matches this DSC KID.
 */
async function findDGCPublicKey(
	dgc: UnsafeDGC
): Promise<{ certificate: DSC; public_key: CryptoKey }> {
	// Find the KID in known DSCs
	if (!(dgc.kid in DCCCerts)) throw new UnknownKidError(dgc);

	const pem = DCCCerts[dgc.kid as keyof typeof DCCCerts];
	const x509cert = new X509Certificate(pem);
	const public_key = await x509cert.publicKey.export(crypto);

	// Export the certificate data.
	const certificate = {
		serialNumber: x509cert.serialNumber,
		subject: x509cert.subject,
		issuer: x509cert.issuer,
		notBefore: x509cert.notBefore.toISOString(),
		notAfter: x509cert.notAfter.toISOString(),
		signatureAlgorithm: x509cert.signatureAlgorithm.name,
		signature: Buffer.from(x509cert.signature).toString('base64'),
		fingerprint: Buffer.from(await x509cert.getThumbprint(crypto)).toString('hex'),
		publicKeyAlgorithm: x509cert.publicKey.algorithm.name,
		publicKeyFingerprint: Buffer.from(await x509cert.publicKey.getThumbprint(crypto)).toString(
			'hex'
		),
		publicKeyPem: await exportPublicKeyToPEM(public_key)
	};

	// Verify that the certificate is still valid.
	const now = new Date();
	if (now > x509cert.notAfter || now < x509cert.notBefore) throw new InvalidCertificateError(dgc);

	return { certificate, public_key };
}

/**
 * Verify that the DGC is authentic:
 *   - Check that the certificate is still valid
 *   - Check the COSE signature
 *   - Check the CWT claims
 */
async function verifyDGC(dgc: UnsafeDGC, rawCoseData: Uint8Array, code: string): Promise<DGC> {
	await verifyDGCClaims(dgc);
	const { certificate, public_key } = await findDGCPublicKey(dgc);
	await verify(rawCoseData, { key: public_key });
	return { ...dgc, certificate, code };
}

function getCertificateInfo(cert: DGC): CommonCertificateInfo {
	const hcert = cert.hcert;
	const common = {
		first_name: hcert.nam.gn || (hcert.nam.gnt || '-').replace(/</g, ' '),
		last_name: hcert.nam.fn || hcert.nam.fnt.replace(/</g, ' '),
		date_of_birth: new Date(hcert.dob),
		code: cert.code,
		source: { format: 'dgc', cert }
	} as const;
	if (hcert.v && hcert.v.length) {
		return {
			type: 'vaccination',
			vaccination_date: new Date(hcert.v[0].dt),
			prophylactic_agent: hcert.v[0].vp,
			doses_received: hcert.v[0].dn,
			doses_expected: hcert.v[0].sd,
			...common
		};
	}
	if (hcert.t && hcert.t.length) {
		return {
			type: 'test',
			test_date: new Date(hcert.t[0].sc),
			// 260415000=not detected: http://purl.bioontology.org/ontology/SNOMEDCT/260415000
			is_negative: hcert.t[0].tr === '260415000',
			...common
		};
	}
	if (hcert.r && hcert.r.length) {
		return {
			type: 'test',
			test_date: new Date(hcert.r[0].fr), // date of positive test
			is_negative: false,
			...common
		};
	}
	throw new Error('Unsupported or empty certificate: ' + JSON.stringify(cert));
}

export async function parse(doc: string): Promise<CommonCertificateInfo> {
	const rawCoseData = await extractCoseFromQRCode(doc);

	// We need to parse COSE data without verifying signature first:
	//   - to get the KID that was used
	//   - to allow inspection of the data on invalid signature as
	// 	   cosette doesn't seem to permit that yet.
	const unsafe_dgc = await unsafeDGCFromCoseData(rawCoseData);
	const dgc = await verifyDGC(unsafe_dgc, rawCoseData, doc);
	return getCertificateInfo(dgc);
}
