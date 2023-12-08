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

export interface OnMatchRespawn
{
    onMatchRespawn(character: Model & { Humanoid: Humanoid; }, player?: Player): void;
}

/**
 * The controller responsible for
 * handling the match requests sent
 * by the server.
 *
 * Has a priority of 2.
 */
@Controller({
    loadOrder: 2,
})
export class MatchController implements OnStart, OnInit
{
    private arenaChangedHandlers = new Set<OnArenaChange>();

    private matchData: ReturnType<Server.Functions["GetCurrentMatch"]>;

    private matchRespawnTrackers: Set<OnMatchRespawn> = new Set();

    onStart()
    {
        // FIXME: currently there is a massive bug where onMatchRespawn functions
        // made for the local player runs because of other participants respawning.
        // should be an easy fix
        ClientEvents.MatchParticipantRespawned.connect((characterModel) =>
        {
            this.matchRespawnTrackers.forEach(async (l) =>
            {
                l.onMatchRespawn(characterModel as never, Players.GetPlayerFromCharacter(characterModel));
            });
        });

        ClientEvents.ArenaChanged.connect((mapId, arenaId) =>
        {
            const currentMatch = this.RequestCurrentMatch();
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

    onMatchRespawn()
    {
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

        Modding.onListenerAdded<OnMatchRespawn>((a) => this.matchRespawnTrackers.add(a));
        Modding.onListenerRemoved<OnMatchRespawn>((a) => this.matchRespawnTrackers.delete(a));
    }

    public GetMatchData()
    {
        return this.matchData;
    }

    /**
     * Request the current match data freshly requested from the server.
     * @returns The current match.
     */
    public RequestCurrentMatch()
    {
        return ClientFunctions.GetCurrentMatch().await()[1] as ReturnType<Server.Functions["GetCurrentMatch"]>;
    }

    public GetCurrentArena(): _Map.Arena | undefined
    {
        const thisMatch = this.matchData;
        assert(thisMatch !== undefined, "Current match is undefined.");

        return thisMatch.Arena;
    }

    private matchContainer = Workspace.WaitForChild("MapContainer") as Folder;

    private localPlayer = Players.LocalPlayer;
}
