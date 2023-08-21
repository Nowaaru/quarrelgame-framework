import { Components } from "@flamework/components";
import { Service, OnStart, OnInit, Dependency } from "@flamework/core";
import { Players, RunService, Workspace } from "@rbxts/services";
import { Entity } from "server/components/entity.component";
import Character from "shared/util/character";

@Service({})
export class TestService implements OnStart, OnInit
{
    onInit()
    {
        const janeModel = Character.CharacterModel.jane.Clone();
        janeModel.SetAttribute("CharacterId", "Vannagio");
        janeModel.Parent = Workspace;
        janeModel.PivotTo(new CFrame(Vector3.FromAxis(Enum.Axis.Z).mul(5)));

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