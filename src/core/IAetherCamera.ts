import * as PIXI from 'pixi.js';

export interface IAetherCamera {
    container: PIXI.Container;
    zoom: number;
    position: { x: number; y: number };
    viewBounds: PIXI.Rectangle;

    // Базовые методы, которые движок будет дергать
    toWorld(screenPoint: PIXI.IPointData): PIXI.IPointData;
    toScreen(worldPoint: PIXI.IPointData): PIXI.IPointData;
    fitBounds(bounds: PIXI.Rectangle): void;
}