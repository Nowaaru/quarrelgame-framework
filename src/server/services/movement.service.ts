import { Service, OnStart, OnInit, Dependency } from "@flamework/core";
import { ServerFunctions } from "shared/network";
import { QuarrelGame } from "./quarrelgame.service";
import { Components } from "@flamework/components";
import { EntityState } from "shared/util/lib";

@Service({})
export class MovementService implements OnStart, OnInit
{
    constructor(private readonly quarrelGame: QuarrelGame)
    {}

    onInit()
    {
    }

    onStart()
    {
        const fetchEntityFromPlayer = (player: Player) =>
        {
            assert(this.quarrelGame.IsParticipant(player), `player ${player} is not a participant`);
            assert(player.Character, "player is not defined");

            const participantPlayer = this.quarrelGame.GetParticipantFromCharacter(player.Character)!;
            assert(participantPlayer.entity, "state entity not defined");

            return participantPlayer.entity;
        };

        ServerFunctions.RequestSprint.setCallback((player, sprintState) =>
        {
            fetchEntityFromPlayer(player).Sprint(sprintState);

            return true;
        });

        ServerFunctions.Crouch.setCallback((player, crouchState) =>
        {

            return fetchEntityFromPlayer(player).SetState(crouchState);
        });

        ServerFunctions.Jump.setCallback((player) =>
        {
            return fetchEntityFromPlayer(player).SetState(EntityState.Midair);
        });
    }
}

export { SprintState } from "shared/util/lib";