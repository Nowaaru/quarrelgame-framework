import type { SchedulerService } from "server/services/scheduler.service";
import type { Animator } from "shared/components/animator.component";
import type { Entity } from "server/components/entity.component";
import { EntityState } from "shared/utility/lib";

import { Input, Motion, MotionInput } from "./input";
import { Dependency } from "@flamework/core";
import { RunService } from "@rbxts/services";

export namespace Animation {
    export interface AnimationData {
        name: string,
        assetId: string,

        priority?: Enum.AnimationPriority
        loop?: boolean,
    }

    export class AnimationBuilder
    {
        private assetId?: string;

        private priority?: Enum.AnimationPriority;

        private name?: string;

        private loop = false;

        public SetName(name: string)
        {
            this.name = name;

            return this;
        }

        public SetLooped(loop: boolean)
        {
            this.loop = loop;

            return this;
        }

        public SetAnimationId(animationId: string): this
        {
            this.assetId = animationId;

            return this;
        }

        public SetPriority(priority: Enum.AnimationPriority = Enum.AnimationPriority.Action)
        {
            this.priority = priority;

            return this;
        }

        public Construct(): Readonly<AnimationData>
        {
            assert(this.assetId, "Builder incomplete! Asset Id is unset.");
            assert(this.name, "Builder incomplete! Name is unset.");

            return {
                assetId: this.assetId,
                priority: this.priority,
                name: this.name,
                loop: this.loop,
            } as const;
        }
    }
}

export namespace Character {
    type EaseOfUse = 1 | 2 | 3 | 4 | 5;

    export enum CharacterType {
        WellRounded = "Well-Rounded",
        Technical = "Technical",
        Rushdown = "Rushdown",
        Beatdown = "Beatdown",
        Special = "Special",
    }

    interface Animations {
        [EntityState.Idle]?: Animation.AnimationData,

        [EntityState.Crouch]?: Animation.AnimationData,
    }

    interface CharacterProps {
        name: string;

        description: string;

        easeOfUse: EaseOfUse;

        characterModel: Model;

        skills: Set<Skill.Skill>;

        animations: Animations;

        characterType: CharacterType;

        attacks: {
            [k in Input]?: Skill.Skill | (() => Skill.Skill);
        },
    }

    interface CharacterProps2D extends CharacterProps {
        character3D?: CharacterProps3D,
    }

    interface CharacterProps3D extends CharacterProps {
        character2D?: CharacterBuilder2D
    }

    export class Character
    {
        readonly Name: string;

        readonly Description: string;

        readonly EaseOfUse: EaseOfUse;

        readonly Model: Model;

        readonly Skills: ReadonlySet<Skill.Skill>;

        readonly Type: CharacterType;

        readonly Animations: Animations;

        readonly Attacks: Readonly<CharacterProps["attacks"]>;

        constructor({name, description, easeOfUse, characterModel, skills, animations, attacks, characterType}: CharacterProps)
        {
            this.Name = name;
            this.Description = description;
            this.EaseOfUse = easeOfUse;
            this.Model = characterModel;
            this.Skills = skills;
            this.Animations = animations;
            this.Type = characterType;
            this.Attacks = attacks;
        }
    }

    abstract class CharacterBuilder
    {
        protected name?: string;

        protected description?: string;

        protected easeOfUse?: EaseOfUse

        protected characterModel?: Model;

        protected skills: Set<Skill.Skill> = new Set();

        protected animations: Animations = {}

        protected attacks: CharacterProps["attacks"] = {}

        protected characterType: CharacterType = CharacterType.WellRounded;

