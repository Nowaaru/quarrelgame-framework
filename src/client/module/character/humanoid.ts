import { Dependency, OnInit, OnStart } from "@flamework/core";
import { assign, fromEntries } from "@rbxts/object-utils";
import { fixedSizeHint } from "@rbxts/rust-classes/out/util/sizeHint";
import { Client } from "client/controllers/client.controller";
import { OnRespawn } from "client/controllers/client.controller";
import Character from "shared/util/character";

export abstract class HumanoidController implements OnStart, OnRespawn
{
    constructor(private readonly client: Client)
    {
    }

    onStart(): void
    {
    }

    onRespawn(character: Model): void
    {
        this.controller = character.WaitForChild("ControllerManager") as NonNullable<typeof this.controller>;
        const rootPart = this.controller.RootPart!;

        this.sensors = {
            ClimbSensor: rootPart.WaitForChild("ClimbSensor"),
            GroundSensor: rootPart.WaitForChild("GroundSensor"),
            SwimSensor: rootPart.WaitForChild("SwimSensor"),
        } as typeof this.sensors;

        this.character = character as never;
        print(`Character ${character.Name} has respawned.`);
    }

    public GetHumanoidController()
    {
        return this.controller;
    }

    public GetSensors()
    {
        return this.sensors;
    }

    private controller?: ControllerManager & {
        GroundController: GroundController;
        AirController: AirController;
        SwimController: SwimController;
        ClimbController: ClimbController;
        ControllerPartSensor: ControllerPartSensor;
    };

    private sensors?: {
        ClimbSensor: ControllerPartSensor;
        GroundSensor: ControllerPartSensor;
        SwimSensor: BuoyancySensor;
    };

    protected character?: Model & {
        Humanoid: Humanoid;
    };
}
