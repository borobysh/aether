import { SpatialHashGrid } from './SpatialHashGrid';
import { DEFAULT_PICK_RADIUS } from './constants';

export interface PickResult {
    type: 'node' | 'edge';
    id: string;
    distance: number;
    /** Layer pick priority. Higher = rendered on top. */
    priority: number;
}

interface EdgeData {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    priority: number;
}

interface NodeData {
    x: number;
    y: number;
    radius: number;
    priority: number;
}

export class PickingSystem {
    private grid: SpatialHashGrid;
    private edges = new Map<string, EdgeData>();
    private nodes = new Map<string, NodeData>();
    private pickRadius: number;
    private cachedMaxNodeRadius: number = 0;

    constructor(grid: SpatialHashGrid, pickRadius: number = DEFAULT_PICK_RADIUS) {
        this.grid = grid;
        this.pickRadius = pickRadius;
    }

    /**
     * Pick the topmost object at (worldX, worldY).
     *
     * Algorithm:
     * 1. Collect all candidates within search radius.
     * 2. For each candidate compute hit distance (point-in-circle for nodes, point-to-line for edges).
     * 3. Select winner: highest priority first, then smallest distance.
     */
    public pick(worldX: number, worldY: number): PickResult | null {
        // Search radius: pickRadius for edges, but need to find nodes whose center
        // may be further away (up to their own radius).
        const searchRadius = Math.max(this.pickRadius, this.cachedMaxNodeRadius);

        const candidates = this.grid.queryRange(
            worldX - searchRadius,
            worldY - searchRadius,
            searchRadius * 2,
            searchRadius * 2
        );

        if (candidates.size === 0) return null;

        let best: PickResult | null = null;

        for (const id of candidates) {
            const node = this.nodes.get(id);
            if (node) {
                const dx = worldX - node.x;
                const dy = worldY - node.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > node.radius) continue; // Outside node circle

                if (this.isBetter(best, node.priority, dist)) {
                    best = { type: 'node', id, distance: dist, priority: node.priority };
                }
                continue;
            }

            const edge = this.edges.get(id);
            if (edge) {
                const dist = this.pointToLineDistance(
                    worldX, worldY,
                    edge.x1, edge.y1,
                    edge.x2, edge.y2
                );

                if (dist > this.pickRadius) continue; // Too far from edge line

                if (this.isBetter(best, edge.priority, dist)) {
                    best = { type: 'edge', id, distance: dist, priority: edge.priority };
                }
            }
        }

        return best;
    }

    /**
     * Returns true if (priority, dist) is better than current best.
     * Higher priority wins. At same priority, shorter distance wins.
     */
    private isBetter(current: PickResult | null, priority: number, dist: number): boolean {
        if (!current) return true;
        if (priority > current.priority) return true;
        if (priority === current.priority && dist < current.distance) return true;
        return false;
    }

    private updateMaxNodeRadius(): void {
        let max = 0;
        this.nodes.forEach(n => { if (n.radius > max) max = n.radius; });
        this.cachedMaxNodeRadius = max;
    }

    private pointToLineDistance(
        px: number, py: number,
        x1: number, y1: number,
        x2: number, y2: number
    ): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSq = dx * dx + dy * dy;

        if (lengthSq === 0) {
            const dpx = px - x1;
            const dpy = py - y1;
            return Math.sqrt(dpx * dpx + dpy * dpy);
        }

        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));

        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;

        const distX = px - closestX;
        const distY = py - closestY;
        return Math.sqrt(distX * distX + distY * distY);
    }

    public registerEdge(id: string, x1: number, y1: number, x2: number, y2: number, priority: number = 0): void {
        this.edges.set(id, { x1, y1, x2, y2, priority });
    }

    public registerNode(id: string, x: number, y: number, radius: number, priority: number = 0): void {
        this.nodes.set(id, { x, y, radius, priority });
        if (radius > this.cachedMaxNodeRadius) this.cachedMaxNodeRadius = radius;
    }

    public updateNode(id: string, x: number, y: number): void {
        const node = this.nodes.get(id);
        if (node) {
            node.x = x;
            node.y = y;
        }
    }

    public updateEdge(id: string, x1: number, y1: number, x2: number, y2: number): void {
        const edge = this.edges.get(id);
        if (edge) {
            edge.x1 = x1;
            edge.y1 = y1;
            edge.x2 = x2;
            edge.y2 = y2;
        }
    }

    public unregister(id: string): void {
        const hadNode = this.nodes.delete(id);
        this.edges.delete(id);
        if (hadNode) this.updateMaxNodeRadius();
    }

    public clear(): void {
        this.edges.clear();
        this.nodes.clear();
        this.cachedMaxNodeRadius = 0;
    }
}

