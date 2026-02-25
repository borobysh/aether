import * as PIXI from 'pixi.js';
import type { AetherEngine } from '../core/AetherEngine';

export abstract class AetherLayer {
    public container: PIXI.Container;
    protected engine: AetherEngine | undefined;

    public minZoom: number = 0;
    public maxZoom: number = Infinity;
    public cullingEnabled: boolean = false;

    /** Higher = picked first when overlapping. Set by addLayer order. */
    public pickPriority: number = 0;

    protected readonly cullableObjects: Map<string, { visible: boolean }> = new Map();
    private _lodVisible: boolean = true;

    constructor() {
        this.container = new PIXI.Container();
    }

    public attach(engine: AetherEngine): void {
        this.engine = engine;
        this.onAttach();
    }

    protected onAttach(): void {}

    abstract setData(data: any): void;

    /** Called only when LOD check passes. Cullables already have visibility set. */
    public update(_visibleIds: Set<string>): void {}

    public destroy(): void {
        this.cullableObjects.clear();
        this.container.destroy({ children: true });
    }

    protected onLodChange(_visible: boolean): void {}

    /** id must match grid id. */
    protected registerCullable(id: string, obj: { visible: boolean }): void {
        this.cullableObjects.set(id, obj);
    }

    protected unregisterCullable(id: string): void {
        this.cullableObjects.delete(id);
    }

    protected clearCullables(): void {
        this.cullableObjects.clear();
    }

    /** @internal */
    public _tick(zoom: number, visibleIds: Set<string>): void {
        const inRange = zoom >= this.minZoom && zoom <= this.maxZoom;

        if (inRange !== this._lodVisible) {
            this._lodVisible = inRange;
            this.container.visible = inRange;
            this.onLodChange(inRange);
        }

        if (!inRange) return;

        if (this.cullingEnabled && this.cullableObjects.size > 0) {
            this.cullableObjects.forEach((obj, id) => {
                obj.visible = visibleIds.has(id);
            });
        }

        this.update(visibleIds);
    }
}
