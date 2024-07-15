import { RecipleAnticrash } from 'reciple-anticrash';

export default new RecipleAnticrash({
    reportChannels: [],
    baseMessageOptions: {
        allowedMentions: {
            parse: [],
            repliedUser: false
        }
    },
    logger: undefined
});