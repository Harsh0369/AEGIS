/**
 * MeshLink — Default Configuration
 *
 * Central configuration constants for the mesh network.
 * All tunable values live here to prevent magic numbers in the codebase.
 */

/** Protocol version for all packets */
export const PROTOCOL_VERSION = 1;

/** Default TTL (hop limit) for new packets */
export const DEFAULT_TTL = 10;

/** Maximum allowed TTL value */
export const MAX_TTL = 32;

/** Maximum payload size in bytes */
export const MAX_PAYLOAD_SIZE = 65536; // 64 KB

/** Maximum frame size for TCP framing (header + payload) */
export const MAX_FRAME_SIZE = 131072; // 128 KB

/** Frame header size: 4 bytes for big-endian uint32 length prefix */
export const FRAME_HEADER_SIZE = 4;

/** Duplicate cache TTL in milliseconds (how long to remember seen message IDs) */
export const DUPLICATE_CACHE_TTL_MS = 60_000; // 60 seconds

/** Duplicate cache cleanup interval in milliseconds */
export const DUPLICATE_CACHE_CLEANUP_INTERVAL_MS = 30_000; // 30 seconds

/** Route expiry time in milliseconds (0 = no expiry for static routes) */
export const ROUTE_EXPIRY_MS = 0;

/** TCP connection timeout in milliseconds */
export const TCP_CONNECT_TIMEOUT_MS = 5_000;

/** Default host for local simulation */
export const DEFAULT_HOST = '127.0.0.1';

/** Allowed packet types */
export const PACKET_TYPES = ['DATA', 'RREQ', 'RREP', 'RERR', 'ACK'] as const;

/** Type alias for packet types */
export type PacketType = typeof PACKET_TYPES[number];
