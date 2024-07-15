import { AttachmentBuilder, BaseMessageOptions, codeBlock, EmbedBuilder, escapeCodeBlock, Message, TextBasedChannel, type Awaitable, type Collection } from 'discord.js';
import { setClientEvent, setProcessEvent, setRecipleModule, setRecipleModuleLoad, setRecipleModuleStart, setRecipleModuleUnload } from '@reciple/decorators';
import { Logger, RecipleClient, RecipleModuleData, RecipleModuleStartData } from '@reciple/core';
import { inspect, stripVTControlCharacters } from 'node:util';
import { limitString, type PackageJson } from 'fallout-utility';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { StrictTypedEmitter } from 'fallout-utility/StrictTypedEmitter';
import type { ReportBaseMessageOptions } from '../types/structures.js';

export interface RecipleAnticrashOptions {
    reportChannels?: (string|{ id: string; })[];
    baseMessageOptions?: ReportBaseMessageOptions|((reason: any) => Awaitable<ReportBaseMessageOptions>);
    logger?: Logger;
}

export interface RecipleAnticrashEvent {
    report: [reason: any, sentMessages: Collection<string, Message>];
}

export interface RecipleAnticrash extends RecipleModuleData {
    id: string;
    name: string;
    versions: string;
}

const packageJson: PackageJson = JSON.parse(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf-8'));

@setRecipleModule({
    id: 'org.reciple.js.anticrash',
    name: packageJson.name,
    versions: packageJson.peerDependencies?.['@reciple/core'],
})
export class RecipleAnticrash extends StrictTypedEmitter<RecipleAnticrashEvent> implements RecipleModuleData, RecipleAnticrashOptions {
    public client!: RecipleClient;
    public logger?: Logger;

    public reportChannels: string[] = [];
    public baseMessageOptions?: ReportBaseMessageOptions|((reason: any) => Awaitable<ReportBaseMessageOptions>);

    constructor(options?: RecipleAnticrashOptions) {
        super();

        this.report = this.report.bind(this);
        this._handleErrorEvent = this._handleErrorEvent.bind(this);

        this.reportChannels = (options?.reportChannels ?? []).map(c => typeof c === 'string' ? c : c.id).filter(Boolean);
        this.logger = options?.logger;
    }

    @setRecipleModuleStart()
    public async onStart({ client }: RecipleModuleStartData): Promise<boolean> {
        this.client = client;
        this.logger ??= client.logger?.clone({ name: 'AntiCrash' });

        return true;
    }

    @setRecipleModuleLoad()
    public async onLoad(): Promise<void> {
        this.logger?.log(`Listening to error events!`);
    }

    @setRecipleModuleUnload()
    public async onUnload(): Promise<void> {
        this.logger?.log(`Removed error event listeners.`);;
    }

    public async report(reason: any): Promise<Message[]> {
        const sentMessages: Message[] = [];
        const messageOptions = await this.createReportMessageOptions(reason);

        this.logger?.error(reason);

        for (const channelId of this.reportChannels) {
            const channel = await this.getTextChannelFromId(channelId);
            if (!channel) continue;

            const message = await channel.send(messageOptions).catch(() => null);
            if (!message) continue;

            sentMessages.push(message);
        }

        return sentMessages;
    }

    public async createReportMessageOptions(reason: any): Promise<BaseMessageOptions> {
        const base = typeof this.baseMessageOptions === 'function' ? await Promise.resolve(this.baseMessageOptions(reason)).catch(() => null) : this.baseMessageOptions ?? {};
        const embed = new EmbedBuilder()
            .setAuthor({ name: `Anticrash report` })
            .setTitle(limitString(String(reason), 100))
            .setColor('Red')
            .setTimestamp();

        const stack = stripVTControlCharacters(inspect(reason));

        let files: Exclude<BaseMessageOptions['files'], undefined>[0][] = [...(base?.files ?? [])];

        if (stack.length < 1950) {
            embed.setDescription(codeBlock(escapeCodeBlock(stack)))
        } else if (base?.replaceFiles === undefined || base?.replaceFiles === 'merge') {
            files.push(new AttachmentBuilder(Buffer.from(stack, 'utf-8'), { name: 'report.log' }));
        }

        return {
            ...base,
            embeds: base?.replaceEmbeds === undefined || base?.replaceEmbeds === 'merge'
                ? [...(base?.embeds ?? []), embed]
                : base.replaceEmbeds
                    ? base.embeds
                    : [embed],
            files
        };
    }

    public async getTextChannelFromId(id: string): Promise<TextBasedChannel|null> {
        const channel = this.client.channels.cache.get(id) ?? await this.client.channels.fetch(id).catch(() => null);
        if (channel) return channel?.isTextBased() ? channel : null;

        const userDm = !channel
            ? (this.client.users.cache.get(id) || await this.client.users.fetch(id).catch(() => null))
            : null;

        if (userDm) return userDm.dmChannel;

        return null;
    }

    @setClientEvent('error')
    @setClientEvent('shardError')
    @setClientEvent('recipleError')
    @setProcessEvent('uncaughtException')
    @setProcessEvent('uncaughtExceptionMonitor')
    @setProcessEvent('unhandledRejection')
    private async _handleErrorEvent(...args: any[]): Promise<void> {
        if (args[0]) await this.report(args[0]);
    }
}