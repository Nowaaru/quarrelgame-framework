import { Dependency, OnStart } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { Physics } from "./physics";
import { HttpService, RunService } from "@rbxts/services";
import { CombatService } from "server/services/combat.service";
import { SprintState } from "server/services/movement.service";
import { StateAttributes, StateComponent } from "shared/components/state.component";

enum RotationMode {
    Unlocked,
    Locked,
}

type String<T> = string;

enum EntityState {
    KnockdownHard,
    KnockdownSoft,
    Knockdown,

    Dash,
    Walk,

    Idle,
    Midair,
}

export interface EntityAttributes extends StateAttributes {
    MaxHealth: number,
    Health: number,

    MaxStamina: number,
    Stamina: number,

    MaxBlockStamina: number,
    BlockStamina: number,
    // Running out of either Stamina or BlockStamina
    // will put the player into a guard-break counter state.

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

    State: EntityState.Idle,
    }
    })

export class Entity extends StateComponent<EntityAttributes, Model> implements OnStart
{
    constructor()
    {
        super();
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

    onStart()
    {
        this.instance.PrimaryPart = this.instance.FindFirstChild("HumanoidRootPart") as BasePart | undefined ?? this.instance.PrimaryPart;

        this.humanoid.GetPropertyChangedSignal("MoveDirection").Connect(() =>
        {
            if (this.IsGrounded())
            {
                if (this.IsMoving())
                {
                    if (this.IsState(EntityState.Idle))

                        this.SetState(EntityState.Walk);

                }
                else this.SetState(EntityState.Idle);

            }
        });

        this.humanoid.GetPropertyChangedSignal("FloorMaterial").Connect(() =>
        {
            if (!this.IsGrounded())

                this.SetState(EntityState.Midair);

            else
            if (this.IsMoving())

                this.SetState(EntityState.Walk);

            else this.SetState(EntityState.Idle);
        });

        print("guh");
        this.StateChanged.Connect((newState) =>
        {
            if (!this.IsState(EntityState.Dash))

                this.humanoid.WalkSpeed = this.baseWalkSpeed;

            else this.humanoid.WalkSpeed = this.sprintWalkSpeed;
        });
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

    private humanoid = this.instance.WaitForChild("Humanoid") as Humanoid;

    private entityId = HttpService.GenerateGUID(false);

    private baseWalkSpeed = 16;

    private sprintWalkSpeed = 24;
}

export { SprintState }  from "server/services/movement.service";