import Roact, { useMemo } from "@rbxts/roact";
export interface HealthProps
{
    Health?: number;
    MaxHealth?: number;

    TestRandomizeProps?: boolean;
    Position?: UDim2;
    Size?: UDim2;
}

export default function Health({
    Health = 100,
    MaxHealth = 100,

    TestRandomizeProps = false,
    Position = new UDim2(),
    Size = UDim2.fromScale(0.5, 1),
}: HealthProps)
{
    const randomInstance = useMemo(() => new Random(), [TestRandomizeProps]);
    if (TestRandomizeProps)
    {
        MaxHealth = randomInstance.NextNumber(0, 100);
        Health = randomInstance.NextNumber(0, MaxHealth);
    }

    return (
        <frame
            Key="Health"
            Size={Size}
            Position={Position}
            BackgroundTransparency={1}
        >
            <textlabel
                Key="HealthText"
                Text="Health"
                Size={UDim2.fromScale(0.5, 0.25)}
                Position={UDim2.fromScale(0.025, 0.6)}
                FontFace={new Font(
                    Enum.Font.ArialBold.Name,
                    Enum.FontWeight.Bold,
                    Enum.FontStyle.Italic,
                )}
                TextXAlignment={Enum.TextXAlignment.Left}
                FontSize={Enum.FontSize.Size48}
                TextColor3={new Color3(1, 1, 1)}
                BackgroundTransparency={1}
                TextTransparency={1 - (Health / MaxHealth)}
            />
            <textlabel
                key="HealthAmount"
                Text={`${tostring(math.floor((Health / MaxHealth) * 100))}%`}
                Size={UDim2.fromScale(0.5, 0.25)}
                Position={UDim2.fromScale(math.clamp(Health / MaxHealth, 0.4, 0.85), 0.63)}
                FontFace={new Font(
                    Enum.Font.ArialBold.Name,
                    Enum.FontWeight.Bold,
                    Enum.FontStyle.Italic,
                )}
                TextXAlignment={Enum.TextXAlignment.Left}
                FontSize={Enum.FontSize.Size36}
                TextColor3={new Color3(1, 1, 1)}
                BackgroundTransparency={1}
                TextTransparency={1 - (Health / MaxHealth)}
            />
            <frame
                Key="HealthBack"
                Size={UDim2.fromScale(1, 0.125)}
                Position={UDim2.fromScale(0, 1)}
                BorderSizePixel={0}
                BackgroundTransparency={0}
            >
                <frame
                    Size={UDim2.fromScale(Health / MaxHealth, 1)}
                    key="HealthFront"
                    BackgroundColor3={new Color3(0.53, 0.87, 0.64)}
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
