import { Workspace } from "@rbxts/services";
import type Map from "server/components/map.component";
import { quarrelMaps } from "./lib";

export namespace Model
{
    export function LoadModel(
        targetModel: Model | Folder,
        parent: Instance = Workspace,
    ): typeof targetModel
    {
        const newModel = targetModel.Clone();
        newModel.Parent = parent;

        return newModel;
    }

    export function LoadMap(mapId: string, parent?: Instance): Map.MapInstance
    {
        const mapModel = quarrelMaps.FindFirstChild(mapId) as Map.MapInstance;
        for (const descendant of mapModel.GetDescendants())
        {
            if (descendant.IsA("SpawnLocation"))
            {
                descendant.Enabled = false;
            }
        }

        assert(mapModel, `map ${mapId} does not exist.`);
        return LoadModel(mapModel, parent) as Map.MapInstance;
    }
}
