import { Components } from "@flamework/components";
import { Service, OnStart, OnInit, Dependency } from "@flamework/core";
import Make from "@rbxts/make";
import { Players, ReplicatedStorage, StarterPlayer } from "@rbxts/services";
import { Entity, EntityAttributes } from "server/components/entity.component";
import { Participant } from "server/components/participant.component";

import { GlobalFunctions } from "shared/network";
const { server: ServerFunctions } = GlobalFunctions;

@Service({
    loadOrder: -1,
    })

export class QuarrelGame implements OnStart, OnInit
{
    onInit()
    {
        StarterPlayer.DevComputerCameraMovementMode = Enum.DevComputerCameraMovementMode.Classic;
        StarterPlayer.EnableMouseLockOption = false;
        Players.CharacterAutoLoads = false;

        print("Quarrel Game is ready.");
    }

    onStart()
    {
        const components = Dependency<Components>();

        Players.PlayerAdded.Connect((player) =>
        {
            components.addComponent(player, Participant);
            player.CharacterAdded.Connect((character) =>
            {
                const Humanoid = character.WaitForChild("Humanoid");
                const Animator = Make("Animator", {
                    Parent: Humanoid,
                });
            });
        });

        // setup events
        ServerFunctions.RespawnCharacter.setCallback((player) =>
        {
            assert(this.IsParticipant(player), `player ${player.UserId} is not a participant`);
            player.LoadCharacter();

            return true;
        });
    }

    public IsPlayer(item: unknown): item is Player
    {
        return typeIs(item, "Instance") && item.IsA("Player");
    }

    public IsParticipant(item: unknown): boolean
    {
        const components = Dependency<Components>();

        return typeIs(item, "Instance") && !!components.getComponent(item, Participant);
    }

    public GetParticipantFromCharacter(item: Instance | undefined): Participant | undefined
    {
        if (!item)

            return undefined;

        const components = Dependency<Components>();
        const player = Players.GetPlayerFromCharacter(item);

        assert(player, "character not found");

        return components.getComponent(player, Participant);
    }

    public participants: Array<Participant> = [];

    public ids: Array<string> = [];
}
