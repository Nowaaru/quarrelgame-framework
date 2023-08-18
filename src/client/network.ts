import { ClientEvents, GlobalEvents, GlobalFunctions } from "shared/network";
import type { Frames } from "./controllers/motioninput.controller";
export interface OnFrame {
    onFrame(frameTime: Frames, tickRate: number): void;
}

const onFrameListeners: Set<OnFrame> = new Set();
ClientEvents.Tick.connect(async (frameTime: Frames, tickRate: number) =>
{
    for (const listener of onFrameListeners)

        listener.onFrame(frameTime, tickRate);
});

export const Events = GlobalEvents.client;
export const Functions = GlobalFunctions.client;
