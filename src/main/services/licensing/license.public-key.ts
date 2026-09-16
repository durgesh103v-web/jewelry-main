/**
 * Embedded Public Verification Key for Jewellery ERP Licensing.
 *
 * CRITICAL SECURITY ARCHITECTURE:
 * - This file contains ONLY the public Ed25519 verification key.
 * - The private signing key is NEVER embedded in the desktop application,
 *   repository, or renderer. It resides exclusively on the secure licensing server.
 */

export const LICENSE_ED25519_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA7zZgIn7mwFObPcsy5dkTO9385L1sxjBwOhXICPbdQnw=
-----END PUBLIC KEY-----`
