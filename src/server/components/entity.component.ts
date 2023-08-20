import "shared/components/entity.component";

import { Dependency, OnPhysics, OnStart, OnTick } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { RotatorComponent } from "shared/components/rotator.component";
import { Physics } from "./physics";
import { Players, RunService } from "@rbxts/services";
import { OnFrame, SchedulerService } from "server/services/scheduler.service";
import { Animator } from "shared/components/animator.component";
import { BlockMode } from "shared/util/lib";


import * as lib from "shared/util/lib";
import { QuarrelGame } from "server/services/quarrelgame.service";
import { Input } from "shared/util/input";
import * as entityExport from "shared/components/entity.component";
import { ServerEvents, ServerFunctions } from "shared/network";
enum RotationMode {
    Unlocked,
    Locked,
}

type String<T> = string;

export namespace Entity {

    export import EntityState = lib.EntityState;

    export import Entity = entityExport.Entity;

    export import EntityAttributes = entityExport.EntityAttributes;
    export interface CombatantAttributes extends EntityAttributes {
        /**
         * The maximum stamina of the entity.
         */
        MaxStamina: number,
        /**
         * The current stamina of the entity.
         */
        Stamina: number,

        /**
         * The maximum block stamina.
         * If the Entity runs out of block stamina, the
         * next hit will be guaranteed to be a counter-hit.
         */
        MaxBlockStamina: number,
        /**
         * The current block stamina.
         * If the Entity runs out of block stamina, the
         * next hit will be guaranteed to be a counter-hit.
         */
        BlockStamina: number,
        /**
         * The amount of block stun the Entity is in.
         * This will constantly reduce by 1 every in-game
         * tick (1/{@link SchedulerService.gameTickRate gameTickRate}).
         *
         * The Entity cannot make any inputs
         * while this value is above 0.
         */
        BlockStun: number | -1,
        /**
         * The amount of invulnerability frames
         * the current Entity is in. In this state,
         * any hurtboxes present will not put the
         * character in a HitStun state.
         */
        IFrame: number | -1,

        /**
         * Whether the Entity was countered by a
         * skill. Should be the ID of the Entity
         * that attacked.
         *
         * If the Entity is hit by another Entity
         * that has the value of this Attribute,
         * this Entity will take more damage,
         * take more hitstun, and receive less
         * forgiveness by the Combo system.
         */
        Counter?: string,

        /**
         * The Id of the skill that the Entity
         * is currently doing.
         */
        PreviousSkill?: string,

        /**
         * The character representing this combatant.
         * Errors if the character is invalid.
         */
        CharacterId: string,

        /**
         * The current State the Entity is in.
         */
        State: String<EntityState>,
    }

    type SkillId = string;

    @Component({
        defaults: {
        MaxHealth: 100,
        Health: 100,

        MaxStamina: 100,
        Stamina: 100,

        MaxBlockStamina: 100,
        BlockStamina: 100,

        IFrame: -1,
        BlockStun: -1,
        HitStop: -1,

        EntityId: "generate",
        State: EntityState.Idle,
        }
        })
    export class Combatant<A extends CombatantAttributes> extends Entity<A> implements OnStart, OnFrame
    {
        public readonly animator: Animator.Animator;

        public readonly stateAnimator: Animator.StateAnimator;

        constructor()
        {
            super();

            const components = Dependency<Components>();

            this.animator = components.getComponent(this.instance, Animator.Animator) ?? components.addComponent(this.instance, Animator.Animator);
            this.stateAnimator =
                components.getComponent(this.instance, Animator.StateAnimator) ?? components.addComponent(this.instance, Animator.StateAnimator);
        }

        private readonly staminaHandler = RunService.Heartbeat.Connect((dt) =>
        {
            this.attributes.Stamina = math.clamp(
                this.attributes.Stamina + (
                    (this.IsMoving() && this.IsState(EntityState.Dash))
                        ? dt * -4
                        : dt * 2
                ),
                0,
                this.attributes.MaxStamina,
            );
        })

