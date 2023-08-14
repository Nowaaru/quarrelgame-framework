import Make from "@rbxts/make";
import { useBindingState, useLifetime, useMountEffect, useMouse, usePropertyBinding } from "@rbxts/pretty-roact-hooks";
import Roact from "@rbxts/roact";
import { useCallback, useEffect, useMemo, useRef, useState, withHooks } from "@rbxts/roact-hooked";
import { RunService } from "@rbxts/services";
import { Character } from "shared/util/character";

export interface CharacterItemProps {
    /**
     * The character.
     */
    Character: Character.Character,
    /**
     * Whether the character is selected
     * or not.
     */
    Selected?: boolean
    /**
     * Whether the character has
     * been selected and locked in
     * or not.
    */,
    LockedIn?: boolean,
    /**
     * Whether the character can
     * be locked in or not.
     */
    Locked?: boolean,
    /**
     * The image of the character
     * if the 3D portrait is not
     * used.
     */
    Image?: string
    /**
     * What happens when the character
     * portrait is selected.
     */
    OnSelected?: (character: Character.Character) => void,
}

export interface CharacterPortraitProps3D {
    Character: Character.Character & { Model: Model & { PrimaryPart: BasePart, Humanoid: Humanoid & { Animator?: Animator } }}
    Facing?: Enum.NormalId,
    CameraFocus?: BasePart,
    CameraDirection?: Enum.NormalId,
    CameraOffset?: CFrame,
    OnClick?: (selectedCharacter: CharacterPortraitProps3D["Character"]) => void,
    [Roact.Children]?: JSX.Element[]
}

const CharacterPortrait3D = withHooks(({
    Character,
    Facing = Enum.NormalId.Front,
    CameraFocus = Character.Model.PrimaryPart,
    CameraDirection = Enum.NormalId.Back,
    CameraOffset = new CFrame(0,1.5,-2),
    OnClick = () => undefined,
    [ Roact.Children ]: children
}: CharacterPortraitProps3D) =>
{
    const viewportFrame = useRef<ViewportFrame>();
    const [viewportCamera, setViewportCamera] = useState<Camera | undefined>();

    useMountEffect(() =>
    {
        const characterModelClone = Character.Model.Clone();
        if (!characterModelClone.Humanoid.FindFirstChildWhichIsA("Animator"))
        {
            Make("Animator", {
                Parent: characterModelClone.Humanoid,
            });
        }

        const worldModel = Make("WorldModel", {
            Name: `World${Character.Name}`,
            Parent: viewportFrame.getValue(),
            Children: [
                characterModelClone
            ]
        });

        characterModelClone.PivotTo(
            new CFrame(
                new CFrame().ToObjectSpace(CameraFocus.CFrame).Position
            ).mul(
                CFrame.lookAt(
                    Vector3.zero,
                    Vector3.FromNormalId(Facing)
                )
            ));

        setViewportCamera(Make("Camera", {
            CameraType: Enum.CameraType.Scriptable,
            CFrame: CFrame.lookAt(Vector3.zero, Vector3.FromNormalId(CameraDirection))
                .mul(CameraOffset.add(new Vector3(0, 0, CameraOffset.Z*-2)))
                .add(characterModelClone.GetPivot().Position),
            Parent: viewportFrame.getValue(),
        }));
    });

    return (
        <textbutton
            Text={""}
            TextTransparency={1}
            BackgroundTransparency={1}
            RichText={false}
            Event={{
                MouseButton1Down: () => OnClick(Character),
            }}
        >
            <viewportframe
                Size={UDim2.fromScale(1,1)}
                BackgroundColor3={new Color3(1,1,1)}
                BorderColor3={new Color3()}
                CurrentCamera={viewportCamera}
                Ref={viewportFrame}
            >
                <uigradient
                    Transparency={new NumberSequence(0,0.5)}
                    Rotation={-90}
                />

                {children}
            </viewportframe>
        </textbutton>
    );
});

function CharacterItem({Character, Selected, LockedIn, Locked, Image, OnSelected}: CharacterItemProps)
{
    const strokeRef = useRef<UIStroke>();

    const _interior = (
        <>
            <uicorner
                CornerRadius={new UDim(0.1,0)}
            />
            <uistroke
                Ref={strokeRef}
                ApplyStrokeMode={Enum.ApplyStrokeMode.Contextual}
                Color={
                    LockedIn
                        ? new Color3(0,1,0.3)
                        : Selected
                            ? new Color3(1,0.2,0.3)
                            : new Color3(0.1,0.1,0.1)
                }
                Transparency={0.7}
            />
        </>
    );

    useEffect(() =>
    {
        const currentUIStroke = strokeRef.getValue();
        if (currentUIStroke && (LockedIn || Selected))
        {
            let totalRuntime = 0;
            const runserviceEvent = RunService.RenderStepped.Connect((dt) =>
            {
                totalRuntime += LockedIn ? dt * 3 : dt * 1.5;
                currentUIStroke.Thickness = math.abs(math.sin(totalRuntime) * 3);
            });

            return () => runserviceEvent.Disconnect();
        }


    }, [strokeRef.getValue(), LockedIn]);

    return Image
    ? (
        <imagebutton
            BackgroundTransparency={0.2}
            BackgroundColor3={ new Color3(0.1,0.1,0.1)}
            ZIndex={100}
            Image={Image}
            Event={{
                MouseButton1Down: (() => OnSelected?.(Character))
            }}
        >
            {_interior}
        </imagebutton>
    )
    : (
        <CharacterPortrait3D
            Character={Character}
            OnClick={OnSelected}
        >
            {_interior}
        </CharacterPortrait3D>
    );
}

export default withHooks(CharacterItem);