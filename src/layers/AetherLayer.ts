import * as PIXI from 'pixi.js';
import type { AetherEngine } from '../core/AetherEngine';

/**
 * Base abstract class for all Aether layers.
 */
export abstract class AetherLayer {
    public container: PIXI.Container;
    protected engine: AetherEngine | undefined;

    constructor() {
        this.container = new PIXI.Container();
    }

    public attach(engine: AetherEngine): void {
        this.engine = engine;
        this.onAttach();
    }

    protected onAttach(): void { }

    abstract setData(data: any): void;

    public update(visibleIds: Set<string>): void {
    }

    public destroy(): void {
        this.container.destroy({ children: true });
    }
}