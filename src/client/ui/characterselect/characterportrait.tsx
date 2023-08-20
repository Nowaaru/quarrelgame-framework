import Roact, { useRef, useState, useEffect, useMemo, useLayoutEffect } from "@rbxts/roact";
import { Animation } from "shared/util/animation";
import { Character } from "shared/util/character";
import { EntityState } from "shared/util/lib";

import Make from "@rbxts/make";
import { Animator } from "shared/components/animator.component";
import { Components } from "@flamework/components";
import { Dependency } from "@flamework/core";

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

const { Animation: AnimationClass } = Animation;
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
    const [characterModel, setCharacterModel] = useState<Character.Character["Model"] | undefined>();
    const [worldModel, setWorldModel] = useState<WorldModel>();

    const viewportClone = useMemo(() =>
    {
        return new Promise<Character.Character["Model"] | void>((res) =>
        {
            if (characterModel && worldModel)
            {
                if (!worldModel.FindFirstChild(characterModel.Name))
                {
                    const newCharacterModel = characterModel.Clone();
                    newCharacterModel.Parent = worldModel;

                    return res(newCharacterModel);
                }
            }

            return res();
        });

    }, [characterModel, worldModel, viewportFrame?.current]);

    useEffect(() =>
    {
        assert(Character, "character is not defined");
        if (!characterModel || Character.Model !== characterModel)
        {
            const newWorldModel = Make("WorldModel", {
                Name: `World${Character.Name}`,
                Parent: viewportFrame.current,
            });

            setWorldModel(() =>
            {
                worldModel?.Destroy();

                return newWorldModel;
            });

            return setCharacterModel(Character.Model);
        }
        viewportClone.then((characterModelClone) =>
        {
            if (!characterModelClone)

                return print('no character model clone');

            print("has character model clone");

            if (!characterModelClone.Humanoid.FindFirstChildWhichIsA("Animator"))
            {
                Make("Animator", {
                    Parent: characterModelClone.Humanoid,
                });
            }

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
        });
    }, [Character, characterModel, worldModel, viewportCamera, viewportFrame.current, viewportClone]);

    useEffect(() =>
    {
        viewportClone.then(() =>
        {

            if (!characterModel?.Parent)

                return;

            setViewportCamera(Make("Camera", {
                CameraType: Enum.CameraType.Scriptable,
                CFrame: CFrame.lookAt(Vector3.zero, Vector3.FromNormalId(CameraDirection))
                    .mul(CameraOffset.add(new Vector3(0, 0, CameraOffset.Z*-2)))
                    .add(characterModel.GetPivot().Position),
                Parent: viewportFrame.current,
            }));
        });
    }, [characterModel]);

    useLayoutEffect(() =>
    {
        viewportClone.then((characterModelClone) =>
        {
            if (!characterModelClone?.Parent)

                return print("no character model parent");

            characterModelClone.SetAttribute("CharacterId", Character.Name);
            if (Animation !== undefined)
            {
                let animationData: Animation.AnimationData | undefined = undefined;
                if (!typeIs(Animation, "table") && Animation in Character.Animations)

                    animationData = Character.Animations[ Animation as keyof typeof Character.Animations ] as Animation.AnimationData;

                else if (typeIs(Animation, "table"))

                    animationData = Animation;

                if (animationData)
                {
                    const components = Dependency<Components>();
                    const thisViewportFrame = viewportFrame.current;
                    new AnimationClass(
                        components.getComponent(characterModelClone, Animator.Animator) ?? components.addComponent(characterModelClone, Animator.Animator),
                        animationData
                    ).Play({
                        FadeTime: 0,
                        Preload: true,
                    })
                        .then(() =>
                        {
                            if (viewportFrame.current && viewportFrame.current === thisViewportFrame)

                                viewportFrame.current!.Visible = true;
                        });
                }

            }
        });
    }, [characterModel, Animation, viewportClone]);

    return (
        <textbutton
            Text={""}
            Size={new UDim2(1,0,1,0)}
            TextTransparency={1}
            BackgroundTransparency={1}
            RichText={false}
            Event={{
                MouseButton1Down: () =>
                {
                    print("on click called");
                    OnClick?.(Character);
                },
            }}
        >
            <viewportframe
                Size={UDim2.fromScale(1,1)}
                BackgroundColor3={new Color3(0,0,0)}
                BorderColor3={new Color3(0,0,0)}
                CurrentCamera={viewportCamera}
                BackgroundTransparency={1}
                Visible={Animation ? false : true}
                ref={viewportFrame}
            >
                {children}
            </viewportframe>
        </textbutton>
    );
}