import { Dependency } from "@flamework/core";
import { Players } from "@rbxts/services";
import { ClientEvents, ClientFunctions } from "shared/network";
import { QuarrelMaps } from "shared/util/lib";
import { Jump } from "shared/util/lib";
import type { Frames } from "./controllers/motioninput.controller";
import { ResourceController } from "./controllers/resourcecontroller.controller";

export interface OnFrame {
  /**
   * Runs everytime a Game frame passes.
   */
  onFrame(frameTime: Frames, tickRate: number): void;
}

const onFrameListeners: Set<OnFrame> = new Set();
ClientEvents.Tick.connect(async (frameTime: Frames, tickRate: number) => 
{
  for (const listener of onFrameListeners)
    listener.onFrame(frameTime, tickRate);
});

ClientFunctions.RequestLoadMap.setCallback((mapId: string) => 
{
  return new Promise((res) => 
  {
    print("request received");
    assert(QuarrelMaps.FindFirstChild(mapId), `Map ${mapId} does not exist.`);
    Dependency<ResourceController>()
      .requestPreloadInstances(
        QuarrelMaps.FindFirstChild(mapId)!.GetDescendants(),
      )
      .then(() => 
      {
        res(true);
      });
  });
});

ClientEvents.Jump.connect(() =>

  Players.LocalPlayer.Character
    ? Jump(Players.LocalPlayer.Character as (Model & { Humanoid: Humanoid, PrimaryPart: BasePart}))
    : undefined,
);

export const Events = ClientEvents;
export const Functions = ClientFunctions;
