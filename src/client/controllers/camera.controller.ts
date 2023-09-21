import { Controller, OnInit, OnStart } from "@flamework/core";
import { Players, Workspace } from "@rbxts/services";

import { BaseCamera, CameraUtils, PlayerModule } from "shared/util/player";
import { OnRespawn } from "./client.controller";

export enum CameraFacing
{
    Left,
    Right,
}

export abstract class CameraController implements OnRespawn
{
    protected readonly BaseFOV = 72;

    protected readonly cameraModule = BaseCamera().new();

    protected readonly cameraUtils = CameraUtils() as CameraModule.CameraUtils;

    protected camera: Camera & { CameraSubject: Humanoid; } = Workspace.CurrentCamera as Camera & { CameraSubject: Humanoid; };

    protected cameraEnabled = false;

    protected character?: Model;

    public readonly PlayerModule = PlayerModule();

    public readonly LocalPlayer = Players.LocalPlayer;

    public bindToCamera(targetCamera: Camera)
    {
        this.camera = targetCamera as Camera & { CameraSubject: Humanoid; };
        this.camera.CameraType = Enum.CameraType.Scriptable;

        Workspace.CurrentCamera = this.camera;
        this.camera.CameraSubject = this.LocalPlayer.Character?.WaitForChild("Humanoid") as Humanoid;
    }

    onRespawn(character: Model): void
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
