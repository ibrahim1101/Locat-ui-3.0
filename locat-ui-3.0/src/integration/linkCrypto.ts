/** Adapted from original Locat src/lib/link.ts. Browser crypto, not native secure storage. */
import { encodeBase64, decodeBase64 } from "./privateStoreCrypto";
const b64decode = decodeBase64;
const b64encode = (input: ArrayBuffer | Uint8Array) => encodeBase64(input instanceof Uint8Array ? input : new Uint8Array(input));
const te = new TextEncoder();

export type DeviceIdentity = { privateKey: CryptoKey; publicKey: CryptoKey; publicKeyB64: string };

export async function generateDeviceIdentity(): Promise<DeviceIdentity> {
  if (!globalThis.crypto?.subtle) throw new Error("Secure context required for Locat Link.");
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  return { privateKey: pair.privateKey, publicKey: pair.publicKey, publicKeyB64: b64encode(spki) };
}

export async function importDevicePublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("spki", b64decode(b64) as BufferSource, { name: "ECDH", namedCurve: "P-256" }, true, []);
}

async function ecdhBits(myPriv: CryptoKey, theirPubB64: string): Promise<ArrayBuffer> {
  const pub = await importDevicePublicKey(theirPubB64);
  return crypto.subtle.deriveBits({ name: "ECDH", public: pub }, myPriv, 256);
}

/** AES-GCM transfer/clipboard key shared by the two paired devices. */
export async function deviceSharedKey(myPriv: CryptoKey, theirPubB64: string, userId: string, pairId: string): Promise<CryptoKey> {
  const bits = await ecdhBits(myPriv, theirPubB64);
  const base = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", salt: te.encode("locat-ui3-link:v1"), info: te.encode(JSON.stringify([userId, pairId])), hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Non-exportable, pair-scoped key for local transfer fingerprints. */
export async function deviceTransferFingerprintKey(myPriv:CryptoKey,theirPubB64:string,userId:string,pairId:string):Promise<CryptoKey>{
  const bits=await ecdhBits(myPriv,theirPubB64);
  let base:CryptoKey;
  try{base=await crypto.subtle.importKey('raw',bits,'HKDF',false,['deriveKey']);}finally{new Uint8Array(bits).fill(0);}
  return crypto.subtle.deriveKey(
    {name:'HKDF',salt:te.encode('locat-ui3-link:v1'),info:te.encode(JSON.stringify(['locat-ui3-link:v1',userId,pairId,'file-fingerprint'])),hash:'SHA-256'},
    base,
    {name:'HMAC',hash:'SHA-256',length:256},
    false,
    ['sign'],
  );
}

/**
 * Six-digit Short Authentication String over the SORTED pair of public keys.
 * Order-independent so both devices compute the same value; MITM key swap
 * changes it. Pure given WebCrypto digest.
 */
export async function pairingSas(pubA: string, pubB: string, pairId: string): Promise<string> {
  const [lo, hi] = [pubA, pubB].sort();
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(JSON.stringify(["locat-ui3-link-sas:v1", pairId, lo, hi]))));
  return Array.from(digest.slice(0, 5), byte => byte.toString(16).padStart(2, "0").toUpperCase()).join("").match(/.{1,5}/g)!.join("-");
}
/** Decrypt a fresh server challenge; proves possession of this device's ECDH key. */
export async function solveDeviceChallenge(identity: DeviceIdentity, challenge: {
  id: string; deviceId: number; userId: string; publicKey: string; iv: string; data: string;
}): Promise<string> {
  const context = `locat-link-device-proof:ui3-v1:${challenge.userId}:${challenge.deviceId}:${challenge.id}`;
  const bits = await ecdhBits(identity.privateKey, challenge.publicKey);
  const base = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: te.encode(context), info: te.encode("challenge-response") }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64decode(challenge.iv) as BufferSource,
    additionalData: te.encode(context) }, key, b64decode(challenge.data) as BufferSource);
  return b64encode(plain);
}

