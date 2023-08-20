import { Service, OnStart, OnInit, Dependency, Modding } from "@flamework/core";
import { QuarrelGame } from "./quarrelgame.service";

import { Physics } from "server/components/physics";
import { ServerFunctions } from "shared/network";
import { Components } from "@flamework/components";
import { EffectsService } from "./effects.service";
import { Entity } from "server/components/entity.component";
import { Input, Motion } from "shared/util/input";
import { ConvertPercentageToNumber, EntityState, HitResult, HitboxRegion, getEnumValues } from "shared/util/lib";
import { Character, Skill } from "shared/util/character";
import Gio from "shared/data/character/gio";
import { Hitbox } from "shared/util/hitbox";
export interface OnHit {
    onHit(contactData: Hitbox.Contact): void
}

@Service({
    loadOrder: 1,
    })
export class CombatService implements OnStart, OnInit
{
    public readonly HitstopFrames: number = 12;

    private readonly lastSkillData = new Map<defined, {
        lastSkillTime?: number,
        lastSkillHitResult?: HitResult;
    }>();

    constructor(private readonly quarrelGame: QuarrelGame, private readonly effectsService: EffectsService)
    {}

    onInit()
    {
        Modding.onListenerAdded<OnHit>((l) => Hitbox.ActiveHitbox.onHitListeners.add(l));
        Modding.onListenerRemoved<OnHit>((l) => Hitbox.ActiveHitbox.onHitListeners.delete(l));
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

        ServerFunctions.SubmitMotionInput.setCallback(async (player, motionInput) =>
        {
            assert(player.Character, "player has not spawned");
            assert(this.quarrelGame.IsParticipant(player), "player is not a participant");
            assert(this.GetCombatant(player.Character), "player is not a combatant");
            const combatantComponent = this.GetCombatant(player.Character)!;
            const {lastSkillHitResult} = this.lastSkillData.get(combatantComponent)
                    ?? this.lastSkillData.set(combatantComponent, {}).get(combatantComponent)!;

            for (const skill of Gio.Skills)
            {
                const isRecovering = combatantComponent.IsState(EntityState.Recovery);
                if (skill.MotionInput.every((n,i) => motionInput[ i ] === n))
                {
                    if ((isRecovering && lastSkillHitResult !== HitResult.Whiffed) || !combatantComponent.IsNegative())
                    {
                        print("skill executed win!");
                        skill.FrameData.Execute(combatantComponent, skill);

                        return true;
                    }

                    return false;
                }
            }

            return false;
        });

        // read input enums and setup events
        getEnumValues(Input).forEach(([inputName, inputTranslation]) =>
        {
            if (!(`${inputTranslation}` as Input in ServerFunctions))
            {
                warn(`${inputTranslation} is not a valid ServerFunction.`);

                return;
            }

            ServerFunctions[ `${inputTranslation}` as Input ].setCallback((player) =>
            {
                assert(this.quarrelGame.IsParticipant(player), "player is not a participant");
                assert(player.Character, "character is not defined");

                const combatantComponent = this.GetCombatant(player.Character);
                assert(combatantComponent, "entity component not found");

                const {lastSkillHitResult, lastSkillTime} = this.lastSkillData.get(combatantComponent)
                    ?? this.lastSkillData.set(combatantComponent, {}).get(combatantComponent)!;

                if (Gio.Attacks[ inputTranslation ])
                {
                    let attackSkill: Skill.Skill | undefined;

                    if (typeIs(Gio.Attacks[ inputTranslation ], "function"))

                        attackSkill = (Gio.Attacks[ inputTranslation ] as (() => Skill.Skill) | undefined)?.();

                    else attackSkill = (Gio.Attacks[ inputTranslation ] as Skill.Skill | undefined);


                    if (attackSkill)
                    {
                        const attackFrameData = attackSkill.FrameData;
                        const previousSkillId = combatantComponent.attributes.PreviousSkill;
                        const attackDidLand = (lastSkillHitResult !== HitResult.Whiffed);

                        let skillDoesGatling = false;

                        if (previousSkillId)
                        {
                            const previousSkill = Skill.GetCachedSkill(previousSkillId);

                            skillDoesGatling = !!(
                                previousSkill?.GatlingsInto.has(attackSkill.Id)
                            );
                        }

                        const isRecovering = combatantComponent.IsState(EntityState.Recovery);
                        if ((isRecovering && attackDidLand && skillDoesGatling) || !combatantComponent.IsNegative())
                        {
                            if (skillDoesGatling)
                            {
                                if (attackDidLand)

                                    print("ooh that does gattle fr");

                                else print("attack does gattle, but it didn't land!");
                            }
                            else print("doesn't gattle, but not negative!");

                            const currentLastSkillTime = os.clock();
                            combatantComponent.SetHitstop(-1);
                            this.lastSkillData.set(combatantComponent, {
                                lastSkillTime: currentLastSkillTime,
                                lastSkillHitResult
                            });


                            return this.executeFrameData(attackFrameData, combatantComponent, attackSkill, currentLastSkillTime).tap(() =>
                            {
                                if (currentLastSkillTime === lastSkillTime)

                                    combatantComponent.ResetState();

                                else print("state seems to have changed");
                            });
                        }
                        else if (!skillDoesGatling)

                            print(`nah that dont gattle (${skillDoesGatling}):`, previousSkillId ? Skill.GetCachedSkill(previousSkillId)?.GatlingsInto ?? "invalid skill id" : "no skill id");


                        return Promise.resolve(false);

                    }

                    return Promise.resolve(false);
                }

                return Promise.resolve(false);
            });
        });
    }

    private executeFrameData<
        T extends Entity.CombatantAttributes
    >(attackFrameData: Skill.FrameData, attackerCombatant: Entity.Combatant<T>, attackSkill: Skill.Skill, lastSkillTime: number)
    {
        return attackFrameData.Execute(attackerCombatant, attackSkill).then(async (hitData) =>
        {
            print('hit data received:', hitData);
            if (await hitData.hitResult !== HitResult.Whiffed)
            {
                print("omg they didnt whiff!");
                const hitstopFrames = Dependency<CombatService>().HitstopFrames;
                hitData.attacker.SetHitstop(hitstopFrames);
                hitData.attacked?.SetHitstop(hitstopFrames);
            }

            this.lastSkillData.set(attackerCombatant, {
                lastSkillHitResult: await hitData.hitResult,
                lastSkillTime
            });

            return true;
        }) ?? Promise.resolve(false);
    }

    public GetCombatant<T extends Model>(instance: T)
    {
        const components = Dependency<Components>();

        return components.getComponent(instance, Entity.PlayerCombatant) ?? components.getComponent(instance, Entity.Combatant);
    }

    public ApplyImpulse(impulseTarget: Model)
    {

    }

}
