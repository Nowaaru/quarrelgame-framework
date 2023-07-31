import { Dependency, OnStart } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { PhysicsEntity, PhysicsAttributes } from "./physicsentity.component";
import { HttpService } from "@rbxts/services";
import { CombatService } from "server/services/combat.service";

export interface EntityAttributes {
    Health: number,
    Stamina: number,

    BlockStamina: number,
    // Running out of either Stamina or BlockStamina
    // will put the player into a guard-break counter state.
}

@Component({
    defaults: {
    Health: 100,
    Stamina: 100,

    BlockStamina: 100,
    }
    })
export class Entity extends BaseComponent<EntityAttributes, Model> implements OnStart
{
    constructor(private readonly combatService: CombatService)
    {
        super();
    }


    onStart()
    {
    }

    private entityId = HttpService.GenerateGUID(false);
}