import { RecipleDevCommands } from 'reciple-dev-commands';

export default new RecipleDevCommands({
    allowExecuteInDms: true,
    allowExecuteInNonDevGuild: true,
    allowNonDevUserExecuteInDevGuild: false,
    deployInProduction: true,
    devGuilds: process.env.DEV_GUILDS ? process.env.DEV_GUILDS.split(',') : [],
    devUsers: process.env.DEV_USERS ? process.env.DEV_USERS.split(',') : [],
    logger: undefined
});