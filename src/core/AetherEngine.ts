import * as PIXI from 'pixi.js';
import {AetherLayer} from '../layers/AetherLayer';
import {IAetherCamera} from "./IAetherCamera";
import {SpatialHashGrid} from "./SpatialHashGrid";

export interface AetherOptions {
    container: HTMLElement;
    camera: IAetherCamera

    app?: PIXI.Application;
    appOptions?: Partial<PIXI.IApplicationOptions>;
    cellSize?: number;
}

export class AetherEngine {
    public app: PIXI.Application;
    private layers: Map<string, AetherLayer> = new Map();
    public camera: IAetherCamera;
    public grid: SpatialHashGrid;

    constructor(options: AetherOptions) {
        if (options.app) {
            this.app = options.app;
        } else {
            this.app = new PIXI.Application({
                resizeTo: options.container,
                backgroundColor: 0xffffff,
                resolution: window.devicePixelRatio || 1,
                antialias: true,
                autoDensity: true,
                ...options.appOptions
            });

            options.container.appendChild(this.app.view as HTMLCanvasElement);
        }

        this.grid = new SpatialHashGrid(options.cellSize || 512);

        this.camera = options.camera;
        this.app.stage.addChild(this.camera.container);
    }

    public addLayer(id: string, layer: AetherLayer) {
        this.layers.set(id, layer);
        layer.attach(this);
        this.camera.container.addChild(layer.container);
    }

    public getLayer<T extends AetherLayer>(id: string): T | undefined {
        return this.layers.get(id) as T;
    }

    public destroy() {
        this.app.ticker.remove(this.update, this);
        this.layers.forEach(layer => layer.destroy());
        this.layers.clear();
        this.grid.clear();
        this.app.destroy(true, {children: true, texture: true});
    }

    public update() {
        const view = this.camera.viewBounds;
        const visibleIds = this.grid.queryRange(
            view.x,
            view.y,
            view.width,
            view.height
        );

        this.layers.forEach(layer => {
            layer.update(visibleIds);
        });
    }
}