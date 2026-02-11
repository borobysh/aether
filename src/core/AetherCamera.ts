import * as PIXI from 'pixi.js';
import {IAetherCamera} from './IAetherCamera';

export class AetherCamera implements IAetherCamera {
    public container: PIXI.Container;
    public zoom: number = 1;

    public position: { x: number; y: number } = {x: 0, y: 0};
    private viewport: { width: number; height: number };

    private isDragging = false;
    private lastPointerPos = {x: 0, y: 0};

    constructor(width: number, height: number) {
        this.container = new PIXI.Container();
        this.viewport = {width, height};
        this.setupInteraction();
    }

    private setupInteraction(): void {
        this.container.eventMode = 'static';

        this.container.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
            if (e.button === 1 || e.pointerType === 'touch') {
                this.isDragging = true;
                this.lastPointerPos = {x: e.globalX, y: e.globalY};
            }
        });

        this.container.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
            if (this.isDragging) {
                const dx = e.globalX - this.lastPointerPos.x;
                const dy = e.globalY - this.lastPointerPos.y;

                this.position.x -= dx / this.zoom;
                this.position.y -= dy / this.zoom;

                this.updateTransform();
                this.lastPointerPos = {x: e.globalX, y: e.globalY};
            }
        });

        this.container.on('pointerup', () => {
            this.isDragging = false;
        });

        this.container.on('wheel', (e: WheelEvent) => {
            e.preventDefault();

            //todo make a constant
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = this.zoom * zoomFactor;

            //todo it should be in the config
            if (newZoom < 0.1 || newZoom > 10) {
                return;
            }

            const worldPos = this.toWorld({x: e.offsetX, y: e.offsetY});
            this.zoom = newZoom;

            const newWorldPos = this.toWorld({x: e.offsetX, y: e.offsetY});

            this.position.x += worldPos.x - newWorldPos.x;
            this.position.y += worldPos.y - newWorldPos.y;

            this.updateTransform();
        });
    }

    private updateTransform() {
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

    public fitBounds(bounds: PIXI.Rectangle) {
        const scaleX = this.viewport.width / bounds.width;
        const scaleY = this.viewport.height / bounds.height;

        this.zoom = Math.min(scaleX, scaleY) * 0.9;
        this.position.x = bounds.x + bounds.width / 2;
        this.position.y = bounds.y + bounds.height / 2;

        this.updateTransform();
    }

    get viewBounds(){
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