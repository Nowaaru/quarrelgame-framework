import Roact, { useMemo } from "@rbxts/roact";

export interface StaminaProps
{
    Stamina?: number;
    MaxStamina?: number;

    TestRandomizeProps?: boolean;
    Position?: UDim2;
    Size?: UDim2;
}

export default function Stamina({
    Stamina = 100,
    MaxStamina = 100,

    TestRandomizeProps = false,
    Position = UDim2.fromScale(1, 0),
    Size = UDim2.fromScale(0.5, 1),
}: StaminaProps)
{
    const randomInstance = useMemo(() => new Random(), [TestRandomizeProps]);

    if (TestRandomizeProps)
    {
        MaxStamina = randomInstance.NextNumber(0, 100);
        Stamina = randomInstance.NextNumber(0, MaxStamina);
    }

    return (
        <frame
            Key="Stamina"
            Size={Size}
            Position={Position}
            BackgroundTransparency={1}
            AnchorPoint={new Vector2(1, 0)}
        >
            <textlabel
                Key="StaminaText"
                Text="Stamina"
                Size={UDim2.fromScale(0.5, 0.25)}
                Position={UDim2.fromScale(0.5, 0.6)}
                FontFace={new Font(
                    Enum.Font.ArialBold.Name,
                    Enum.FontWeight.Bold,
                    Enum.FontStyle.Italic,
                )}
                TextXAlignment={Enum.TextXAlignment.Right}
                FontSize={Enum.FontSize.Size48}
                TextColor3={new Color3(1, 1, 1)}
                BackgroundTransparency={1}
            />
            <frame
                Key="StaminaBack"
                Size={UDim2.fromScale(1, 0.125)}
                Position={UDim2.fromScale(0, 1)}
                BorderSizePixel={0}
                BackgroundTransparency={0}
            >
                <frame
                    Size={UDim2.fromScale(Stamina / MaxStamina, 1)}
                    Position={UDim2.fromScale(1 - (Stamina / MaxStamina), 0)}
                    key="StaminaFront"
                    BackgroundColor3={new Color3(0.53, 0.87, 0.82)}
                >
                    <uicorner
                        CornerRadius={new UDim(1, 0)}
                    />
                </frame>
                <uicorner
                    CornerRadius={new UDim(1, 0)}
                />
            </frame>
        </frame>
    );
}
