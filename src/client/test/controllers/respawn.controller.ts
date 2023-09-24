import { Controller, OnStart } from "@flamework/core";
import { Players } from "@rbxts/services";
import { MatchController, OnArenaChange } from "client/controllers/match.controller";
import { PlatformCameraController2D } from "./platformcamera2d.controller";

@Controller({})
export class RespawnController2D implements OnStart, OnArenaChange
{
    constructor(private readonly cameraController: PlatformCameraController2D, private readonly matchController: MatchController)
    {
    }

    onStart(): void
    {
    }

    onArenaChanged()
    {
        const currentMatch = this.matchController.GetCurrentMatch();
        assert(currentMatch, "current match is undefined");
        assert(currentMatch.Arena, "match arena is undefined");

        this.cameraController.SetParticipants(
            ...currentMatch.Participants.mapFiltered((n) => n.ParticipantId).map((n) =>
                Players.GetPlayers().find((a) => a.GetAttribute("ParticipantId") === n)?.Character as Model
            ),
        );
        this.cameraController.SetCameraEnabled(true);
    }
}
