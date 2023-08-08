import { InteractionEventManager } from './classes/InteractionEventManager';

export * from './classes/InteractionEventListenerError';
export * from './classes/InteractionEventManager';
export * from './types/RecipleInteractionListenerModule';
export * from './types/listeners';

export const module = new InteractionEventManager();
export default module;