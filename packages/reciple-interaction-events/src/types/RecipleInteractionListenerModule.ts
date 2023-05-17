import { RecipleModuleScript } from '@reciple/client';
import { AnyInteractionListener } from './listeners';

export interface RecipleInteractionListenerModule extends RecipleModuleScript {
    interactionListeners?: AnyInteractionListener[];
}