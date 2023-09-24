import { Controller, OnStart } from "@flamework/core";
import { Players } from "@rbxts/services";
import { MatchController, OnArenaChange } from "client/controllers/match.controller";
import { CameraController2D } from "client/module/camera/camera2d";

@Controller({})
export class RespawnController2D implements OnStart, OnArenaChange
{
    constructor(private readonly cameraController2D: CameraController2D, private readonly matchController: MatchController)
    {
    }

    onStart(): void
    {
    }

    onArenaChanged()
    {
        const currentMatch = this.matchController.GetCurrentMatch();
        assert(currentMatch, "current match is undefined");

        this.cameraController2D.SetParticipants(
            ...currentMatch.Participants.mapFiltered((n) => n.ParticipantId).map((n) =>
                Players.GetPlayers().find((a) => a.GetAttribute("ParticipantId") === n)?.Character as Model
            ),
        );
        this.cameraController2D.SetCameraEnabled(true);
    }
}
