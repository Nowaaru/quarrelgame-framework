import { Dependency, OnPhysics, OnStart } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { Physics } from "./physics";
import { HttpService, RunService } from "@rbxts/services";
import { CombatService } from "server/services/combat.service";
import { SprintState } from "server/services/movement.service";
import { StateAttributes, StateComponent } from "shared/components/state.component";
import { OnFrame, SchedulerService } from "server/services/scheduler.service";
import { Animator } from "shared/components/animator.component";
import { BlockMode } from "shared/util/lib";
import { Identifier } from "shared/util/identifier";

import * as lib from "shared/util/lib";
import { QuarrelGame } from "server/services/quarrelgame.service";

enum RotationMode {
    Unlocked,
    Locked,
}

type String<T> = string;

export namespace Entity {

    export import EntityState = lib.EntityState
    export interface EntityAttributes extends StateAttributes
    {
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
    }

    @Component({
        defaults:
        {
        MaxHealth: 100,
        Health: 100,

        EntityId: "generate",
        State: EntityState.Idle,
        }
        })
    export class Entity<I extends EntityAttributes> extends StateComponent<I, Model>
    {
        private readonly id = Identifier.GenerateID(this, "EntityId");

        constructor()
        {
            super();
            this.onAttributeChanged("EntityId", () =>
            {
                if (this.attributes.EntityId !== this.id)

                    this.attributes.EntityId = this.id;
            });
        }
    }

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
        Counter?: string

        /**
         * The current State the entity is in.
         */
        State: String<EntityState>,

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

        EntityId: "generate",
        State: EntityState.Idle,
        }
        })
    export class Combatant extends Entity<CombatantAttributes> implements OnStart, OnFrame
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

        private tickDowns: Set<keyof CombatantAttributes> = new Set();
        private tickDown(attr: keyof {
            [K in keyof CombatantAttributes as (CombatantAttributes[K] extends number ? K : never )]: number
        })
        {
            const attributeValue = this.attributes[ attr ];
            assert(attr && attr in this.attributes, `invalid attribute: ${attr}`);
            assert(typeIs(attributeValue, "number"), `invalid attribute type of ${attr} for tickDown: ${typeOf(attr)}`);

            // wait for one extra frame if the tickdown
            // was just applied
            if (this.tickDowns.has(attr))
            {
                if (attributeValue > 0)

                    this.setAttribute(attr, attributeValue - 1);

                else if (attributeValue !== -1)
                {
                    this.tickDowns.delete(attr);
                    this.setAttribute(attr, -1);
                }
            }
            else if (attributeValue > 0)

                this.tickDowns.add(attr);
        }

        onFrame(dt: number): void
        {
            // tick-down stun and iframes
            this.tickDown("IFrame");
            this.tickDown("BlockStun");

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
                    else if (!this.IsState(EntityState.Crouch, EntityState.Idle))

                        this.ResetState();
                }
                else this.SetState(EntityState.Midair);
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

                return true;
            });

            this.SetStateEffect(EntityState.Midair, () =>
            {
                this.humanoid.Jump = true;
                zeroWalkSpeed();
            });

            this.SetStateEffect(EntityState.Startup, zeroWalkSpeed);

            this.SetStateEffect(EntityState.Idle, onNeutral);

            this.SetStateEffect(EntityState.Crouch, slowButNotImmobile);

            this.SetStateEffect(EntityState.Attack, zeroWalkSpeed);

            this.SetStateEffect(EntityState.Recovery, zeroWalkSpeed);

            this.SetStateEffect(EntityState.Walk, onNeutral);
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


        // TODO: Implement a global state that allows developers to swap between
        // blocking through a blocking state or through move direction.
        public IsBlocking(damageOrigin: Vector3, blockMode: BlockMode = Dependency<QuarrelGame>().DefaultBlockMode)
        {
            if (this.IsFacing(damageOrigin))
            {
                print("is facing damage origin");
                if (blockMode === BlockMode.MoveDirection)
                {
                    print("movedirection-based blocking");
                    const { MoveDirection } = this.humanoid;
                    const dotProduct = MoveDirection.Dot((damageOrigin.mul(new Vector3(1,0,1)).sub(MoveDirection)).Unit);
                    print("facing:", dotProduct);

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
            print("dot:", dotProduct);

            return dotProduct <= this.facingLeniency;
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

    interface PlayerCombatantAttributes extends CombatantAttributes {
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
}
export { SprintState }  from "server/services/movement.service";