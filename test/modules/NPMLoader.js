import { InteractionListenerType } from 'reciple-interaction-events';
import { RecipleNPMLoader } from "@reciple/npm-loader";
import { RecipleClient, cli } from "reciple";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class NPMLoader extends RecipleNPMLoader {
    get cwd() { return cli.cwd; }

    /**
     * @type {import("reciple-interaction-events").AnyInteractionListener[]}
     */
    interactionListeners = [
        {
            type: InteractionListenerType.ModalSubmit,
            customId: 'ee',
            execute: async interaction => {
                await interaction.reply(interaction.fields.getTextInputValue('content'));
            }
        }
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

export default new NPMLoader()