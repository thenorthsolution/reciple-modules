import { RecipleInteractionEvents } from 'reciple-interaction-events';

export default new RecipleInteractionEvents({
    defaultHalt: data => {
        /**
         * Handle halt of interaction listeners
         * Return false if handling failed, true if it's handled.
         */
    },
    logger: undefined
});