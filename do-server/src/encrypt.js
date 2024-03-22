import { Buffer } from 'node:buffer';

const encryptSymmetric = async (plaintext, key) => {
	// create a random 96-bit initialization vector (IV)
	const iv = crypto.getRandomValues(new Uint8Array(12));

	// encode the text you want to encrypt
	const encodedPlaintext = new TextEncoder().encode(plaintext);

	// prepare the secret key for encryption
	const secretKey = await crypto.subtle.importKey(
		'raw',
		Buffer.from(key, 'base64'),
		{
			name: 'AES-GCM',
			length: 256,
		},
		true,
		['encrypt', 'decrypt']
	);

	// encrypt the text with the secret key
	const ciphertext = await crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv,
		},
		secretKey,
		encodedPlaintext
	);

	// return the encrypted text "ciphertext" and the IV
	// encoded in base64
	return {
		ciphertext: Buffer.from(ciphertext).toString('base64'),
		iv: Buffer.from(iv).toString('base64'),
	};
};

const decryptSymmetric = async (ciphertext, iv, key) => {
	// prepare the secret key
	const secretKey = await crypto.subtle.importKey(
		'raw',
		Buffer.from(key, 'base64'),
		{
			name: 'AES-GCM',
			length: 256,
		},
		true,
		['encrypt', 'decrypt']
	);

	// decrypt the encrypted text "ciphertext" with the secret key and IV
	const cleartext = await crypto.subtle.decrypt(
		{
			name: 'AES-GCM',
			iv: Buffer.from(iv, 'base64'),
		},
		secretKey,
		Buffer.from(ciphertext, 'base64')
	);

	// decode the text and return it
	return new TextDecoder().decode(cleartext);
};

// create or bring your own base64-encoded encryption key
const generateKey = () => {
	return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
};

export { encryptSymmetric, decryptSymmetric, generateKey };
