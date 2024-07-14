import { RESTPostAPIChatInputApplicationCommandsJSONBody, RESTPostAPIContextMenuApplicationCommandsJSONBody, isJSONEncodable } from 'discord.js';
import { RecipleClient, RecipleModuleData, RecipleModuleStartData } from '@reciple/core';
import type { DevCommandManager } from 'reciple-dev-commands';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';
import path from 'node:path';
import { existsAsync } from '@reciple/utils';
import { setRecipleModule, setRecipleModuleLoad, setRecipleModuleStart, setRecipleModuleUnload } from '@reciple/decorators';

export type RESTPostAPICommand = RESTPostAPIChatInputApplicationCommandsJSONBody|RESTPostAPIContextMenuApplicationCommandsJSONBody;

export interface RegistryCacheManagerOptions {
    /**
     * @default "./node_modules/.cache/reciple-registry-cache/"
     */
    cacheFolder?: string;
    /**
     * @default 86400000 // 24 hours in milliseconds
     */
    maxCacheAgeMs?: number;
}

export interface RegistryCacheContent {
    clientId: string;
    data: string;
    hash: string;
    createdAt: string;
}

const packageJson: Record<string, any> = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf-8'));

@setRecipleModule({
    id: 'com.reciple.registry-cache',
    name: packageJson.name,
    versions: packageJson.peerDependencies?.['@reciple/core'],
})
export class RegistryCacheManager implements RecipleModuleData, RegistryCacheManagerOptions {
    public static cacheFolder = path.join(process.cwd(), './node_modules/.cache/reciple-registry-cache/');

    private _isCommandsCached: boolean = false;
    private _DevCommandManager: typeof DevCommandManager|null = null;
    private _loggedWarning: boolean = false;

    public devCommandsManager?: DevCommandManager;
    public cacheFolder: string = RegistryCacheManager.cacheFolder;
    public maxCacheAgeMs?: number = 86400000;
    public client!: RecipleClient<true>;

    public lastRegistryCheck: Date|null = null;
    public registryCache: RegistryCacheContent|null = null;

    get registryCacheFile() {
        return path.join(this.cacheFolder, this.client.user?.id ?? randomBytes(10).toString('hex'));
    }

    get isCommandsCached() {
        return this._isCommandsCached;
    }

    constructor(options?: RegistryCacheManagerOptions) {
        this.cacheFolder = options?.cacheFolder ?? this.cacheFolder;
    }

    @setRecipleModuleStart()
    public async onStart({ client }: RecipleModuleStartData): Promise<boolean> {
        this.client = client as RecipleClient<true>;

        if (this.cacheFolder === RegistryCacheManager.cacheFolder) {
            const cli = await import('reciple').then(r => r.cli).catch(() => null);

            if (cli) this.cacheFolder = path.join(cli.cwd, './node_modules/.cache/reciple-registry-cache/');
        }

        return true;
    }

    @setRecipleModuleLoad()
    public async onLoad(): Promise<void> {
        const DevCommandManager = await import('reciple-dev-commands').then(data => data.DevCommandManager).catch(() => null);
        this._DevCommandManager = DevCommandManager ?? null;

        await this.checkRegistryCache();
    }

    @setRecipleModuleUnload()
    public async onUnload(): Promise<void> {}

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

        const data = await this.encodeCommandsData(commands);

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

    public async encodeCommandsData(commands: RESTPostAPICommand[]): Promise<RegistryCacheContent> {
        const data = {
            contextMenuCommands: this.client.config.commands?.contextMenuCommand,
            slashCommands: this.client.config.commands?.slashCommand,
            applicationCommandRegister: this.client.config.applicationCommandRegister,
            userId: this.client.user?.id,
            devCommandsGuilds: this.devCommandsManager?.devGuilds ?? [],
            commands: commands.map(c => Buffer.from(inspect(c, { depth: 10 })).toString('hex'))
        };

        const hex = Buffer.from(JSON.stringify(data)).toString('hex');

        return {
            clientId: this.client.user.id,
            data: hex,
            hash: RegistryCacheManager.createHash(hex),
            createdAt: new Date().toISOString(),
        };
    }

    public static createHash(data: string): string {
        const hash = createHash('md5');
        hash.update(data, 'utf-8');
        return hash.digest('hex');
    }

    public async isEqualToCache(data: RegistryCacheContent): Promise<boolean> {
        this.lastRegistryCheck = new Date();

        const cached = await this.resolveLastCache();
        if (!cached) return false;

        const createdAt = new Date(cached.createdAt);
        const age = Date.now() - createdAt.getTime();

        if (age >= (this.maxCacheAgeMs ?? Infinity)) return false;
        return cached.hash === data.hash;
    }

    public async updateLastCache(data: RegistryCacheContent): Promise<void> {
        await mkdir(this.cacheFolder, { recursive: true });
        await writeFile(this.registryCacheFile, JSON.stringify(data, null, 2), 'utf-8');
    }

    public async resolveLastCache(): Promise<RegistryCacheContent|null> {
        if (!await existsAsync(this.registryCacheFile)) return null;

        try {
            return JSON.parse(await readFile(this.registryCacheFile, 'utf-8'));
        } catch (err) {
            return null;
        }
    }
}