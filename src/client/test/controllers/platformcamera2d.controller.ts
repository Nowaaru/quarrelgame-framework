import { Controller, Dependency, OnInit, OnPhysics, OnStart } from "@flamework/core";
import { CameraFacing } from "client/module/camera";
import { CameraController2D, CameraMode2D } from "client/module/camera/camera2d";
import _Map from "server/components/map.component";

import { Players } from "@rbxts/services";
import { OnRespawn } from "client/controllers/client.controller";
import { MatchController } from "client/controllers/match.controller";
import { ClientFunctions } from "shared/network";

@Controller({})
export class PlatformCameraController2D extends CameraController2D implements OnInit, OnPhysics, OnRespawn, OnStart
{
    protected cameraDirection: CameraFacing = CameraFacing.Left;

    protected cameraMode: CameraMode2D = CameraMode2D.Single;

    constructor()
    {
        super();
    }

    onInit(): void | Promise<void>
    {
    }

    onStart(): void
    {
    }

    public singularParticipantCameraHandler(participant: Model, emulateMultiCamera?: boolean)
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

    public multiParticipantCameraHandler(...characters: Model[]): void
    {
        const currentMatchData = Dependency<MatchController>().GetMatchData();
        assert(this.character, "character is not defined");
        assert(currentMatchData, "currentMatchData is not defined");

        const { arenaInstance } = currentMatchData;
        const { config: arenaConfig } = arenaInstance;
        const arenaForwardCFrame = CFrame.lookAt(arenaConfig.Origin.Value.Position, arenaConfig.Origin.Value.PointToWorldSpace(arenaConfig.Axis.Value));

        const [ radicalParticipants ] = this.GetRadicalParticipants(...characters);
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
        const extentsSize = new Vector3(math.abs(baseSize.X), baseSize.Z).mul(new Vector3(1, 1 / aspectRatio, 1).mul(3 * (1 + this.paddingPercentage)));
        print("extents size:", extentsSize);

        const offset = (extentsSize.Magnitude / 2) / math.tan(math.rad(this.camera.FieldOfView / 2));
        const cameraPosition = positionMedian.add(
            arenaForwardCFrame.RightVector.mul(
                (math.clamp(math.abs(offset), this.minDistance, this.maxDistance)) * (this.cameraDirection === CameraFacing.Right ? 1 : -1),
            ),
        );

        this.camera.CFrame = CFrame.lookAt(cameraPosition, positionMedian);
        this.camera.Focus = this.camera.CFrame.Rotation.add(positionMedian);
    }

    public async SetCameraEnabled(enabled: boolean): Promise<void>
    {
        super.SetCameraEnabled(this.cameraEnabled = enabled);
    }
}
