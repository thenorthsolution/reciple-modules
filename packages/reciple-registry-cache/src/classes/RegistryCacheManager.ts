import { RESTPostAPIChatInputApplicationCommandsJSONBody, RESTPostAPIContextMenuApplicationCommandsJSONBody, isJSONEncodable } from 'discord.js';
import { RecipleClient, RecipleModuleData, RecipleModuleStartData } from '@reciple/core';
import type { DevCommandManager } from 'reciple-dev-commands';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { inspect } from 'node:util';
import path from 'node:path';

export type RESTPostAPICommand = RESTPostAPIChatInputApplicationCommandsJSONBody|RESTPostAPIContextMenuApplicationCommandsJSONBody;

export interface RegistryCacheManagerOptions {
    cacheFolder?: string;
}

export class RegistryCacheManager implements RecipleModuleData {
    private packageJson: Record<string, any> = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));

    readonly id: string = 'com.reciple.registry-cache';
    readonly name: string = this.packageJson.name;
    readonly versions: string = this.packageJson.peerDependencies['@reciple/core'];

    private _isCommandsCached: boolean = false;
    private _DevCommandManager: typeof DevCommandManager|null = null;
    private _loggedWarning: boolean = false;

    public devCommandsManager?: DevCommandManager;
    public cacheFolder: string = path.join(__dirname, '../../.cache/');
    public client!: RecipleClient<true>;

    public lastRegistryCheck: Date|null = null;

    get registryCacheFile() {
        return path.join(this.cacheFolder, this.client.user?.id ?? randomBytes(10).toString('hex'));
    }

    get isCommandsCached() {
        return this._isCommandsCached;
    }

    constructor(options?: RegistryCacheManagerOptions) {
        this.cacheFolder = options?.cacheFolder ?? this.cacheFolder;
    }

    public async onStart({ client }: RecipleModuleStartData): Promise<boolean> {
        this.client = client;

        return true;
    }

    public async onLoad(): Promise<void> {
        const DevCommandManager = await import('reciple-dev-commands').then(data => data.DevCommandManager).catch(() => null);
        this._DevCommandManager = DevCommandManager ?? null;

        await this.checkRegistryCache();
    }

    public async checkRegistryCache(): Promise<void> {
        let devCommands: RESTPostAPICommand[] = [];

        if (this._DevCommandManager) {
            const DevCommandManager = this._DevCommandManager;

            const devCommandsModule = this.client.modules.cache.find(m => m.data instanceof DevCommandManager && m.data.id === 'com.reciple.dev-commands');
            this.devCommandsManager = devCommandsModule?.data as DevCommandManager|undefined;

            if (this.devCommandsManager) devCommands = [...this.devCommandsManager.contextMenuCommands.values(), ...this.devCommandsManager.slashCommands.values()].map(c => c.toJSON());
        }

        if (this.client.config.applicationCommandRegister?.enabled === false) return;

        const commands = [
            ...this.client.commands.contextMenuCommands.values(),
            ...this.client.commands.slashCommands.values(),
            ...devCommands
        ].map(c => isJSONEncodable(c) ? c.toJSON() : c as RESTPostAPICommand);

        const data = this.encodeCommandsData(commands);

        if (await this.isEqualToCache(data)) {
            if (!this._loggedWarning) this.client.logger?.warn(`Application commands did not change! Skipping command register...`);

            this.client.config.applicationCommandRegister = {
                ...this.client.config.applicationCommandRegister,
                enabled: false
            };

            this._isCommandsCached = true;
            this._loggedWarning ||= true;
        }

        await this.updateLastCache(data);
    }

    public encodeCommandsData(commands: RESTPostAPICommand[]): string {
        const data = {
            contextMenuCommands: this.client.config.commands?.contextMenuCommand,
            slashCommands: this.client.config.commands?.slashCommand,
            applicationCommandRegister: this.client.config.applicationCommandRegister,
            userId: this.client.user?.id,
            devCommandsGuilds: this.devCommandsManager?.devGuilds ?? [],
            commands: inspect(commands, { depth: 5 })
        };

        return Buffer.from(JSON.stringify(data)).toString('hex');
    }

    public async isEqualToCache(data: string): Promise<boolean> {
        this.lastRegistryCheck = new Date();

        const cachedId = await this.resolveLastCache();
        if (cachedId === undefined) return false;

        return cachedId === data;
    }

    public async updateLastCache(data: string): Promise<void> {
        mkdir(this.cacheFolder, { recursive: true });
        writeFile(this.registryCacheFile, data, 'utf-8');
    }

    public async resolveLastCache(): Promise<string|undefined> {
        if (!existsSync(this.registryCacheFile)) return;
        return readFile(this.registryCacheFile, 'utf-8');
    }
}