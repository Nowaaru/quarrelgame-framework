import { Dependency, OnInit, OnStart } from "@flamework/core";
import { assign, fromEntries } from "@rbxts/object-utils";
import { fixedSizeHint } from "@rbxts/rust-classes/out/util/sizeHint";
import { Client } from "client/controllers/client.controller";
import { OnRespawn } from "client/controllers/client.controller";
import { OnMatchRespawn } from "client/controllers/match.controller";
import Character from "shared/util/character";

export abstract class HumanoidController implements OnStart, OnMatchRespawn
{
    constructor(private readonly client: Client)
    {
    }

    onStart(): void
    {
    }

    async onMatchRespawn(character: Model & { Humanoid: Humanoid; })
    {
        this.controller = character.WaitForChild("ControllerManager") as NonNullable<typeof this.controller>;
        if (!this.controller.RootPart)
        {
            await new Promise<void>((res, rej) =>
            {
                let thisConnection: RBXScriptConnection | void = this.controller?.GetPropertyChangedSignal("RootPart").Connect(() =>
                {
                    if (this.controller?.RootPart)
                        thisConnection = res();
                });
            });
        }

        const rootPart = this.controller.RootPart!;
        print("this other thing:", rootPart, this.controller.RootPart, character.Humanoid.RootPart);

        this.sensors = {
            ClimbSensor: rootPart.WaitForChild("ClimbSensor"),
            GroundSensor: rootPart.WaitForChild("GroundSensor"),
            SwimSensor: rootPart.WaitForChild("SwimSensor"),
        } as typeof this.sensors;
        print("okay done:", this.sensors);

        this.character = character as never;
        print(`Character ${character.Name} has respawned.`);

        return $tuple(this.controller, this.sensors);
    }

    public GetHumanoidController()
    {
        return this.controller;
    }

    public GetSensors()
    {
        return this.sensors;
    }

    public GetCharacter()
    {
        return this.character;
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
