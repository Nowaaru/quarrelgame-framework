import { Controller, OnStart, OnInit, Modding } from "@flamework/core";
import { Players, RunService, TweenService, UserInputService, Workspace } from "@rbxts/services";
import { LockType, Mouse, MouseMovement, OnMouseMove } from "./mouse.controller";
import { Option, Result } from "@rbxts/rust-classes";
import { BaseCamera, CameraUtils, PlayerModule } from "shared/utility/player";
import { Cursor, CursorMode } from "./cursor.controller";

export interface BattleCamera {
    onBattleCameraEnabled?(): void;
    onBattleCameraDisabled?(): void;
}

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
    private readonly BaseFOV = 72;

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

    private lockOnTarget?: Instance & { Position: Vector3 };

    public SetLockOnTarget<T extends Instance & { Position: Vector3 }>(targetInstance?: T)
    {
        const gameSettings = UserSettings().GetService("UserGameSettings");
        if (!this.lockOnTarget && targetInstance)
        {
            this.lockOnTarget = targetInstance;

            const params = new RaycastParams();
            params.AddToFilter(this.LocalPlayer.Character ? this.LocalPlayer.Character : []);

            RunService.BindToRenderStep("LockOn", Enum.RenderPriority.Last.Value + 2, (dt) =>
            {
                assert(this.LocalPlayer.Character, "character does not exist");

                if (this.lockOnTarget)
                {
                    const lockOnTargetCFrame = CFrame.lookAt(
                        this.Camera.CFrame.Position,
                        this.lockOnTarget.Position
                    );

                    gameSettings.RotationType = Enum.RotationType.CameraRelative;
                    TweenService.Create(this.Camera, new TweenInfo(0.1, Enum.EasingStyle.Sine), {
                        CFrame: lockOnTargetCFrame,
                        // cameraOccluderIsNotTarget
                        //  ? lockOnTargetCFrame.add(this.LocalPlayer.Character.GetPivot().LookVector.mul(4))
                        //  : lockOnTargetCFrame
                    }).Play();
                }
            });
        }
        else if (!targetInstance)
        {
            this.lockOnTarget = undefined;
            RunService.UnbindFromRenderStep("LockOn");
        }

    }

    public GetLockOnTarget()
    {
        return this.lockOnTarget;
    }

    public GetBaseFOV()
    {
        return this.BaseFOV;
    }

    public ResetFOV()
    {
        this.Camera.FieldOfView = this.BaseFOV;
    }

    public InterpolateResetFOV(): Tween
    {
        return this.InterpolateFOV(this.BaseFOV);
    }

    public SetFOV(newFoV: number): void
    {
        this.Camera.FieldOfView = newFoV;
    }

    public InterpolateFOV(newFOV: number, tweenInfo = this.battleCameraTweenInfo): Tween
    {
        const interpolationTween = TweenService.Create(this.Camera, tweenInfo, {
            FieldOfView: newFOV,
        });

        interpolationTween.Play();

        return interpolationTween;
    }

    private mouseLockOffset = new Vector3(2, 1, 0);

    private battleCameraTweenInfo = new TweenInfo(0.1, Enum.EasingStyle.Sine, Enum.EasingDirection.Out)

    public SetBattleCameraEnabled(enabled: boolean)
    {
        this.battleCameraEnabled = enabled;
        for (const listener of this.listeners)
        {
            if (enabled)

                listener.onBattleCameraEnabled?.();

            else listener.onBattleCameraDisabled?.();
        }

        return new Promise<void>((resolve, reject) =>
        {
            if (!this.LocalPlayer.Character)

                return reject(new CameraError("The character is not defined."));

            const Humanoid = this.LocalPlayer.Character.WaitForChild("Humanoid", 3) as Humanoid | undefined;
            if (!Humanoid)

                return reject(new CameraError("The character does not have a humanoid."));

            if (enabled)
            {
                this.CameraUtils.setMouseBehaviorOverride(Enum.MouseBehavior.LockCenter);

                RunService.BindToRenderStep("BattleCamera", Enum.RenderPriority.Last.Value + 1, (dt: number) =>
                {
                    if (!this.lockOnTarget)

                        UserSettings().GetService("UserGameSettings").RotationType = Enum.RotationType.MovementRelative;

                    this.mouse.Lock();
                    this.CameraModule.SetIsMouseLocked(true);
                    this.CameraUtils.setMouseBehaviorOverride(Enum.MouseBehavior.LockCenter);
                });
            }
            else
            {
                RunService.UnbindFromRenderStep("BattleCamera");
                this.SetLockOnTarget(undefined);

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
                            cameraCenter.Y - 32,
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

    public IsBattleCameraEnabled()
    {
        return this.battleCameraEnabled;
    }

    onInit()
    {
        Modding.onListenerAdded<BattleCamera>((listener) => this.listeners.add(listener));
        Modding.onListenerRemoved<BattleCamera>((listener) => this.listeners.delete(listener));

        this.bindToCamera(Workspace.CurrentCamera!);
        const BoundKeys = Players.LocalPlayer.WaitForChild("PlayerScripts").WaitForChild("PlayerModule")
            .WaitForChild("CameraModule")
            .WaitForChild("MouseLockController")
            .WaitForChild("BoundKeys") as StringValue;

        BoundKeys.Value = "";
        print("Camera Controller initiated.");
    }

    onStart()
    {
        this.ResetFOV();
    }

    private battleCameraEnabled = false;

    private listeners: Set<BattleCamera> = new Set();
}