        onFrame(dt: number): void
        {
            // tick-down stun and iframes
            this.tickDown<CombatantAttributes>("IFrame");
            this.tickDown<CombatantAttributes>("BlockStun");
            this.tickDown<CombatantAttributes>("HitStop");

            if (this.attributes.HitStop > 0)
            {

                this.animator.GetPlayingAnimations().forEach((animation) =>
                {
                    if (animation.AnimationData.isAttackAnimation && animation.IsPlaying())

                        animation.Pause();

                });

                this.instance.PrimaryPart.Anchored = true;
                this.stateAnimator.Pause();
            }
            else if (this.attributes.HitStop !== -1)

                this.ClearHitstop();

            if (this.IsNeutral())
            {
                if (this.IsGrounded())
                {
                    if (this.IsMoving())

                        this.SetState(EntityState.Walk);

                    else if (!this.IsState(EntityState.Crouch))

                        this.ResetState();
                }
                else
                if (!this.IsNegative())

                    this.SetState(EntityState.Midair);
            }
        }

        onStart()
        {
            this.SetDefaultState(EntityState.Idle);
            this.ResetState();

            this.instance.PrimaryPart = this.instance.FindFirstChild("HumanoidRootPart") as BasePart | undefined ?? this.instance.PrimaryPart;

            const zeroWalkSpeed = () => this.humanoid.WalkSpeed = 0;
            const slowButNotImmobile = () => this.humanoid.WalkSpeed = 0.0125;

            const onNeutral = () =>
            {
                this.attributes.PreviousSkill = undefined;
                this.attributes.Counter = undefined;
                this.humanoid.WalkSpeed = this.baseWalkSpeed;

                return true;
            };

            this.SetStateGuard(EntityState.Crouch, () =>
            {
                if (this.IsNegative())

                    return false;

                return true;
            });

            this.SetStateGuard(EntityState.Midair, () =>
            {
                if (this.IsNegative())

                    return false;

                return !this.IsGrounded();
            });

            this.SetStateEffect(EntityState.Midair, onNeutral);

            this.SetStateEffect(EntityState.Startup, zeroWalkSpeed);

            this.SetStateEffect(EntityState.Idle, onNeutral);

            this.SetStateEffect(EntityState.Crouch, () =>
            {
                if (!this.IsAttacked)

                    this.ClearBlockstun();

                slowButNotImmobile();
            });

            this.SetStateEffect(EntityState.Attack, zeroWalkSpeed);

            this.SetStateEffect(EntityState.Recovery, zeroWalkSpeed);

            this.SetStateEffect(EntityState.Walk, () =>
            {
                if (!this.IsAttacked())

                    this.ClearBlockstun();

                onNeutral();
            });
        }

        /**
         * Add block stun to the entity.
         * This does **not** set the block stun to the `blockStun` argument.
         * @param blockStun The block stun to add to the Entity.
         */
        public AddBlockStun(blockStun: number)
        {
            this.attributes.BlockStun += blockStun;
        }

        /**
         * Place the entity in their Counter sub-state
         * if the entity is currently being attacked.
         */
        public Counter<T extends CombatantAttributes>(fromEntity: Entity.Combatant<T>)
        {
            if (this.IsState(EntityState.Hitstun, EntityState.HitstunCrouching, EntityState.Knockdown, EntityState.KnockdownHard))
            {
                if (!this.attributes.Counter)

                    this.attributes.Counter = fromEntity.entityId;
            }
        }

        /**
         * Clears the entity's block stun.
         * Good for bursts and cancels.
         */
        public ClearBlockstun()
        {
            this.attributes.BlockStun = -1;
        }

        /**
         * Clears the entity's hitstop.
         */
        public ClearHitstop()
        {
            this.stateAnimator.Unpause();
            this.attributes.HitStop = -1;
            this.instance.PrimaryPart.Anchored = false;

            this.animator.GetPlayingAnimations().forEach((animation) =>
            {
                if (animation.AnimationData.isAttackAnimation && animation.IsPaused())

                    animation.Resume();
            });
        }

        public Jump()
        {
            if (!this.CanJump())

                return Promise.resolve(false);

            this.ClearHitstop();

            return new Promise<boolean>((res) =>
            {
                const playerFromCharacter = Players.GetPlayerFromCharacter(this.instance);
                if (playerFromCharacter)

                    return ServerEvents.Jump(playerFromCharacter, this.instance);


                lib.Jump(this.instance);

                return res(true);
            });
        }

