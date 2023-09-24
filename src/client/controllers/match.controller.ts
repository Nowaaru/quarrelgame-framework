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
    onMatchStart(matchId: string, matchData: Awaited<ReturnType<typeof ClientFunctions["GetCurrentMatch"]>>): void;
}

@Controller({
    loadOrder: -1,
})
export class MatchController implements OnStart, OnInit
{
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

            for (const listener of this.arenaChangedHandlers)
                task.spawn(() => listener.onArenaChanged(matchId, this.matchData!.arenaInstance));
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
