import type { Entity } from "server/components/entity.component";
import type { CombatService } from "server/services/combat.service";
import type { SchedulerService } from "server/services/scheduler.service";
import type { Animator } from "shared/components/animator.component";
import { Animation } from "shared/util/animation";
import { EntityState, HitboxRegion, HitData, HitResult } from "shared/util/lib";

import { Hitbox } from "./hitbox";
import { Input, isInput, Motion, MotionInput } from "./input";

import { Dependency } from "@flamework/core";
import { CharacterRigR6 as CharacterRigR6_ } from "@rbxts/promise-character";
import { HttpService, ReplicatedStorage, RunService } from "@rbxts/services";
import { EntityAttributes } from "shared/components/entity.component";
import { Identifier } from "./identifier";

type SkillName = string;

export namespace Character
{
    export const MaximumEaseOfUse = 5;

    type EaseOfUse = 1 | 2 | 3 | 4 | 5;

    export type CharacterRig = CharacterRigR6_ & { PrimaryPart: BasePart; Humanoid: CharacterRigR6_["Humanoid"] & { Animator: Animator; }; };

    export enum CharacterRigType
    {
        Raw,
        HumanoidDescription,
    }

    export const GetCharacterModel = <CharacterModels>() =>
        table.freeze(setmetatable({}, {
            __index: (_, index) =>
            {
                assert(typeIs(index, "string"), "index is not a string.");

                const quarrelGame = ReplicatedStorage.WaitForChild("QuarrelGame") as Folder;
                const quarrelAssets = quarrelGame.WaitForChild("QuarrelGame/assets") as Folder;
                const quarrelModels = quarrelAssets.WaitForChild("model") as Folder;
                const characterModels = quarrelModels.WaitForChild("character") as Folder;

                assert(characterModels.FindFirstChild(index), `character model of name ${index} does not exist.`);

                return characterModels[index as never] as unknown as Character.CharacterRig;
            },
        })) as CharacterModels;
    export enum Archetype
    {
        WellRounded = "Well-Rounded",
        Technical = "Technical",
        Rushdown = "Rushdown",
        Beatdown = "Beatdown",
        Special = "Special",
    }

    export type Animations = {
        [K in EntityState]?: Animation.AnimationData;
    };

    interface CharacterProps
    {
        name: string;

        description: string;

        easeOfUse: EaseOfUse;

        characterModel: Model & { PrimaryPart: BasePart; Humanoid: Humanoid & { Animator?: Animator; }; };

        rigType: CharacterRigType;

        skills: Set<Skill.Skill>;

        animations: Animations;

        characterArchetype: Archetype;

        characterHeader?: string;

        characterSubheader?: string;

        attacks: Map<MotionInput, Skill.Skill | (() => Skill.Skill)>;
    }

    export enum CharacterEvent
    {
        SKILL_CAST,
        METER,

        DAMAGED,
        HEALED,

        ATTACK,
        ANIMATION_START,
        ANIMATION_END,
    }

    namespace CharacterEventSignatures
    {
        export type SkillCast = (skillId: string) => void;
        export type Meter = (meter: number) => void;
        export type Damaged = (healthOld: number, healthNew: number) => void;
        export type Healed = (healthOld: number, healthNew: number) => void;
        export type Attack = (attackId: string) => void;
        export type AnimationStart = (animation: Animation.Animation) => void;
        export type AnimationEnd = (animation: Animation.Animation) => void;
    }

    type CharacterEventSignature<T extends CharacterEvent> = T extends typeof CharacterEvent["SKILL_CAST"] ? CharacterEventSignatures.SkillCast
        : T extends typeof CharacterEvent["METER"] ? CharacterEventSignatures.SkillCast
        : T extends typeof CharacterEvent["DAMAGED"] ? CharacterEventSignatures.AnimationEnd
        : T extends typeof CharacterEvent["HEALED"] ? CharacterEventSignatures.Healed
        : T extends typeof CharacterEvent["ATTACK"] ? CharacterEventSignatures.Attack
        : T extends typeof CharacterEvent["ANIMATION_START"] ? CharacterEventSignatures.AnimationStart
        : T extends typeof CharacterEvent["ANIMATION_END"] ? CharacterEventSignatures.AnimationEnd
        : never;

    interface CharacterProps2D extends CharacterProps
    {
        character3D?: CharacterProps3D;
    }

    interface CharacterProps3D extends CharacterProps
    {
        character2D?: CharacterBuilder2D;
    }

