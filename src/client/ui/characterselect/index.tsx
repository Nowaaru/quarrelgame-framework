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

    const darken = (flipped?: boolean) => <frame
        Key="Darken"
        BackgroundColor3={new Color3(1,1,1)}
        Size={new UDim2(1,0,1,0)}
        ZIndex={-1}
    >
        <uigradient
            Rotation={flipped ? 0 : 180}
            Color={new ColorSequence(Color3.fromRGB(18,3,3))}
            Transparency={
                new NumberSequence([
                    new NumberSequenceKeypoint(0,1),
                    new NumberSequenceKeypoint(0.6,1),
                    new NumberSequenceKeypoint(1,0.45)
                ])
            }

        />
    </frame>;

    return <>
        <canvasgroup
            Key={"Detail"}
            BackgroundTransparency={1}
            Size={UDim2.fromScale(1,1)}
            ZIndex={-25}
        >
            <frame
                Key="FlavorTextContainer"
                Size={new UDim2(0.281,0,0.187,0)}
                AnchorPoint={new Vector2(0,0.5)}
                Position={new UDim2(0.35,0,0.5,0)}
                BackgroundTransparency={1}
            >
                <textlabel
                    Text="Select your character."
                    TextColor3={new Color3(0.6,0.6,0.6)}
                    TextSize={10}
                    BackgroundTransparency={1}
                    AnchorPoint={new Vector2(0,0.5)}
                    Position={new UDim2(0.1,0,0.15,0)}
                    AutomaticSize={Enum.AutomaticSize.XY}
                    FontFace={new Font(
                        "rbxasset://fonts/families/Roboto.json",
                        Enum.FontWeight.Thin,
                        Enum.FontStyle.Normal,
                    )}
                >
                    <uicorner
                        CornerRadius={new UDim(1,0)}
                    />
                    <uipadding
                        PaddingLeft={new UDim(0,8)}
                        PaddingRight={new UDim(0,8)}
                    />
                    <uistroke
                        ApplyStrokeMode={Enum.ApplyStrokeMode.Border}
                        Color={new Color3(0.6,0.6,0.6)}
                    />
                </textlabel>
                <textlabel
                    Text="CHARACTER"
                    TextColor3={new Color3(1,1,1)}
                    TextSize={48}
                    BackgroundTransparency={1}
                    AnchorPoint={new Vector2(0.5,0.5)}
                    Position={new UDim2(0.325,0,0.325,0)}
                    FontFace={new Font(
                        "rbxasset://fonts/families/Roboto.json",
                        Enum.FontWeight.Thin,
                        Enum.FontStyle.Normal,
                    )}
                />
                <textlabel
                    Text="∞"
                    TextColor3={new Color3(1,1,1)}
                    TextSize={84}
                    BackgroundTransparency={1}
                    AnchorPoint={new Vector2(0.5,0.5)}
                    Position={new UDim2(0.8,0,0.5,0)}
                    FontFace={new Font(
                        "rbxasset://fonts/families/Roboto.json",
                        Enum.FontWeight.Thin,
                        Enum.FontStyle.Normal,
                    )}
                />
                <textlabel
                    Text="SELECT"
                    TextColor3={new Color3(1,1,1)}
                    TextSize={48}
                    BackgroundTransparency={1}
                    AnchorPoint={new Vector2(0.5,0.5)}
                    Position={new UDim2(0.5,0,0.58,0)}
                    FontFace={new Font(
                        "rbxasset://fonts/families/Roboto.json",
                        Enum.FontWeight.Thin,
                        Enum.FontStyle.Normal,
                    )}
                />
            </frame>
            <canvasgroup
                Key={"DetailBack"}
                BackgroundTransparency={1}
                GroupColor3={Color3.fromRGB(116, 15, 0)}
                Size={UDim2.fromScale(1,1)}
                ZIndex={-250}
            >
                <canvasgroup
                    Key={"LeftRed"}
                    GroupColor3={new Color3(1,1,1)}
                    GroupTransparency={0}
                    Position={new UDim2(-0.35,0,-0.313,0)}
                    Rotation={15}
                    Size={new UDim2(0.5,0,2,0)}
                    ZIndex={100}
                >
                    {darken(true)}
                    {[chains, dots]}
                </canvasgroup>
                <canvasgroup
                    Key={"RightRed"}
                    GroupColor3={new Color3(1,1,1)}
                    GroupTransparency={0}
                    Position={new UDim2(0.763,0,-0.313,0)}
                    Rotation={15}
                    Size={new UDim2(0.5,0,2,0)}
                    ZIndex={100}
                >
                    {darken(false)}
                    {[chains, dots]}
                </canvasgroup>
                <canvasgroup
                    Key={"Shadows"}
                    Size={new UDim2(1,0,1,0)}
                    BackgroundTransparency={1}
                >
                    <frame
                        Key="Back"
                        BackgroundTransparency={0.6}
                        BackgroundColor3={new Color3(0,0,0)}
                        Position={new UDim2(0.5,0,0.5,0)}
                        Size={new UDim2(1,0,1,0)}
                        AnchorPoint={new Vector2(0.5,0.5)}
                        ZIndex={-1}
                    />
                    <frame
                        Key="L1"
                        BackgroundTransparency={0.6}
                        BackgroundColor3={new Color3(0,0,0)}
                        Position={new UDim2(-0.1,0,0.4,0)}
                        Size={new UDim2(1,0,2,0)}
                        AnchorPoint={new Vector2(0.5,0.5)}
                        ZIndex={2}
                        Rotation={10}
                    />
                    <frame
                        Key="R1"
                        BackgroundTransparency={0.6}
                        BackgroundColor3={new Color3(0,0,0)}
                        Position={new UDim2(1.183,0,0.57,0)}
                        Size={new UDim2(1,0,2,0)}
                        AnchorPoint={new Vector2(0.5,0.5)}
                        ZIndex={2}
                        Rotation={10}
                    />
                    <frame
                        Key="Top"
                        BackgroundTransparency={0.6}
                        BackgroundColor3={new Color3(0,0,0)}
                        Position={new UDim2(0.5,0,0.5,0)}
                        Size={new UDim2(1,0,1,0)}
                        AnchorPoint={new Vector2(0.5,0.5)}
                        ZIndex={3}
                    />
                </canvasgroup>
            </canvasgroup>
        </canvasgroup>
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