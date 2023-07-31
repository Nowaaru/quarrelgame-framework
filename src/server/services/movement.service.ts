import { Service, OnStart, OnInit, Dependency } from "@flamework/core";
import { ServerFunctions } from "shared/network";
import { QuarrelGame } from "./quarrelgame.service";
import { Components } from "@flamework/components";
import { Participant } from "server/components/participant.component";

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
        ServerFunctions.RequestSprint.setCallback((player, sprintState) =>
        {
            assert(this.quarrelGame.IsParticipant(player), `player ${player} is not a participant`);
            assert(player.Character, "player is not defined");

            const participantPlayer = this.quarrelGame.GetParticipantFromCharacter(player.Character)!;
            participantPlayer.entity?.Sprint(sprintState);

            return true;
        });
    }
}

export { SprintState } from "shared/utility/lib";