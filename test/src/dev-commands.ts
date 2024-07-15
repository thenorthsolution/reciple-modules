import { RecipleDevCommands } from 'reciple-dev-commands';

export default new RecipleDevCommands({
    allowExecuteInDms: true,
    allowExecuteInNonDevGuild: true,
    allowNonDevUserExecuteInDevGuild: false,
    deployInProduction: true,
    devGuilds: ['876039624814899220'],
    devUsers: ['749120018771345488'],
    logger: undefined
});