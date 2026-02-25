import * as PIXI from 'pixi.js';
import { AetherLayer } from './AetherLayer';

export interface BakeTransform {
    toTexture(worldX: number, worldY: number): { x: number; y: number };
    scale: number;
    textureSize: number;
}

/** Bake visuals into RenderTexture. Implement draw(), engine handles lifecycle */
export abstract class AetherBakeLayer extends AetherLayer {
    public textureSize: number = 2048;

    private _renderTexture: PIXI.RenderTexture | null = null;
    private _bakeSprite: PIXI.Sprite | null = null;

    get renderTexture(): PIXI.RenderTexture | null {
        return this._renderTexture;
    }

    get bakeSprite(): PIXI.Sprite | null {
        return this._bakeSprite;
    }

    protected abstract draw(graphics: PIXI.Graphics, transform: BakeTransform): void;

    /** Call after loading data */
    public bake(renderer: PIXI.IRenderer, worldBounds: PIXI.Rectangle): void {
        this.disposeBake();

        const texSize = this.textureSize;

        this._renderTexture = PIXI.RenderTexture.create({
            width: texSize,
            height: texSize,
        });

        const scaleX = texSize / worldBounds.width;
        const scaleY = texSize / worldBounds.height;
        const scale = Math.min(scaleX, scaleY);

        const offsetX =
            (texSize - worldBounds.width * scale) / 2 - worldBounds.x * scale;
        const offsetY =
            (texSize - worldBounds.height * scale) / 2 - worldBounds.y * scale;

        const transform: BakeTransform = {
            toTexture: (wx, wy) => ({
                x: wx * scale + offsetX,
                y: wy * scale + offsetY,
            }),
            scale,
            textureSize: texSize,
        };

        const g = new PIXI.Graphics();
        this.draw(g, transform);

        renderer.render(g, { renderTexture: this._renderTexture });
        g.destroy();

        this._bakeSprite = new PIXI.Sprite(this._renderTexture);
        this._bakeSprite.position.set(
            worldBounds.x + (worldBounds.width - texSize / scale) / 2,
            worldBounds.y + (worldBounds.height - texSize / scale) / 2,
        );
        this._bakeSprite.scale.set(1 / scale);

        this.container.removeChildren();
        this.container.addChild(this._bakeSprite);
    }

    public disposeBake(): void {
        if (this._bakeSprite) {
            this.container.removeChild(this._bakeSprite);
            this._bakeSprite.destroy();
            this._bakeSprite = null;
        }
        if (this._renderTexture) {
            this._renderTexture.destroy(true);
            this._renderTexture = null;
        }
    }

    public setData(_data: any): void {}

    public destroy(): void {
        this.disposeBake();
        super.destroy();
    }
}