        public SetName(name: string)
        {
            this.name = name;

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

        public SetModel(characterModel: Model)
        {
            this.characterModel = characterModel;

            return this;
        }

        public AddSkill(skill: Skill.Skill)
        {
            this.skills.add(skill);

            return this;
        }

        public SetAttack(animationId: keyof typeof this.attacks, skill: Skill.Skill)
        {
            this.attacks[ animationId ] = skill;

            return this;
        }

        public SetAnimation(animationId: keyof typeof this.animations, animationData: Animation.AnimationData)
        {
            this.animations[ animationId ] = animationData;

            return this;
        }

        public Compile()
        {
            const { name, description, easeOfUse, characterModel, skills, attacks, animations, characterType } = this;
            assert(characterModel, "Builder incomplete! Character model is unset.");
            assert(name, "Builder incomplete! Name is unset.");
            assert(description, "Builder incomplete! Description is unset.");
            assert(easeOfUse, "Builder incomplete! Ease of use is unset.");

            return {
                name, description, easeOfUse, characterModel, skills, attacks, animations, characterType,
            };
        }

        public Construct()
        {
            return new Character(this.Compile());
        }
    }

    export class CharacterBuilder2D extends CharacterBuilder
    {
        private character3D?: Character & { Character2D: Character }

        public Set3DCharacter(character: Character & { Character2D: Character })
        {
            this.character3D = character;
        }

        public Compile(): CharacterProps2D
        {
            const { name, description, easeOfUse, characterModel, skills, attacks, animations, characterType, character3D } = this;
            assert(characterModel, "Builder incomplete! Character model is unset.");
            assert(name, "Builder incomplete! Name is unset.");
            assert(description, "Builder incomplete! Description is unset.");
            assert(easeOfUse, "Builder incomplete! Ease of use is unset.");

            return {
                name, description, easeOfUse, characterModel, skills, attacks, animations, characterType
            };
        }
    }

    export class CharacterBuilder3D extends CharacterBuilder
    {
        private character2D?: Character & { Character2D: Character }

        public Set2DCharacter(character: Character & { Character2D: Character })
        {
            this.character2D = character;
        }

        public Compile(): CharacterProps3D
        {
            const { name, description, easeOfUse, characterModel, skills, attacks, animations, characterType, character2D } = this;
            assert(characterModel, "Builder incomplete! Character model is unset.");
            assert(name, "Builder incomplete! Name is unset.");
            assert(description, "Builder incomplete! Description is unset.");
            assert(easeOfUse, "Builder incomplete! Ease of use is unset.");

            return {
                name, description, easeOfUse, characterModel, skills, attacks, animations, characterType
            };
        }
    }
}

export namespace Skill {

    interface FrameDataClassProps {
        Startup: number,

        Active: number,

        Recovery: number,

        BlockStun: number,

        Animation: Animation.AnimationData
    }

    class HitboxBuilder
    {

    }

    class Hitbox
    {
        constructor()
        {

        }
    }

    class _FrameData
    {
        protected AttackSetup({humanoid}: Entity)
        {
            humanoid.Move(Vector3.zero, true);
        }
    }

    export class FrameData extends _FrameData
    {
        public readonly StartupFrames;

        public readonly ActiveFrames;

        public readonly RecoveryFrames;

        public readonly BlockStunFrames;

        public readonly Animation;

        constructor({Startup, Recovery, BlockStun, Active, Animation}: FrameDataClassProps)
        {
            super();

            this.StartupFrames = Startup;
            this.RecoveryFrames = Recovery;
            this.BlockStunFrames = BlockStun;
            this.ActiveFrames = Active;
            this.Animation = Animation as Readonly<Animation.AnimationData>;
        }

        public async Execute(entity: Entity): Promise<boolean>
        {
            const { animator } = entity;

            this.AttackSetup?.(entity);
            assert(RunService.IsServer(), "Function is to be run on the server.");
            assert(this.Animation, "Builder incomplete! Animation not defined.");

            const animatorAnimation = animator.LoadAnimation(this.Animation);

            return animatorAnimation.Play().then(async () =>
            {
                const schedulerService = Dependency<SchedulerService>();
                if (this.StartupFrames > 0)

                {
                    entity.SetState(EntityState.Startup);
                    for (let i = 0; i < this.StartupFrames; i++)

                        await schedulerService.WaitForNextTick();

                }

                if (this.ActiveFrames > 0)
                {
                    entity.SetState(EntityState.Attack);
                    for (let i = 0; i < this.ActiveFrames; i++)

                        await schedulerService.WaitForNextTick();

                    // do something to make hitboxes appear

                }

                if (this.RecoveryFrames > 0)
                {
                    entity.SetState(EntityState.Recovery);
                    for (let i = 0; i < this.RecoveryFrames; i++)

                        await schedulerService.WaitForNextTick();

                }

                return new Promise<boolean>((res) =>
                {
                    if (animatorAnimation.IsPlaying())

                    {
                        return Promise.fromEvent(animatorAnimation.Ended)
                            .then(() => res(true));
                    }

                    return res(true);
                });
            });
        }
    }

