import { Dependency, OnStart } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { PhysicsEntity, PhysicsAttributes } from "./physicsentity.component";
import { HttpService, RunService } from "@rbxts/services";
import { CombatService } from "server/services/combat.service";
import { SprintState } from "server/services/movement.service";

export interface EntityAttributes {
    MaxHealth: number,
    Health: number,

    MaxStamina: number,
    Stamina: number,

    MaxBlockStamina: number,
    BlockStamina: number,
    // Running out of either Stamina or BlockStamina
    // will put the player into a guard-break counter state.

    Sprinting: SprintState,
}

@Component({
    defaults: {
    MaxHealth: 100,
    Health: 100,

    MaxStamina: 100,
    Stamina: 100,

    MaxBlockStamina: 100,
    BlockStamina: 100,

    Sprinting: SprintState.Walking,
    }
    })

export class Entity extends BaseComponent<EntityAttributes, Model> implements OnStart
{
    constructor(private readonly combatService: CombatService)
    {
        super();
    }


    private readonly staminaHandler = RunService.Heartbeat.Connect((dt) =>
    {
        this.attributes.Stamina = math.clamp(
            this.attributes.Stamina + (
                (this.attributes.Sprinting === SprintState.Sprinting)
                    ? dt * -4
                    : dt * 2
            ),
            0,
            this.attributes.MaxStamina,
        );
    })

    onStart()
    {
    }

    public Sprint(sprintState: SprintState): undefined
    {
        if (sprintState === SprintState.Sprinting)
        {
            if (this.attributes.Stamina > this.attributes.MaxStamina * 1/8)
            {
                this.humanoid.WalkSpeed = this.sprintWalkSpeed;
                this.attributes.Sprinting = SprintState.Sprinting;

                return undefined;
            }

            return this.Sprint(SprintState.Walking);
        }
        else if (sprintState === SprintState.Walking)
        {
            this.humanoid.WalkSpeed = this.baseWalkSpeed;
            this.attributes.Sprinting = SprintState.Walking;

            return undefined;
        }

        return undefined;
    }

    private humanoid = this.instance.WaitForChild("Humanoid") as Humanoid;

    private entityId = HttpService.GenerateGUID(false);

    private baseWalkSpeed = 16;

    private sprintWalkSpeed = 24;
}

export { SprintState }  from "server/services/movement.service";