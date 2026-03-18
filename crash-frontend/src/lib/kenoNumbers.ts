/**
 * kenoNumbers.ts
 *
 * Client-side implementation of the keno number generation algorithm.
 * Must match crash-backend/game/keno.go GenerateKenoNumbers exactly.
 *
 * Used for post-game verification: once the server reveals serverSeed,
 * the user can run this in the browser console to confirm the drawn numbers.
 */

const MASK64 = (1n << 64n) - 1n; // 0xffffffffffffffff

/**
 * Derives two 32-bit hash values from serverSeed + clientSeed using SHA-256.
 * Matches the Go: binary.BigEndian.Uint32(SHA256(serverSeed+":"+clientSeed)[0:4/4:8])
 */
export async function deriveHashes(
  serverSeed: string,
  clientSeed: string
): Promise<{ hash1: number; hash2: number }> {
  const combined = serverSeed + ':' + clientSeed;
  const encoded = new TextEncoder().encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const view = new DataView(hashBuffer);
  return {
    hash1: view.getUint32(0, false), // big-endian, bytes 0-3
    hash2: view.getUint32(4, false), // big-endian, bytes 4-7
  };
}

/**
 * Deterministic xorshift64* PRNG + partial Fisher-Yates over [1..40].
 * Returns 10 unique numbers — same result as the Go backend for identical seeds.
 *
 * @param hash1  First 32 bits derived from SHA-256(serverSeed:clientSeed)
 * @param hash2  Next 32 bits from the same hash
 */
export function generateNumbers(hash1: number, hash2: number): number[] {
  let seed = (BigInt(hash1) << 32n | BigInt(hash2)) & MASK64;

  function rand(): number {
    seed = (seed ^ (seed << 13n)) & MASK64;
    seed = (seed ^ (seed >> 7n)) & MASK64;
    seed = (seed ^ (seed << 17n)) & MASK64;
    return Number(seed & 0xffffffffn) / 0xffffffff;
  }

  const arr = Array.from({ length: 40 }, (_, i) => i + 1);

  for (let i = 0; i < 10; i++) {
    const j = i + Math.floor(rand() * (40 - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.slice(0, 10);
}

/**
 * Convenience: given both seeds, derives hashes and generates numbers in one call.
 */
export async function verifyKenoGame(
  serverSeed: string,
  clientSeed: string
): Promise<number[]> {
  const { hash1, hash2 } = await deriveHashes(serverSeed, clientSeed);
  return generateNumbers(hash1, hash2);
}
