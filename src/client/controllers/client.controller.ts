import { Controller, Modding, OnInit, OnStart } from "@flamework/core";
import { Players, StarterGui } from "@rbxts/services";
import { ClientEvents } from "shared/network";

export interface OnMatchRespawn
{
    onMatchRespawn(character: Model): void;
}

export interface OnRespawn
{
    onRespawn(character: Model): void;
}

<<<<<<< HEAD
@Controller({
    loadOrder: -math.huge,
})
=======
@Controller({})
>>>>>>> 8817bee (IT WORKS!! :0)
export class Client implements OnInit
{
    private matchRespawnTrackers: Set<OnMatchRespawn> = new Set();
    private respawnTrackers: Set<OnRespawn> = new Set();

    constructor()
    {}

    onInit()
    {
<<<<<<< HEAD
        Modding.onListenerAdded<OnMatchRespawn>((a) => this.matchRespawnTrackers.add(a));
        Modding.onListenerRemoved<OnMatchRespawn>((a) => this.matchRespawnTrackers.delete(a));

=======
>>>>>>> 8817bee (IT WORKS!! :0)
        Modding.onListenerAdded<OnRespawn>((a) => this.respawnTrackers.add(a));
        Modding.onListenerRemoved<OnRespawn>((a) => this.respawnTrackers.delete(a));

        ClientEvents.MatchParticipantRespawned.connect((characterModel) =>
        {
            this.matchRespawnTrackers.forEach(async (l) =>
            {
                print("oh naur...");
                l.onMatchRespawn(characterModel);
            });
        });

        const onRespawn = (character: Model) =>
        {
            for (const listener of this.respawnTrackers)
            {
                print("i'm so confused:", listener);
                listener.onRespawn(character);
            }
        };

        Players.PlayerAdded.Connect((player) =>
        {
            player.CharacterAdded.Connect(onRespawn);
        });

        for (const Player of Players.GetPlayers())
            Player.CharacterAdded.Connect(onRespawn);
    }

    public readonly player = Players.LocalPlayer as Player & {
        PlayerGui: PlayerGui;
    };

    public character = this.player.Character;
}
