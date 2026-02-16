import { PickResult } from './PickingSystem';

/** Base for all pointer events. World/screen coords, button, modifiers. */
export interface AetherInputEvent {
    worldX: number;
    worldY: number;
    screenX: number;
    screenY: number;
    /** todo in Enum 0=left, 1=middle, 2=right */
    button: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    altKey: boolean;
}

/** Pointer event with pick result. Used for object:pointerdown. */
export interface AetherPointerEvent extends AetherInputEvent {
    result: PickResult;
}

/** Pointer event on empty canvas. Used for canvas:pointerdown. */
export interface AetherCanvasPointerEvent extends AetherInputEvent {}

/** Pointer move with deltas. */
export interface AetherPointerMoveEvent extends AetherInputEvent {
    deltaScreenX: number;
    deltaScreenY: number;
    result?: PickResult | null;
}

/** Pointer up. May include pick result. */
export interface AetherPointerUpEvent extends AetherInputEvent {
    result?: PickResult | null;
}
