/**
 * Spatial hash grid for efficient object lookup and culling.
 * Divides the world into fixed-size cells for O(1) spatial queries.
 */
export class SpatialHashGrid {
    private cellSize: number;
    private cells: Map<string, Set<string>> = new Map();

    constructor(cellSize: number = 256) {
        this.cellSize = cellSize;
    }

    private getCellKey(x: number, y: number): string {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx},${cy}`;
    }

    public addNode(id: string, x: number, y: number) {
        const key = this.getCellKey(x, y);
        if (!this.cells.has(key)) {
            this.cells.set(key, new Set());
        }
        this.cells.get(key)!.add(id);
    }

    /**
     * Adds an edge to the grid.
     * @param precise - Use DDA algorithm (slower, less memory) or AABB (faster, more indices)
     */
    public addEdge(id: string, x1: number, y1: number, x2: number, y2: number, precise: boolean = true) {
        if (!precise) {
            this.addEdgeAABB(id, x1, y1, x2, y2);
            return;
        }

        const cells = this.getLineCells(x1, y1, x2, y2);
        
        for (const key of cells) {
            if (!this.cells.has(key)) {
                this.cells.set(key, new Set());
            }
            this.cells.get(key)!.add(id);
        }
    }
    
    private addEdgeAABB(id: string, x1: number, y1: number, x2: number, y2: number) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        const startX = Math.floor(minX / this.cellSize);
        const endX = Math.floor(maxX / this.cellSize);
        const startY = Math.floor(minY / this.cellSize);
        const endY = Math.floor(maxY / this.cellSize);

        for (let ix = startX; ix <= endX; ix++) {
            for (let iy = startY; iy <= endY; iy++) {
                const key = `${ix},${iy}`;
                if (!this.cells.has(key)) {
                    this.cells.set(key, new Set());
                }
                this.cells.get(key)!.add(id);
            }
        }
    }
    
    /**
     * Computes exact cell intersections for a line using DDA algorithm.
     */
    private getLineCells(x1: number, y1: number, x2: number, y2: number): Set<string> {
        const cells = new Set<string>();
        
        let cx = Math.floor(x1 / this.cellSize);
        let cy = Math.floor(y1 / this.cellSize);
        const endCx = Math.floor(x2 / this.cellSize);
        const endCy = Math.floor(y2 / this.cellSize);
        
        cells.add(`${cx},${cy}`);
        
        if (cx === endCx && cy === endCy) {
            return cells;
        }
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const stepX = dx >= 0 ? 1 : -1;
        const stepY = dy >= 0 ? 1 : -1;
        
        const nextBoundaryX = (dx >= 0 ? (cx + 1) * this.cellSize : cx * this.cellSize);
        const nextBoundaryY = (dy >= 0 ? (cy + 1) * this.cellSize : cy * this.cellSize);
        
        let tMaxX = dx !== 0 ? (nextBoundaryX - x1) / dx : Infinity;
        let tMaxY = dy !== 0 ? (nextBoundaryY - y1) / dy : Infinity;
        
        const tDeltaX = dx !== 0 ? (this.cellSize * stepX) / dx : Infinity;
        const tDeltaY = dy !== 0 ? (this.cellSize * stepY) / dy : Infinity;
        
        while (cx !== endCx || cy !== endCy) {
            if (tMaxX < tMaxY) {
                tMaxX += tDeltaX;
                cx += stepX;
            } else {
                tMaxY += tDeltaY;
                cy += stepY;
            }
            
            cells.add(`${cx},${cy}`);
            
            if (cells.size > 10000) {
                console.warn('SpatialHashGrid: exceeded safety limit');
                break;
            }
        }
        
        return cells;
    }

    public remove(id: string): void {
        this.cells.forEach((cell) => {
            cell.delete(id);
        });
    }
    
    public removeFromCell(id: string, x: number, y: number): void {
        const key = this.getCellKey(x, y);
        const cell = this.cells.get(key);
        if (cell) {
            cell.delete(id);
            if (cell.size === 0) {
                this.cells.delete(key);
            }
        }
    }
    
    public updateNode(id: string, oldX: number, oldY: number, newX: number, newY: number): void {
        const oldKey = this.getCellKey(oldX, oldY);
        const newKey = this.getCellKey(newX, newY);
        
        if (oldKey === newKey) {
            return;
        }
        
        const oldCell = this.cells.get(oldKey);
        if (oldCell) {
            oldCell.delete(id);
            if (oldCell.size === 0) {
                this.cells.delete(oldKey);
            }
        }
        
        if (!this.cells.has(newKey)) {
            this.cells.set(newKey, new Set());
        }
        this.cells.get(newKey)!.add(id);
    }
    
    public clear() {
        this.cells.clear();
    }
    
    public getStats() {
        let totalObjects = 0;
        let maxObjectsPerCell = 0;
        let avgObjectsPerCell = 0;
        
        this.cells.forEach((cell) => {
            const size = cell.size;
            totalObjects += size;
            if (size > maxObjectsPerCell) {
                maxObjectsPerCell = size;
            }
        });
        
        avgObjectsPerCell = this.cells.size > 0 ? totalObjects / this.cells.size : 0;
        
        return {
            cellCount: this.cells.size,
            totalObjects,
            maxObjectsPerCell,
            avgObjectsPerCell: avgObjectsPerCell.toFixed(2),
            cellSize: this.cellSize
        };
    }

    public queryRange(x: number, y: number, width: number, height: number): Set<string> {
        const found = new Set<string>();
        const startX = Math.floor(x / this.cellSize);
        const endX = Math.floor((x + width) / this.cellSize);
        const startY = Math.floor(y / this.cellSize);
        const endY = Math.floor((y + height) / this.cellSize);

        for (let ix = startX; ix <= endX; ix++) {
            for (let iy = startY; iy <= endY; iy++) {
                const key = `${ix},${iy}`;
                const cell = this.cells.get(key);
                if (cell) {
                    cell.forEach(id => found.add(id));
                }
            }
        }
        return found;
    }

    public queryPoint(x: number, y: number): Set<string> {
        const key = this.getCellKey(x, y);
        return this.cells.get(key) || new Set();
    }
}