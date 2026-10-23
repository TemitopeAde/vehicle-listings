// The Wix production worker has no node:crypto; a static import fails every API route that
// loads it. These use the Web Crypto globals and match Node's hex output, so stored IDs stay stable.
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return hex(new Uint8Array(digest));
}

export function randomHex(byteLength: number) {
  return hex(crypto.getRandomValues(new Uint8Array(byteLength)));
}
