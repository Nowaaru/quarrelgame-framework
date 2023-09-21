import { Controller, Dependency, OnInit, OnPhysics, OnStart } from "@flamework/core";
import { Players } from "@rbxts/services";
import type { Entity } from "server/components/entity.component";
import _Map from "server/components/map.component";
import type { ParticipantAttributes } from "server/components/participant.component";
import type { MatchPhase, MatchService, MatchSettings, MatchState } from "server/services/matchservice.service";
import { EntityAttributes } from "shared/components/entity.component";
import { CameraController, CameraFacing } from "./camera.controller";
import { CameraController2D } from "./camera2d.controller";

import { OnRespawn } from "./client.controller";
import { MatchController, OnMatchStart } from "./match.controller";

enum PlatformControllerCameraMode
{
    Single,
    Multi,
}

export class PlatformCameraController2D extends CameraController2D implements OnInit, OnPhysics, OnRespawn, OnStart
{
    protected cameraDirection: CameraFacing = CameraFacing.Left;

    protected cameraMode: PlatformControllerCameraMode = PlatformControllerCameraMode.Multi;

    constructor()
    {
        super();
    }

    onInit(): void | Promise<void>
    {
    }

    onPhysics(): void
    {
        switch ( this.cameraMode )
        {
            case PlatformControllerCameraMode.Single:
            {
                assert(this.character, "character is not defined");
                this.singularParticipantCameraHandler(this.character!, true);
                break;
            }

            case PlatformControllerCameraMode.Multi:
            {
                this.multiParticipantCameraHandler();
            }
        }
    }

    onRespawn(character: Model): void
    {
        this.character = character;
    }

    onStart(): void
    {
    }

    /**
     * Run a camera cycle.
     *
     * @param participant The participant to handle.
     * @param emulateMultiCamera Whether to emulate functionality of the
     * multiParticipantCameraHandler by acting as if the middle of the arena
     * is the second participant.
     */
    private singularParticipantCameraHandler(participant: Model, emulateMultiCamera?: boolean)
    {
        const currentMatchData = Dependency<MatchController>().GetMatchData();
        assert(currentMatchData, "currentMatchData is not defined");

        if (emulateMultiCamera)
        {
            const positionMedian = participant.GetPivot().Position
                .mul(new Vector3(1, 0, 1))
                .Lerp(currentMatchData.arenaInstance.config.Origin.Value.Position.mul(new Vector3(1, 0, 1)), 0.5)
                .add(participant.GetPivot().Position.mul(new Vector3(0, 1, 0)));

            this.multiParticipantCameraHandler(participant, {
                GetPivot()
                {
                    return new CFrame(positionMedian);
                },

                GetExtentsSize()
                {
                    return participant.GetExtentsSize();
                },
            } as Model);
            return;
        }

        const characterPivot = participant.GetPivot();
        const extentsSize = participant.GetExtentsSize().mul(new Vector3(0, 0.5, 0));
        const characterWithHeight = characterPivot.Position.add(extentsSize);
        this.camera.CFrame = CFrame.lookAt(
            characterWithHeight.add(characterPivot.RightVector.mul(this.cameraDirection === CameraFacing.Right ? 16 : -16)),
            characterWithHeight,
        );
    }

    /**
     *  Run a camera cycle.
     * @param participant The participant to handle.
     */
    private multiParticipantCameraHandler(...participants: Model[]): void
    {
        const currentMatchData = Dependency<MatchController>().GetMatchData();
        assert(this.character, "character is not defined");
        assert(currentMatchData, "currentMatchData is not defined");
        if (currentMatchData)
        {
            const { arenaInstance } = currentMatchData;
            const { config: arenaConfig } = arenaInstance;
            const arenaForwardCFrame = CFrame.lookAt(arenaConfig.Origin.Value.Position, arenaConfig.Origin.Value.PointToWorldSpace(arenaConfig.Axis.Value));

            const [ radicalParticipants ] = this.GetRadicalParticipants(...participants);
            const [ focusedParticipant, farthestParticipant ] = radicalParticipants ?? [];
            assert(focusedParticipant, "cannot find focused participant");
            assert(farthestParticipant, "cannot find farthest participant");

            const positionMedian = focusedParticipant.GetPivot().Position
                .mul(new Vector3(1, 0, 1))
                .Lerp(currentMatchData.arenaInstance.config.Origin.Value.Position.mul(new Vector3(1, 0, 1)), 0.5)
                .add(focusedParticipant.GetPivot().Position.mul(new Vector3(0, 1, 0)));

            const { ViewportSize: CameraSize } = this.camera;
            const aspectRatio = CameraSize.X / CameraSize.Y;
            const baseSize = focusedParticipant.GetPivot().Position.sub(positionMedian).mul(new Vector3(1, 0, 1));
            const extentsSize = new Vector3(math.abs(baseSize.X), baseSize.Z).mul(new Vector3(1, 1 / aspectRatio, 1)).mul(1 + this.paddingPercentage);

            const offset = (extentsSize.Magnitude / 2) / math.tan(math.rad(this.camera.FieldOfView / 2));
            const cameraPosition = positionMedian.add(
                arenaForwardCFrame.RightVector.mul(
                    (this.minDistance + math.max(this.minDistance, math.abs(offset))) * (this.cameraDirection === CameraFacing.Right ? 1 : -1),
                ),
            );

            this.camera.CFrame = CFrame.lookAt(cameraPosition, positionMedian);
            this.camera.Focus = this.camera.CFrame.Rotation.add(positionMedian);
        }
    }

    public async SetBaseCameraDistance(baseCameraDistance: number)
    {
        this.minDistance = baseCameraDistance;
    }

    public async SetCameraMode(cameraMode: PlatformControllerCameraMode)
    {
        this.cameraMode = cameraMode;
    }

    public async SetCameraEnabled(enabled: boolean): Promise<void>
    {
        this.cameraEnabled = enabled;
    }
}
