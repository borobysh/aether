import * as PIXI from 'pixi.js';
import {AetherLayer} from '../layers/AetherLayer';
import {IAetherCamera} from './IAetherCamera';
import {SpatialHashGrid} from './SpatialHashGrid';
import {PickingSystem, PickResult} from './PickingSystem';
import {EventEmitter} from './EventEmitter';
import {DEFAULT_CELL_SIZE, DEFAULT_PICK_RADIUS, MOUSE_BUTTON, HOVER_THROTTLE_MS} from './constants';
import {AetherCamera} from "./AetherCamera";

export interface AetherOptions {
    container: HTMLElement;
    camera: IAetherCamera;
    app?: PIXI.Application;
    appOptions?: Partial<PIXI.IApplicationOptions>;
    cellSize?: number;
    pickRadius?: number;
}

export class AetherEngine extends EventEmitter {
    public app: PIXI.Application;
    public camera: IAetherCamera;
    public grid: SpatialHashGrid;
    public picking: PickingSystem;

    private layers = new Map<string, AetherLayer>();
    private canvas: HTMLCanvasElement;

    private isPanning = false;
    private lastPointer = {x: 0, y: 0};
    private hoveredObject: PickResult | null = null;
    private lastHoverCheck = 0;

    constructor(options: AetherOptions) {
        super();

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

        this.canvas = this.app.view as HTMLCanvasElement;
        this.grid = new SpatialHashGrid(options.cellSize ?? DEFAULT_CELL_SIZE);
        this.picking = new PickingSystem(this.grid, options.pickRadius ?? DEFAULT_PICK_RADIUS);
        this.camera = options.camera;
        this.app.stage.addChild(this.camera.container);

        this.setupInput();
    }

    public addLayer(id: string, layer: AetherLayer) {
        this.layers.set(id, layer);
        layer.attach(this);
        this.camera.container.addChild(layer.container);
    }

    public getLayer<T extends AetherLayer>(id: string): T | undefined {
        return this.layers.get(id) as T;
    }

    private setupInput(): void {
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerup', this.onPointerUp);
        this.canvas.addEventListener('wheel', this.onWheel);
    }

    private onPointerDown = (e: PointerEvent): void => {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const world = this.camera.toWorld({x: screenX, y: screenY});

        this.lastPointer = {x: e.clientX, y: e.clientY};

        if (e.button === MOUSE_BUTTON.MIDDLE) {
            this.isPanning = true;
            this.canvas.style.cursor = 'grabbing';
            this.emit('camera:panstart');
            return;
        }

        const picked = this.picking.pick(world.x, world.y);

        if (picked && e.button === MOUSE_BUTTON.LEFT) {
            this.emit('object:pointerdown', {
                result: picked,
                worldX: world.x,
                worldY: world.y,
                screenX,
                screenY,
                button: e.button
            });
        } else if (e.button === MOUSE_BUTTON.LEFT) {
            this.isPanning = true;
            this.canvas.style.cursor = 'grabbing';
            this.emit('canvas:pointerdown', {worldX: world.x, worldY: world.y});
        }
    };

    private onPointerMove = (e: PointerEvent): void => {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const world = this.camera.toWorld({x: screenX, y: screenY});

        const deltaScreenX = e.clientX - this.lastPointer.x;
        const deltaScreenY = e.clientY - this.lastPointer.y;

        this.emit('pointermove', {
            worldX: world.x,
            worldY: world.y,
            screenX,
            screenY,
            deltaScreenX,
            deltaScreenY
        });

        if (this.isPanning) {
            this.camera.pan(-deltaScreenX, -deltaScreenY);
            this.emit('camera:pan', {deltaX: deltaScreenX, deltaY: deltaScreenY});
        } else {
            const now = performance.now();
            if (now - this.lastHoverCheck < HOVER_THROTTLE_MS) {
                this.lastPointer = {x: e.clientX, y: e.clientY};
                return;
            }
            this.lastHoverCheck = now;

            const picked = this.picking.pick(world.x, world.y);

            if (picked?.id !== this.hoveredObject?.id) {
                if (this.hoveredObject) {
                    this.emit('hover:out', this.hoveredObject);
                }
                if (picked) {
                    this.emit('hover:in', picked);
                    this.canvas.style.cursor = 'pointer';
                } else {
                    this.canvas.style.cursor = 'default';
                }
                this.hoveredObject = picked;
            }
        }

        this.lastPointer = {x: e.clientX, y: e.clientY};
    };

    private onPointerUp = (e: PointerEvent): void => {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const world = this.camera.toWorld({x: screenX, y: screenY});
        const picked = this.picking.pick(world.x, world.y);

        this.emit('pointerup', {
            result: picked,
            worldX: world.x,
            worldY: world.y,
            screenX,
            screenY,
            button: e.button
        });

        if (this.isPanning) {
            this.isPanning = false;
            this.emit('camera:panend');
        }

        this.canvas.style.cursor = 'default';
    };

    private onWheel = (e: WheelEvent): void => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        this.camera.zoomAt(screenX, screenY, -e.deltaY);
        this.emit('camera:zoom', this.camera.zoom);
    };

    public update(): void {
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

    public destroy(): void {
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        this.canvas.removeEventListener('pointermove', this.onPointerMove);
        this.canvas.removeEventListener('pointerup', this.onPointerUp);
        this.canvas.removeEventListener('wheel', this.onWheel);

        this.app.ticker.remove(this.update, this);
        this.layers.forEach(layer => layer.destroy());
        this.layers.clear();
        this.grid.clear();
        this.picking.clear();
        this.clear();
        this.app.destroy(true, {children: true, texture: true});
    }
}