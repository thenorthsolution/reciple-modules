import { interactionEventListenerModuleMetadataSymbol } from '../types/constants.js';
import type { InteractionListenerGuard, InteractionListenerType } from '../types/listeners.js';
import type { RecipleInteractionListenerModule, RecipleInteractionListenerModuleMetadata } from '../types/RecipleInteractionListenerModule.js';

/**
 * Registers the interaction event listeners for the module
 *
 * ```ts
 * ＠setRecipleModule()
 * class MyModule implements RecipleInteractionListenerModule {
 *     ＠setRecipleModuleStart()
 *     ＠setRegisterInteractionEvents()
 *     async onStart(): Promise<boolean> {
 *         return true;
 *     }
 * }
 * ```
 */
export function setRegisterInteractionEvents() {
    return function(target: unknown, propertyKey: string, descriptor?: PropertyDescriptor) {
        const originalValue = descriptor?.value;
        if (!descriptor?.value || typeof originalValue !== 'function') throw new Error(`@registerInteractionListeners must be used on a method`);

        descriptor.value = function(this: RecipleInteractionListenerModule & { [interactionEventListenerModuleMetadataSymbol]: RecipleInteractionListenerModuleMetadata; }, ...args: any[]) {
            const metadata = this[interactionEventListenerModuleMetadataSymbol] ?? { interactionListeners: [] };

            metadata.interactionListeners ??= [];
            this.interactionListeners ??= [];

            if (metadata.interactionListeners.length > 0) for (const listener of metadata.interactionListeners) {
                const originalExecute = listener.execute as (...args: unknown[]) => void;
                const originalHalt = listener.halt as (...args: unknown[]) => boolean;
                const originalIdentifier = ('customId' in listener
                    ? listener.customId
                    : 'commandName' in listener
                        ? listener.commandName
                        : undefined) as string|((...args: unknown[]) => boolean)|undefined;

                listener.execute = (...args: any[]) => originalExecute.call(this, ...args);

                if (originalHalt) listener.halt = (...args: any[]) => originalHalt.call(this, ...args);
                if (originalIdentifier && typeof originalIdentifier === 'function') {
                    if ('customId' in listener) listener.customId = (...args: any[]) => originalIdentifier.call(this, ...args);
                    if ('commandName' in listener) listener.commandName = (...args: any[]) => originalIdentifier.call(this, ...args);
                }

                this.interactionListeners.push(listener);
            }

            this[interactionEventListenerModuleMetadataSymbol] = metadata;

            return originalValue.call(this, ...args);
        }
    }
}

/**
 * Sets a method as an interaction event
 *
 * ```ts
 * ＠setRecipleModule()
 * class MyModule implements RecipleInteractionListenerModule {
 *     ＠setRecipleModuleStart()
 *     ＠setRegisterInteractionEvents()
 *     async onStart(): Promise<boolean> {
 *         return true;
 *     }
 * 
 *     ＠setInteractionEvent(InteractionListenerType.Button, { customId: 'hello-world' })
 *     async helloWorld(interaction: ButtonInteraction): Promise<void> {
 *         await interaction.reply('Pong!');
 *     }
 * }
 * ```
 */
export function setInteractionEvent<T extends InteractionListenerType>(type: T, data?: Omit<InteractionListenerGuard<T>, 'execute'|'type'>) {
    return function(target: { constructor: { prototype: { [interactionEventListenerModuleMetadataSymbol]: RecipleInteractionListenerModuleMetadata; } } }, propertyKey: string, descriptor?: PropertyDescriptor) {
        const originalValue = descriptor?.value;
        if (!descriptor?.value || typeof originalValue !== 'function') throw new Error(`@setInteractionEvent must be used on a method`);

        const metadata = target.constructor.prototype[interactionEventListenerModuleMetadataSymbol] ?? { interactionListeners: [] };

        metadata.interactionListeners ??= [];
        metadata.interactionListeners.push({
            type,
            ...data,
            execute: originalValue
        } as InteractionListenerGuard<T>);

        target.constructor.prototype[interactionEventListenerModuleMetadataSymbol] = metadata;
    }
}