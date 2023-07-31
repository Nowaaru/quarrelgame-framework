import { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
import { CombatService } from "server/services/combat.service";
import { RunService, TweenService, Workspace } from "@rbxts/services";
import { Impulse } from "./impulse";
import Signal from "@rbxts/signal";

export interface PhysicsAttributes {
    /**
     * How quickly the item falls and how far it can get knocked back.
     * Also determines how susceptible the item is to bouncing and rolling.
     */
    Weight: number,

    /**
     * The knockback resistance of the item.
     */
    Inertia: number,
}

@Component({
    defaults: {
    Weight: 100,
    Inertia: 1,
    }
    })
export class PhysicsEntity<A extends PhysicsAttributes, I extends Model & { PrimaryPart: BasePart } > extends BaseComponent<A,I> implements OnStart
{
    constructor(protected readonly combatService: CombatService)
    {
        super();
        this.mainAttachment = new Instance("Attachment");

        this.mainVelocity.ForceLimitMode = Enum.ForceLimitMode.Magnitude;
        this.mainAttachment.Parent = this.combatService.globalAttachmentOrigin;

        const { AssemblyRootPart } = this.GetPrimaryPart();
        if (AssemblyRootPart)

            AssemblyRootPart.Massless = true;
    }

    onStart()
    {
        assert(this.GetPrimaryPart(), "entity does not have a primary part");
        const deletedHandler = this.GetPrimaryPart().AncestryChanged.Connect(() =>
        {
            if (this.GetPrimaryPart().IsDescendantOf(Workspace))
            {
                this.Deleted.Fire();
                this.Deleted.Destroy();
                deletedHandler.Disconnect();
            }
        });
    }

    public ConstantImpulse(direction: Vector3, velocity: number): Impulse.ConstantImpulse
    {
        return new Impulse.ConstantImpulse(this, direction, velocity);
    }

    public PhysicsImpulse(direction: Vector3, velocity: number): Impulse.PhysicsImpulse
    {
        return new Impulse.PhysicsImpulse(this, direction, velocity);
    }

    public CFrame(): CFrame
    {
        return this.instance.GetPivot();
    }

    public GetPrimaryPart(): BasePart
    {
        return this.instance.PrimaryPart;
    }

    public Forward(): Vector3
    {
        return this.instance.GetPivot().LookVector;
    }

    public Backward(): Vector3
    {
        return this.Forward().mul(-1);
    }

    public Right(): Vector3
    {
        return this.instance.GetPivot().RightVector;
    }

    public Left(): Vector3
    {
        return this.Right().mul(-1);
    }

    public Up(): Vector3
    {
        return this.instance.GetPivot().UpVector;
    }

    public Down(): Vector3
    {
        return this.Up().mul(-1);
    }

    public Deleted = new Signal<() => void>();

    private readonly mainAttachment;

    private readonly mainVelocity = new Instance("LinearVelocity", this.instance.PrimaryPart);
}