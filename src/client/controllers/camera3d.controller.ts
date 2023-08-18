import { Controller, OnStart, OnInit, Modding, Dependency } from "@flamework/core";
import { Players, RunService, TweenService, UserInputService, Workspace } from "@rbxts/services";
import { LockType, Mouse, MouseMovement, OnMouseMove } from "./mouse.controller";
import { Cursor, CursorMode } from "./cursor.controller";
import { Components } from "@flamework/components";
import { StateAttributes, StatefulComponent } from "shared/components/state.component";
import { EntityState } from "shared/util/lib";
import { CameraController } from "./camera.controller";

export interface Camera3D {
    on3DCameraEnabled?(): void;
    on3DCameraDisabled?(): void;
}

@Controller({})
export class CameraController3D extends CameraController implements OnStart, OnInit, OnMouseMove
{
    constructor(private readonly mouse: Mouse, private readonly cursor: Cursor)
    {
        super();
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
                        this.camera.CFrame.Position,
                        this.lockOnTarget.Position
                    );

                    // gameSettings.RotationType = Enum.RotationType.CameraRelative;
                    TweenService.Create(this.camera, new TweenInfo(0.1, Enum.EasingStyle.Sine), {
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
        this.camera.FieldOfView = this.BaseFOV;
    }

    public InterpolateResetFOV(): Tween
    {
        return this.InterpolateFOV(this.BaseFOV);
    }

    public SetFOV(newFoV: number): void
    {
        this.camera.FieldOfView = newFoV;
    }

    public InterpolateFOV(newFOV: number, tweenInfo = this.battleCameraTweenInfo): Tween
    {
        const interpolationTween = TweenService.Create(this.camera, tweenInfo, {
            FieldOfView: newFOV,
        });

        interpolationTween.Play();

        return interpolationTween;
    }

    private readonly mouseLockOffset = new Vector3(2, 1, 0);

    private crouchCameraOffset = new Vector3();

    private directionCameraOffset = new Vector3();

    public InterpolateOffset(tweenInfo: TweenInfo = this.battleCameraTweenInfo): Tween
    {
        const Humanoid = this.LocalPlayer.Character?.WaitForChild("Humanoid");
        assert(Humanoid, "humanoid not found");

        const interpolationTween = TweenService.Create(this.LocalPlayer.Character?.WaitForChild("Humanoid") as Humanoid, tweenInfo, {
            CameraOffset: this.mouseLockOffset.add(this.crouchCameraOffset).add(this.directionCameraOffset),
        });

        interpolationTween.Play();

        return interpolationTween;
    }

    private battleCameraTweenInfo = new TweenInfo(0.1, Enum.EasingStyle.Sine, Enum.EasingDirection.Out)

    public async SetCameraEnabled(enabled: boolean)
    {
        this.cameraEnabled = enabled;
        for (const cameraListener of this.listeners)

            Promise.try(() => cameraListener[ `on3DCamera${enabled ? "Enabled" : "Disabled"}` ]?.());

        return new Promise<void>((resolve, reject) =>
        {
            if (!this.LocalPlayer.Character)

                return reject("The character is not defined.");

            const Humanoid = this.LocalPlayer.Character.WaitForChild("Humanoid", 3) as Humanoid | undefined;
            if (!Humanoid)

                return reject("The character does not have a humanoid.");

            const userSettings = UserSettings().GetService("UserGameSettings");
            if (enabled)
            {
                this.cameraUtils.setMouseBehaviorOverride(Enum.MouseBehavior.LockCenter);

                RunService.BindToRenderStep("BattleCamera", Enum.RenderPriority.Last.Value + 1, (dt: number) =>
                {
                    // if (!this.lockOnTarget)

                    userSettings.RotationType = Enum.RotationType.CameraRelative;

                    this.mouse.Lock();
                    this.cameraModule.SetIsMouseLocked(true);
                    this.cameraUtils.setMouseBehaviorOverride(Enum.MouseBehavior.LockCenter);
                });
            }
            else
            {
                RunService.UnbindFromRenderStep("BattleCamera");
                userSettings.RotationType = Enum.RotationType.MovementRelative;
                this.SetLockOnTarget(undefined);

                Promise.fromEvent(this.cursor.InterpolateTransparency(undefined, 1).Completed).then(() =>
                {
                    this.cursor.SetCursorMode(CursorMode.Default);
                    task.wait(1/8);

                    return Promise.fromEvent(this.cursor.InterpolateTransparency(undefined, 0).Completed).then(() =>
                    {
                        this.mouse.Unlock();
                        this.cameraModule.SetIsMouseLocked(false);
                        this.cameraUtils.restoreMouseBehavior();
                    });
                });
            }

            if (enabled)
            {
                const viewportSize = this.cursor.CursorInstance.Parent.AbsoluteSize;
                const viewportCenter = viewportSize.div(2);

                const [cameraCenter, isVisible] = [viewportCenter, true]; // this.camera.WorldToViewportPoint(this.camera.CFrame.Position);

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

            return Promise.fromEvent(this.InterpolateOffset().Completed).then(() =>
            {
                resolve();
            });
        });
    }

    onMouseMove({delta}: MouseMovement): void
    {
        if (!this.cameraEnabled)

            return;
    }

    onInit()
    {
        Modding.onListenerAdded<Camera3D>((listener) => this.listeners.add(listener));
        Modding.onListenerRemoved<Camera3D>((listener) => this.listeners.delete(listener));

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

        this.LocalPlayer.CharacterAdded.Connect(async (character) =>
        {
            const Humanoid = (character.WaitForChild("Humanoid") as Humanoid);
            Humanoid.GetPropertyChangedSignal("MoveDirection").Connect(() =>
            {
                this.directionCameraOffset = Humanoid.MoveDirection.mul(1.525);
                this.InterpolateOffset(new TweenInfo(0.5, Enum.EasingStyle.Sine, Enum.EasingDirection.Out));
            });

            const components = Dependency<Components>();
            const stateController = await components.waitForComponent(character, StatefulComponent);

            if (stateController)
            {
                print("state controller found!");
                this.entityStateController = stateController;
                this.entityStateController.onAttributeChanged("State", (_newState, _oldState) =>
                {
                    const _cameraOffset = this.crouchCameraOffset;
                    const newState = EntityState[ EntityState[ _newState as number ] as keyof typeof EntityState ];
                    const oldState = EntityState[ EntityState[ _oldState as number ] as keyof typeof EntityState ];
                    const crouchStateTest = [EntityState.Crouch];

                    if (crouchStateTest.includes(newState))

                        this.crouchCameraOffset = new Vector3(0, -2, 0);

                    else if (crouchStateTest.includes(oldState))

                        this.crouchCameraOffset = Vector3.zero;

                    if (this.crouchCameraOffset !== _cameraOffset)

                        this.InterpolateOffset(new TweenInfo(0.15, Enum.EasingStyle.Sine, Enum.EasingDirection.Out));

                });
            }
        });
    }


    private entityStateController?: StatefulComponent<StateAttributes, Instance>;

    private listeners: Set<Camera3D> = new Set();
}