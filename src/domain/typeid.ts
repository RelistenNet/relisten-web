// TypeIDs (https://github.com/jetify-com/typeid): a prefix, then a UUIDv7 as 26
// characters of Crockford base32. The User Service takes client-generated IDs for
// everything a client creates, and accepts only version 7 (RelistenApi:
// Relisten.Accounts.Contracts/Identifiers). Works in the browser and on the server.

export type TypeIdPrefix =
  | 'playlist'
  | 'playlist_segment'
  | 'playlist_entry'
  | 'playlist_operation'
  | 'command';

const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const SUFFIX = /^[0-7][0-9a-hjkmnp-tv-z]{25}$/;

/**
 * The 26-character suffix for 16 bytes: 130 bits, the first two always zero, so
 * the first character is 0–7. Bit by bit, because the target predates BigInt.
 */
function encode(bytes: Uint8Array): string {
  let out = '';
  for (let c = 0; c < 26; c++) {
    let value = 0;
    for (let b = 0; b < 5; b++) {
      const bit = c * 5 + b - 2;
      value = (value << 1) | (bit < 0 ? 0 : (bytes[bit >> 3] >> (7 - (bit & 7))) & 1);
    }
    out += ALPHABET[value];
  }
  return out;
}

/** A new UUIDv7 (millisecond timestamp, then random bits), as bytes. */
function uuidv7(now: number): Uint8Array {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  for (let i = 0; i < 6; i++) bytes[i] = Math.floor(now / 2 ** (8 * (5 - i))) % 256;
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 9562 variant
  return bytes;
}

export function newTypeId<P extends TypeIdPrefix>(prefix: P, now = Date.now()): `${P}_${string}` {
  return `${prefix}_${encode(uuidv7(now))}`;
}

/** The TypeID for a UUID (`0188bac7-4afa-…`): for the shared vectors, which check the encoding. */
export function typeIdForUuid(prefix: string, uuid: string): string {
  const hex = uuid.replaceAll('-', '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return `${prefix}_${encode(bytes)}`;
}

/** Whether `id` is a well-formed TypeID with this prefix (the suffix's alphabet and range). */
export function isTypeId(id: string, prefix: TypeIdPrefix): boolean {
  return id.startsWith(`${prefix}_`) && SUFFIX.test(id.slice(prefix.length + 1));
}
