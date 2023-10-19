import { Controller, Modding, OnInit, OnStart } from "@flamework/core";
import { Players, StarterGui } from "@rbxts/services";
import { ClientEvents } from "shared/network";

export interface OnMatchRespawn
{
    onMatchRespawn(character: Model & { Humanoid: Humanoid; }, player?: Player): void;
}

export interface OnRespawn
{
    onRespawn(character: Model & { Humanoid: Humanoid; }): void;
}

@Controller({
    loadOrder: -math.huge,
})
export class Client implements OnInit, OnRespawn
{
    private matchRespawnTrackers: Set<OnMatchRespawn> = new Set();
    private respawnTrackers: Set<OnRespawn> = new Set();

    constructor()
    {}

    // FIXME: currently there is a massive bug where onMatchRespawn functions
    // made for the local player runs because of other participants respawning.
    // should be an easy fix

    onInit()
    {
        Modding.onListenerAdded<OnMatchRespawn>((a) => this.matchRespawnTrackers.add(a));
        Modding.onListenerRemoved<OnMatchRespawn>((a) => this.matchRespawnTrackers.delete(a));

        Modding.onListenerAdded<OnRespawn>((a) => this.respawnTrackers.add(a));
        Modding.onListenerRemoved<OnRespawn>((a) => this.respawnTrackers.delete(a));

        ClientEvents.MatchParticipantRespawned.connect((characterModel) =>
        {
            this.matchRespawnTrackers.forEach(async (l) =>
            {
                l.onMatchRespawn(characterModel as never, Players.GetPlayerFromCharacter(characterModel));
            });
        });

        const onRespawn = (character: Model) =>
        {
            for (const listener of this.respawnTrackers)
                listener.onRespawn(character as never);
        };

        Players.PlayerAdded.Connect((player) =>
        {
            player.CharacterAdded.Connect(onRespawn);
        });

        for (const Player of Players.GetPlayers())
        {
            Player.CharacterAdded.Connect(onRespawn);
            if (Player.Character)
                onRespawn(Player.Character);
        }
    }

    onRespawn(character: Model)
    {
        print("kekwkwkw");
        this.character = character;
    }

    public readonly player = Players.LocalPlayer as Player & {
        PlayerGui: PlayerGui;
    };

    public character = this.player.Character;
}
