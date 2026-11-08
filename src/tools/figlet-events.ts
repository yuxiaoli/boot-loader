/** The only EventEmitter operations used by Commander 14's in-process parser. */
export class EventEmitter {
  private events = new Map<string, Array<(...args: unknown[]) => void>>();
  on(name: string, listener: (...args: unknown[]) => void) {
    const listeners = this.events.get(name) ?? [];
    listeners.push(listener); this.events.set(name, listeners); return this;
  }
  emit(name: string, ...args: unknown[]) {
    const listeners = this.events.get(name) ?? [];
    for (const listener of [...listeners]) listener.apply(this, args);
    return listeners.length > 0;
  }
  listenerCount(name: string) { return this.events.get(name)?.length ?? 0; }
}
export default { EventEmitter };