        private rotationLocked = RotationMode.Unlocked;
        public LockRotation(rotationMode = RotationMode.Locked)
        {
            if (this.rotationLocked === rotationMode)

                return;

            this.humanoid.AutoRotate = RotationMode.Locked ? false : true;
        }

        public UnlockRotation()
        {
            this.LockRotation(RotationMode.Unlocked);
        }

        // TODO: Implement a global state that allows developers to swap between
        // blocking through a blocking state or through move direction.
        public IsBlocking(damageOrigin: Vector3, blockMode: BlockMode = Dependency<QuarrelGame>().DefaultBlockMode)
        {
            if (this.IsFacing(damageOrigin))
            {
                // print("is facing damage origin");
                if (blockMode === BlockMode.MoveDirection)
                {
                    // print("movedirection-based blocking");
                    const { MoveDirection } = this.humanoid;
                    const dotProduct = MoveDirection.Dot((damageOrigin.mul(new Vector3(1,0,1)).sub(MoveDirection.mul(new Vector3(1,0,1)))).Unit);
                    print("facing:", dotProduct, MoveDirection.Magnitude);

                    if (dotProduct >= this.facingLeniency)

                        return true;

                    return false;
                }

                if (this.IsState(EntityState.Block))

                    return true;
            }

            print("not facing");

            return false;
        }

        private readonly facingLeniency = 0.725;
        // TODO: Important - Fix bug where dot product in Facing is incorrect leading to blocks being non-functional
        public IsFacing(origin: Vector3, leniency = this.facingLeniency)
        {
            const { LookVector: normalizedFacing, Position: normalizedPosition } = this.instance.GetPivot().sub(new Vector3(0, this.instance.GetPivot().Y, 0));
            const normalizedOrigin = origin.sub((new Vector3(0,origin.Y, 0)));

            const dotArg = normalizedPosition.sub(normalizedOrigin).Unit;
            const dotProduct = normalizedFacing.Dot(dotArg);

            return dotProduct <= this.facingLeniency;
        }

        public CanJump()
        {
            return !this.IsNegative() && this.IsGrounded();
        }

        public CanCounter()
        {
            return this.IsState(EntityState.Startup, EntityState.Attack);
        }

        public IsAttacking()
        {
            return this.IsState(EntityState.Startup, EntityState.Attack, EntityState.Recovery);
        }

        public IsNeutral()
        {
            return this.IsState(EntityState.Idle, EntityState.Crouch, EntityState.Walk, EntityState.Midair);
        }

        public IsNegative()
        {
            return this.IsState(
                EntityState.Startup,
                EntityState.Recovery,
                EntityState.Attack,

                EntityState.Hitstun,
                EntityState.HitstunCrouching,

                EntityState.Knockdown,
                EntityState.KnockdownHard,

                EntityState.Dash
            );
        }

        public IsAttacked()
        {
            return this.IsState(
                EntityState.Hitstun,
                EntityState.HitstunCrouching,

                EntityState.Knockdown,
                EntityState.KnockdownHard,
            );
        }
    }

    export interface PlayerCombatantAttributes extends CombatantAttributes {
        QueuedInput?: Input,
    }

    @Component({
        defaults: {
        MaxHealth: 100,
        Health: 100,

        MaxStamina: 100,
        Stamina: 100,

        MaxBlockStamina: 100,
        BlockStamina: 100,

        IFrame: -1,
        BlockStun: -1,
        HitStop: -1,

        EntityId: "generate",
        State: EntityState.Idle,
        }
        })
    export class PlayerCombatant<A extends PlayerCombatantAttributes> extends Combatant<A>
    {
        constructor()
        {
            super();
        }
    }

    interface EntityRotatorAttributes {}
    @Component({})
    export class EntityRotator extends RotatorComponent implements OnStart, OnTick
    {
        onTick(dt: number): void
        {
            const entityComponent = Dependency<Components>().getComponent(this.instance, Entity);
            this.DoRotate();
        }
    }
}

export { SprintState } from "server/services/movement.service";