import * as PIXI from 'pixi.js';

export interface IAetherCamera {
    container: PIXI.Container;
    zoom: number;
    position: { x: number; y: number };
    viewBounds: PIXI.Rectangle;

    pan(deltaX: number, deltaY: number): void;
    zoomAt(screenX: number, screenY: number, delta: number): void;
    toWorld(screenPoint: PIXI.IPointData): PIXI.IPointData;
    toScreen(worldPoint: PIXI.IPointData): PIXI.IPointData;
    fitBounds(bounds: PIXI.Rectangle): void;
}