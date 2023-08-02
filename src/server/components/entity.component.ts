import { Dependency, OnPhysics, OnStart } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { Physics } from "./physics";
import { HttpService, RunService } from "@rbxts/services";
import { CombatService } from "server/services/combat.service";
import { SprintState } from "server/services/movement.service";
import { StateAttributes, StateComponent } from "shared/components/state.component";
import { OnFrame, SchedulerService } from "server/services/scheduler.service";
import { Animator } from "shared/components/animator.component";
import { EntityState } from "shared/utility/lib";

enum RotationMode {
    Unlocked,
    Locked,
}

type String<T> = string;

export interface EntityAttributes extends StateAttributes {
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

    onFrame(dt: number): void
    {
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

    public IsNeutral()
    {
        return this.IsState(EntityState.Idle, EntityState.Walk, EntityState.Midair);
    }

    public IsNegative()
    {
        return this.IsState(
            EntityState.Startup,
            EntityState.Recovery,
            EntityState.Attack,

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

export { SprintState }  from "server/services/movement.service";
export { EntityState }  from "shared/utility/lib";