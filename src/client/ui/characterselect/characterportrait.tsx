import Roact, { useRef, useState, useEffect } from "@rbxts/roact";
import { Animation } from "shared/util/animation";
import { Character } from "shared/util/character";
import { EntityState } from "shared/util/lib";

import Make from "@rbxts/make";

export interface CharacterDisplayProps {
    Character: Character.Character,
    Facing?: Enum.NormalId,
    CameraFocus?: BasePart,
    CameraDirection?: Enum.NormalId,
    CameraOffset?: CFrame,

    Animation?: EntityState | Animation.AnimationData,
}
export interface CharacterPortraitProps3D extends CharacterDisplayProps {
    OnClick?: (selectedCharacter: CharacterPortraitProps3D["Character"]) => void,
    [Roact.Children]?: JSX.Element[]
}

export default function CharacterPortrait3D({
    Character,
    Facing = Enum.NormalId.Front,
    CameraFocus = Character.Model.PrimaryPart,
    CameraDirection = Enum.NormalId.Back,
    CameraOffset = new CFrame(0,1.5,-2),
    OnClick,

    Animation,
    [ Roact.Children ]: children
}: CharacterPortraitProps3D)
{
    const viewportFrame = useRef<ViewportFrame>();
    const [viewportCamera, setViewportCamera] = useState<Camera | undefined>();

    useEffect(() =>
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
            Parent: viewportFrame.current,
        });

        characterModelClone.Parent = worldModel;
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
            Parent: viewportFrame.current,
        }));

        if (Animation !== undefined)
        {
            let animationData: Animation.AnimationData | undefined = undefined;
            if (!typeIs(Animation, "table") && Animation in Character.Animations)

                animationData = Character.Animations[ Animation as keyof typeof Character.Animations ] as Animation.AnimationData;

            else if (typeIs(Animation, "table"))

                animationData = Animation;

            print("animation data:", animationData);

            if (animationData)
            {
                const idleAnimation = characterModelClone.Humanoid.Animator!.LoadAnimation(Make("Animation", {
                    AnimationId: animationData.assetId,
                }));

                task.wait(0.25);
                print("idle animation length:", idleAnimation.Length);

                idleAnimation.Priority = Enum.AnimationPriority.Action;
                idleAnimation.Looped = true;
                idleAnimation.Play();

                task.wait(0.25);
                print(idleAnimation.IsPlaying);
            }
        }
    }, [Character]);

    return (
        <textbutton
            Text={""}
            Size={new UDim2(1,0,1,0)}
            TextTransparency={1}
            BackgroundTransparency={1}
            RichText={false}
            Event={{
                MouseButton1Down: () => OnClick?.(Character),
            }}
        >
            <viewportframe
                Size={UDim2.fromScale(1,1)}
                BackgroundColor3={new Color3(1,1,1)}
                BorderColor3={new Color3()}
                CurrentCamera={viewportCamera}
                ref={viewportFrame}
            >
                <uigradient
                    Transparency={new NumberSequence(0,0.5)}
                    Rotation={-90}
                />

                {children}
            </viewportframe>
        </textbutton>
    );
}