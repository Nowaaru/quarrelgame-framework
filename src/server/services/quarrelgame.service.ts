import { Components } from "@flamework/components";
import { Service, OnStart, OnInit, Dependency } from "@flamework/core";
import Make from "@rbxts/make";
import { Players, ReplicatedStorage, StarterPlayer } from "@rbxts/services";
import { Participant } from "server/components/participant.component";

import { GlobalFunctions } from "shared/network";
import { BlockMode } from "shared/util/lib";
const { server: ServerFunctions } = GlobalFunctions;

@Service({
    loadOrder: -1,
    })

export class QuarrelGame implements OnStart, OnInit
{
    public readonly DefaultBlockMode = BlockMode.MoveDirection;

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
            this.participants.push(components.addComponent(player, Participant));
            player.CharacterAdded.Connect((character) =>
            {
                const Humanoid = character.WaitForChild("Humanoid");
                Make("Animator", {
                    Parent: Humanoid,
                });
            });
        });

        Players.PlayerRemoving.Connect((player) =>
        {
            for (const [i, participant] of pairs(this.participants))
            {
                if (participant.instance === player)

                    this.participants.remove(i);
            }
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
        return !!this.participants.find((n) => n.instance === item);
    }

    public GetParticipant(player: Player)
    {
        return this.participants.find((n) => n.instance === player);
    }

    public GetParticipantFromId(id: string)
    {
        return this.participants.find((n) => n.id === id);
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
