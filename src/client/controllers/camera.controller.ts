import { Controller, OnStart, OnInit } from "@flamework/core";
import { Players, RunService, TweenService, UserInputService, Workspace } from "@rbxts/services";
import { LockType, Mouse, MouseMovement, OnMouseMove } from "./mouse.controller";
import { Option, Result } from "@rbxts/rust-classes";
import { BaseCamera, CameraUtils, PlayerModule } from "shared/utility/lib";
import { Cursor, CursorMode } from "./cursor.controller";

class CameraError implements Error
{
    constructor(public readonly why: string)
    {
        this.why = why;
    }

    public ToString(): string
    {
        return `${this.why}`;
    }
}

@Controller({})
export class CameraController implements OnStart, OnInit, OnMouseMove
{
    private Camera: Camera & { CameraSubject: Humanoid } = Workspace.CurrentCamera as Camera & { CameraSubject: Humanoid };

    private CameraModule = BaseCamera().new();

    private CameraUtils = CameraUtils() as CameraModule.CameraUtils;

    public readonly PlayerModule = PlayerModule();

    public readonly LocalPlayer = Players.LocalPlayer;

    constructor(private readonly mouse: Mouse, private readonly cursor: Cursor)
    {}

    private bindToCamera(targetCamera: Camera)
    {
        this.Camera = targetCamera as Camera & { CameraSubject: Humanoid };
        this.Camera.CameraType = Enum.CameraType.Scriptable;

        Workspace.CurrentCamera = this.Camera;
        this.Camera.CameraSubject = this.LocalPlayer.Character?.WaitForChild("Humanoid") as Humanoid;
    }

    private mouseLockOffset = new Vector3(2, 0, 0);

    private battleCameraTweenInfo = new TweenInfo(0.1, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut)

    public SetBattleCameraEnabled(enabled: boolean)
    {

        print(`🚀 ~ file: camera.controller.ts:49 ~ enabled:`, enabled);
        this.battleCameraEnabled = enabled;

        return new Promise<void>((resolve, reject) =>
        {
            if (!this.LocalPlayer.Character)

                return reject(new CameraError("The character is not defined."));

            const Humanoid = this.LocalPlayer.Character.WaitForChild("Humanoid", 3) as Humanoid | undefined;
            if (!Humanoid)

                return reject(new CameraError("The character does not have a humanoid."));

            if (enabled)
            {
                this.CameraModule.SetIsMouseLocked(true);
                this.CameraUtils.setMouseBehaviorOverride(Enum.MouseBehavior.LockCenter);

                RunService.BindToRenderStep("BattleCamera", Enum.RenderPriority.Last.Value + 1, (dt: number) =>
                {
                    this.mouse.Lock();
                });
            }
            else
            {
                RunService.UnbindFromRenderStep("BattleCamera");

                Promise.fromEvent(this.cursor.InterpolateTransparency(undefined, 1).Completed).then(() =>
                {
                    this.cursor.SetCursorMode(CursorMode.Default);
                    task.wait(1/8);

                    return Promise.fromEvent(this.cursor.InterpolateTransparency(undefined, 0).Completed).then(() =>
                    {

                        this.mouse.Unlock();
                        this.CameraModule.SetIsMouseLocked(false);
                        this.CameraUtils.restoreMouseBehavior();
                    });
                });
            }

            const offsetTween = TweenService.Create(Humanoid, this.battleCameraTweenInfo, {
                CameraOffset: enabled ? this.mouseLockOffset : new Vector3(),
            });

            offsetTween.Play();
            if (enabled)
            {
                const viewportSize = this.cursor.CursorInstance.Parent.AbsoluteSize;
                const viewportCenter = viewportSize.div(2);

                const [cameraCenter, isVisible] = [viewportCenter, true]; // this.Camera.WorldToViewportPoint(this.Camera.CFrame.Position);

                this.cursor.SetCursorMode(CursorMode.Scriptable);

                if (isVisible)
                {
                    print("Camera center is visible on the screen.");
                    Promise.fromEvent(this.cursor.InterpolatePosition(undefined, [
                        viewportCenter.X,
                        viewportCenter.Y,
                    ]).Completed).then(() =>
                    {
                        task.wait(1/10);

                        return this.cursor.InterpolatePosition(undefined, [
                            cameraCenter.X,
                            cameraCenter.Y,
                        ]);
                    })
                        .then(() =>
                        {
                            print("Main movement interpolation complete.");
                        });
                }
                else
                {
                    print("Camera center is not visible on the screen.");
                    Promise.fromEvent(this.cursor.InterpolateTransparency(undefined, 1).Completed).then(() =>
                    {
                        this.cursor.SetPosition([viewportCenter.X, viewportCenter.Y]);

                        return Promise.fromEvent(this.cursor.InterpolateTransparency(undefined, 0).Completed).then(() =>
                        {
                            print("Fallback transparency interpolation complete.");
                        });
                    });
                }
            }

            return Promise.fromEvent(offsetTween.Completed).then(() =>
            {
                resolve();
            });
        });
    }

    onMouseMove({delta}: MouseMovement): void
    {
        if (!this.battleCameraEnabled)

            return;

    }

    public ToggleBattleCameraEnabled()
    {
        return this.SetBattleCameraEnabled(this.battleCameraEnabled = !this.battleCameraEnabled);
    }

    onInit()
    {
        print("Camera Controller initiated.");
        this.bindToCamera(Workspace.CurrentCamera!);
        const BoundKeys = Players.LocalPlayer.WaitForChild("PlayerScripts").WaitForChild("PlayerModule")
            .WaitForChild("CameraModule")
            .WaitForChild("MouseLockController")
            .WaitForChild("BoundKeys") as StringValue;

        BoundKeys.Value = "";
    }

    onStart()
    {
    }

    private battleCameraEnabled = false;
}