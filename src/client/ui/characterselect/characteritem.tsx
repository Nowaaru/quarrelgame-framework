import Roact from "@rbxts/roact";
import Make from "@rbxts/make";

import { useEffect, useRef, useState } from "@rbxts/roact";
import { RunService } from "@rbxts/services";
import { Character } from "shared/util/character";
import { EntityState } from "shared/util/lib";
import { Animation } from "shared/util/animation";
import CharacterPortrait3D from "./characterportrait";

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

export default function CharacterItem({Character, Selected, LockedIn, Locked, Image, OnSelected}: CharacterItemProps)
{
    const strokeRef = useRef<UIStroke>();

    const _interior = (
        <>
            <uicorner
                CornerRadius={new UDim(0.1,0)}
            />
            <uistroke
                ref={strokeRef}
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
        const currentUIStroke = strokeRef.current;
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


    }, [strokeRef.current, LockedIn, Selected]);

    return Image
    ? (
        <imagebutton
            BackgroundTransparency={0.2}
            BackgroundColor3={ new Color3(0.1,0.1,0.1)}
            ZIndex={100}
            Image={Image}
            Event={{
                MouseButton1Down: (async () => OnSelected?.(Character))
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