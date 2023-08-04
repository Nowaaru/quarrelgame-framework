import { Service, OnStart, OnInit, Dependency } from "@flamework/core";
import { QuarrelGame } from "./quarrelgame.service";

import { Physics } from "server/components/physics";
import { ServerFunctions } from "shared/network";
import { Components } from "@flamework/components";
import { EffectsService } from "./effects.service";
import { Entity } from "server/components/entity.component";
import { Input } from "shared/util/input";
import { getEnumValues } from "shared/util/lib";
import Gio from "shared/data/character/gio";
import { Skill } from "shared/util/character";

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
            const normalEntity = components.getComponent(participantItem.character!, Entity.Combatant);

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

                const entityComponent = Dependency<Components>().getComponent(player.Character, Entity.Combatant);
                assert(entityComponent, "entity component not found");

                if (Gio.Attacks[ inputTranslation ])
                {
                    let attackFrameData;

                    if (typeIs(Gio.Attacks[ inputTranslation ], "function"))

                        attackFrameData = (Gio.Attacks[ inputTranslation ] as (() => Skill.Skill) | undefined)?.().FrameData;

                    else attackFrameData = (Gio.Attacks[ inputTranslation ] as Skill.Skill | undefined)?.FrameData;

                    if (!entityComponent.IsNegative())
                    {
                        return attackFrameData?.Execute(entityComponent).tap(() =>
                        {
                            entityComponent.ResetState();
                        }) ?? Promise.resolve(false);
                    }

                    return Promise.resolve(false);
                }

                return Promise.resolve(false);
            });
        });
    }

    public ApplyImpulse(impulseTarget: Model)
    {

    }

}
