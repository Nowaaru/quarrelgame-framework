import { Controller, Modding, OnInit, OnStart } from "@flamework/core";
import { Players, Workspace } from "@rbxts/services";
import { CameraController2D } from "client/module/camera/camera2d";
import type _Map from "server/components/map.component";
import { ClientEvents, ClientFunctions, Server, ServerFunctions } from "shared/network";

export interface OnArenaChange
{
    onArenaChanged(matchId: string, arenaInstance: _Map.Arena): void;
}

// TODO: Implement.
export interface OnMatchStart
{
    onMatchStart(matchId: string, matchData: ReturnType<Server.Functions["GetCurrentMatch"]>): void;
}

@Controller({
    loadOrder: -1,
})
export class MatchController implements OnStart, OnInit
{
    private arenaChangedHandlers = new Set<OnArenaChange>();

    private matchData: ReturnType<Server.Functions["GetCurrentMatch"]>;

    onStart()
    {
        ClientEvents.ArenaChanged.connect((mapId, arenaId) =>
        {
            const currentMatch = this.GetCurrentMatch();
            if (currentMatch === undefined)
            {
                this.matchData = undefined;
                throw "current match is undefined.";
            }

            this.matchData = currentMatch;

            for (const listener of this.arenaChangedHandlers)
                task.spawn(() => listener.onArenaChanged(mapId, currentMatch.Arena as never));
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

        return thisMatch.Arena;
    }

    private matchContainer = Workspace.WaitForChild("MapContainer") as Folder;

    private localPlayer = Players.LocalPlayer;
}
