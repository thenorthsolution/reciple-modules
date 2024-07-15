import { RecipleModuleData } from '@reciple/core';
import { AnyInteractionListener } from './listeners.js';
import { JSONEncodable } from 'discord.js';

export interface RecipleInteractionEventsModuleData extends RecipleModuleData {
    interactionListeners?: (AnyInteractionListener|JSONEncodable<AnyInteractionListener>)[];
}

export interface RecipleInteractionListenerModuleMetadata {
    interactionListeners?: AnyInteractionListener[];
}