import { Controller, Modding, OnInit, OnStart } from "@flamework/core";
import { Players, StarterGui } from "@rbxts/services";
import { ClientEvents } from "shared/network";

export interface OnRespawn
{
    onRespawn(character: Model): void;
}

@Controller({})
export class Client implements OnStart, OnInit
{
    private respawnTrackers: Set<OnRespawn> = new Set();

    constructor()
    {}

    onInit()
    {
        Players.LocalPlayer.CameraMinZoomDistance = 8;
        Players.LocalPlayer.CameraMaxZoomDistance = Players.LocalPlayer.CameraMinZoomDistance;

        StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.All, false);
    }

    onStart()
    {
        Modding.onListenerAdded<OnRespawn>((a) => this.respawnTrackers.add(a));
        Modding.onListenerRemoved<OnRespawn>((a) => this.respawnTrackers.delete(a));

        ClientEvents.MatchParticipantRespawned.connect((characterModel) => Promise.all([ ...this.respawnTrackers ].map(async (l) => l.onRespawn(characterModel))));
    }

    public readonly player = Players.LocalPlayer as Player & {
        PlayerGui: PlayerGui;
    };

    public character = this.player.Character;
}
