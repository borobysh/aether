import * as PIXI from 'pixi.js';
import {AetherLayer} from "./AetherLayer";
import {Point} from "pixi.js";

/**
 * Abstract layer for high-performance geometry rendering using spatial chunking.
 * Divides rendering into cells for efficient updates and culling.
 */
export abstract class CellGraphicsLayer<T> extends AetherLayer {
    private cells: Map<string, PIXI.Graphics> = new Map();
    private cellData: Map<string, T[]> = new Map();
    private dirtyCells: Set<string> = new Set();
    protected cellSize: number;

    constructor(cellSize: number = 1024) {
        super();
        this.cellSize = cellSize;
    }

    protected abstract renderElement(g: PIXI.Graphics, item: T): void;

    protected indexElement(item: T, start: Point, end: Point): void {
        const startX = Math.floor(Math.min(start.x, end.x) / this.cellSize);
        const endX = Math.floor(Math.max(start.x, end.x) / this.cellSize);
        const startY = Math.floor(Math.min(start.y, end.y) / this.cellSize);
        const endY = Math.floor(Math.max(start.y, end.y) / this.cellSize);

        for (let ix = startX; ix <= endX; ix++) {
            for (let iy = startY; iy <= endY; iy++) {
                const key = `${ix},${iy}`;
                if (!this.cellData.has(key)) {
                    this.cellData.set(key, []);
                }
                this.cellData.get(key)!.push(item);
                this.dirtyCells.add(key);
            }
        }
    }
    
    public markCellDirty(x: number, y: number): void {
        const ix = Math.floor(x / this.cellSize);
        const iy = Math.floor(y / this.cellSize);
        const key = `${ix},${iy}`;
        this.dirtyCells.add(key);
    }
    
    public markAllDirty(): void {
        this.cellData.forEach((_, key) => {
            this.dirtyCells.add(key);
        });
    }

    protected clearIndexing(): void {
        this.cells.forEach((g) => {
            g.clear();
            this.container.removeChild(g);
            g.destroy({ children: true, texture: false, baseTexture: false });
        });
        
        this.cells.clear();
        this.cellData.forEach((arr) => arr.length = 0);
        this.cellData.clear();
        this.dirtyCells.clear();
    }

    /**
     * Renders cells. If force is true, redraws all cells; otherwise only dirty cells.
     */
    public redraw(force: boolean = false): void {
        if (force) {
            this.cellData.forEach((items, key) => {
                this.renderCell(key, items);
            });
            this.dirtyCells.clear();
        } else {
            this.dirtyCells.forEach((key) => {
                const items = this.cellData.get(key);
                if (items) {
                    this.renderCell(key, items);
                } else {
                    const g = this.cells.get(key);
                    if (g) {
                        g.clear();
                        this.container.removeChild(g);
                        g.destroy({ children: true, texture: false, baseTexture: false });
                        this.cells.delete(key);
                    }
                }
            });
            this.dirtyCells.clear();
        }
    }

    private renderCell(key: string, items: T[]): void {
        let g = this.cells.get(key);
        if (!g) {
            g = new PIXI.Graphics();
            this.cells.set(key, g);
            this.container.addChild(g);
        }

        g.clear();
        this.prepareGraphics(g);

        items.forEach(item => {
            this.renderElement(g!, item);
        });
    }

    protected prepareGraphics(g: PIXI.Graphics): void {
        g.lineStyle({width: 1, color: 0xcccccc, alpha: 0.5, native: true});
    }

    public update(visibleIds: Set<string>): void {
        if (!this.engine) {
            return;
        }

        const view = this.engine.camera.viewBounds;
        const startX = Math.floor(view.x / this.cellSize);
        const endX = Math.floor((view.x + view.width) / this.cellSize);
        const startY = Math.floor(view.y / this.cellSize);
        const endY = Math.floor((view.y + view.height) / this.cellSize);

        this.cells.forEach((g, key) => {
            const [cx, cy] = key.split(',').map(Number);
            const isVisible = cx >= startX - 1 && cx <= endX + 1 &&
                cy >= startY - 1 && cy <= endY + 1;

            g.visible = isVisible;
        });
    }

    public clearAllGraphics(): void {
        this.cells.forEach(g => g.clear());
    }

    public destroy(): void {
        this.cells.forEach(g => {
            g.clear();
            this.container.removeChild(g);
            g.destroy({ children: true, texture: false, baseTexture: false });
        });
        
        this.cells.clear();
        this.cellData.forEach(arr => arr.length = 0);
        this.cellData.clear();
        this.dirtyCells.clear();
        
        super.destroy();
    }
}