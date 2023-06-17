import { RecipleModuleScript } from '@reciple/client';
import { AnyInteractionListener } from './listeners';
import { JSONEncodable } from 'discord.js';

export interface RecipleInteractionListenerModule extends RecipleModuleScript {
    interactionListeners?: (AnyInteractionListener|JSONEncodable<AnyInteractionListener>)[];
}