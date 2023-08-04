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
        janeModel.PrimaryPart!.Anchored = true;
        janeModel.Parent = Workspace;

        RunService.Stepped.Connect(() =>
        {
            const targetPlayer = Players.GetPlayers()[ 0 ]?.Character;
            if (targetPlayer)
            {
                janeModel.Humanoid.Move(targetPlayer.GetPivot().LookVector);
                janeModel.PivotTo(CFrame.lookAt(new Vector3(2, 3, -15), targetPlayer.GetPivot().Position ?? new Vector3()));
            }
        });
        Dependency<Components>().addComponent(janeModel, Entity.Combatant);
    }

    onStart()
    {

    }
}