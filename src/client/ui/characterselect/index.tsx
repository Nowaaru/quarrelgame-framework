import Roact from "@rbxts/roact";
import { useState, withHooks } from "@rbxts/roact-hooked";
import { Character } from "shared/util/character";
import CharactersList from "shared/data/character";
import CharacterItem from "./characteritem";
import Gio from "shared/data/character/gio";
import Object from "@rbxts/object-utils";

export interface CharacterSelectProps {
    Characters: ReadonlyMap<string, Character.Character>,
}

export const ChainsImage = "rbxassetid://137751994";

export const DotsImage = "rbxassetid://4376776276";

function CharacterSelect(characterSelectProps: CharacterSelectProps = {Characters: CharactersList})
{
    const { Characters } = characterSelectProps ?? { Characters: CharactersList };
    const [selectedCharacter, setSelectedCharacter] = useState<Character.Character | undefined>();

    const chains = <imagelabel
        Image={ChainsImage}
        BackgroundTransparency={1}
        ImageColor3={new Color3(0,0,0)}
        ImageTransparency={0.8}
        ResampleMode={Enum.ResamplerMode.Pixelated}
        ScaleType={Enum.ScaleType.Tile}
        TileSize={new UDim2(0,32,0,32)}
        Size={new UDim2(1,0,1,0)}
        ZIndex={-1}
    />;

    const dots = <imagelabel
        BackgroundTransparency={1}
        Image={DotsImage}
        ImageColor3={new Color3(0,0,0)}
        ImageTransparency={0.8}
        ResampleMode={Enum.ResamplerMode.Pixelated}
        ScaleType={Enum.ScaleType.Tile}
        TileSize={new UDim2(0,32,0,32)}
        Size={new UDim2(1,0,1,0)}
        ZIndex={-2}
    />;


    return <>
        <canvasgroup
            Key={"CharacterFrame"}
            BackgroundTransparency={1}
            BorderColor3={new Color3()}
            BorderSizePixel={0}
            BackgroundColor3={new Color3(1,1,1)}
            Size={new UDim2(1,0,1,0)}
            Position={new UDim2(0,0,0,0)}
            ZIndex={1}
        >
            <frame
                Key={"CharacterContainer"}
                BackgroundColor3={Color3.fromRGB(50,50,50)}
                BackgroundTransparency={0.2}
                AnchorPoint={new Vector2(0.5,0)}
                Position={new UDim2(0.5,0,0.75,0)}
                Size={new UDim2(1.01,0,0.3,0)}
                ZIndex={1}
            >
                <uicorner
                    CornerRadius={new UDim(0.1,0)}
                />
                <uistroke
                    Color={new Color3(1,1,1)}
                    Thickness={2}
                    Transparency={0.7}
                    ApplyStrokeMode={Enum.ApplyStrokeMode.Contextual}
                />
                {chains}
                <frame
                    Key={"CharacterList"}
                    BackgroundTransparency={1}
                    AnchorPoint={new Vector2(0.5,0)}
                    Position={new UDim2(0.5,0,0,0)}
                    Size={new UDim2(0.75,0,1,0)}
                    ZIndex={1}
                >
                    <uiaspectratioconstraint />
                    <uigridlayout />
                    <uipadding
                        PaddingBottom={new UDim(0,8)}
                        PaddingTop={new UDim(0,8)}
                    />
                    {(() =>
                    {
                        const allCharacters: Roact.Element[] = [];
                        for (const [,character] of Characters)
                        {
                            allCharacters.push(
                                <CharacterItem
                                    Character={character}
                                    Selected={selectedCharacter === character}
                                    OnSelected={(selectedCharacter) =>
                                    {
                                        setSelectedCharacter(selectedCharacter);
                                    }}
                                />
                            );
                        }

                        return allCharacters;
                    })()}
                </frame>
            </frame>
        </canvasgroup>
    </>;
}

export default withHooks(CharacterSelect);