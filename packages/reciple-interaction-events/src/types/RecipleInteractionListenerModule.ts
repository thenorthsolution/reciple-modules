import { RecipleModuleData } from '@reciple/core';
import { AnyInteractionListener } from './listeners.js';
import { JSONEncodable } from 'discord.js';

export interface RecipleInteractionListenerModule extends RecipleModuleData {
    interactionListeners?: (AnyInteractionListener|JSONEncodable<AnyInteractionListener>)[];
}

export interface RecipleInteractionListenerModuleMetadata {
    interactionEvents?: AnyInteractionListener[];
}