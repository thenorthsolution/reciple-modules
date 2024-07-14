import { interactionEventListenerModuleMetadataSymbol } from '../types/constants.js';
import type { InteractionListenerGuard, InteractionListenerType } from '../types/listeners.js';
import type { RecipleInteractionListenerModule, RecipleInteractionListenerModuleMetadata } from '../types/RecipleInteractionListenerModule.js';

export function registerInteractionListeners() {
    return function(target: unknown, propertyKey: string, descriptor?: PropertyDescriptor) {
        const originalValue = descriptor?.value;
        if (!descriptor?.value || typeof originalValue !== 'function') throw new Error(`@registerInteractionListeners must be used on a method`);

        descriptor.value = function(this: RecipleInteractionListenerModule & { [interactionEventListenerModuleMetadataSymbol]: RecipleInteractionListenerModuleMetadata; }, ...args: any[]) {
            const metadata = this[interactionEventListenerModuleMetadataSymbol] ?? { interactionEvents: [] };

            metadata.interactionEvents ??= [];
            this.interactionListeners ??= [];

            if (metadata.interactionEvents.length > 0) for (const listener of metadata.interactionEvents) {
                const originalExecute = listener.execute as (...args: unknown[]) => void;
                listener.execute = (...args: any[]) => originalExecute.call(this, ...args);

                this.interactionListeners.push(listener);
            }

            return originalValue.call(this, ...args);
        }
    }
}

export function setInteractionEvent<T extends InteractionListenerType>(type: T, data: Omit<InteractionListenerGuard<T>, 'execute'|'type'>) {
    return function(target: { constructor: { prototype: { [interactionEventListenerModuleMetadataSymbol]: RecipleInteractionListenerModuleMetadata; } } }, propertyKey: string, descriptor?: PropertyDescriptor) {
        const originalValue = descriptor?.value;
        if (!descriptor?.value || typeof originalValue !== 'function') throw new Error(`@setInteractionEvent must be used on a method`);

        const metadata = target.constructor.prototype[interactionEventListenerModuleMetadataSymbol] ?? { interactionEvents: [] };

        metadata.interactionEvents ??= [];
        metadata.interactionEvents.push({
            type,
            ...data,
            execute: originalValue
        } as InteractionListenerGuard<T>);
    }
}