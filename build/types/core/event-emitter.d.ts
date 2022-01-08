import { EventCallback, EventName } from '../types';
export declare class EventEmitter {
    listeners: Map<EventName, Set<EventCallback>>;
    on(eventName: EventName, fn: EventCallback): void;
    once(eventName: EventName, fn: EventCallback): void;
    off(eventName: EventName, fn: EventCallback): void;
    emit(eventName: EventName, ...args: any[]): boolean;
}
