import { Controller, OnStart, OnInit } from "@flamework/core";
import { Camera3D, CameraController3D } from "./camera3d.controller";
import { Client } from "./client.controller";
import Make from "@rbxts/make";
import { Players, TweenService } from "@rbxts/services";
import Roact from "@rbxts/roact";
import HeadsUpDisplay from "client/ui/hud";

interface WidescreenInterface {
    Top: Frame,
    Bottom: Frame,
}

@Controller({})
export class HudController implements OnStart, OnInit
{
    constructor(
        private readonly camera: CameraController3D,
    )
    {
        this.player = Players.LocalPlayer;
        this.playerGui = this.player.WaitForChild("PlayerGui") as PlayerGui;
    }

    onInit()
    {
        this.hudInstance.Parent = this.playerGui;
        this.widescreenInterface.Top.Parent = this.hudInstance;
        this.widescreenInterface.Bottom.Parent = this.hudInstance;
    }

    onStart()
    {

    }

    private HudTree?: Roact.Tree;

    public IsHudEnabled()
    {
        return !!this.HudTree;
    }

    public EnableHud()
    {
        if (this.HudTree)

            this.DisableHud();

        this.HudTree = Roact.mount(<HeadsUpDisplay />, this.hudInstance, "Heads-Up Display");
    }

    public DisableHud()
    {
        if (this.HudTree)

            Roact.unmount(this.HudTree);

        this.HudTree = undefined;
    }

    private lockOnTweenInfo = new TweenInfo(0.1, Enum.EasingStyle.Circular, Enum.EasingDirection.InOut);

    private lockOnTarget?: Model;

    private lockOnHighlight?: Highlight | void;

    public SetLockOnTarget(targetModel?: Model)
    {

        if (targetModel !== this.lockOnTarget)
        {
            this.lockOnTarget = targetModel;
            if (this.lockOnHighlight)
            {
                const oldLockOnHighlight = this.lockOnHighlight;
                const dismissTween = TweenService.Create(oldLockOnHighlight, new TweenInfo(0.1), {
                    OutlineTransparency: 1,
                    FillTransparency: 1,
                });

                dismissTween.Play();
                Promise.fromEvent(dismissTween.Completed).then(() =>
                {
                    oldLockOnHighlight.Destroy();
                });
            }

            if (this.lockOnTarget)
            {
                this.lockOnHighlight = Make("Highlight", {
                    Parent: targetModel,
                    Adornee: targetModel,

                    OutlineTransparency: 1,
                    FillTransparency: 1,

                    OutlineColor: Color3.fromRGB(255, 141, 42),
                    FillColor: Color3.fromRGB(255, 141, 42)
                });

                TweenService.Create(this.lockOnHighlight, new TweenInfo(0.5), {
                    OutlineTransparency: 0,
                    FillTransparency: 0.5,
                }).Play();
            }
        }
    }

    public SetLockOnEffectEnabled(enabled?: boolean): void
    {
        this.wideScreenEffectEnabled = !!enabled;
        TweenService.Create(this.widescreenInterface.Top, this.lockOnTweenInfo, {
            Position: this.wideScreenEffectEnabled ? UDim2.fromScale(0, 0) : UDim2.fromScale(0, -this.widescreenInterface.Top.Size.Y.Scale)
        }).Play();

        TweenService.Create(this.widescreenInterface.Bottom, this.lockOnTweenInfo, {
            Position: this.wideScreenEffectEnabled ? UDim2.fromScale(0, 1 - this.widescreenInterface.Bottom.Size.Y.Scale) : UDim2.fromScale(0, 1)
        }).Play();

        if (!this.wideScreenEffectEnabled)
        {
            this.camera.InterpolateResetFOV();

            return;
        }

        this.camera.InterpolateFOV(this.camera.GetBaseFOV() * 0.65, new TweenInfo(0.25, Enum.EasingStyle.Circular, Enum.EasingDirection.InOut));
    }

    public ToggleLockOnEffectEnabled(): void
    {
        return this.SetLockOnEffectEnabled(!this.wideScreenEffectEnabled);
    }

    public IsLockOnEffectEnabled(): boolean
    {
        return this.wideScreenEffectEnabled;
    }

    private wideScreenEffectEnabled = false;
    private widescreenInterface = {
        Top: Make("Frame", {
            Name: "Top",
            BackgroundColor3: new Color3(),
            BorderSizePixel: 0,
            Position: UDim2.fromScale(0, -1/8),
            Size: UDim2.fromScale(1, 1/8),
        }),

        Bottom: Make("Frame", {
            Name: "Bottom",
            BackgroundColor3: new Color3(),
            BorderSizePixel: 0,
            Position: UDim2.fromScale(0, 1),
            Size: UDim2.fromScale(1, 1/8),
        }),
    }

    private hudInstance = Make("ScreenGui", {
        Name: "Heads-Up Display",
        ResetOnSpawn: false,
        IgnoreGuiInset: true,
    });

    public readonly player: Player;

    public readonly playerGui: PlayerGui;
}