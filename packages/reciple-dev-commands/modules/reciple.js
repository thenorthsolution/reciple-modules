import { RecipleDevCommands } from 'reciple-dev-commands';

export default new RecipleDevCommands({
    allowExecuteInDms: true,
    allowExecuteInNonDevGuild: true,
    allowNonDevUserExecuteInDevGuild: false,
    devGuilds: [],
    devUsers: [],
    logger: undefined
});