import { AttachmentBuilder, BaseMessageOptions, codeBlock, EmbedBuilder, escapeCodeBlock, Message, TextBasedChannel } from 'discord.js';
import { Logger, RecipleClient, RecipleModuleData, RecipleModuleStartData } from '@reciple/core';
import { inspect, stripVTControlCharacters } from 'node:util';
import { limitString } from 'fallout-utility';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export class RecipleAnticrash implements RecipleModuleData {
    private packageJson: Record<string, any> = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf-8'));

    readonly id: string = 'com.reciple.anticrash';
    readonly name: string = this.packageJson.name;

    public versions: string = this.packageJson.peerDependencies['@reciple/core'];
    public client!: RecipleClient;
    public logger?: Logger;

    public reportChannels: string[];

    constructor(reportChannels?: (string|{ id: string; })[]) {
        this.reportChannels = (reportChannels ?? []).map(c => typeof c === 'string' ? c : c.id).filter(Boolean);

        this.report = this.report.bind(this);
        this._eventListener = this._eventListener.bind(this);
    }

    public async onStart({ client }: RecipleModuleStartData): Promise<boolean> {
        this.client = client;
        this.logger = client.logger?.clone({ name: 'AntiCrash' });

        return true;
    }

    public async onLoad(): Promise<void> {
        this.client.on('error', this._eventListener);
        this.client.on('shardError', this._eventListener);
        this.client.on('recipleError', this._eventListener);
        this.logger?.log(`Listening to client error events!`);

        process.on('uncaughtException', this._eventListener);
        process.on('uncaughtExceptionMonitor', this._eventListener);
        process.on('unhandledRejection', this._eventListener);
        this.logger?.log(`Listening to process error events!`);
    }

    public async onUnload(): Promise<void> {
        this.client.removeListener('error', this._eventListener);
        this.client.removeListener('shardError', this._eventListener);
        this.client.removeListener('recipleError', this._eventListener);
        this.logger?.log(`Removed client error event listeners.`);

        process.removeListener('uncaughtException', this._eventListener);
        process.removeListener('uncaughtExceptionMonitor', this._eventListener);
        process.removeListener('unhandledRejection', this._eventListener);
        this.logger?.log(`Removed process error event listeners.`);
    }

    public async report(reason: any): Promise<Message[]> {
        const sentMessages: Message[] = [];
        const messageOptions = this.createReportMessageOptions(reason);

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

    public createReportMessageOptions(reason: any): BaseMessageOptions {
        const embed = new EmbedBuilder()
            .setAuthor({ name: `Anticrash report` })
            .setTitle(limitString(String(reason), 100))
            .setColor('Red')
            .setTimestamp();

        const stack = stripVTControlCharacters(inspect(reason));

        let attachment: AttachmentBuilder|null = null;

        if (stack.length < 1950) {
            embed.setDescription(codeBlock(escapeCodeBlock(stack)))
        } else {
            attachment = new AttachmentBuilder(Buffer.from(stack, 'utf-8'), { name: 'report.log' });
        }

        return { embeds: [embed], files: attachment ? [attachment] : [] };
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

    private async _eventListener(err: any): Promise<void> {
        await this.report(err);
    }
}