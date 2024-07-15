import { RESTPostAPIChatInputApplicationCommandsJSONBody, RESTPostAPIContextMenuApplicationCommandsJSONBody, isJSONEncodable } from 'discord.js';
import { setRecipleModule, setRecipleModuleLoad, setRecipleModuleStart, setRecipleModuleUnload } from '@reciple/decorators';
import type { RecipleDevCommands } from 'reciple-dev-commands';
import { RecipleClient, RecipleModuleData, RecipleModuleStartData, type RecipleModule } from '@reciple/core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { existsAsync } from '@reciple/utils';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';
import path from 'node:path';

export type RESTPostAPICommand = RESTPostAPIChatInputApplicationCommandsJSONBody|RESTPostAPIContextMenuApplicationCommandsJSONBody;

export interface RecipleRegistryCacheOptions {
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

export interface RecipleRegistryCache extends RecipleModuleData, RecipleRegistryCacheOptions {
    id: string;
    name: string;
    versions: string;
}

const packageJson: Record<string, any> = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf-8'));

@setRecipleModule({
    id: 'org.reciple.js.registry-cache',
    name: packageJson.name,
    versions: packageJson.peerDependencies?.['@reciple/core'],
})
export class RecipleRegistryCache implements RecipleModuleData, RecipleRegistryCacheOptions {
    public static cacheFolder = path.join(process.cwd(), './node_modules/.cache/reciple-registry-cache/');

    private _isCommandsCached: boolean = false;
    private _loggedWarning: boolean = false;

    public cacheFolder: string = RecipleRegistryCache.cacheFolder;
    public maxCacheAgeMs?: number = 86400000;
    public client!: RecipleClient<true>;

    public lastRegistryCheck: Date|null = null;
    public registryCache: RegistryCacheContent|null = null;

    get registryCacheFile() {
        return path.join(this.cacheFolder, this.client.user?.id ?? randomBytes(10).toString('hex'));
    }

    get isCached() {
        return this._isCommandsCached;
    }

    constructor(options?: RecipleRegistryCacheOptions) {
        this.cacheFolder = options?.cacheFolder ?? this.cacheFolder;
    }

    @setRecipleModuleStart()
    public async onStart({ client }: RecipleModuleStartData): Promise<boolean> {
        this.client = client as RecipleClient<true>;

        if (this.cacheFolder === RecipleRegistryCache.cacheFolder) {
            const cli = await import('reciple').then(r => r.cli).catch(() => null);

            if (cli) this.cacheFolder = path.join(cli.cwd, './node_modules/.cache/reciple-registry-cache/');
        }

        return true;
    }

    @setRecipleModuleLoad()
    public async onLoad(): Promise<void> {
        await this.checkRegistryCache();
    }

    @setRecipleModuleUnload()
    public async onUnload(): Promise<void> {}

    public async checkRegistryCache(): Promise<void> {
        if (this.client.config.applicationCommandRegister?.enabled === false) return;

        const commands = Array.from(this.client.commands.applicationCommands.values()).map(c => isJSONEncodable(c) ? c.toJSON() : c as RESTPostAPICommand);

        const data = await this.encodeCommandsData(commands, (await this.getDevCommands())?.devGuilds);

        if (await this.isCacheAvailable(data)) {
            if (!this._loggedWarning) this.client.logger?.warn(`(${commands.length}) Application commands did not change! Skipping command register...`);

            this.client.config.applicationCommandRegister = {
                ...this.client.config.applicationCommandRegister,
                enabled: false
            };

            this._isCommandsCached = true;
            this._loggedWarning ||= true;
        }

        await this.updateLastCache(data);
    }

    public async encodeCommandsData(commands: RESTPostAPICommand[], devGuilds?: string[]): Promise<RegistryCacheContent> {
        const data = {
            contextMenuCommands: this.client.config.commands?.contextMenuCommand,
            slashCommands: this.client.config.commands?.slashCommand,
            applicationCommandRegister: this.client.config.applicationCommandRegister,
            userId: this.client.user?.id,
            commands: commands.map(c => Buffer.from(inspect(c, { depth: 10 })).toString('hex')),
            devGuilds: devGuilds ?? [],
        };

        const hex = Buffer.from(JSON.stringify(data)).toString('hex');

        return {
            clientId: this.client.user.id,
            data: hex,
            hash: RecipleRegistryCache.createHash(hex),
            createdAt: new Date().toISOString(),
        };
    }

    public async isCacheAvailable(data: RegistryCacheContent): Promise<boolean> {
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

    public async getDevCommands(): Promise<RecipleDevCommands|undefined> {
        return (this.client.modules.cache.find(m => m.id === 'org.reciple.js.dev-commands') as RecipleModule<RecipleDevCommands>|undefined)?.data;
    }

    public static createHash(data: string): string {
        const hash = createHash('md5');
        hash.update(data, 'utf-8');
        return hash.digest('hex');
    }
}