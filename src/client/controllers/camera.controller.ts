import { Controller, OnInit, OnStart } from "@flamework/core";
import { Players, Workspace } from "@rbxts/services";

import { BaseCamera, CameraUtils, PlayerModule } from "shared/util/player";

export abstract class CameraController
{
    protected readonly BaseFOV = 72;

    protected readonly cameraModule = BaseCamera().new();

    protected readonly cameraUtils = CameraUtils() as CameraModule.CameraUtils;

    protected camera: Camera & { CameraSubject: Humanoid } = Workspace.CurrentCamera as Camera & { CameraSubject: Humanoid };

    protected cameraEnabled = false;

    protected character?: Model;

    public readonly PlayerModule = PlayerModule();

    public readonly LocalPlayer = Players.LocalPlayer;

    public bindToCamera(targetCamera: Camera)
    {
        this.camera = targetCamera as Camera & { CameraSubject: Humanoid };
        this.camera.CameraType = Enum.CameraType.Scriptable;

        Workspace.CurrentCamera = this.camera;
        this.camera.CameraSubject = this.LocalPlayer.Character?.WaitForChild("Humanoid") as Humanoid;
    }

    public abstract SetCameraEnabled(enabled: boolean): Promise<void>
}