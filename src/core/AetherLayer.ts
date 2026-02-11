import * as PIXI from 'pixi.js';
import type { AetherEngine } from './AetherEngine';

export abstract class AetherLayer {
    public container: PIXI.Container;
    protected engine: AetherEngine | undefined;

    constructor() {
        this.container = new PIXI.Container();
    }

    public attach(engine: AetherEngine) {
        this.engine = engine;
        this.onAttach();
    }

    // Хук для юзера: "Я подключен, можно инициализировать текстуры"
    protected onAttach(): void {
    }

    abstract setData(data: any): void;

    public update?(delta: number): void;

    public destroy() {
        this.container.destroy({children: true});
    }
}