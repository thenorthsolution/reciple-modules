import { AnyCommandBuilder, AnyCommandExecuteData, AnySlashCommandBuilder, CommandType, ContextMenuCommandBuilder, Logger, MessageCommandBuilder, MessageCommandExecuteOptions, RecipleClient, RecipleModuleData, RecipleModuleLoadData, RecipleModuleStartData, SlashCommandBuilder, Utils } from '@reciple/core';
import { RecipleDevCommandModuleScript } from '../types/DevCommandModule';
import type { RegistryCacheManager } from 'reciple-registry-cache';
import { ApplicationCommand, Awaitable, Collection } from 'discord.js';
import { TypedEmitter, getCommand } from 'fallout-utility';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface DevCommandManagerOptions {
    prefix?: string|((data: MessageCommandExecuteOptions) => Awaitable<string>);
    argSeparator?: string|((data: MessageCommandExecuteOptions) => Awaitable<string>);
    devGuilds?: string[];
    devUsers?: string[];
    /**
     * @default true
     */
    allowExecuteInNonDevGuild?: boolean;
    /**
     * Ignores cache when [reciple-registry-cache](https://npmjs.org/package/reciple-registry-cache) is installed
     * @default false
     */
    ignoreCommandsCacheRegister?: boolean;
}

export interface DevCommandManagerEvents {
    registerApplicationCommands: [commands: ApplicationCommand, guildId: string];
    commandExecute: [command: AnyCommandExecuteData];
}