    export class FrameDataBuilder
    {
        private Startup = 0;

        private Active = 0;

        private Recovery = 0;

        private BlockStun = 0;

        private Animation?: Animation.AnimationData;

        private Hitbox?: Hitbox

        public SetStartup(startup: number)
        {
            this.Startup = startup;

            return this;
        }

        public SetActive(active: number)
        {
            this.Active = active;

            return this;
        }

        public SetRecovery(recovery: number)
        {
            this.Recovery = recovery;

            return this;
        }

        public SetBlockStun(blockstun: number)
        {
            this.BlockStun = blockstun;

            return this;
        }

        public SetAnimation(animation: Animation.AnimationData)
        {
            this.Animation = animation;

            return this;
        }

        public Construct()
        {
            const { Active, Startup, Recovery, BlockStun, Animation } = this;
            assert(Animation, "Builder incomplete! Animation not defined.");

            return new FrameData({
                Startup,
                Recovery,
                BlockStun,
                Active,
                Animation
            });
        }
    }

    interface SkillClassProps {
        name: string,

        description: string,

        frameData: FrameData,

        groundedType: SkillGroundedType,

        motionInput: MotionInput,

        isReversal: boolean,

        canCounterHit: boolean,

        gaugeRequired: number,
    }

    export class Skill
    {
        constructor(
            { name, description, frameData, groundedType, motionInput, isReversal, canCounterHit, gaugeRequired }: SkillClassProps
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
        }

        /**
         * The name of the skill.
         */
        public readonly Name: string;

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
       public readonly MotionInput: MotionInput

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
    }

    export enum SkillGroundedType {
        Ground,
        AirOk,
        AirOnly,
    }

    export class SkillBuilder
    {
        private name?: string;

        private description?: string = "";

        private frameData?: FrameData;

        private groundedType: SkillGroundedType = SkillGroundedType.Ground;

        private motionInput: MotionInput = [];

        private isReversal = false;

        private canCounterHit = true;

        private gaugeRequired = 0;

        private followUps: Map<Input, Skill> = new Map();

        public SetName(name: string)
        {
            this.name = name;

            return this;
        }

        public SetDescription(description: string)
        {
            this.description = description;

            return this;
        }

        public SetFrameData(frameData: FrameData): this
        public SetFrameData(frameData: FrameDataBuilder): this
        public SetFrameData(frameData: FrameData | FrameDataBuilder)
        {
            if ("SetStartup" in frameData)

                this.frameData = frameData.Construct();

            else this.frameData = frameData;

            return this;
        }

        public SetGroundedType(groundedType: SkillGroundedType = SkillGroundedType.Ground)
        {
            this.groundedType = groundedType;

            return this;
        }

        public SetFollowUp(input: Input, skill: Skill.Skill)
        {
            if (this.followUps.has(input))

                warn(`Skill ${this.name} already has a follow up input (${input}). Overwriting.`);

            this.followUps.set(input, skill);

            return this;
        }

        public CanCounter(canCounter = true)
        {
            this.canCounterHit = canCounter;

            return this;
        }

        public SetReversal(isReversal = false)
        {
            this.isReversal = isReversal;

            return this;
        }

        public SetMotionInput(motionInput: MotionInput = [])
        {
            this.motionInput = motionInput;

            return this;
        }

        public SetGaugeRequired(gaugeRequired: number)
        {
            this.gaugeRequired = gaugeRequired;

            return this;
        }

        public Construct(): Skill
        {
            const { name, description, frameData, groundedType, motionInput, isReversal, canCounterHit, gaugeRequired } = this;
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
                gaugeRequired
            });
        }
    }
}