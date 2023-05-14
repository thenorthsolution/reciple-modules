const { RecipleNPMLoader } = require("@reciple/npm-loader");
const { RecipleClient, cli, MessageCommandBuilder } = require("reciple");
const path = require("path");

class NPMLoader extends RecipleNPMLoader {
    get cwd() { return cli.cwd; }

    devCommands = [
        new MessageCommandBuilder()
            .setName('ping')
            .setDescription('Pong')
            .setExecute(async ({ message }) => message.reply('Pong'))
    ];

    /**
     * 
     * @param {RecipleClient} client 
     * @returns 
     */
    async onStart(client) {
        this.nodeModulesFolder = path.join(__dirname, '../../node_modules');
        this.disableVersionChecks = client.config.modules.disableModuleVersionCheck;

        return super.onStart(client);
    }
}

module.exports = {
    NPMLoader,
    default: new NPMLoader()
}