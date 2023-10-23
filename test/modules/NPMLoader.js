import { RecipleNPMLoader } from "@reciple/npm-loader";
import { cli } from "reciple";
import { fileURLToPath } from 'url';
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class NPMLoader extends RecipleNPMLoader {
    get cwd() { return cli.cwd; }

    async onStart(data) {
        this.nodeModulesFolder = path.join(__dirname, '../../node_modules');
        this.disableVersionChecks = data.client.config.modules.disableModuleVersionCheck;

        return super.onStart(data);
    }
}

export default new NPMLoader()