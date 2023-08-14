import { Controller, OnInit, OnRender, OnStart } from "@flamework/core";
import { OnRespawn } from "./client.controller";
import { CameraController } from "./camera.controller";
import { TweenService } from "@rbxts/services";

export enum CameraFacing {
    Left,
    Right
}

@Controller({})
class CameraController2D extends CameraController implements OnInit, OnRender, OnRespawn, OnStart
{
    private readonly allParticipants: Model[] = [];

    private cameraDirection: CameraFacing = CameraFacing.Left

    private minDistance = 16;

    private maxDistance = 48;

    constructor()
    {
        super();
    }

    public SetParticipants(...participants: Array<Model>)
    {
        participants.forEach((e) => this.allParticipants.push(e));
    }

    onInit(): void | Promise<void>
    {
    }

    onRender(dt: number): void
    {
        if (!this.cameraEnabled)
        {
            // print("camera not enabled.");

            return;
        }

        let largestSize = 0;
        let radicalParticipants: [Model, Model] | undefined;
        const google = new Map<Model, Set<Model>>();
        for (const participant of this.allParticipants)
        {
            for (const otherParticipant of this.allParticipants.filter((n) => n !== participant))
            {
                const alreadyChecked = google.get(participant)?.has(otherParticipant);
                if (alreadyChecked)

                    continue;

                const distanceFromOtherParticipant = participant.GetPivot().Position.sub(otherParticipant.GetPivot().Position).Magnitude;
                if (math.min(distanceFromOtherParticipant, largestSize) > largestSize)
                {
                    largestSize = math.clamp(distanceFromOtherParticipant, this.minDistance, this.maxDistance);
                    radicalParticipants = [participant, otherParticipant];
                }
            }
        }

        if (radicalParticipants?.size() === 2)
        {
            const [participantAPos, participantBPos] = radicalParticipants.map((n) => n.GetPivot().Position);
            const positionMedian = participantAPos.Lerp(participantBPos, 0.5);
            TweenService.Create(this.camera, new TweenInfo(0.1, Enum.EasingStyle.Sine), {
                CFrame: CFrame.lookAt(positionMedian.add(
                    new Vector3(largestSize, 0, 0).mul(this.cameraDirection === CameraFacing.Right ? -1 : 1)
                ), positionMedian)
            }).Play();
        }
        else print(radicalParticipants?.size());
    }

    onRespawn(character: Model): void
    {
        this.allParticipants.clear();
        this.allParticipants.push(character);
    }

    onStart(): void
    {
    }

    public async SetCameraEnabled(enabled = true)
    {
        return new Promise<void>((res, rej) =>
        {
            if (!this.character)

                return rej("character not found");

            this.cameraEnabled = enabled;

            return res();
        });
    }
}