import { Controller, OnInit, OnRender, OnStart } from "@flamework/core";
import { OnRespawn } from "./client.controller";
import { CameraController } from "./camera.controller";
import { TweenService } from "@rbxts/services";
import Object from "@rbxts/object-utils";

export enum CameraFacing {
    Left,
    Right
}

export interface Camera2D {
    on2DCameraEnabled?(): void;
    on2DCameraDisabled?(): void;
}

@Controller({})
export class CameraController2D extends CameraController implements OnInit, OnRender, OnRespawn, OnStart
{
    private readonly cameraListeners: Set<Camera2D> = new Set<Camera2D>();

    private readonly allParticipants: Model[] = [];

    private cameraDirection: CameraFacing = CameraFacing.Left

    private minDistance = 16;

    private maxDistance = 48;

    constructor()
    {
        super();
    }

    public AddParticipants(...participants: Array<Model>)
    {
        participants.forEach((participant) => (this.allParticipants.includes(participant) ? undefined : this.allParticipants.push(participant)));
        print("new participants:", this.allParticipants);
    }

    public SetParticipants(...participants: Array<Model>)
    {
        this.ClearParticipants();
        this.AddParticipants(...participants);
    }


    public ClearParticipants()
    {
        assert(this.character, "character is not defined");

        this.allParticipants.clear();
        this.allParticipants.push(this.character);
    }

    onInit(): void | Promise<void>
    {
    }

    onRender(): void
    {
        if (!this.cameraEnabled)
        {
            print("camera not enabled.");

            return;
        }

        let largestSize = -math.huge;
        let radicalParticipants: [Model, Model] | undefined;
        const google = new Map<Model, Set<Model>>();
        for (const participant of this.allParticipants)
        {
            if (!google.has(participant))

                google.set(participant, new Set());
            for (const otherParticipant of this.allParticipants.filter((n) => n !== participant))
            {
                const alreadyChecked = google.get(participant)?.has(otherParticipant);
                if (alreadyChecked)
                {
                    print(`already checked: ${participant.Name} -> ${otherParticipant.Name}`);
                    continue;
                }
                else

                    google.set(participant, new Set([...google.get(participant)!, otherParticipant])).get(participant)!;

                const distanceFromOtherParticipant = participant.GetPivot().Position.sub(otherParticipant.GetPivot().Position).Magnitude;
                if (math.max(distanceFromOtherParticipant, largestSize) > largestSize)
                {
                    largestSize = math.clamp(distanceFromOtherParticipant, this.minDistance, this.maxDistance);
                    radicalParticipants = [participant, otherParticipant];

                }
            }
        }

        if (radicalParticipants && radicalParticipants.size() >= 2)
        {
            const [participantAPos, participantBPos] = radicalParticipants.map(
                (n) => n.GetPivot().Position.mul(new Vector3(1,0,1)).add(new Vector3(0,radicalParticipants![ 0 ].GetPivot().Position.Y))
            );

            const positionMedian = participantAPos.Lerp(participantBPos, 0.5);
            const targetCFrame = CFrame.lookAt(positionMedian.add(
                new Vector3(largestSize, 0, 0).mul(this.cameraDirection === CameraFacing.Right ? -1 : 1)
            ), positionMedian).add(this.character?.GetExtentsSize().mul(new Vector3(0,0.,0)) ?? new Vector3());

            this.camera.CFrame = targetCFrame;
            // TweenService.Create(this.camera, new TweenInfo(0.1, Enum.EasingStyle.Sine), {
            //     CFrame:
            // }).Play();
        }
    }

    onRespawn(character: Model): void
    {
        this.allParticipants.clear();
        this.allParticipants.push(character);

        super.onRespawn(character);
    }

    onStart(): void
    {
    }

    public async SetCameraEnabled(enabled = true)
    {
        return new Promise<void>((res, rej) =>
        {
            if (!this.character)
            {
                this.cameraEnabled = false;

                return rej("character not found");
            }

            this.cameraEnabled = enabled;

            return res();
        }).tap(() =>
        {
            for (const cameraListener of this.cameraListeners)

                Promise.try(() => cameraListener[ `on2DCamera${enabled ? "Enabled" : "Disabled"}` ]?.());
        });
    }
}