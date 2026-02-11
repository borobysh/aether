import * as PIXI from 'pixi.js';
import {AetherLayer} from "./AetherLayer";

/**
 * Basic layer for rendering geometry using PIXI.Graphics.
 */
export class GraphicsLayer extends AetherLayer {
    protected graphics: PIXI.Graphics;

    constructor() {
        super();
        this.graphics = new PIXI.Graphics();
        this.container.addChild(this.graphics);
    }

    public setData(data: any): void {
    }

    public clear(): void {
        this.graphics.clear();
    }
}