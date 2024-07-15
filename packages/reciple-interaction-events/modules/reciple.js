import { InteractionEventManager } from 'reciple-interaction-events';

export default new InteractionEventManager({
    defaultHalt: data => {
        /**
         * Handle halt of interaction listeners
         * Return false if handling failed, true if it's handled.
         */
    }
});