    export class Character
    {
        public static isCharacter(T: defined): T is Character.Character
        {
            return getmetatable(T) === getmetatable(this);
        }

        readonly Name: string;

        readonly Description: string;

        readonly EaseOfUse: EaseOfUse;

        readonly Header?: string;

        readonly Subheader?: string;

        readonly Model: Model & { PrimaryPart: BasePart; Humanoid: Humanoid & { Animator?: Animator; }; };

        readonly Skills: ReadonlySet<Skill.Skill>;

        readonly Archetype: Archetype;

        readonly Animations: Animations;

        readonly Attacks: ReadonlyMap<MotionInput, Skill.Skill | (() => Skill.Skill)>;

        readonly RigType: CharacterRigType;

        constructor({
            name,
            description,
            easeOfUse,
            characterModel,
            skills,
            animations,
            attacks,
            characterHeader,
            characterSubheader,
            rigType,
            characterArchetype: characterArchetype,
        }: CharacterProps)
        {
            this.Name = name;
            this.Description = description;
            this.EaseOfUse = easeOfUse;
            this.Model = characterModel;
            this.Skills = skills;
            this.Animations = animations;
            this.Archetype = characterArchetype;
            this.Header = characterHeader;
            this.Subheader = characterSubheader;
            this.Attacks = attacks;
            this.RigType = rigType;
        }
    }

    abstract class CharacterBuilder
    {
        protected name?: string;

        protected description?: string;

        protected easeOfUse?: EaseOfUse;

        protected characterModel?: CharacterProps["characterModel"];

        protected skills: Set<Skill.Skill> = new Set();

        protected animations: Animations = {};

        protected rigType: CharacterRigType = CharacterRigType.HumanoidDescription;

        protected attacks: CharacterProps["attacks"] = new Map();

        protected characterArchetype: Archetype = Archetype.WellRounded;

        protected characterHeader?: string;

        protected characterSubheader?: string;

        public SetName(name: string)
        {
            this.name = name;

            return this;
        }

        public SetHeader(header: string)
        {
            this.characterHeader = header;

            return this;
        }

        public SetSubheader(subheader: string)
        {
            this.characterSubheader = subheader;

            return this;
        }

        public SetDescription(description: string)
        {
            this.description = description;

            return this;
        }

        public SetEasiness(easeOfUse: EaseOfUse)
        {
            this.easeOfUse = easeOfUse;

            return this;
        }

        public SetModel(characterModel: CharacterProps["characterModel"], rigType = CharacterRigType.HumanoidDescription)
        {
            this.characterModel = characterModel;
            this.rigType = rigType;

            return this;
        }

        public AddSkill(skill: Skill.Skill)
        {
            this.skills.add(skill);

            return this;
        }

        public SetAttack(input: Input | MotionInput, skill: Skill.Skill | (() => Skill.Skill))
        {
            this.attacks.set(isInput(input) ? [ input ] : input, skill);

            return this;
        }

        public SetAnimation(animationId: keyof typeof this.animations, animationData: Animation.AnimationData)
        {
            this.animations[animationId] = animationData;

            return this;
        }

        public Compile(): CharacterProps
        {
            // eslint-disable-next-line max-len
            const { name, description, easeOfUse, characterModel, skills, rigType, attacks, animations, characterArchetype, characterHeader, characterSubheader } =
                this;
            assert(characterModel, "Builder incomplete! Character model is unset.");
            assert(name, "Builder incomplete! Name is unset.");
            assert(description, "Builder incomplete! Description is unset.");
            assert(easeOfUse, "Builder incomplete! Ease of use is unset.");

            return {
                name,
                description,
                easeOfUse,
                characterModel,
                skills,
                attacks,
                animations,
                characterArchetype,
                characterHeader,
                characterSubheader,
                rigType,
            };
        }

        public Construct()
        {
            return new Character(this.Compile());
        }
    }

    export class CharacterBuilder2D extends CharacterBuilder
    {
        private character3D?: Character & { Character2D: Character; };

        public Set3DCharacter(character: Character & { Character2D: Character; })
        {
            this.character3D = character;
        }
    }

    export class CharacterBuilder3D extends CharacterBuilder
    {
        private character2D?: Character & { Character2D: Character; };

        public Set2DCharacter(character: Character & { Character2D: Character; })
        {
            this.character2D = character;
        }
    }
}

export namespace Skill
{
    interface FrameDataClassProps
    {
        Startup: number;

