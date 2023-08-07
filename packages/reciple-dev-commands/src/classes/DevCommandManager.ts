import { AnyCommandBuilder, AnyCommandExecuteData, AnySlashCommandBuilder, CommandType, ContextMenuCommandBuilder, Logger, MessageCommandBuilder, MessageCommandExecuteData, MessageCommandExecuteFunction, RecipleClient, RecipleModuleScript, SlashCommandBuilder } from '@reciple/client';
import { RecipleDevCommandModuleScript } from '../types/DevCommandModule';
import type { RegistryCacheManager } from 'reciple-registry-cache';
import { ApplicationCommand, Collection } from 'discord.js';
import { TypedEmitter, getCommand } from 'fallout-utility';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface DevCommandManagerOptions {
    prefix?: string;
    argSeparator?: string;
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

export class DevCommandManager extends TypedEmitter<DevCommandManagerEvents> implements RecipleModuleScript {
    private _prefix?: string;
    private _argSeparator?: string;
    private packageJson: Record<string, any> = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));

    readonly moduleName: string = this.packageJson.name;
    readonly versions: string = this.packageJson.peerDependencies['@reciple/client'];
    readonly contextMenuCommands: Collection<string, ContextMenuCommandBuilder> = new Collection();
    readonly messageCommands: Collection<string, MessageCommandBuilder> = new Collection();
    readonly slashCommands: Collection<string, AnySlashCommandBuilder> = new Collection();

    get devCommands(): AnyCommandBuilder[] {
        return [...this.contextMenuCommands.values(), ...this.messageCommands.values(), ...this.slashCommands.values()];
    };

    public client!: RecipleClient;
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

    get prefix(): string {
        return this._prefix ?? this.client.config.commands?.messageCommand?.prefix ?? '!';
    }

    get argSeparator(): string {
        return this._argSeparator ?? this.client.config.commands?.messageCommand?.commandArgumentSeparator ?? ' ';
    }

    set prefix(value: string|undefined|null) { this._prefix = value || undefined; }
    set argSeparator(value: string|undefined|null) { this._argSeparator = value || undefined; }

    constructor(options?: DevCommandManagerOptions) {
        super();

        this.prefix = options?.prefix;
        this.argSeparator = options?.argSeparator;
        this.devGuilds = options?.devGuilds ?? [];
        this.devUsers = options?.devUsers ?? [];
        this.allowExecuteInNonDevGuild = options?.allowExecuteInNonDevGuild ?? true;
        this.ignoreCommandsCacheRegister = options?.ignoreCommandsCacheRegister ?? false;
    }

    public async onStart(client: RecipleClient<false>): Promise<boolean> {
        this.client = client;
        this.logger = client.logger?.clone({ name: 'DevCommandManager' });

        if (!this.devGuilds.length && process.env.DEV_GUILD) this.devGuilds = process.env.DEV_GUILD.split(' ');

        return true;
    }

    public async onLoad(client: RecipleClient<true>): Promise<void> {
        const RegistryCacheManager = await import('reciple-registry-cache').then(data => data.RegistryCacheManager).catch(() => null);

        if (RegistryCacheManager) {
            const registryCacheManagerModule = client.modules.cache.find(m => m.script instanceof RegistryCacheManager && m.script.moduleName === 'reciple-registry-cache');
            this.registryCacheManager = registryCacheManagerModule?.script as RegistryCacheManager ?? null;
        }

        for (const [id, mdule] of client.modules.cache) {
            const devCommands = await this.getModuleDevCommands(mdule.script);

            for (const command of devCommands) {
                switch (command.commandType) {
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
                let timer: NodeJS.Timer|null = null;

                setInterval(() => {
                    if (this.registryCacheManager && this.registryCacheManager.lastRegistryCheck === null) return;
                    if (timer) clearInterval(timer);

                    res(this.isCommandsCached);
                }, 100);
            });

            if (!this.isCommandsCached) {
                const configGuilds = new Set(
                    ...(this.client.config.applicationCommandRegister?.registerToGuilds ?? []),
                    ...(this.client.config.commands?.contextMenuCommand?.registerCommands?.registerToGuilds ?? []),
                    ...(this.client.config.commands?.slashCommand?.registerCommands?.registerToGuilds ?? []),
                    ...(this.client.config.commands?.additionalApplicationCommands?.registerCommands?.registerToGuilds ?? [])
                );

                for (const guildId of (this.devGuilds)) {
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

            if (client.config.commands?.messageCommand?.prefix && this.prefix !== client.config.commands?.messageCommand?.prefix) {
                this.logger?.warn(`Message commands prefix is [${this.prefix}]`);
            }
        });

        client.on('messageCreate', async message => {
            const commandData = getCommand(message.content, this.prefix, this.argSeparator);
            if (!commandData || !commandData.name) return;

            const clientCommand = client.commands.get(commandData.name, CommandType.MessageCommand);
            const devCommand = this.messageCommands.get(commandData.name);

            if (!devCommand || (!this.allowExecuteInNonDevGuild && (!message.guildId || !this.devGuilds.includes(message.guildId)))) return;
            if (clientCommand && devCommand) {
                this.logger?.warn(`Found conflicting message command from client and dev commands: ${commandData.name}`);
                return;
            }

            this.emit('commandExecute', await MessageCommandBuilder.execute(client, message, this.prefix, this.argSeparator, devCommand));
        });

        client.on('interactionCreate', async interaction => {
            if (interaction.isChatInputCommand()) {
                const clientCommand = client.commands.get(interaction.commandName, CommandType.SlashCommand);
                const devCommand = this.slashCommands.get(interaction.commandName);

                if (!devCommand || (!this.allowExecuteInNonDevGuild && (!interaction.guildId || !this.devGuilds.includes(interaction.guildId)))) return;
                if (clientCommand && devCommand) {
                    this.logger?.warn(`Found conflicting slash command from client and dev commands: ${devCommand.name}`);
                    return;
                }

                this.emit('commandExecute', await SlashCommandBuilder.execute(this.client, interaction, devCommand));
            } else if (interaction.isContextMenuCommand()) {
                const clientCommand = client.commands.get(interaction.commandName, CommandType.ContextMenuCommand);
                const devCommand = this.contextMenuCommands.get(interaction.commandName);

                if (!devCommand || (!this.allowExecuteInNonDevGuild && (!interaction.guildId || !this.devGuilds.includes(interaction.guildId)))) return;
                if (clientCommand && devCommand) {
                    this.logger?.warn(`Found conflicting context menu command from client and dev commands: ${devCommand.name}`);
                    return;
                }

                this.emit('commandExecute', await ContextMenuCommandBuilder.execute(this.client, interaction, devCommand));
            }
        });
    }

    public async getModuleDevCommands(script: RecipleDevCommandModuleScript): Promise<AnyCommandBuilder[]> {
        const commands: AnyCommandBuilder[] = [];
        if (!script?.devCommands) return commands;

        for (const command of script.devCommands) {
            if (command.commandType !== CommandType.MessageCommand) {
                commands.push(
                    command.commandType === CommandType.ContextMenuCommand
                    ? ContextMenuCommandBuilder.resolve(command)
                    : SlashCommandBuilder.resolve(command)
                );
                continue;
            }

            const originalExecute = command.execute;
            const execute: MessageCommandExecuteFunction = (data: MessageCommandExecuteData) => {
                if (data.message.inGuild() && !(this.devGuilds ?? []).includes(data.message.guildId)) return;
                if (this.devUsers && !this.devUsers.includes(data.message.author.id)) return;

                return originalExecute ? originalExecute(data) : undefined;
            };

            commands.push(MessageCommandBuilder.resolve(command).setExecute(execute));
        }

        return commands;
    }
}