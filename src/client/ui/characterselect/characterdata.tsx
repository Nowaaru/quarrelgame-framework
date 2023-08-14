/* eslint-disable @typescript-eslint/no-array-constructor */
import Roact, { JsxInstance } from "@rbxts/roact";
import { Character } from "shared/util/character";

export enum CharacterDataAlignment {
    Left = 1,
    Right = -1
}

export interface CharacterDataProps {
    Character: Character.Character,
    Alignment?: CharacterDataAlignment
    Color?: Color3,

    Position?: UDim2,
    Rotation?: number
}

function CharacterData({
    Character: ChosenCharacter,
    Alignment = CharacterDataAlignment.Left,
    Color = new Color3(0.68,0.49,0.79),
    Position = UDim2.fromScale(0,0.565),
    Rotation
}: CharacterDataProps)
{
    return (
        <frame
            key={"CharacterData"}
            BackgroundColor3={new Color3(0.1,0.1,0.1)}
            BackgroundTransparency={0.15}
            BorderSizePixel={0}
            Size={new UDim2(0.325,0,0.15,0)}
            Position={Position}
            Rotation={Rotation}
            ZIndex={250}
        >
            <frame
                key={"CharacterTitle"}
                Size={new UDim2(0.75,0,0.675,0)}
                Position={new UDim2(0.235, 0, -0.53, 0)}
                BackgroundColor3={Color3.fromRGB(145,0,0)}
                BorderSizePixel={0}
                ZIndex={2}
            >
                <imagelabel
                    BackgroundTransparency={1}
                    Image={"rbxassetid://4376776276"}
                    ImageColor3={new Color3(1,1,1)}
                    ImageTransparency={0.95}
                    ResampleMode={Enum.ResamplerMode.Pixelated}
                    ScaleType={Enum.ScaleType.Tile}
                    TileSize={new UDim2(0,8,0,8)}
                    Size={new UDim2(1,0,1,0)}
                    ZIndex={-2}
                />
                <textlabel
                    key={"CharacterName"}
                    Text={ChosenCharacter.Name.upper()}
                    BackgroundTransparency={1}
                    Size={new UDim2(1,0,0.65,0)}
                    Font={Enum.Font.Antique}
                    TextColor3={new Color3(1,1,1)}
                    TextScaled
                >
                    <uipadding
                        PaddingLeft={new UDim(0.1,0)}
                        PaddingRight={new UDim(0.1,0)}
                        PaddingBottom={new UDim(0.1,0)}
                        PaddingTop={new UDim(0.1,0)}
                    />
                </textlabel>
                <frame
                    key={"SubContainer"}
                    Size={new UDim2(1,0,0.35,0)}
                    Position={new UDim2(0,0,0.60,0)}
                    BackgroundTransparency={1}
                    BackgroundColor3={new Color3(1,1,1)}
                    BorderSizePixel={0}
                >
                    <frame
                        key={"EaseOfUse"}
                        Size={new UDim2(0.45,0,0.8,0)}
                        Position={new UDim2(0.525, 0, 0.5, 1)}
                        AnchorPoint={new Vector2(0,0.5)}
                        BackgroundTransparency={1}
                    >
                        <frame
                            key={"EaseOfUseStars"}
                            AnchorPoint={new Vector2(0,0.5)}
                            Position={new UDim2(0.45,0,0.5,0)}
                            Size={new UDim2(0.55,0,1,0)}
                            BackgroundColor3={new Color3(1,1,1)}
                            BackgroundTransparency={1}
                        >
                            {(new Array(Character.MaximumEaseOfUse, -1)).map<Roact.Element>((_,i) => <imagelabel
                                BackgroundTransparency={1}
                                ImageColor3={i < ChosenCharacter.EaseOfUse ? new Color3(0.85,0.85,0.4) : new Color3()}
                                Image={"rbxassetid://3057073083"}
                                BorderSizePixel={0}
                            />)}

                            <uigridlayout
                                CellSize={new UDim2(0,12,0,12)}
                                CellPadding={new UDim2(0,2,0,0)}
                                FillDirection={Enum.FillDirection.Horizontal}
                                HorizontalAlignment={Enum.HorizontalAlignment.Center}
                                VerticalAlignment={Enum.VerticalAlignment.Center}
                                StartCorner={Enum.StartCorner.TopLeft}
                            />
                        </frame>
                        <textlabel
                            Text={"Ease of Use"}
                            Font={Enum.Font.SpecialElite}
                            AnchorPoint={new Vector2(0.5,0.5)}
                            Position={new UDim2(0.25,0,0.5,1)}
                            BackgroundTransparency={1}
                        />
                        <uistroke
                            ApplyStrokeMode={Enum.ApplyStrokeMode.Border}
                            LineJoinMode={Enum.LineJoinMode.Bevel}
                            Color={new Color3(0.1,0.1,0.1)}
                            Thickness={2}
                            Transparency={0.5}
                        />
                    </frame>
                </frame>
            </frame>
            <textlabel
                Text={"You won't be laughing when he kills you.".gsub("(%s%w)", (v) => v.upper())[ 0 ].gsub("^(%w)", (v) => v.upper())[ 0 ].gsub("%.$", "")[ 0 ]}
                AutomaticSize={Enum.AutomaticSize.XY}
                BackgroundTransparency={1}
                Position={new UDim2(0.5,-4,0.35,0)}

                TextXAlignment={Enum.TextXAlignment.Right}
                TextColor3={new Color3(0.8,0.8,0.8)}
                TextSize={8}
                ZIndex={450}
            />
            <textlabel
                Text={"THE PEEPEE POOPOO MAN"}
                BackgroundTransparency={1}
                Position={new UDim2(1,-4,0.55,0)}

                TextColor3={new Color3(0.8,0.8,0.8)}
                TextXAlignment={Enum.TextXAlignment.Right}
                TextSize={16}
                ZIndex={450}
            />

            <frame
                BackgroundColor3={new Color3(0.25,0.25,0.25)}
                Size={new UDim2(0.125,0,1,0)}
                BorderSizePixel={0}
                Position={new UDim2(1 * Alignment,0,0,0)}
            >
                <textlabel
                    Text={ChosenCharacter.Archetype}
                    TextColor3={Color}
                    Rotation={90 * Alignment}
                    BackgroundTransparency={1}
                    Size={new UDim2(1,0,1,0)}
                    TextSize={15}
                    FontFace={
                        new Font(
                            "rbxasset://fonts/families/SpecialElite.json",
                            Enum.FontWeight.Bold,
                            Enum.FontStyle.Normal
                        )
                    }
                />
            </frame>
            <imagelabel
                BackgroundTransparency={1}
                Image={"rbxassetid://4376776276"}
                ImageColor3={new Color3(0,0,0)}
                ImageTransparency={0.95}
                ResampleMode={Enum.ResamplerMode.Pixelated}
                ScaleType={Enum.ScaleType.Tile}
                TileSize={new UDim2(0,8,0,8)}
                Size={new UDim2(1,0,1,0)}
                ZIndex={-2}
            />
        </frame>
    );
}

export default CharacterData;