import { Components } from "@flamework/components";
import { Service, OnStart, OnInit, Dependency } from "@flamework/core";
import { Players, RunService, Workspace } from "@rbxts/services";
import Character from "data/models/character";
import { Entity } from "server/components/entity.component";

@Service({})
export class TestService implements OnStart, OnInit
{
    onInit()
    {
        const janeModel = Character.jane.Clone();
        janeModel.Parent = Workspace;
        janeModel.PivotTo(new CFrame(0,0,-17));

        const janeCombatant = Dependency<Components>().addComponent(janeModel, Entity.Combatant);
        const janeRotator = Dependency<Components>().addComponent(janeModel, Entity.EntityRotator);
        RunService.Stepped.Connect(() =>
        {
            janeModel.Humanoid.WalkSpeed = 0;
            const targetPlayer = Players.GetPlayers()[ 0 ]?.Character;
            if (targetPlayer)
            {
                janeModel.Humanoid.Move(targetPlayer.GetPivot().LookVector);
                janeRotator.RotateTowards(targetPlayer.PrimaryPart);
            }
        });
    }

    onStart()
    {

    }
}