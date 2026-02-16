import * as PIXI from 'pixi.js';
import {AetherLayer} from "./AetherLayer";

export interface SpriteNodeData {
    id: string;
    x: number;
    y: number;
    texture?: PIXI.Texture;
    tint?: number;
    scale?: number;
    anchor?: number | { x: number; y: number };
}

/**
 * High-perf layer for graph nodes. Uses ParticleContainer, supports culling via visibleIds.
 */
export class SpriteLayer extends AetherLayer {
    protected particleContainer: PIXI.ParticleContainer;
    protected sprites = new Map<string, PIXI.Sprite>();
    protected nodeData = new Map<string, SpriteNodeData>();
    protected defaultTexture: PIXI.Texture | null = null;

    constructor(maxCount: number = 15000, defaultTexture?: PIXI.Texture) {
        super();
        this.particleContainer = new PIXI.ParticleContainer(maxCount, {
            position: true,
            scale: true,
            rotation: false,
            uvs: false,
            tint: true
        });
        this.container.addChild(this.particleContainer);
        
        if (defaultTexture) {
            this.defaultTexture = defaultTexture;
        }
    }

    /** Replaces all nodes. Clears existing sprites first. */
    public setData(nodes: SpriteNodeData[]): void {
        this.clear();

        // Создаем новые спрайты
        for (const nodeData of nodes) {
            this.createSprite(nodeData);
        }
    }

    /**
     * Создает спрайт для узла
     */
    private createSprite(nodeData: SpriteNodeData): void {
        const texture = nodeData.texture || this.defaultTexture;
        
        if (!texture) {
            console.warn(`SpriteLayer: No texture provided for node ${nodeData.id}`);
            return;
        }

        const sprite = new PIXI.Sprite(texture);
        sprite.position.set(nodeData.x, nodeData.y);

        if (typeof nodeData.anchor === 'number') {
            sprite.anchor.set(nodeData.anchor);
        } else if (nodeData.anchor) {
            sprite.anchor.set(nodeData.anchor.x, nodeData.anchor.y);
        } else {
            sprite.anchor.set(0.5, 0.5); // По умолчанию центрируем
        }

        if (nodeData.scale !== undefined) {
            sprite.scale.set(nodeData.scale);
        }

        if (nodeData.tint !== undefined) {
            sprite.tint = nodeData.tint;
        }

        this.nodeData.set(nodeData.id, nodeData);
        this.sprites.set(nodeData.id, sprite);
        this.particleContainer.addChild(sprite);
    }

    /** Culling: set visibility per visibleIds. Called by engine.update(). */
    public update(visibleIds: Set<string>): void {
        this.sprites.forEach((sprite, id) => {
            sprite.visible = visibleIds.has(id);
        });
    }

    public updateNodePosition(id: string, x: number, y: number): void {
        const sprite = this.sprites.get(id);
        const data = this.nodeData.get(id);
        
        if (sprite && data) {
            sprite.position.set(x, y);
            data.x = x;
            data.y = y;
        }
    }

    /** Partial update without recreating sprite. */
    public updateNode(id: string, updates: Partial<Omit<SpriteNodeData, 'id'>>): void {
        const sprite = this.sprites.get(id);
        const data = this.nodeData.get(id);
        
        if (!sprite || !data) {
            return;
        }


        if (updates.x !== undefined || updates.y !== undefined) {
            const x = updates.x ?? data.x;
            const y = updates.y ?? data.y;
            sprite.position.set(x, y);
            data.x = x;
            data.y = y;
        }

        if (updates.tint !== undefined) {
            sprite.tint = updates.tint;
            data.tint = updates.tint;
        }

        if (updates.scale !== undefined) {
            sprite.scale.set(updates.scale);
            data.scale = updates.scale;
        }

        if (updates.anchor !== undefined) {
            if (typeof updates.anchor === 'number') {
                sprite.anchor.set(updates.anchor);
            } else {
                sprite.anchor.set(updates.anchor.x, updates.anchor.y);
            }
            data.anchor = updates.anchor;
        }

        if (updates.texture !== undefined) {
            sprite.texture = updates.texture;
            data.texture = updates.texture;
        }
    }

    public removeNode(id: string): void {
        const sprite = this.sprites.get(id);
        
        if (sprite) {
            this.particleContainer.removeChild(sprite);
            sprite.destroy();
            this.sprites.delete(id);
            this.nodeData.delete(id);
        }
    }

    public clear(): void {
        this.sprites.forEach(sprite => {
            sprite.destroy();
        });
        
        this.sprites.clear();
        this.nodeData.clear();
        this.particleContainer.removeChildren();
    }

    public destroy(): void {
        this.clear();
        this.particleContainer.destroy({ children: true, texture: false, baseTexture: false });
        super.destroy();
    }

    public getSprite(id: string): PIXI.Sprite | undefined {
        return this.sprites.get(id);
    }

    public getNodeData(id: string): SpriteNodeData | undefined {
        return this.nodeData.get(id);
    }

    public get count(): number {
        return this.sprites.size;
    }
}