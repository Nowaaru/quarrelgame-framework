import { BaseComponent, Component } from "@flamework/components";
import { OnStart, OnTick } from "@flamework/core";
import Make from "@rbxts/make";

interface ControllerAttributes
{
    /**
     * Whether the humanoid is sprinting or not.
     */
    Sprinting: boolean;
    /**
     * The speed at which the humanoid can move.
     */
    WalkSpeed: number;
    /**
     * How heavy the humanoid is.
     */
    Weight: number;
    /**
     * Whether the humanoid can move or not.
     */
    Rooted: boolean;
}

interface ControllerInstance extends Model
{
    Humanoid: Humanoid;
}

@Component({
    defaults: {
        Sprinting: false,
        Rooted: false,
        WalkSpeed: 8,
        Weight: 2,
    },
})
export class ControllerComponent extends BaseComponent<ControllerAttributes, ControllerInstance> implements OnStart, OnTick
{
    private sprintSpeedMultiplier = 2;

    private controllers: {
        GroundController: GroundController;
        AirController: AirController;
        SwimController: SwimController;
        ClimbController: ClimbController;
    };

    private sensors: {
        ClimbSensor: ControllerPartSensor;
        GroundSensor: ControllerPartSensor;
        SwimSensor: BuoyancySensor;
    };

    constructor()
    {
        super();
        this.instance.FindFirstChildWhichIsA("Humanoid")!.EvaluateStateMachine = false;
        const ControllerManager = Make("ControllerManager", {
            RootPart: (this.instance.WaitForChild("Humanoid") as Humanoid).RootPart,
            BaseMoveSpeed: 7.65,
            BaseTurnSpeed: 4,
        });

        const GroundController = Make("GroundController", {
            Parent: ControllerManager,
            Friction: this.attributes.Weight,
            FrictionWeight: 4,
        });

        const ClimbController = Make("ClimbController", {
            Parent: ControllerManager,
        });

        const AirController = Make("AirController", {
            Parent: ControllerManager,
        });

        const SwimController = Make("SwimController", {
            Parent: ControllerManager,
        });

        const ClimbSensor = Make("ControllerPartSensor", {
            Name: "ClimbSensor",
        });

        const GroundSensor = Make("ControllerPartSensor", {
            Name: "GroundSensor",
        });

        const SwimSensor = Make("BuoyancySensor", {
            Name: "SwimSensor",
        });

        ControllerManager.GroundSensor = GroundSensor;
        ControllerManager.ClimbSensor = ClimbSensor;

        SwimSensor.Parent = ControllerManager.RootPart;
        ClimbSensor.Parent = ControllerManager.RootPart;
        GroundSensor.Parent = ControllerManager.RootPart;

        this.controllers = {
            GroundController,
            AirController,
            ClimbController,
            SwimController,
        };

        this.sensors = {
            SwimSensor,
            ClimbSensor,
            GroundSensor,
        };

        ControllerManager.Parent = this.instance;
    }

    onTick(dt: number): void
    {
        const [ controllers, sensors ] = [ this.GetControllers(), this.GetSensors() ];

        if (this.attributes.Rooted)
            controllers.GroundController.MoveSpeedFactor = 1 / 1024;
        else
        {
            this.controllers.GroundController.MoveSpeedFactor = 1;

            if (this.attributes.Sprinting)
                controllers.GroundController.MoveSpeedFactor *= this.sprintSpeedMultiplier;
        }
    }

    onStart(): void
    {
        const { GroundController } = this.GetControllers();
        GroundController.BalanceRigidityEnabled = true;

        this.onAttributeChanged("Weight", (newWeight) =>
        {
            this.GetControllers().GroundController.FrictionWeight = newWeight;
        });
    }

    /**
     *   Make a humanoid rooted.
     */
    public SetRooted(rooted = this.attributes.Rooted)
    {
        this.attributes.Rooted = rooted;
    }

    /**
     *   Set the walk speed of the humanoid.
     */
    public SetWalkSpeed(walkSpeed: number)
    {
        this.attributes.WalkSpeed = walkSpeed;
    }

    /**
     *   Get the sensors of this humanoid.
     */
    public GetSensors()
    {
        return { ...this.sensors };
    }

    /**
     *   Get the controllers of this humanoid.
     */
    public GetControllers()
    {
        return { ...this.controllers };
    }
}
