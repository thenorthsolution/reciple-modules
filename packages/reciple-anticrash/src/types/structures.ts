import type { BaseMessageOptions } from 'discord.js';

export interface ReportBaseMessageOptions extends BaseMessageOptions {
    replaceEmbeds?: boolean|'merge';
    replaceFiles?: boolean|'merge';
}