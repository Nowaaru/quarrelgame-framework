import { Controller, OnInit, OnStart } from "@flamework/core";
import { Players, TweenService, UserInputService } from "@rbxts/services";
import { InputMode } from "shared/util/input";
import { ConvertPercentageToNumber } from "shared/util/lib";
import { Mouse, MouseButton, MouseMovement, OnMouseButton, OnMouseMove } from "./mouse.controller";

export enum CursorMode
{
    Scriptable,
    Default,
}

@Controller({})
export class Cursor implements OnStart, OnInit, OnMouseMove, OnMouseButton
{
    constructor(private mouse: Mouse)
    {}

    private playerGui = Players.LocalPlayer.WaitForChild("PlayerGui") as PlayerGui;

    private interpInfo = new TweenInfo(0.1, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut);

    private baseSize = 8;

    onMouseMove({ position, delta }: MouseMovement): void
    {
        if (this.CursorMode === CursorMode.Scriptable)
        {
            return;
        }

        this.SetPosition(position);
    }

    onMouseButton(mouseButton: MouseButton, inputMode: InputMode): void
    {
        if (this.mouse.GetPressedButtons().isEmpty())
        {
            this.InterpolateSize(undefined, this.baseSize);
        }
        else
        {
            this.InterpolateSize(undefined, this.baseSize * 0.85);
        }
    }

    onInit()
    {
        UserInputService.MouseIconEnabled = false;

        const cursorContainer = new Instance("ScreenGui", this.playerGui);
        const cursorFrame = this.CursorInstance = new Instance("Frame", cursorContainer) as never;
        const uiCorner = new Instance("UICorner", cursorFrame);

        this.CursorInstance.AnchorPoint = new Vector2(0.5, 0.5);
        this.CursorInstance.Name = "Cursor";
        this.CursorInstance.BackgroundColor3 = new Color3(0.77, 0.51, 0.39);

        uiCorner.CornerRadius = new UDim(0, 0);

        cursorContainer.Name = "Cursor Container";
        cursorContainer.IgnoreGuiInset = false;
        cursorContainer.DisplayOrder = (2 ** 31) - 1;
        cursorContainer.ResetOnSpawn = false;
    }

    onStart()
    {
        this.SetRadius("100%");
        this.SetSize();
    }

    public SetPosition(position: readonly [xPx: number, yPx: number] = [0, 0])
    {
        this.CursorInstance.Position = new UDim2(0, position[0], 0, position[1]);
    }

    public InterpolatePosition(tweenInfo = this.interpInfo, position: readonly [xPx: number, yPx: number] = [0, 0])
    {
        const interpolationTween = TweenService.Create(this.CursorInstance, tweenInfo, {
            Position: UDim2.fromOffset(...position),
        });

        interpolationTween.Play();

        return interpolationTween;
    }

    /**
     * Change the radius of the cursor.
     * @param radius The radius as a percentage.
     * @returns The radius converted into a UDim.
     */
    public SetRadius(radius: string): void;
    /**
     * Change the radius of the cursor.
     * @param radius The radius as a number.
     * @returns The radius converted into a UDim.
     */
    public SetRadius(radius: number): UDim;
    public SetRadius(radius: string | number): UDim
    {
        if (typeIs(radius, "string"))
        {
            const radiusSize = ConvertPercentageToNumber(radius);
            assert(radiusSize, `radius size ${radius} (parsed: ${radiusSize}) is invalid.`);

            return this.CursorInstance.UICorner.CornerRadius = new UDim(radiusSize / 100, 0);
        }

        return this.CursorInstance.UICorner.CornerRadius = new UDim(0, radius);
    }

    public InterpolateRadius(tweenInfo: TweenInfo, radius: string): Tween;
    public InterpolateRadius(tweenInfo: TweenInfo, radius: number): Tween;
    public InterpolateRadius(tweenInfo = this.interpInfo, radius: string | number): Tween
    {
        let radiusSize: UDim | undefined;
        if (typeIs(radius, "string"))
        {
            const radiusScale = ConvertPercentageToNumber(radius);
            assert(radiusScale, `radius scale ${radius} (parsed: ${radiusScale}) is invalid.`);

            radiusSize = new UDim(radiusScale);
        }
        else
        {
            radiusSize = new UDim(0, radius);
        }

        const interpolationTween = TweenService.Create(this.CursorInstance.UICorner, tweenInfo, {
            CornerRadius: radiusSize,
        });

        interpolationTween.Play();

        return interpolationTween;
    }

    /**
     * Rotate the cursor.
     * @param degrees The amount of degrees to rotate the cursor.
     * Defaults to 0.
     *
     * @param absolute Whether to consider the rotation as an absolute
     * rotation. If set to true, the rotation will simply be set.
     */
    public Rotate(degrees = 0, absolute?: boolean)
    {
        this.CursorInstance.Rotation += absolute ? -this.CursorInstance.Rotation + degrees : degrees;
    }

    public InterpolateRotation(tweenInfo = this.interpInfo, degrees = 0, absolute?: boolean): Tween
    {
        const interpolationTween = TweenService.Create(this.CursorInstance, tweenInfo, {
            Rotation: absolute ? -this.CursorInstance.Rotation + degrees : degrees,
        });

        interpolationTween.Play();

        return interpolationTween;
    }

    public SetSize(sizePx = this.baseSize): void
    {
        this.CursorInstance.Size = UDim2.fromOffset(sizePx, sizePx);
    }

    public InterpolateSize(tweenInfo = this.interpInfo, sizePx = this.baseSize): Tween
    {
        const interpolationTween = TweenService.Create(this.CursorInstance, tweenInfo, {
            Size: UDim2.fromOffset(sizePx, sizePx),
        });

        interpolationTween.Play();

        return interpolationTween;
    }

    public SetTransparency(transparency = 1)
    {
        this.CursorInstance.BackgroundTransparency = transparency;
    }

    public InterpolateTransparency(tweenInfo = this.interpInfo, transparency = 1)
    {
        const interpolationTween = TweenService.Create(this.CursorInstance, tweenInfo, {
            BackgroundTransparency: transparency,
        });

        interpolationTween.Play();

        return interpolationTween;
    }

    public SetCursorMode(cursorMode: CursorMode)
    {
        this.CursorMode = cursorMode;
    }

    public CursorInstance!: Frame & {
        Parent: ScreenGui;
        UICorner: UICorner;
    };

    private CursorMode = CursorMode.Default;
}