        Active: number;

        Recovery: number;

        BlockStun: number;

        Contact: number;

        Animation: Animation.AnimationData;

        Hitbox: Hitbox.Hitbox;
    }

    class _FrameData
    {
        protected AttackSetup<I extends Entity.CombatantAttributes>({ humanoid }: Entity.Combatant<I>)
        {
            humanoid.Move(Vector3.zero, true);
        }
    }

    export class FrameData extends _FrameData
    {
        /**
         * How many frames it takes for
         * the attack to become active.
         */
        public readonly StartupFrames;

        /**
         * How many frames the hitbox
         * will be enabled for.
         */
        public readonly ActiveFrames;

        /**
         * How many frames the Entity
         * will be unable to act after
         * the active frames.
         *
         * Is subtracted by the {@link FrameData.Contact Contact Frames}.
         */
        public readonly RecoveryFrames;

        /**
         * How many frames a character
         * that gets hit by this move
         * while blocking will be put
         * in a block-stun state.
         */
        public readonly BlockStunFrames;

        /**
         * How many frames the Entity
         * will be given if the attack
         * while the entity is not
         * blocking.
         *
         * Subtracts from the {@link FrameData.RecoveryFrames Recovery Frames}.
         */
        public readonly Contact;

        /**
         * The Animation of the Frame Data.
         */
        public readonly Animation;

        /**
         * The Hitbox of the Frame Data.
         */
        public readonly Hitbox;

        constructor({ Startup, Recovery, BlockStun, Active, Animation, Hitbox, Contact }: FrameDataClassProps)
        {
            super();

            this.StartupFrames = Startup;
            this.RecoveryFrames = Recovery;
            this.BlockStunFrames = BlockStun;
            this.ActiveFrames = Active;
            this.Animation = Animation as Readonly<NonNullable<Animation.AnimationData>>;
            this.Hitbox = Hitbox;
            this.Contact = Contact;
        }

