import { AnyCommandBuilder, AnySlashCommandBuilder, CommandType, ContextMenuCommandBuilder, Logger, MessageCommandBuilder, MessageCommandExecuteData, MessageCommandExecuteFunction, RecipleClient, RecipleModuleScript, SlashCommandBuilder } from '@reciple/client';
import { RecipleDevCommandModuleScript } from '../types/DevCommandModule';
import { readFileSync } from 'fs';
import path from 'path';
import { Collection } from 'discord.js';
import { getCommand } from 'fallout-utility';

export class DevCommandManager implements RecipleModuleScript {
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
    public devGuilds?: string[];
    public devUsers?: string[];

    get prefix(): string {
        return this._prefix ?? this.client.config.commands?.messageCommand?.prefix ?? '!';
    }

    get argSeparator(): string {
        return this._argSeparator ?? this.client.config.commands?.messageCommand?.commandArgumentSeparator ?? ' ';
    }

    set prefix(value: string|undefined|null) { this._prefix = value || undefined; }
    set argSeparator(value: string|undefined|null) { this._argSeparator = value || undefined; }

    constructor(options?: { prefix?: string; argSeparator?: string; devGuilds?: string[]; devUsers?: string[] }) {
        this.prefix = options?.prefix;
        this.argSeparator = options?.argSeparator;
        this.devGuilds = options?.devGuilds;
        this.devUsers = options?.devUsers;
    }

    public async onStart(client: RecipleClient<false>): Promise<boolean> {
        this.client = client;
        this.logger = client.logger?.clone({ name: 'DevCommandManager' });

        if (!this.devGuilds && process.env.DEV_GUILD) this.devGuilds = process.env.DEV_GUILD.split(' ');

        return true;
    }

    public async onLoad(client: RecipleClient<true>): Promise<void> {
        for (const [id, mdule] of client.modules.modules) {
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
            for (const guildId of (this.devGuilds ?? [])) {
                await client.application.commands.set(applicationCommands, guildId);
                this.logger?.log(`Registered (${applicationCommands.length}) dev commands to ${guildId}`);
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
            const devCommand = client.commands.messageCommands.get(commandData.name);

            if (!devCommand) return;
            if (clientCommand && devCommand) {
                this.logger?.warn(`Found conflicting message command from client and dev commands: ${commandData.name}`);
                return;
            }

            await MessageCommandBuilder.execute(client, message, this.prefix, this.argSeparator, devCommand);
        });

        client.on('interactionCreate', async interaction => {
            if (interaction.isChatInputCommand()) {
                const clientCommand = client.commands.get(interaction.commandName, CommandType.SlashCommand);
                const devCommand = client.commands.slashCommands.get(interaction.commandName);

                if (!devCommand) return;
                if (clientCommand && devCommand) {
                    this.logger?.warn(`Found conflicting slash command from client and dev commands: ${devCommand.name}`);
                    return;
                }

                await SlashCommandBuilder.execute(this.client, interaction, devCommand);
            } else if (interaction.isContextMenuCommand()) {
                const clientCommand = client.commands.get(interaction.commandName, CommandType.ContextMenuCommand);
                const devCommand = client.commands.contextMenuCommands.get(interaction.commandName);

                if (!devCommand) return;
                if (clientCommand && devCommand) {
                    this.logger?.warn(`Found conflicting context menu command from client and dev commands: ${devCommand.name}`);
                    return;
                }

                await ContextMenuCommandBuilder.execute(this.client, interaction, devCommand);
            }
        });
    }

    public async getModuleDevCommands(script: RecipleDevCommandModuleScript): Promise<(AnyCommandBuilder)[]> {
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