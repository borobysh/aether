import * as PIXI from 'pixi.js';
import {AetherLayer} from './AetherLayer';
import {IAetherCamera} from "./IAetherCamera";

export interface AetherOptions {
    container: HTMLElement;
    camera: IAetherCamera

    app?: PIXI.Application;
    appOptions?: Partial<PIXI.IApplicationOptions>;
}

export class AetherEngine {
    public app: PIXI.Application;
    private layers: Map<string, AetherLayer> = new Map();
    public camera: IAetherCamera;

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
        this.app.destroy(true, {children: true, texture: true});
    }
}