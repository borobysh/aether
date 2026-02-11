type EventHandler = (...args: any[]) => void;

export class EventEmitter {
    private events = new Map<string, EventHandler[]>();

    public on(event: string, handler: EventHandler): () => void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(handler);

        return () => this.off(event, handler);
    }

    public off(event: string, handler: EventHandler): void {
        const handlers = this.events.get(event);
        if (!handlers) {
            return;
        }

        const index = handlers.indexOf(handler);
        if (index !== -1) {
            handlers.splice(index, 1);
        }
    }

    public emit(event: string, ...args: any[]): void {
        const handlers = this.events.get(event);
        if (!handlers) {
            return;
        }

        handlers.forEach(handler => handler(...args));
    }

    public clear(): void {
        this.events.clear();
    }
}

