import { BaseComponent, Component } from "@flamework/components";
import { OnStart, OnTick } from "@flamework/core";
import Make from "@rbxts/make";
import { StateAttributes, StatefulComponent } from "./state.component";

export interface RotatorAttributes extends StateAttributes
{
    readonly RotateTarget?: Vector3;
}

/**
 * Automatically rotate this Instance towards its internal RotateTarget.
 *
 * The RotateTarget attribute is self-managed and cannot be modified permanently
 * through SetAttribute.
 */
@Component({})
export class RotatorComponent extends StatefulComponent<RotatorAttributes, Model & { PrimaryPart: BasePart; }> implements OnStart, OnTick
{
    protected rotateTarget?: Vector3 = this.attributes.RotateTarget;

    protected rotateInstance?: { Position: Vector3; };

    protected targetedAttachment = this.instance.PrimaryPart.FindFirstChild("RootAttachment") as Attachment;

    protected alignOrientation = Make("AlignOrientation", {
        Parent: this.instance.PrimaryPart,
        Mode: Enum.OrientationAlignmentMode.OneAttachment,
        Attachment0: this.targetedAttachment,
        AlignType: Enum.AlignType.Parallel,
        MaxTorque: 120000,
        MaxAngularVelocity: 12000,
        Responsiveness: 150,
    });

    public BindToAttachment(attachment: Attachment)
    {
        assert(attachment.IsDescendantOf(this.instance), `attachment is not a descendant of ${this.instance}`);
        this.targetedAttachment = attachment;
        this.alignOrientation.Attachment0 = this.targetedAttachment;
    }

    public onStart(): void
    {
    }

    public DoRotate()
    {
        if (!this.rotateTarget && !this.rotateInstance)
        {
            return;
        }

        this.UpdateRotator();
        this.alignOrientation.CFrame = CFrame.lookAt(
            this.instance.GetPivot().Position,
            (this.rotateInstance ? this.rotateInstance.Position : this.rotateTarget!)
                .mul(new Vector3(1, 0, 1))
                .add(new Vector3(0, this.instance.GetPivot().Y * 0.7, 0)),
            // Allow the character to tilt slightly downwards for
            // aesthetics
        );
    }

    public RotateTowards<T extends { Position: Vector3; }>(rotateTarget?: Vector3 | T): void
    {
        if (!rotateTarget)
        {
            return this.rotateTarget = this.rotateInstance = undefined;
        }

        if ("Position" in rotateTarget)
        {
            this.rotateInstance = rotateTarget;
        }
        else
        {
            this.rotateTarget = rotateTarget;
        }
    }

    onTick(dt: number)
    {
        this.DoRotate();
    }

    protected UpdateRotator()
    {
        if (this.rotateTarget)
        {
            (this.attributes as Record<"RotateTarget", defined>).RotateTarget = this.rotateTarget;
        }
    }
}
