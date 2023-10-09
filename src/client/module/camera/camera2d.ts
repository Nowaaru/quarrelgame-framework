import { OnInit, OnPhysics } from "@flamework/core";
import { Players, Workspace } from "@rbxts/services";
import { OnMatchRespawn } from "client/controllers/client.controller";
import { CameraController, CameraFacing } from "client/module/camera";
import { ClientFunctions } from "shared/network";

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

export abstract class CameraController2D extends CameraController implements OnInit, OnPhysics, OnMatchRespawn, Camera2D
{
    protected readonly cameraListeners: Set<Camera2D> = new Set<Camera2D>();

    protected readonly allParticipants: Model[] = [];

    protected cameraDirection: CameraFacing = CameraFacing.Left;

    protected cameraMode: CameraMode2D = CameraMode2D.Single;

    protected minDistance = 16;

    protected maxDistance = 32;

    protected paddingPercentage = 1;

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

    onInit()
    {
        this.bindToCamera(Workspace.CurrentCamera!);
    }

    onPhysics(): void
    {
        if (!this.cameraEnabled)
            return;

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

    on2DCameraEnabled(): void
    {
        this.camera.CameraType = Enum.CameraType.Scriptable;
    }

    on2DCameraDisabled(): void
    {
        this.camera.CameraType = Enum.CameraType.Custom;
    }

    async onMatchRespawn(character: Model): Promise<void>
    {
        super.onMatchRespawn(character);
        this.allParticipants.clear();
        this.allParticipants.push(character);

        const currentMatch = await ClientFunctions.GetCurrentMatch();
        if (currentMatch?.Arena)
        {
            this.SetParticipants(...currentMatch.Participants.mapFiltered(({ ParticipantId }) =>
            {
                return Players.GetPlayers().find((player) => player.GetAttribute("ParticipantId") === ParticipantId)?.Character;
            }));

            this.SetCameraEnabled(true);
        }
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
            if (enabled)
                this.on2DCameraEnabled();
            else
                this.on2DCameraDisabled();

            for (const cameraListener of this.cameraListeners)
                Promise.try(() => cameraListener[`on2DCamera${enabled ? "Enabled" : "Disabled"}`]?.());
        });
    }
}
