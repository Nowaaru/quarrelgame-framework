import { useEffect, useState } from "@rbxts/roact";
import { Players } from "@rbxts/services";

import Roact from "@rbxts/roact";
import Health from "./health";
import Stamina from "./stamina";

export interface HudOptions
{
}

interface HealthTracker
{
    Health: number;
    MaxHealth: number;
}

interface StaminaTracker
{
    Stamina: number;
    MaxStamina: number;
}

export default function HeadsUpDisplay(props: HudOptions)
{
    const [playerCharacter, setCharacter] = useState<Model | undefined>(Players.LocalPlayer.Character);

    const [humanoidHealth, setHealth] = useState<HealthTracker>({
        Health: playerCharacter?.GetAttribute("Health") as number ?? 0,
        MaxHealth: playerCharacter?.GetAttribute("MaxHealth") as number ?? 0,
    });

    const [humanoidStamina, setStamina] = useState<StaminaTracker>({
        Stamina: playerCharacter?.GetAttribute("Stamina") as number ?? 0,
        MaxStamina: playerCharacter?.GetAttribute("MaxStamina") as number ?? 0,
    });

    useEffect(() =>
    {
        if (playerCharacter !== Players.LocalPlayer.Character)
        {
            setCharacter(Players.LocalPlayer.Character);
        }
    });

    useEffect(() =>
    {
        if (!playerCharacter)
        {
            return undefined;
        }

        const healthChangedHandler = () =>
        {
            setHealth({
                Health: playerCharacter.GetAttribute("Health") as number,
                MaxHealth: playerCharacter.GetAttribute("MaxHealth") as number,
            });
        };

        const staminaChangedHandler = () =>
        {
            setStamina({
                Stamina: playerCharacter.GetAttribute("Stamina") as number,
                MaxStamina: playerCharacter.GetAttribute("MaxStamina") as number,
            });
        };

        const healthChanged = playerCharacter.GetAttributeChangedSignal("Health").Connect(healthChangedHandler);
        const maxHealthChanged = playerCharacter.GetAttributeChangedSignal("MaxHealth").Connect(healthChangedHandler);

        const staminaChanged = playerCharacter.GetAttributeChangedSignal("Stamina").Connect(staminaChangedHandler);
        const maxStaminaChanged = playerCharacter.GetAttributeChangedSignal("MaxStamina").Connect(staminaChangedHandler);

        return () =>
        {
            healthChanged.Disconnect();
            maxHealthChanged.Disconnect();

            staminaChanged.Disconnect();
            maxStaminaChanged.Disconnect();
        };
    }, [playerCharacter]);

    return (
        <frame
            key={"Heads-Up Display"}
            BackgroundTransparency={1}
            AnchorPoint={new Vector2(0.5, 0)}
            Position={UDim2.fromScale(0.5, 0.85)}
            Size={UDim2.fromScale(0.95, 1 / 10)}
        >
            <Health
                Health={humanoidHealth.Health}
                MaxHealth={humanoidHealth.MaxHealth}
                Size={UDim2.fromScale(0.35, 1)}
            />
            <Stamina
                Stamina={humanoidStamina.Stamina}
                MaxStamina={humanoidStamina.MaxStamina}
                Size={UDim2.fromScale(0.35, 1)}
                Position={UDim2.fromScale(1, 0)}
            />
        </frame>
    );
}
