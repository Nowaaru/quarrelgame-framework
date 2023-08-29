import { ReplicatedStorage, Workspace } from "@rbxts/services";
import { quarrelAssets, quarrelMaps } from "./lib";

import { Dependency } from "@flamework/core";
import type { QuarrelGame } from "server/services/quarrelgame.service";

import type Map from "server/components/map.component";
import { Components } from "@flamework/components";

export namespace Model {
    export function LoadModel(targetModel: Model | Folder, parent: Instance = Workspace): typeof targetModel
    {
        const newModel = targetModel.Clone();
        newModel.Parent = parent;

        return newModel;
    }

    export function LoadMap(mapId: string, parent?: Instance): Map.MapInstance
    {
        const mapModel = quarrelMaps.FindFirstChild(mapId) as Map.MapInstance;
        assert(mapModel, `map ${mapId} does not exist.`);

        return LoadModel(mapModel, parent) as Map.MapInstance;
    }
}