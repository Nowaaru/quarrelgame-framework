import { OnInit, OnStart, Service } from "@flamework/core";
import Make from "@rbxts/make";
import { Workspace } from "@rbxts/services";
import { Physics } from "server/components/physics";
import { QuarrelGame } from "./quarrelgame.service";

interface AttachmentSet
{
    Attachment0: Attachment;
    Attachment1: Attachment;
}

export const GetRandomPositionInBox = (min: Vector3, max: Vector3) =>
{
    const randomInstance = new Random();

    return new Vector3(randomInstance.NextNumber(min.X, max.X), randomInstance.NextNumber(min.Y, max.Y), randomInstance.NextNumber(min.Z, max.Z));
};

export const GetRandomPositionFromPart = (CSInstance: { CFrame: CFrame; Size: Vector3; }) =>
{
    const { X, Y, Z } = CSInstance.Size;

    return CSInstance.CFrame.mul(
        new CFrame(
            (math.random() - 0.5) * X,
            (math.random() - 0.5) * Y,
            (math.random() - 0.5) * Z,
        ),
    ).Position;
};

class KnockbackTrail
{
    private trailInstances: Set<Trail> = new Set();

    private attachmentInstances: Set<AttachmentSet> = new Set();

    constructor(targetModel: Model, private globalAttachmentOrigin: Part, trailDensity = 8)
    {
        for (let i = 0; i < trailDensity; i++)
        {
            const [CFrame, Size] = targetModel.GetBoundingBox();

            const attachmentZero = Make("Attachment", {
                Parent: targetModel.PrimaryPart,
                Position: targetModel.PrimaryPart?.CFrame.PointToObjectSpace(GetRandomPositionFromPart({
                    CFrame,
                    Size: Size.mul(new Vector3(0.5, 1, 1)),
                })),
            });

            this.attachmentInstances.add({
                Attachment0: attachmentZero,

                Attachment1: Make("Attachment", {
                    Parent: targetModel.PrimaryPart,
                    Position: attachmentZero.Position.sub(new Vector3(0, 0.25, 0)),
                }),
            });
        }
    }

    public Render()
    {
        for (const { Attachment0, Attachment1 } of this.attachmentInstances)
        {
            this.trailInstances.add(
                Make("Trail", {
                    Parent: this.globalAttachmentOrigin,

                    Attachment0,
                    Attachment1,

                    MaxLength: 2 ^ 31 - 1,
                    MinLength: 0,

                    WidthScale: new NumberSequence(1, 0.25),
                    Transparency: new NumberSequence(1, 0),
                }),
            );
        }
    }
}

@Service({})
export class EffectsService implements OnStart, OnInit
{
    onInit()
    {
    }

    onStart()
    {
    }

    public GenerateKnockbackTrail(model: Model): KnockbackTrail
    {
        const knockbackTrail = new KnockbackTrail(model, this.globalAttachmentOrigin, 8);
        knockbackTrail.Render();

        return knockbackTrail;
    }

    public readonly globalAttachmentOrigin = Make("Part", {
        Anchored: true,
        Transparency: 1,
        CanQuery: false,
        CanCollide: false,
        Parent: Workspace,
        Name: "Global Attachment Origin",
    });
}
