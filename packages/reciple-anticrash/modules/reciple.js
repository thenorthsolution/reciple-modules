import { RecipleAnticrash } from 'reciple-anticrash';

export default new RecipleAnticrash({
    reportChannels: process.env.ERROR_CHANNELS ? process.env.ERROR_CHANNELS.split(',') : [],
    baseMessageOptions: {
        allowedMentions: {
            parse: [],
            repliedUser: false
        }
    },
    logger: undefined
});