        public async Execute<
            I extends Entity.CombatantAttributes,
            K extends Entity.Combatant<I>,
        >(entity: K, skill: Skill.Skill): Promise<HitData<Entity.EntityAttributes, I>>
        {
            const { animator } = entity;
            const previousEntityState = [ EntityState.Idle, EntityState.Crouch ].includes(entity.GetState())
                ? entity.GetState()
                : EntityState.Idle;

            print("prev entity state:", previousEntityState);
            this.AttackSetup?.(entity);
            assert(RunService.IsServer(), "Function is to be run on the server.");
            assert(this.Animation, "Builder incomplete! Animation not defined.");

            const animatorAnimation = animator.LoadAnimation(this.Animation);
            const previousSkill = entity.attributes.PreviousSkill;
            const cachedPreviousSkill = previousSkill ? GetCachedSkill(previousSkill) : undefined;
            if (cachedPreviousSkill)
            {
                const lastSkillAnimation = animator.GetAnimator()
                    .GetPlayingAnimationTracks()
                    .find((t) => t.Animation?.AnimationId === cachedPreviousSkill.FrameData.Animation.assetId);

                if (lastSkillAnimation)
                    lastSkillAnimation.Stop(0);
            }

            entity.attributes.PreviousSkill = skill.Id;

            return new Promise((res) =>
            {
                const playAnimation = async () =>
                {
                    const schedulerService = Dependency<SchedulerService>();
                    const waitFrames = async (frames: number) =>
                    {
                        const waiter = async () =>
                        {
                            for (let i = 0; i < frames; i++)
                                await schedulerService.WaitForNextTick();
                        };

                        return Promise.any([ waiter(), Promise.fromEvent(animatorAnimation.Ended) ]);
                    };

                    if (this.StartupFrames > 0)
                    {
                        entity.SetState(EntityState.Startup);
                        await waitFrames(this.StartupFrames);
                    }

                    let attackDidLand = HitResult.Whiffed;

                    if (this.ActiveFrames > 0)
                    {
                        let onContact: RBXScriptConnection | void;
                        Promise.try(async () =>
                        {
                            await waitFrames(this.ActiveFrames);
                            activeHitbox.Stop();
                            onContact = onContact?.Disconnect();
                        });

                        entity.SetState(EntityState.Attack);
                        const activeHitbox = this.Hitbox.Initialize(entity.GetPrimaryPart(), skill);
                        onContact = activeHitbox.Contact.Connect(({
                            Attacker,
                            Attacked,

                            AttackerIsBlocking,
                            Region,
                        }) =>
                        {
                            const setLandState = (result: HitResult.Contact | HitResult.Counter | HitResult.Whiffed): HitResult =>
                            {
                                if (result === HitResult.Counter)
                                {
                                    if (!skill.CanCounter)
                                        return attackDidLand = HitResult.Contact;
                                }
                                else if (result === HitResult.Contact)
                                {
                                    if (Attacked.CanCounter())
                                        return setLandState(HitResult.Counter);
                                }

                                return attackDidLand = result;
                            };

                            if (AttackerIsBlocking)
                            {
                                if (Attacked.IsState(EntityState.Crouch))
                                {
                                    if (Region === HitboxRegion.Overhead)
                                    {
                                        setLandState(HitResult.Contact);
                                        Attacker.SetState(EntityState.HitstunCrouching);
                                    }
                                    else
                                    {
                                        attackDidLand = HitResult.Blocked;
                                        Attacked.AddBlockStun(skill.FrameData.BlockStunFrames);
                                    }

                                    return res({
                                        hitResult: attackDidLand,
                                        attacker: entity,
                                        attacked: Attacked,
                                    });
                                }

                                if (Region === HitboxRegion.Low)
                                {
                                    setLandState(HitResult.Contact);
                                    Attacker.SetState(EntityState.Hitstun);
                                }
                                else
                                {
                                    attackDidLand = HitResult.Blocked;
                                    Attacked.AddBlockStun(skill.FrameData.BlockStunFrames);
                                }

                                return res({
                                    hitResult: attackDidLand,
                                    attacker: entity,
                                    attacked: Attacked,
                                });
                            }

                            if (Attacker.IsState(EntityState.Crouch))
                                Attacker.SetState(EntityState.HitstunCrouching);
                            else
                                Attacker.SetState(EntityState.Hitstun);

                            setLandState(HitResult.Contact);
                            if (attackDidLand === HitResult.Counter)
                                Attacked.Counter(Attacker);
                            else
                                print("no Attacked");

                            return res({
                                hitResult: attackDidLand,
                                attacker: entity,
                                attacked: Attacked,
                            });
                        });
                    }

                    if (this.RecoveryFrames > 0)
                    {
                        if (attackDidLand !== HitResult.Whiffed)
                        {
                            let addedFrames = 0;
                            if (attackDidLand === HitResult.Blocked)
                                addedFrames += this.BlockStunFrames;

                            task.spawn(() => entity.ForceState(previousEntityState));
                            return res({
                                hitResult: attackDidLand,
                                attacker: entity,
                            });
                        }

                        task.spawn(() => entity.SetState(EntityState.Recovery));
                        // await Promise.fromEvent(animatorAnimation.Ended);
                        // for (let i = 0; i < this.RecoveryFrames; i++)
                        // {
                        //     if (animatorAnimation.IsPlaying())
                        //         await schedulerService.WaitForNextTick();
                        // }
                        print("waiting frames");
                        await waitFrames(this.RecoveryFrames);
                        print("done waiting");
                    }

                    task.spawn(() => entity.ForceState(previousEntityState));

                    print("current entity state:", EntityState[previousEntityState]);
                    // if (animatorAnimation.IsPlaying())
                    // {
                    //     return Promise.fromEvent(animatorAnimation.Ended)
                    //         .then(() =>
                    //             res({
                    //                 attacker: entity,
                    //                 hitResult: attackDidLand,
                    //             })
                    //         );
                    // }

                    return res({
                        attacker: entity,
                        hitResult: attackDidLand,
                    });
                };

                task.spawn(() =>
                {
                    animatorAnimation.Play({
                        FadeTime: 0,
                        // Weight: 4,
                    });
                });

                playAnimation();
            });
        }
    }

    export class FrameDataBuilder
    {
        private Startup = 0;

        private Active = 0;

        private Recovery = 0;

        private Contact = 0;

        private Block = 0;

        private Animation?: Animation.AnimationData;

        private Hitbox?: Hitbox.Hitbox;

        /**
         * Set the startup frames of the Frame Data.
         * @param startup The amount of time for the attack to be active.
         */
        public SetStartup(startup: number)
        {
            this.Startup = startup;

            return this;
        }

        /**
         * Set the active frames of the Frame Data.
         * @param active The amount of frames the attack is active for.
         */
        public SetActive(active: number)
        {
            this.Active = active;

            return this;
        }

