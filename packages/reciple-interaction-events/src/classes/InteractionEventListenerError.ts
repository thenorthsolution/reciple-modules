import { InteractionListenerType } from '../types/listeners.js';

export class InteractionEventListenerError extends Error {
    readonly listenerType?: keyof typeof InteractionListenerType;

    constructor(options: { message: string; cause?: unknown; listenerType: keyof typeof InteractionListenerType; }) {
        super(options.message, { cause: options?.cause });

        this.listenerType = options.listenerType;
    }
}