import { Controller, OnInit, OnStart } from "@flamework/core";
import { Players, Workspace } from "@rbxts/services";

import { OnMatchRespawn } from "client/controllers/client.controller";
import { BaseCamera, CameraUtils, PlayerModule } from "client/lib/player";

export enum CameraFacing
{
    Left,
    Right,
}

export abstract class CameraController implements OnMatchRespawn
{
    protected readonly BaseFOV = 72;

    protected readonly cameraModule = BaseCamera().new();

    protected readonly cameraUtils = CameraUtils() as CameraModule.CameraUtils;

    protected camera: Camera & { CameraSubject: Humanoid; } = Workspace.CurrentCamera as Camera & { CameraSubject: Humanoid; };

    protected cameraEnabled = false;

    protected character?: Model;

    public readonly PlayerModule = PlayerModule();

    public readonly LocalPlayer = Players.LocalPlayer;

    public bindToCamera(targetCamera: Camera, targetSubject?: Humanoid)
    {
        this.camera = targetCamera as Camera & { CameraSubject: Humanoid; };
        this.camera.CameraType = Enum.CameraType.Scriptable;

        Workspace.CurrentCamera = this.camera;
        this.camera.CameraSubject = targetSubject ?? this.character?.WaitForChild("Humanoid") as Humanoid;
    }

    onMatchRespawn(character: Model): void
    {
        this.character = character;
    }

    public IsEnabled()
    {
        return this.cameraEnabled;
    }

    public ToggleCameraEnabled()
    {
        return this.SetCameraEnabled(this.cameraEnabled = !this.cameraEnabled);
    }

    public abstract SetCameraEnabled(enabled: boolean): Promise<void>;
}
