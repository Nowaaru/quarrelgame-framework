import { Controller, Dependency, OnInit, OnPhysics, OnRender, OnStart } from "@flamework/core";
import Object from "@rbxts/object-utils";
import { TweenService } from "@rbxts/services";
import { CameraController } from "./camera.controller";
import { OnRespawn } from "./client.controller";
import { MatchController } from "./match.controller";

export enum CameraFacing
{
    Left,
    Right,
}

export interface Camera2D
{
    on2DCameraEnabled?(): void;
    on2DCameraDisabled?(): void;
}

@Controller({})
export class CameraController2D extends CameraController implements OnInit, OnPhysics, OnRespawn, OnStart
{
    private readonly cameraListeners: Set<Camera2D> = new Set<Camera2D>();

    private readonly allParticipants: Model[] = [];

    private cameraDirection: CameraFacing = CameraFacing.Left;

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

    onPhysics(): void
    {
        if (!this.cameraEnabled)
            return;

        this.camera.CameraType = Enum.CameraType.Scriptable;

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

        /*
         * https://www.gamedev.net/forums/topic/660245-2dmake-a-camera-follow-multiple-characters/5175871/
         *
         * First you create a bounding box of your level that contains all of your characters plus a bit of a margin so a character isn't right on the edge.
         * You then compare the aspect ratio of this bounding box to the aspect ratio of the screen.
         * If the bounding box has a larger aspect ratio, then you base the zoom of the camera on screen.width / boundingBox.width, otherwise you use screen.height / boundingBox.height.
         * The center point of the camera is simply the midpoint of the bounding box.
         */
        const paddingPercentage = 0.15;
        const paddedCameraSize = this.camera.ViewportSize.X * paddingPercentage;
        if (radicalParticipants && radicalParticipants.size() >= 2)
        {
            let participantAPos, participantBPos;
            if (radicalParticipants.size() > 2)
            {
                const matchController = Dependency<MatchController>();
                const currentMatchData = matchController.GetMatchData();

                assert(currentMatchData, "current match data is not defined - required for greater than 2 participants");
                const { arenaInstance } = currentMatchData;

                [ participantAPos, participantBPos ] = [ radicalParticipants[0].GetPivot().Position, arenaInstance.config.Origin.Value.Position ];
            }
            else
            {
                [ participantAPos, participantBPos ] = radicalParticipants.map(
                    (n) => n.GetPivot().Position.mul(new Vector3(1, 0, 1)).add(new Vector3(0, radicalParticipants![0].GetPivot().Position.Y)),
                );
            }

            const positionMedian = participantAPos.Lerp(participantBPos, 0.5);
            const targetCFrame = CFrame.lookAt(
                positionMedian.add(
                    new Vector3(largestSize, 0, 0).mul(this.cameraDirection === CameraFacing.Right ? -1 : 1),
                ),
                positionMedian,
            ).add(this.character?.GetExtentsSize().mul(new Vector3(0, 0.5, 0)) ?? new Vector3());

            const participantScreenPositions = radicalParticipants.map((n) => this.camera.WorldToViewportPoint(n.GetPivot().Position)[0]);
            const { X, Y, Z } = participantScreenPositions[0].sub(participantScreenPositions[1]);
            const participantScreenPositionDistanceAbsolute = new Vector3(...[ X, Y, Z ].map(math.abs));
            const differenceFromEdges = (paddedCameraSize / 2) - participantScreenPositionDistanceAbsolute.X;

            print("differenceFromEdges:", differenceFromEdges);
            if (differenceFromEdges > 1250295253425569)
                this.camera.FieldOfView = 70 + (differenceFromEdges * 0.1);

            this.camera.CFrame = targetCFrame;
        }
        else if (!radicalParticipants || radicalParticipants.size() === 1)
        {
            const matchController = Dependency<MatchController>();
            const currentMatchData = matchController.GetMatchData();

            if (this.character)
            {
                if (currentMatchData)
                {
                    // TODO: add a way to make camera distance easily configurable

                    const { arenaInstance } = currentMatchData;
                    const { config: arenaConfig } = arenaInstance;
                    const arenaForwardCFrame = CFrame.lookAt(arenaConfig.Origin.Value.Position, arenaConfig.Origin.Value.PointToWorldSpace(arenaConfig.Axis.Value));
                    const focusedParticipant = radicalParticipants?.[0] ?? this.character;
                    const positionMedian = focusedParticipant.GetPivot().Position
                        .mul(new Vector3(1, 0, 1))
                        .Lerp(currentMatchData.arenaInstance.config.Origin.Value.Position.mul(new Vector3(1, 0, 1)), 0.5)
                        .add(focusedParticipant.GetPivot().Position.mul(new Vector3(0, 1, 0)));

                    const { ViewportSize: CameraSize } = this.camera;
                    const aspectRatio = CameraSize.X / CameraSize.Y;
                    const baseSize = focusedParticipant.GetPivot().Position.sub(positionMedian).mul(new Vector3(1, 0, 1));
                    const extentsSize = new Vector3(math.abs(baseSize.X), baseSize.Z).mul(new Vector3(1, 1 / aspectRatio, 1)).mul(1 + paddingPercentage);

                    const offset = (extentsSize.Magnitude / 2) / math.tan(math.rad(this.camera.FieldOfView / 2));
                    const cameraPosition = positionMedian.add(
                        arenaForwardCFrame.RightVector.mul((8 + math.max(8, math.abs(offset))) * (this.cameraDirection === CameraFacing.Right ? 1 : -1)),
                    );

                    print(
                        "extents size:",
                        extentsSize,
                        "offset:",
                        offset,
                    );
                    this.camera.CFrame = CFrame.lookAt(cameraPosition, positionMedian);
                    this.camera.Focus = this.camera.CFrame.Rotation.add(positionMedian);
                }
            }
        }
        else if (this.character)
        {
            print("uh oh");
            const characterPivot = this.character.GetPivot();
            const extentsSize = this.character.GetExtentsSize().mul(new Vector3(0, 0.5, 0));
            const characterWithHeight = characterPivot.Position.add(extentsSize);
            this.camera.CFrame = CFrame.lookAt(
                characterWithHeight.add(characterPivot.RightVector.mul(this.cameraDirection === CameraFacing.Right ? 16 : -16)),
                characterWithHeight,
            );
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
                Promise.try(() => cameraListener[`on2DCamera${enabled ? "Enabled" : "Disabled"}`]?.());
        });
    }
}
