import { ClientEvents, ClientFunctions, GlobalEvents, GlobalFunctions } from "shared/network";
import { Players } from "@rbxts/services";
import type { Frames } from "./controllers/motioninput.controller";
import { Jump } from "shared/util/lib";
export interface OnFrame {
    onFrame(frameTime: Frames, tickRate: number): void;
}

const onFrameListeners: Set<OnFrame> = new Set();
ClientEvents.Tick.connect(async (frameTime: Frames, tickRate: number) =>
{
    for (const listener of onFrameListeners)

        listener.onFrame(frameTime, tickRate);
});

ClientEvents.Jump.connect(Jump);

export const Events = GlobalEvents.client;
export const Functions = GlobalFunctions.client;
