import * as PIXI from 'pixi.js';
import {AetherLayer} from "./AetherLayer";

/**
 * Layer for rendering multiple sprites using ParticleContainer.
 */
export class SpriteLayer extends AetherLayer {
    protected particleContainer: PIXI.ParticleContainer;
    protected texture: PIXI.Texture | null = null;

    constructor(maxCount: number = 15000) {
        super();
        this.particleContainer = new PIXI.ParticleContainer(maxCount, {
            position: true,
            scale: true,
            rotation: false,
            uvs: false,
            tint: true
        });
        this.container.addChild(this.particleContainer);
    }

    public setData(nodes: any[]): void {
    }

    public update(visibleIds: Set<string>): void {
    }
}