/**
 * MeshLink — Node Configuration Types
 *
 * Defines the configuration needed to create and wire up a mesh node.
 */

/** Configuration for a single mesh node */
export interface NodeConfig {
  /** Logical node ID (e.g., 'A', 'B', 'nodeAlpha') */
  nodeId: string;

  /** TCP host to listen on */
  host: string;

  /** TCP port to listen on */
  port: number;

  /** Neighbor definitions — who this node is directly connected to */
  neighbors: NeighborConfig[];

  /** Static route entries — pre-configured routing table */
  routes: RouteConfig[];
}

/** Configuration for a neighbor connection */
export interface NeighborConfig {
  /** Neighbor's logical node ID */
  nodeId: string;

  /** Neighbor's TCP host */
  host: string;

  /** Neighbor's TCP port */
  port: number;
}

/** Configuration for a static route */
export interface RouteConfig {
  /** Destination node ID */
  destination: string;

  /** Next-hop node ID */
  nextHop: string;

  /** Number of hops to the destination */
  hopCount: number;
}
