import { Dependency } from "@flamework/core";
import { Players } from "@rbxts/services";
import { ClientEvents, ClientFunctions } from "shared/network";
import { Jump, quarrelMaps } from "shared/util/lib";
import type { Frames } from "./controllers/motioninput.controller";
import { ResourceController } from "./controllers/resourcecontroller.controller";
export interface OnFrame
{
    onFrame(frameTime: Frames, tickRate: number): void;
}

const onFrameListeners: Set<OnFrame> = new Set();
ClientEvents.Tick.connect(async (frameTime: Frames, tickRate: number) =>
{
    for (const listener of onFrameListeners)
    {
        listener.onFrame(frameTime, tickRate);
    }
});

ClientFunctions.RequestLoadMap.setCallback((mapId: string) =>
{
    return new Promise((res) =>
    {
        assert(quarrelMaps.FindFirstChild(mapId), `Map ${mapId} does not exist.`);
        Dependency<ResourceController>()
            .requestPreloadInstances(
                quarrelMaps.FindFirstChild(mapId)!.GetDescendants(),
            )
            .then(() =>
            {
                res(true);
            });
    });
});

ClientEvents.Jump.connect(Jump);

export const Events = ClientEvents;
export const Functions = ClientFunctions;
