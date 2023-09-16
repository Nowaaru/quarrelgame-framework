import { Controller, Modding, OnInit, OnStart } from "@flamework/core";
import { Players, Workspace } from "@rbxts/services";
import type _Map from "server/components/map.component";
import { ClientEvents, ClientFunctions, Server, ServerFunctions } from "shared/network";
import { CameraController2D } from "./camera2d.controller";

export interface OnArenaChange
{
    onArenaChanged(matchId: string, arenaInstance: _Map.Arena): void;
}

@Controller({
    loadOrder: -1,
})
export class MatchController implements OnStart, OnInit
{
    constructor(private cameraController2D: CameraController2D)
    {}

    private arenaChangedHandlers = new Set<OnArenaChange>();

    private matchData: {
        matchId: string;
        arenaInstance: _Map.Arena;
    } | undefined;

    onStart()
    {
        ClientEvents.ArenaChanged.connect((matchId, arenaId) =>
        {
            const currentMatch = this.GetCurrentMatch();
            if (currentMatch === undefined)
            {
                this.matchData = undefined;
                return error("Current match is undefined.");
            }

            this.matchData = {
                matchId,
                arenaInstance: currentMatch.Arena.instance as _Map.Arena,
            };

            this.cameraController2D.SetParticipants(
                ...currentMatch.Participants.mapFiltered((n) => n.ParticipantId).map((n) =>
                    Players.GetPlayers().find((a) => a.GetAttribute("ParticipantId") === n)?.Character as Model
                ),
            );
            this.cameraController2D.SetCameraEnabled(true);

            for (const listener of this.arenaChangedHandlers)
                task.spawn(() => listener.onArenaChanged(matchId, this.matchData!));
        });
    }

    onInit()
    {
        ClientEvents.MatchParticipantRespawned.connect((characterModel) =>
        {
            if (characterModel === undefined)
                return;
        });

        Modding.onListenerAdded<OnArenaChange>((l) => this.arenaChangedHandlers.add(l));
        Modding.onListenerRemoved<OnArenaChange>((l) => this.arenaChangedHandlers.delete(l));
    }

    public GetMatchData()
    {
        return this.matchData;
    }

    /**
     * Get the current match data freshly requested from the server.
     * @returns The current match.
     */
    public GetCurrentMatch()
    {
        return ClientFunctions.GetCurrentMatch().await()[1] as ReturnType<Server.Functions["GetCurrentMatch"]>;
    }

    public GetCurrentArena(): _Map.Arena | undefined
    {
        const thisMatch = this.GetCurrentMatch()!;
        assert(thisMatch !== undefined, "Current match is undefined.");

        return thisMatch.Arena.instance as _Map.Arena;
    }

    private matchContainer = Workspace.WaitForChild("MapContainer") as Folder;

    private localPlayer = Players.LocalPlayer;
}
