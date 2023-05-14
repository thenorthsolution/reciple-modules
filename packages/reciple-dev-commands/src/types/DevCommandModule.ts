import { AnyCommandBuilder, AnyCommandData, RecipleModuleScript } from '@reciple/client';

export interface RecipleDevCommandModuleScript extends RecipleModuleScript {
    devCommands?: (AnyCommandBuilder|AnyCommandData)[];
}