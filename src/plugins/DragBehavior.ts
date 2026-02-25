import * as PIXI from 'pixi.js';
import { AetherEngine } from '../core/AetherEngine';
import { PickResult } from '../core/PickingSystem';

export interface DragBehaviorConfig {
    enabled?: boolean;
    mode?: 'classic' | 'ghost' | 'none';
    dragThreshold?: number;
    /** Return false to block drag start (e.g. when Shift held for marquee). */
    canStartDrag?: (event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => boolean;
    onDragStart?: (result: PickResult) => boolean | void;
    onDrag?: (result: PickResult, worldX: number, worldY: number, deltaX: number, deltaY: number) => void;
    onDragEnd?: (result: PickResult) => void;
}

export class DragBehavior {
    private engine: AetherEngine;
    private config: Required<DragBehaviorConfig>;
    private ghostSprite: PIXI.Graphics | null = null;
    
    private isDragging = false;
    private dragTarget: PickResult | null = null;
    private dragStartWorld = { x: 0, y: 0 };
    private pointerDownWorld = { x: 0, y: 0 };

    constructor(engine: AetherEngine, config: DragBehaviorConfig = {}) {
        this.engine = engine;
        this.config = {
            enabled: config.enabled ?? true,
            mode: config.mode ?? 'classic',
            dragThreshold: config.dragThreshold ?? 3,
            canStartDrag: config.canStartDrag ?? (() => true),
            onDragStart: config.onDragStart ?? (() => true),
            onDrag: config.onDrag ?? this.defaultDragHandler.bind(this),
            onDragEnd: config.onDragEnd ?? this.defaultDragEndHandler.bind(this)
        };

        this.setupListeners();
    }

    private setupListeners(): void {
        if (!this.config.enabled) {
            return;
        }

        this.engine.on('object:pointerdown', (event: any) => {
            if (event.result.type === 'node') {
                this.dragTarget = event.result;
                this.pointerDownWorld = { x: event.worldX, y: event.worldY };
                this.dragStartWorld = { x: event.worldX, y: event.worldY };
            }
        });

        this.engine.on('pointermove', (event: any) => {
            if (!this.dragTarget) return;

            if (!this.isDragging) {
                if (!this.config.canStartDrag({ shiftKey: event.shiftKey ?? false, ctrlKey: event.ctrlKey ?? false, metaKey: event.metaKey ?? false })) {
                    this.dragTarget = null;
                    return;
                }
                const dx = event.worldX - this.pointerDownWorld.x;
                const dy = event.worldY - this.pointerDownWorld.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > this.config.dragThreshold) {
                    this.isDragging = true;
                    const shouldContinue = this.config.onDragStart(this.dragTarget);
                    
                    if (shouldContinue === false) {
                        this.dragTarget = null;
                        return;
                    }

                    if (this.config.mode === 'ghost') {
                        this.createGhost(this.dragTarget);
                    }

                    this.engine.emit('node:dragstart', this.dragTarget);
                }
            }

            if (this.isDragging && this.dragTarget) {
                const deltaX = event.worldX - this.dragStartWorld.x;
                const deltaY = event.worldY - this.dragStartWorld.y;
                this.dragStartWorld = { x: event.worldX, y: event.worldY };

                this.config.onDrag(this.dragTarget, event.worldX, event.worldY, deltaX, deltaY);
                
                this.engine.emit('node:drag', {
                    target: this.dragTarget,
                    worldX: event.worldX,
                    worldY: event.worldY,
                    deltaX,
                    deltaY
                });
            }
        });

        this.engine.on('pointerup', (event: any) => {
            if (this.isDragging && this.dragTarget) {
                if (this.config.mode === 'ghost') {
                    this.removeGhost();
                }
                
                this.config.onDragEnd(this.dragTarget);
                this.engine.emit('node:dragend', this.dragTarget);
                
                this.isDragging = false;
                this.dragTarget = null;
            } else if (this.dragTarget && !this.isDragging) {
                this.engine.emit('click', event.result);
                this.dragTarget = null;
            }
        });
    }

    private createGhost(result: PickResult): void {
        // Ghost implementation (placeholder)
    }

    private removeGhost(): void {
        // Ghost removal (placeholder)
    }

    private defaultDragHandler(
        result: PickResult,
        worldX: number,
        worldY: number,
        deltaX: number,
        deltaY: number
    ): void {
        this.engine.emit('drag:update', {
            target: result,
            worldX,
            worldY,
            deltaX,
            deltaY
        });
    }

    private defaultDragEndHandler(result: PickResult): void {
        this.engine.emit('drag:commit', result);
    }

    public enable(): void {
        this.config.enabled = true;
    }

    public disable(): void {
        this.config.enabled = false;
    }

    public setMode(mode: 'classic' | 'ghost' | 'none'): void {
        this.config.mode = mode;
    }

    public destroy(): void {
        this.isDragging = false;
        this.dragTarget = null;
        if (this.ghostSprite) {
            this.removeGhost();
        }
    }
}

