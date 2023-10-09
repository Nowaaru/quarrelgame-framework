import { Dependency, Modding, OnInit, OnStart, Service } from "@flamework/core";
import { QuarrelGame } from "./quarrelgame.service";

import { Components } from "@flamework/components";
import { Players } from "@rbxts/services";
import { Entity } from "server/components/entity.component";
import { Physics } from "server/components/physics";
import { ServerFunctions } from "shared/network";
import { Character, Skill } from "shared/util/character";
import { Hitbox } from "shared/util/hitbox";
import { Input, Motion } from "shared/util/input";
import { ConvertPercentageToNumber, EntityState, getEnumValues, HitboxRegion, HitResult } from "shared/util/lib";
import { EffectsService } from "./effects.service";
<<<<<<< HEAD

=======
import { CharacterSelectController } from "client/controllers/characterselect.controller";
>>>>>>> 8817bee (IT WORKS!! :0)
export interface OnHit
{
    onHit(contactData: Hitbox.Contact): void;
}

@Service({
    loadOrder: 1,
})
export class CombatService implements OnStart, OnInit
{
    public readonly HitstopFrames: number = 12;

    private readonly lastSkillData = new Map<defined, {
        lastSkillTime?: number;
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

            const direction = physicsEntity.CFrame()
                .add(
                    physicsEntity.Backward()
                        .mul(new Vector3(1, 0, 1)),
                ).Position
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
            let combatantComponent;
            let selectedCharacter;

            assert(player.Character, "player has not spawned");
            assert(this.quarrelGame.IsParticipant(player), "player is not a participant");
            assert(combatantComponent = this.GetCombatant(player.Character), "player is not a combatant");
            assert(
                selectedCharacter = this.GetSelectedCharacterFromCharacter(this.GetCombatant(player.Character)!),
                `player ${player.UserId}'s selected character is invalid ${player.GetAttribute("SelectedCharacter")}`,
            );

            const { lastSkillHitResult } = this.lastSkillData.get(combatantComponent) ?? this.lastSkillData.set(combatantComponent, {}).get(combatantComponent)!;

            for (const skill of selectedCharacter.Skills)
            {
                const isRecovering = combatantComponent.IsState(EntityState.Recovery);
                if (skill.MotionInput.every((n, i) => motionInput[i] === n))
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
        getEnumValues(Input).forEach(([ inputName, inputTranslation ]) =>
        {
            if (!(`${inputTranslation}` as Input in ServerFunctions))
            {
                warn(`${inputTranslation} is not a valid ServerFunction.`);

                return;
            }

            ServerFunctions[`${inputTranslation}` as Input].setCallback((player) =>
            {
                assert(this.quarrelGame.IsParticipant(player), "player is not a participant");
                assert(player.Character, "character is not defined");

                let combatantComponent: Entity.Combatant<Entity.CombatantAttributes>;
                let selectedCharacter: Character.Character;
                assert(combatantComponent = this.GetCombatant(player.Character) as never, "entity component not found");
                assert(selectedCharacter = this.GetSelectedCharacterFromCharacter(combatantComponent) as never, "selected character not found");

                const { lastSkillHitResult, lastSkillTime } = this.lastSkillData.get(combatantComponent)
                    ?? this.lastSkillData.set(combatantComponent, {}).get(combatantComponent)!;

                if (selectedCharacter.Attacks[inputTranslation])
                {
                    let attackSkill: Skill.Skill | undefined;

                    if (typeIs(selectedCharacter.Attacks[inputTranslation], "function"))
                        attackSkill = (selectedCharacter.Attacks[inputTranslation] as (() => Skill.Skill) | undefined)?.();
                    else
                        attackSkill = selectedCharacter.Attacks[inputTranslation] as Skill.Skill | undefined;

                    if (attackSkill)
                    {
                        const attackFrameData = attackSkill.FrameData;
                        const previousSkillId = combatantComponent.attributes.PreviousSkill;
                        const attackDidLand = lastSkillHitResult !== HitResult.Whiffed;

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
                                else
                                    print("attack does gattle, but it didn't land!");
                            }
                            else
                            {
                                print("doesn't gattle, but not negative!");
                            }

                            const currentLastSkillTime = os.clock();
                            combatantComponent.SetHitstop(-1);
                            this.lastSkillData.set(combatantComponent, {
                                lastSkillTime: currentLastSkillTime,
                                lastSkillHitResult,
                            });

                            return this.executeFrameData(attackFrameData, combatantComponent, attackSkill, currentLastSkillTime).tap(() =>
                            {
                                if (currentLastSkillTime === lastSkillTime)
                                    combatantComponent.ResetState();
                                else
                                    print("state seems to have changed");
                            });
                        }
                        else if (!skillDoesGatling)
                        {
                            print(
                                `nah that dont gattle (${skillDoesGatling}):`,
                                previousSkillId ? Skill.GetCachedSkill(previousSkillId)?.GatlingsInto ?? "invalid skill id" : "no skill id",
                            );
                        }

                        return Promise.resolve(false);
                    }

                    return Promise.resolve(false);
                }

                return Promise.resolve(false);
            });
        });
    }

    private executeFrameData<
        T extends Entity.CombatantAttributes,
    >(attackFrameData: Skill.FrameData, attackerCombatant: Entity.Combatant<T>, attackSkill: Skill.Skill, lastSkillTime: number)
    {
        return attackFrameData.Execute(attackerCombatant, attackSkill).then(async (hitData) =>
        {
            print("hit data received:", hitData);
            if (await hitData.hitResult !== HitResult.Whiffed)
            {
                print("omg they didnt whiff!");
                const hitstopFrames = Dependency<CombatService>().HitstopFrames;
                hitData.attacker.SetHitstop(hitstopFrames);
                hitData.attacked?.SetHitstop(hitstopFrames);
            }

            this.lastSkillData.set(attackerCombatant, {
                lastSkillHitResult: await hitData.hitResult,
                lastSkillTime,
            });

            return true;
        }) ?? Promise.resolve(false);
    }

    public GetCombatant<T extends Model>(instance: T)
    {
        const components = Dependency<Components>();

        return components.getComponent(instance, Entity.PlayerCombatant) ?? components.getComponent(instance, Entity.Combatant);
    }

    public GetSelectedCharacterFromCharacter<T extends Entity.CombatantAttributes>(instance: Model | Entity.Combatant<T>)
    {
        const characterId = Players.GetPlayers().filter((n) =>
        {
            print("1:", n, n.GetAttributes());

            return !!n.GetAttribute("SelectedCharacter");
        })
            .find((n) =>
            {
                print("2:", n);

                return !!(typeIs(instance, "Instance") ? instance : instance.instance);
            })
            ?.GetAttribute("SelectedCharacter");

        assert(characterId, `character ${characterId} is not found`);

<<<<<<< HEAD
        return Dependency<QuarrelGame>().characters.get(characterId as string);
=======
        return Dependency<CharacterSelectController>().characters.get(characterId as string);
>>>>>>> 8817bee (IT WORKS!! :0)
    }

    public ApplyImpulse(impulseTarget: Model)
    {
    }
}
