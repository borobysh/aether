import * as PIXI from 'pixi.js';
import { IAetherCamera } from './IAetherCamera';
import { DEFAULT_MIN_ZOOM, DEFAULT_MAX_ZOOM, DEFAULT_ZOOM_SPEED, DEFAULT_FIT_BOUNDS_PADDING } from './constants';

export interface CameraConfig {
    minZoom?: number;
    maxZoom?: number;
    zoomSpeed?: number;
}

export class AetherCamera implements IAetherCamera {
    public container: PIXI.Container;
    public zoom: number = 1;
    public position: { x: number; y: number } = { x: 0, y: 0 };

    private viewport: { width: number; height: number };
    private config: Required<CameraConfig>;

    constructor(width: number, height: number, config: CameraConfig = {}) {
        this.container = new PIXI.Container();
        this.viewport = { width, height };
        this.config = {
            minZoom: config.minZoom ?? DEFAULT_MIN_ZOOM,
            maxZoom: config.maxZoom ?? DEFAULT_MAX_ZOOM,
            zoomSpeed: config.zoomSpeed ?? DEFAULT_ZOOM_SPEED
        };
        this.updateTransform();
    }

    public pan(deltaX: number, deltaY: number): void {
        this.position.x -= deltaX / this.zoom;
        this.position.y -= deltaY / this.zoom;
        this.updateTransform();
    }

    public zoomAt(screenX: number, screenY: number, delta: number): void {
        const factor = delta > 0 ? this.config.zoomSpeed : 1 / this.config.zoomSpeed;
        const newZoom = this.zoom * factor;

        if (newZoom < this.config.minZoom || newZoom > this.config.maxZoom) {
            return;
        }

        const worldBefore = this.toWorld({ x: screenX, y: screenY });
        this.zoom = newZoom;
        const worldAfter = this.toWorld({ x: screenX, y: screenY });

        this.position.x += worldBefore.x - worldAfter.x;
        this.position.y += worldBefore.y - worldAfter.y;

        this.updateTransform();
    }

    private updateTransform(): void {
        this.container.scale.set(this.zoom);
        this.container.position.set(
            -this.position.x * this.zoom + this.viewport.width / 2,
            -this.position.y * this.zoom + this.viewport.height / 2
        );
    }

    public toWorld(screenPoint: PIXI.IPointData): PIXI.IPointData {
        return {
            x: (screenPoint.x - this.viewport.width / 2) / this.zoom + this.position.x,
            y: (screenPoint.y - this.viewport.height / 2) / this.zoom + this.position.y
        };
    }

    public toScreen(worldPoint: PIXI.IPointData): PIXI.IPointData {
        return {
            x: (worldPoint.x - this.position.x) * this.zoom + this.viewport.width / 2,
            y: (worldPoint.y - this.position.y) * this.zoom + this.viewport.height / 2
        };
    }

    public fitBounds(bounds: PIXI.Rectangle): void {
        const scaleX = this.viewport.width / bounds.width;
        const scaleY = this.viewport.height / bounds.height;

        this.zoom = Math.min(scaleX, scaleY) * DEFAULT_FIT_BOUNDS_PADDING;
        this.position.x = bounds.x + bounds.width / 2;
        this.position.y = bounds.y + bounds.height / 2;

        this.updateTransform();
    }

    public resize(width: number, height: number): void {
        this.viewport = { width, height };
        this.updateTransform();
    }

    get viewBounds(): PIXI.Rectangle {
        const halfW = this.viewport.width / (2 * this.zoom);
        const halfH = this.viewport.height / (2 * this.zoom);

        return new PIXI.Rectangle(
            this.position.x - halfW,
            this.position.y - halfH,
            halfW * 2,
            halfH * 2
        );
    }
}
