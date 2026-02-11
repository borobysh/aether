import { SpatialHashGrid } from './SpatialHashGrid';
import { DEFAULT_PICK_RADIUS } from './constants';

export interface PickResult {
    type: 'node' | 'edge';
    id: string;
    distance: number;
}

interface EdgeData {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface NodeData {
    x: number;
    y: number;
    radius: number;
}

export class PickingSystem {
    private grid: SpatialHashGrid;
    private edges = new Map<string, EdgeData>();
    private nodes = new Map<string, NodeData>();
    private pickRadius: number;

    constructor(grid: SpatialHashGrid, pickRadius: number = DEFAULT_PICK_RADIUS) {
        this.grid = grid;
        this.pickRadius = pickRadius;
    }

    public pick(worldX: number, worldY: number): PickResult | null {
        const candidates = this.grid.queryRange(
            worldX - this.pickRadius,
            worldY - this.pickRadius,
            this.pickRadius * 2,
            this.pickRadius * 2
        );

        if (candidates.size === 0) return null;

        let closest: PickResult | null = null;
        let closestDist = this.pickRadius;

        for (const id of candidates) {
            if (id.startsWith('node-')) {
                const node = this.nodes.get(id);
                if (!node) continue;

                const dx = worldX - node.x;
                const dy = worldY - node.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < node.radius && dist < closestDist) {
                    closestDist = dist;
                    closest = { type: 'node', id, distance: dist };
                }
            } else if (id.startsWith('edge-')) {
                const edge = this.edges.get(id);
                if (!edge) continue;

                const dist = this.pointToLineDistance(
                    worldX, worldY,
                    edge.x1, edge.y1,
                    edge.x2, edge.y2
                );

                if (dist < closestDist) {
                    closestDist = dist;
                    closest = { type: 'edge', id, distance: dist };
                }
            }
        }

        return closest;
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

    public registerEdge(id: string, x1: number, y1: number, x2: number, y2: number): void {
        this.edges.set(id, { x1, y1, x2, y2 });
    }

    public registerNode(id: string, x: number, y: number, radius: number): void {
        this.nodes.set(id, { x, y, radius });
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
        this.edges.delete(id);
        this.nodes.delete(id);
    }

    public clear(): void {
        this.edges.clear();
        this.nodes.clear();
    }
}