export class DevCommandManager extends TypedEmitter<DevCommandManagerEvents> implements RecipleModuleData {
    private _prefix?: string|((data: MessageCommandExecuteOptions) => Awaitable<string>);
    private _argSeparator?: string|((data: MessageCommandExecuteOptions) => Awaitable<string>);
    private packageJson: Record<string, any> = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));

    readonly id: string = 'com.reciple.dev-commands';
    readonly name: string = this.packageJson.name;
    readonly versions: string = this.packageJson.peerDependencies['@reciple/core'];
    readonly contextMenuCommands: Collection<string, ContextMenuCommandBuilder> = new Collection();
    readonly messageCommands: Collection<string, MessageCommandBuilder> = new Collection();
    readonly slashCommands: Collection<string, AnySlashCommandBuilder> = new Collection();

    get devCommands(): AnyCommandBuilder[] {
        return [...this.contextMenuCommands.values(), ...this.messageCommands.values(), ...this.slashCommands.values()];
    };

    public client!: RecipleClient<true>;
    public logger?: Logger;
    public devGuilds: string[];
    public devUsers: string[];
    public allowExecuteInNonDevGuild: boolean;
    public ignoreCommandsCacheRegister: boolean;

    public registryCacheManager: RegistryCacheManager|null = null;

    get isCommandsCached() {
        if (this.registryCacheManager === null) return false;

        return this.registryCacheManager.isCommandsCached;
    }

    set argSeparator(value: string|undefined|null) { this._argSeparator = value || undefined; }

    constructor(options?: DevCommandManagerOptions) {
        super();

        this._prefix = options?.prefix;
        this._argSeparator = options?.argSeparator;
        this.devGuilds = options?.devGuilds ?? [];
        this.devUsers = options?.devUsers ?? [];
        this.allowExecuteInNonDevGuild = options?.allowExecuteInNonDevGuild ?? true;
        this.ignoreCommandsCacheRegister = options?.ignoreCommandsCacheRegister ?? false;
    }

    public async onStart({ client }: RecipleModuleStartData): Promise<boolean> {
        this.client = client as RecipleClient<true>;
        this.logger = client.logger?.clone({ name: 'DevCommandManager' });

        if (!this.devGuilds.length && process.env.DEV_GUILD) this.devGuilds = process.env.DEV_GUILD.split(' ');

        return true;
    }

    public async onLoad({ client }: RecipleModuleLoadData): Promise<void> {
        const RegistryCacheManager = await import('reciple-registry-cache').then(data => data.RegistryCacheManager).catch(() => null);

        if (RegistryCacheManager) {
            const registryCacheManagerModule = client.modules.cache.find(m => m.data instanceof RegistryCacheManager && m.id === 'com.reciple.registry-cache');
            this.registryCacheManager = registryCacheManagerModule?.data as RegistryCacheManager ?? null;
        }

        for (const [id, mdule] of client.modules.cache) {
            const devCommands = await this.getModuleDevCommands(mdule.data);

            for (const command of devCommands) {
                switch (command.command_type) {
                    case CommandType.ContextMenuCommand:
                        this.contextMenuCommands.set(command.name, command);
                        break;
                    case CommandType.MessageCommand:
                        this.messageCommands.set(command.name, command);
                        break;
                    case CommandType.SlashCommand:
                        this.slashCommands.set(command.name, command);
                        break;
                }
            }
        }

        const applicationCommands = [...this.contextMenuCommands.values(), ...this.slashCommands.values()];

        client.modules.once('loadedModules', async () => {
            await new Promise((res, rej) => {
                let timer: NodeJS.Timeout = setTimeout(() => {
                    if (this.registryCacheManager && this.registryCacheManager.lastRegistryCheck === null) return;
                    if (timer) clearTimeout(timer);

                    res(this.isCommandsCached);
                }, 100);
            });

            if (!this.isCommandsCached) {
                const configGuilds = new Set(
                    ...(this.client.config.applicationCommandRegister?.registerToGuilds ?? []),
                    ...(this.client.config.commands?.contextMenuCommand?.registerCommands?.registerToGuilds ?? []),
                    ...(this.client.config.commands?.slashCommand?.registerCommands?.registerToGuilds ?? [])
                );

                for (const guildId of this.devGuilds) {
                    if (configGuilds.has(guildId)) this.logger?.warn(`Replacing reciple application commands with dev commands on guild ${guildId}`);

                    const commands = await client.application.commands.set(applicationCommands, guildId);

                    this.emit('registerApplicationCommands', commands, guildId);
                    this.logger?.log(`Registered (${applicationCommands.length}) dev commands to ${guildId}`);
                }
            } else {
                this.logger?.warn(`Dev commands are cached! Skipping application command register...`);
            }

            this.logger?.log(`Loaded (${this.contextMenuCommands.size}) context menu command(s)`);
            this.logger?.log(`Loaded (${this.messageCommands.size}) message command(s)`);
            this.logger?.log(`Loaded (${this.slashCommands.size}) slash command(s)`);
        });

        client.on('messageCreate', async message => {
            if (!this.devGuilds.length && !this.devUsers.length) return;

            const prefix = await this.getCommandPrefix({ client: this.client, message });
            const argSeparator = await this.getCommandArgSeparator({ client: this.client, message });
            const commandData = getCommand(message.content, prefix, argSeparator);
            if (!commandData || !commandData.name) return;

            const clientCommand = client.commands.get(commandData.name, CommandType.MessageCommand);
            const devCommand = this.messageCommands.get(commandData.name);

            if (!devCommand || !this.isGuildAllowed(message)) return;
            if (this.devUsers.length && !this.devUsers.includes(message.author.id)) return;
            if (clientCommand && devCommand) {
                this.logger?.warn(`Found conflicting message command from client and dev commands: ${commandData.name}`);
                return;
            }

            this.emit('commandExecute', await MessageCommandBuilder.execute({
                client: this.client,
                message,
                command: devCommand
            }));
        });

        client.on('interactionCreate', async interaction => {
            if (!this.devGuilds.length && !this.devUsers.length) return;

            if (interaction.isChatInputCommand()) {
                const clientCommand = client.commands.get(interaction.commandName, CommandType.SlashCommand);
                const devCommand = this.slashCommands.get(interaction.commandName);

                if (!devCommand || !this.isGuildAllowed(interaction)) return;
                if (this.devUsers.length && !this.devUsers.includes(interaction.user.id)) return;
                if (clientCommand && devCommand) {
                    this.logger?.warn(`Found conflicting slash command from client and dev commands: ${devCommand.name}`);
                    return;
                }

                this.emit('commandExecute', await SlashCommandBuilder.execute({
                    client: this.client,
                    interaction,
                    command: devCommand
                }));
            } else if (interaction.isContextMenuCommand()) {
                const clientCommand = client.commands.get(interaction.commandName, CommandType.ContextMenuCommand);
                const devCommand = this.contextMenuCommands.get(interaction.commandName);

                if (!devCommand || !this.isGuildAllowed(interaction)) return;
                if (this.devUsers.length && !this.devUsers.includes(interaction.user.id)) return;
                if (clientCommand && devCommand) {
                    this.logger?.warn(`Found conflicting context menu command from client and dev commands: ${devCommand.name}`);
                    return;
                }

                this.emit('commandExecute', await ContextMenuCommandBuilder.execute({
                    client: this.client,
                    interaction,
                    command: devCommand
                }));
            }
        });
    }

    public async getModuleDevCommands(script: RecipleDevCommandModuleScript): Promise<AnyCommandBuilder[]> {
        const commands: AnyCommandBuilder[] = [];
        if (!script?.devCommands) return commands;

        for (const command of script.devCommands) {
            const data = Utils.resolveCommandBuilder(command);
            commands.push(
                data.command_type === CommandType.ContextMenuCommand
                    ? ContextMenuCommandBuilder.resolve(data)
                    : data.command_type === CommandType.MessageCommand
                        ? MessageCommandBuilder.resolve(data)
                        : SlashCommandBuilder.resolve(data)
            );
        }

        return commands;
    }

    public async getCommandPrefix(data: MessageCommandExecuteOptions): Promise<string> {
        const prefix = this._prefix ?? this.client.config.commands?.messageCommand?.prefix ?? '!';
        return typeof prefix === 'string' ? prefix : prefix(data);
    }

    public setCommandPrefix(prefix: DevCommandManagerOptions['prefix']|null): this {
        this._prefix = prefix ?? undefined;
        return this;
    }

    public async getCommandArgSeparator(data: MessageCommandExecuteOptions): Promise<string> {
        const argSeparator = this._argSeparator ?? this.client.config.commands?.messageCommand?.commandArgumentSeparator ?? ' ';
        return typeof argSeparator === 'string' ? argSeparator : argSeparator(data);
    }

    public setCommandArgSeparator(argSeparator: DevCommandManagerOptions['argSeparator']|null): this {
        this._argSeparator = argSeparator ?? undefined;
        return this;
    }

    public isGuildAllowed(command: { guildId: string|null; }): boolean {
        if (this.allowExecuteInNonDevGuild) return true;
        return command.guildId ? this.devGuilds.includes(command.guildId) : false;
    }
}