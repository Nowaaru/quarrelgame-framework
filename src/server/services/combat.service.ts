import { Service, OnStart, OnInit, Dependency } from "@flamework/core";
import { QuarrelGame } from "./quarrelgame.service";

import { Physics } from "server/components/physics";
import { ServerFunctions } from "shared/network";
import { Workspace } from "@rbxts/services";
import { Components } from "@flamework/components";
import { EffectsService } from "./effects.service";
import { Entity, EntityState } from "server/components/entity.component";
import { Input } from "shared/utility/input";
import { getEnumValues } from "shared/utility/lib";
import Gio from "shared/data/character/gio";

export class KnockbackInstance
{
    constructor(targetInstance: Physics.PhysicsEntity<Physics.PhysicsAttributes, Model & { PrimaryPart: Instance }>)
    {
        print("Physics Attribute for model ");
    }
}

@Service({
    loadOrder: 1,
    })
export class CombatService implements OnStart, OnInit
{
    constructor(private readonly quarrelGame: QuarrelGame, private readonly effectsService: EffectsService)
    {}

    onInit()
    {
    }

    onStart()
    {
        // setup events
        const components = Dependency<Components>();
        ServerFunctions.KnockbackTest.setCallback(async (player) =>
        {
            assert(player.Character, "player has not spawned");
            assert(this.quarrelGame.IsParticipant(player), "player is not a participant");

            const participantItem = this.quarrelGame.GetParticipantFromCharacter(player.Character)!;
            const physicsEntity = components.getComponent(participantItem.character!, Physics.PhysicsEntity);
            const normalEntity = components.getComponent(participantItem.character!, Entity);

            assert(physicsEntity, "physics entity not found");

            const direction =
                physicsEntity.CFrame()
                    .add(physicsEntity.Backward()
                        .mul(new Vector3(1,0,1))).Position
                    .mul(5);

            normalEntity?.LockRotation();
            const newImpulse = physicsEntity.ConstantImpulse(
                direction,
                100,
            );

            const knockbackTrail = this.effectsService.GenerateKnockbackTrail(player.Character);
            physicsEntity.RotateFacing(direction.mul(-1));
            newImpulse.Apply();


            return true;
        });

        ServerFunctions.TrailTest.setCallback(async (player) =>
        {
            assert(player.Character, "player has not spawned");
            assert(this.quarrelGame.IsParticipant(player), "player is not a participant");

            const knockbackTrail = this.effectsService.GenerateKnockbackTrail(player.Character);

            return true;
        });

        getEnumValues(Input).forEach(([inputName, inputTranslation]) =>
        {
            ServerFunctions[ `${inputTranslation}` as Input ].setCallback((player) =>
            {
                assert(this.quarrelGame.IsParticipant(player), "player is not a participant");
                assert(player.Character, "character is not defined");

                const entityComponent = Dependency<Components>().getComponent(player.Character, Entity);
                assert(entityComponent, "entity component not found");

                if (Gio.Attacks[ inputTranslation ])
                {
                    const attackFrameData = Gio.Attacks[ inputTranslation ]!.FrameData;

                    entityComponent.SetState(EntityState.Attacking);

                    return attackFrameData?.Execute(entityComponent).tap(() =>
                    {
                        entityComponent.ResetState();
                    });
                }

                return Promise.resolve(false);
            });
        });
    }

    public ApplyImpulse(impulseTarget: Model)
    {

    }

}
