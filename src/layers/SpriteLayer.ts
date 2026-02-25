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

export class SpriteLayer extends AetherLayer {
    protected particleContainer: PIXI.ParticleContainer;
    protected nodeData = new Map<string, SpriteNodeData>();
    protected defaultTexture: PIXI.Texture | null = null;

    constructor(maxCount: number = 15000, defaultTexture?: PIXI.Texture) {
        super();
        this.cullingEnabled = true;

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

    public setData(nodes: SpriteNodeData[]): void {
        this.clear();
        for (const nodeData of nodes) {
            this.createSprite(nodeData);
        }
    }

    private createSprite(data: SpriteNodeData): void {
        const texture = data.texture || this.defaultTexture;

        if (!texture) {
            console.warn(`SpriteLayer: no texture for ${data.id}`);
            return;
        }

        const sprite = new PIXI.Sprite(texture);
        sprite.position.set(data.x, data.y);

        if (typeof data.anchor === 'number') {
            sprite.anchor.set(data.anchor);
        } else if (data.anchor) {
            sprite.anchor.set(data.anchor.x, data.anchor.y);
        } else {
            sprite.anchor.set(0.5, 0.5);
        }

        if (data.scale !== undefined) sprite.scale.set(data.scale);
        if (data.tint !== undefined) sprite.tint = data.tint;

        this.nodeData.set(data.id, data);
        this.registerCullable(data.id, sprite);
        this.particleContainer.addChild(sprite);
    }

    public updateNodePosition(id: string, x: number, y: number): void {
        const sprite = this.cullableObjects.get(id) as PIXI.Sprite | undefined;
        const data = this.nodeData.get(id);

        if (sprite && data) {
            sprite.position.set(x, y);
            data.x = x;
            data.y = y;
        }
    }

    public updateNode(id: string, updates: Partial<Omit<SpriteNodeData, 'id'>>): void {
        const sprite = this.cullableObjects.get(id) as PIXI.Sprite | undefined;
        const data = this.nodeData.get(id);

        if (!sprite || !data) return;

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
        const sprite = this.cullableObjects.get(id) as PIXI.Sprite | undefined;

        if (sprite) {
            this.particleContainer.removeChild(sprite);
            sprite.destroy();
            this.unregisterCullable(id);
            this.nodeData.delete(id);
        }
    }

    public clear(): void {
        this.cullableObjects.forEach(obj => {
            (obj as PIXI.Sprite).destroy();
        });
        this.clearCullables();
        this.nodeData.clear();
        this.particleContainer.removeChildren();
    }

    public destroy(): void {
        this.clear();
        this.particleContainer.destroy({ children: true, texture: false, baseTexture: false });
        super.destroy();
    }

    public getSprite(id: string): PIXI.Sprite | undefined {
        return this.cullableObjects.get(id) as PIXI.Sprite | undefined;
    }

    public getNodeData(id: string): SpriteNodeData | undefined {
        return this.nodeData.get(id);
    }

    public get count(): number {
        return this.cullableObjects.size;
    }
}