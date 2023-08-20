import { Components } from "@flamework/components";
import { Service, OnStart, OnInit, Dependency, Modding } from "@flamework/core";
import Make from "@rbxts/make";
import { Players, ReplicatedStorage, StarterPlayer, Workspace } from "@rbxts/services";
import { CharacterRigType } from "data/models/character";
import { Participant } from "server/components/participant.component";
import Characters from "shared/data/character";

import { GlobalFunctions } from "shared/network";
import { BlockMode } from "shared/util/lib";
const { server: ServerFunctions } = GlobalFunctions;

export interface OnParticipantAdded
{
    onParticipantAdded(participant: Participant): void;
}

@Service({
    loadOrder: -1,
    })
export class QuarrelGame implements OnStart, OnInit
{
    public readonly DefaultBlockMode = BlockMode.MoveDirection;

    public readonly CharacterContainer = Make("Folder", {
        Parent: Workspace,
        Name: "CharacterContainer",
    })

    private readonly participantAddedHandler = new Set<OnParticipantAdded>();

    onInit()
    {
        StarterPlayer.DevComputerCameraMovementMode = Enum.DevComputerCameraMovementMode.Classic;
        StarterPlayer.EnableMouseLockOption = false;
        Players.CharacterAutoLoads = false;

        Modding.onListenerAdded<OnParticipantAdded>((l) => this.participantAddedHandler.add(l));
        Modding.onListenerRemoved<OnParticipantAdded>((l) => this.participantAddedHandler.delete(l));

        print("Quarrel Game is ready.");
    }

    onStart()
    {
        const components = Dependency<Components>();
        const reparentCharacter = (t: Model) =>
        {
            task.wait(0.5);
            t.Parent = this.CharacterContainer;
        };

        Players.PlayerAdded.Connect((player) =>
        {
            const newParticipant = components.addComponent(player, Participant);
            this.participants.push(newParticipant);
            for (const participant of this.participantAddedHandler)

                participant.onParticipantAdded(newParticipant);

            player.CharacterAdded.Connect((character) =>
            {

                if (!character.Parent)
                    character.AncestryChanged.Once(() => reparentCharacter(character));
                else reparentCharacter(character);

                Make("Animator", {
                    Parent: character.WaitForChild("Humanoid"),
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
        ServerFunctions.RespawnCharacter.setCallback((player, characterId) =>
        {
            assert(this.IsParticipant(player), `player ${player.UserId} is not a participant`);

            return this.GetParticipant(player)!.LoadCharacter(characterId);
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
