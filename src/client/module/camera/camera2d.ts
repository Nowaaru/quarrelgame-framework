import { OnPhysics } from "@flamework/core";
import { OnRespawn } from "client/controllers/client.controller";
import { CameraController, CameraFacing } from "client/module/camera";

export interface Camera2D
{
    on2DCameraEnabled?(): void;
    on2DCameraDisabled?(): void;
}

export enum CameraMode2D
{
    Single,
    Multi,
}

export abstract class CameraController2D extends CameraController implements OnPhysics, OnRespawn
{
    protected readonly cameraListeners: Set<Camera2D> = new Set<Camera2D>();

    protected readonly allParticipants: Model[] = [];

    protected cameraDirection: CameraFacing = CameraFacing.Left;

    protected cameraMode: CameraMode2D = CameraMode2D.Single;

    protected minDistance = 8;

    protected maxDistance = 32;

    protected paddingPercentage = 0.15;

    constructor()
    {
        super();
    }

    protected GetRadicalParticipants(...participants: Model[])
    {
        let largestSize = -math.huge;
        let radicalParticipants: [Model, Model] | undefined;
        const google = new Map<Model, Set<Model>>();
        for (const participant of (participants.size() > 0 ? participants : this.allParticipants))
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
                {
                    google.set(participant, new Set([ ...google.get(participant)!, otherParticipant ])).get(participant)!;
                }

                const distanceFromOtherParticipant = participant.GetPivot().Position.sub(otherParticipant.GetPivot().Position).Magnitude;
                if (math.max(distanceFromOtherParticipant, largestSize) > largestSize)
                {
                    largestSize = math.clamp(distanceFromOtherParticipant, this.minDistance, this.maxDistance);
                    radicalParticipants = [ participant, otherParticipant ];
                }
            }
        }

        return [ radicalParticipants, largestSize ] as LuaTuple<[typeof radicalParticipants, number]>;
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

    /**
     * Run a camera cycle.
     *
     * @param participant The participant to handle.
     * @param emulateMultiCamera Whether to emulate functionality of the
     * multiParticipantCameraHandler by acting as if the middle of the arena
     * is the second participant.
     */
    public abstract singularParticipantCameraHandler(character: Model, emulateMultiCamera?: boolean): void;

    /**
     *  Run a camera cycle.
     *
     * @param participant The participant to handle.
     */
    public abstract multiParticipantCameraHandler(...characters: Model[]): void;

    onPhysics(): void
    {
        switch ( this.cameraMode )
        {
            case CameraMode2D.Single:
            {
                assert(this.character, "character is not defined");
                this.singularParticipantCameraHandler(this.character!, true);
                break;
            }

            case CameraMode2D.Multi:
            {
                this.multiParticipantCameraHandler();
            }
        }
    }

    onRespawn(character: Model): void
    {
        this.allParticipants.clear();
        this.allParticipants.push(character);

        super.onRespawn(character);
    }

    public async SetMinimumDistance(baseCameraDistance: number)
    {
        this.minDistance = baseCameraDistance;
    }

    public async SetCameraMode(cameraMode: CameraMode2D)
    {
        this.cameraMode = cameraMode;
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
                Promise.try(() => cameraListener[`on2DCamera${enabled ? "Enabled" : "Disabled"}`]?.());
        });
    }
}
