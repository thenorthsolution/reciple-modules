import { RecipleClient, RecipleModuleScript } from '@reciple/client';
import { randomBytes } from 'crypto';
import { RESTPostAPIChatInputApplicationCommandsJSONBody, RESTPostAPIContextMenuApplicationCommandsJSONBody, isJSONEncodable } from 'discord.js';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { inspect } from 'util';
import type { DevCommandManager } from 'reciple-dev-commands';
import { mkdir, readFile, writeFile } from 'fs/promises';

export type RESTPostAPICommand = RESTPostAPIChatInputApplicationCommandsJSONBody|RESTPostAPIContextMenuApplicationCommandsJSONBody;

export class RegistryCacheManager implements RecipleModuleScript {
    private packageJson: Record<string, any> = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
    readonly moduleName: string = this.packageJson.name;
    readonly versions: string = this.packageJson.peerDependencies['@reciple/client'];

    private _isCommandsCached: boolean = false;
    private _DevCommandManager: typeof DevCommandManager|null = null;

    public devCommandsManager?: DevCommandManager;
    public cacheFolder: string = path.join(__dirname, '../../.cache/');
    public client!: RecipleClient;

    get registryCacheFile() {
        return path.join(this.cacheFolder, this.client.user?.id ?? randomBytes(10).toString('hex'));
    }

    get isCommandsCached() {
        return this._isCommandsCached;
    }

    public async onStart(client: RecipleClient<false>): Promise<boolean> {
        this.client = client;

        return true;
    }

    public async onLoad(): Promise<void> {
        const DevCommandManager = await import('reciple-dev-commands').then(data => data.DevCommandManager).catch(() => null);
        this._DevCommandManager = DevCommandManager ?? null;

        this.client.modules.once('loadedModules', async () => this.checkRegistryCache());
    }

    public async checkRegistryCache(): Promise<void> {
        let devCommands: RESTPostAPICommand[] = [];

        if (this._DevCommandManager) {
            const DevCommandManager = this._DevCommandManager;

            const devCommandsModule = this.client.modules.cache.find(m => m.script instanceof DevCommandManager && m.script.moduleName === 'reciple-dev-commands');

            this.devCommandsManager = devCommandsModule?.script as DevCommandManager;

            devCommands = [...this.devCommandsManager.contextMenuCommands.values(), ...this.devCommandsManager.slashCommands.values()].map(c => c.toJSON());
        }

        const commands = [...this.client.commands.contextMenuCommands.toJSON(), ...this.client.commands.slashCommands.toJSON(), ...this.client.commands.additionalApplicationCommands, ...devCommands].map(c => isJSONEncodable(c) ? c.toJSON() : c as RESTPostAPICommand);
        if (this.client.config.applicationCommandRegister?.enabled === false) return;

        const data = this.encodeCommandsData(commands);

        if (await this.isEqualToCache(data)) {
            this.client.logger?.warn(`Application commands did not change! Skipping command register...`);

            this.client.config.applicationCommandRegister = {
                ...this.client.config.applicationCommandRegister,
                enabled: false
            };

            this._isCommandsCached = true;
        }

        await this.updateLastCache(data);
    }

    public encodeCommandsData(commands: RESTPostAPICommand[]): string {
        const data = {
            additionalApplicationCommands: this.client.config.commands?.additionalApplicationCommands,
            contextMenuCommands: this.client.config.commands?.contextMenuCommand,
            slashCommands: this.client.config.commands?.slashCommand,
            applicationCommandRegister: this.client.config.applicationCommandRegister,
            userId: this.client.user?.id,
            commands: inspect(commands, { depth: 5 })
        };

        return Buffer.from(JSON.stringify(data)).toString('hex');
    }

    public async isEqualToCache(data: string): Promise<boolean> {
        const cachedId = await this.resolveLastCache();
        if (cachedId === undefined) return false;

        return cachedId === data;
    }

    public async updateLastCache(data: string): Promise<void> {
        mkdir(path.dirname(this.registryCacheFile), { recursive: true });
        writeFile(this.registryCacheFile, data, 'utf-8');
    }

    public async resolveLastCache(): Promise<string|undefined> {
        if (!existsSync(this.registryCacheFile)) return;
        return readFile(this.registryCacheFile, 'utf-8');
    }
}