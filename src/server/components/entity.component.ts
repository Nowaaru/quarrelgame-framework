import { Dependency, OnPhysics, OnStart } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { Physics } from "./physics";
import { HttpService, RunService } from "@rbxts/services";
import { CombatService } from "server/services/combat.service";
import { SprintState } from "server/services/movement.service";
import { StateAttributes, StateComponent } from "shared/components/state.component";
import { OnFrame, SchedulerService } from "server/services/scheduler.service";
import { Animator } from "shared/components/animator.component";
import * as lib from "shared/util/lib";

enum RotationMode {
    Unlocked,
    Locked,
}

type String<T> = string;

export namespace Entity {
    export interface EntityAttributes extends StateAttributes {
        /**
         * The ID of the entity.
         */
        EntityId: string,

        /**
         * The maximum health of the entity.
         */
        MaxHealth: number,
        /**
         * The current health of the entity.
         */
        Health: number,

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
        Counter?: string

        /**
         * The current State the entity is in.
         */
        State: String<EntityState>,

    }

    @Component({
        defaults: {
        EntityId: "generate",
        MaxHealth: 100,
        Health: 100,

        MaxStamina: 100,
        Stamina: 100,

        MaxBlockStamina: 100,
        BlockStamina: 100,

        IFrame: -1,
        BlockStun: -1,
        State: EntityState.Idle,
        }
        })
    export class Entity extends StateComponent<EntityAttributes, Model> implements OnStart, OnFrame
    {
        public readonly animator: Animator.Animator;

        public readonly stateAnimator: Animator.StateAnimator;

        constructor()
        {
            super();
            const components = Dependency<Components>();

            this.animator = components.getComponent(this.instance, Animator.Animator) ?? components.addComponent(this.instance, Animator.Animator);
            this.stateAnimator = components.getComponent(this.instance, Animator.StateAnimator) ?? components.addComponent(this.instance, Animator.StateAnimator);
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

        private tickDown(attr: keyof EntityAttributes)
        {
            assert(attr, `invalid attribute: ${attr}`);
            assert(typeIs(this.attributes[ attr ], "number"), attr);
            if ( (this.attributes[ attr ] as number) > 0 )

                (this.attributes[ attr ] as number) -= 1;

            else if (this.attributes[ attr ] !== -1)

                (this.attributes[ attr ] as number) = -1;

        }

        onFrame(dt: number): void
        {
            // tick-down stun and iframes
            this.tickDown("IFrame");
            this.tickDown("BlockStun");

            this.IsBlocking(new Vector3());

            if (this.IsNegative())

                return;


            if (this.IsNeutral())
            {
                if (this.IsGrounded())
                {
                    if (this.IsMoving())
                    {
                        if (this.IsState(EntityState.Idle))

                            this.SetState(EntityState.Walk);

                    }
                    else this.ResetState();
                }
                else this.SetState(EntityState.Midair);
            }
        }

        onStart()
        {
            this.SetDefaultState(EntityState.Idle);
            this.instance.PrimaryPart = this.instance.FindFirstChild("HumanoidRootPart") as BasePart | undefined ?? this.instance.PrimaryPart;

            const zeroWalkSpeed = () => this.humanoid.WalkSpeed = 0;
            const resetWalkSpeed = () => this.humanoid.WalkSpeed = this.baseWalkSpeed;

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

                return true;
            });

            this.SetStateEffect(EntityState.Midair, () =>
            {
                this.humanoid.Jump = true;
                zeroWalkSpeed();
            });

            this.SetStateEffect(EntityState.Startup, zeroWalkSpeed);

            this.SetStateEffect(EntityState.Idle, resetWalkSpeed);

            this.SetStateEffect(EntityState.Crouch, zeroWalkSpeed);

            this.SetStateEffect(EntityState.Attack, zeroWalkSpeed);

            this.SetStateEffect(EntityState.Recovery, zeroWalkSpeed);

            this.SetStateEffect(EntityState.Walk, resetWalkSpeed);
        }

        public Sprint(sprintState: SprintState): undefined
        {
            if (sprintState === SprintState.Sprinting)
            {
                if (this.attributes.Stamina > this.attributes.MaxStamina * 1/8 && this.IsMoving())
                {
                    this.SetState(EntityState.Dash);

                    return undefined;
                }

                return this.Sprint(SprintState.Walking);
            }
            else if (sprintState === SprintState.Walking)
            {
                this.humanoid.WalkSpeed = this.baseWalkSpeed;

                return undefined;
            }

            return undefined;
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
         * if the entity is in their
         */
        public Counter(fromEntity: Entity.Entity)
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
        public ClearBlockStun()
        {
            this.attributes.BlockStun = -1;
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

        public IsGrounded()
        {
            return this.humanoid.FloorMaterial !== Enum.Material.Air;
        }

        public IsMoving()
        {
            return this.humanoid.MoveDirection !== Vector3.zero;
        }

        public IsBlocking(damageOrigin: Vector3)
        {
            const entityPosition = this.GetPrimaryPart().GetPivot();
            const normalizedEntityPosition = entityPosition.sub(new Vector3(0, entityPosition.Y, 0)); // shouldn't really matter, but JIC!

            const dotProduct = normalizedEntityPosition.LookVector.Dot(
                (
                    damageOrigin
                        .mul(new Vector3(1,0,1))
                        .sub(
                            this.GetPrimaryPart().Position.mul(
                                new Vector3(1,0,1)
                            )
                        )
                ).Unit
            );
            print("dotProduct:", dotProduct);

            return dotProduct <= -0.125;
        }

        public GetPrimaryPart()
        {
            assert(this.instance.PrimaryPart, "primary part not found");

            return this.instance.PrimaryPart;
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

        public readonly humanoid = this.instance.WaitForChild("Humanoid") as Humanoid;

        public readonly entityId = HttpService.GenerateGUID(false);

        public readonly baseWalkSpeed = 16;

        public readonly sprintWalkSpeed = 24;
    }

    export import EntityState = lib.EntityState
}
export { SprintState }  from "server/services/movement.service";