        /**
         * Set the recovery frames of the Frame Data.
         * @param recovery The amount of recovery frames the attack has.
         */
        public SetRecovery(recovery: number)
        {
            this.Recovery = recovery;

            return this;
        }

        /**
         * Set the amount of frames to be added to the Recovery frames
         * if the attack was blocked.
         * @param block The amount of frames added to recovery on block.
         */
        public SetBlock(block: number)
        {
            this.Block = block;

            return this;
        }

        /**
         * Set the Frame Data animation.
         * @param animation The new animation.
         */
        public SetAnimation(animation: Animation.AnimationData)
        {
            this.Animation = animation;

            return this;
        }

        /**
         * Set the new Frame Data hitbox.
         * @param hitbox The new {@link Hitbox.Hitbox Hitbox}.
         */
        public SetHitbox(hitbox: Hitbox.Hitbox)
        {
            this.Hitbox = hitbox;

            return this;
        }

        /**
         * Set the amount of contact frames for the Frame Data.
         * @param contact The amount of contact frames given to the Entity
         * if the attack lands while the target is neutral.
         */
        public SetContact(contact: number)
        {
            this.Contact = contact;

            return this;
        }

        /**
         * Turn this FrameBuilder instance into a readonly FrameData instance.
         * @returns {FrameData} The new readonly FrameData instance.
         */
        public Construct()
        {
            const { Active, Startup, Recovery, Block: BlockStun, Animation, Hitbox, Contact } = this;
            assert(Animation, "Builder incomplete! Animation not defined.");
            assert(Hitbox, "Builder incomplete! Hitbox not defined.");

            return new FrameData({
                Startup,
                Recovery,
                BlockStun,
                Contact,
                Active,
                Animation,
                Hitbox,
            });
        }
    }

    type SkillId = string;
    const allCachedSkills: Map<SkillId, Skill> = new Map();

    export function GetCachedSkill(skillId: SkillId): Skill | undefined
    {
        return allCachedSkills.get(skillId);
    }

    interface SkillClassProps
    {
        name: string;

        description: string;

        frameData: FrameData;

        groundedType: SkillGroundedType;

        motionInput: MotionInput;

        isReversal: boolean;

        canCounterHit: boolean;

        gaugeRequired: number;

        gatlings: Set<(Skill.Skill | SkillName)>;

        skillType: SkillType;
    }

    /**
     * A readonly Class of {@link SkillClassProps}.
     */
    export class Skill
    {
        constructor(
            { name, description, frameData, groundedType, motionInput, isReversal, canCounterHit, gaugeRequired, skillType }: SkillClassProps,
        )
        {
            this.Name = name;
            this.Description = description;
            this.FrameData = frameData;
            this.GroundedType = groundedType;
            this.MotionInput = motionInput;
            this.IsReversal = isReversal;
            this.CanCounter = canCounterHit;
            this.GaugeRequired = gaugeRequired;
            this.Type = skillType;

            allCachedSkills.set(this.Id, this);
        }

        /**
         * The ID of the skill.
         */
        public readonly Id = Identifier.Generate();

        /**
         * The name of the skill.
         */
        public readonly Name: string;

        /**
         * The Type of the skill.
         */
        public readonly Type: SkillType;

        /**
         * The description of the skill.
         */
        public readonly Description: string;

        /**
         * The frame data of the skill.
         * Determines how fast or slow the attacker
         * or defender can act out of an attack.
         */
        public readonly FrameData: FrameData;

        /**
         * The motion input of the skill.
         */
        public readonly MotionInput: MotionInput;

        /**
         * Whether the skill is invulnerable
         * after frame 1. Disabling this on super moves
         * can allow for vulnerable supers.
         */
        public readonly IsReversal: boolean;

        /**
         * Whether this move can put an Entity
         * in the Counter state under the
         * right conditions.
         */
        public readonly CanCounter: boolean;

        /**
         * An Enum that determines whether the skill
         * can only be done {@link SkillGroundedType.Ground grounded}, {@link SkillGroundedType.AirOnly in the air only},
         * {@link SkillGroundedType.AirOk or both in the air and on the ground}.
         */
        public readonly GroundedType: SkillGroundedType;

        /**
         * How much gauge this skill requires to activate.
         */
        public readonly GaugeRequired: number;

        /**
         * The Skills that tkis Skill can cancel
         * into.
         */
        public readonly GatlingsInto = new Set<SkillId>();
        /**
         * Set the Skills that this Skill can
         * cancel into.
         */
        public AddGatling<NormalSkill extends Skill.Skill>(...skills: NormalSkill[])
        {
            assert(skills.every(({ Type }) => Type === SkillType.Normal), "skill is not a Normal skill");

            skills.forEach((skill) =>
            {
                if (!this.GatlingsInto.has(skill.Id))
                    this.GatlingsInto.add(skill.Id);
            });

            return this;
        }
    }

    export enum SkillGroundedType
    {
        Ground,
        AirOk,
        AirOnly,
    }

    export enum SkillType
    {
        Normal,
        CommandNormal,

        Super,
    }

    export class SkillBuilder
    {
        constructor(public readonly skillType: SkillType = SkillType.Normal)
        {}

        private name?: string;

        private description?: string = "";

        private frameData?: FrameData;

        private groundedType: SkillGroundedType = SkillGroundedType.Ground;

        private motionInput: MotionInput = [];

        private isReversal = false;

        private canCounterHit = true;

        private gatlings: Set<Skill.Skill> = new Set();

        private gaugeRequired = 0;

        private followUps: Map<Input, Skill> = new Map();

        /**
         * Set the skill name.
         * @param name The new skill name.
         */
        public SetName(name: string)
        {
            this.name = name;

            return this;
        }

        /**
         * Set the new description.
         * @param description The new description.
         */
        public SetDescription(description: string)
        {
            this.description = description;

            return this;
        }

        /**
         * Set the frame data of the skill using a {@link FrameData} instance.
         * @param frameData A {@link FrameData} instance.
         */
        public SetFrameData(frameData: FrameData): this;
        /**
         * Set the frame data of the skill using a {@link FrameDataBuilder FrameDataBuilder} instance.
         * @param frameData A {@link FrameDataBuilder} instance.
         */
        public SetFrameData(frameData: FrameDataBuilder): this;
        public SetFrameData(frameData: FrameData | FrameDataBuilder)
        {
            if ("SetStartup" in frameData)
                this.frameData = frameData.Construct();
            else
                this.frameData = frameData;

            return this;
        }

        /**
         * Set the new grounded type of the skill.
         * @param groundedType The new {@link SkillGroundedType grounded type} of the skill.
         */
        public SetGroundedType(groundedType: SkillGroundedType = SkillGroundedType.Ground)
        {
            this.groundedType = groundedType;

            return this;
        }

        /**
         * Set a follow-up skill.
         * @param input The input required to follow-up.
         * @param skill The skill to execute on follow-up.
         */
        public SetFollowUp(input: Input, skill: Skill.Skill)
        {
            if (this.followUps.has(input))
                warn(`Skill ${this.name} already has a follow up input (${input}). Overwriting.`);

            this.followUps.set(input, skill);

            return this;
        }

        /**
         * Set the Counter property of the Skill.
         * @param canCounter Whether the skill can initiate the counter-hit state.
         */
        public CanCounter(canCounter = true)
        {
            this.canCounterHit = canCounter;

            return this;
        }

        /**
         * Set the skill's invulnerability after Frame 1.
         * @param isReversal Whether this skill is a Reversal.
         */
        public SetReversal(isReversal = false)
        {
            this.isReversal = isReversal;

            return this;
        }

        /**
         * Set the skill's motion input.
         * @param motionInput The motion input required to execute the Skill.
         */
        public SetMotionInput(motionInput: MotionInput = [])
        {
            this.motionInput = motionInput;

            return this;
        }

        /**
         * Set the amount of gauge required for the skill to activate.
         * @param gaugeRequired The amount of gauge required.
         */
        public SetGaugeRequired(gaugeRequired: number)
        {
            this.gaugeRequired = gaugeRequired;

            return this;
        }

        /**
         * Construct the skill into a new readonly Skill instance.
         * @returns A new readonly Skill instance.
         */
        public Construct(): Skill
        {
            const { name, description, frameData, groundedType, motionInput, isReversal, canCounterHit, gaugeRequired, skillType, gatlings } = this;
            assert(name, "Builder incomplete! Name is unset.");
            assert(description !== undefined, "Builder incomplete! Description is unset.");
            assert(frameData, "Builder incomplete! Frame Data is unset.");
            assert(motionInput, "Builder incomplete! Motion input is unset.");

            return new Skill({
                name,
                description,
                frameData,
                groundedType,
                motionInput,
                isReversal,
                canCounterHit,
                gaugeRequired,
                skillType,
                gatlings,
            });
        }
    }
}

export default Character;
