import { Controller, OnStart, OnInit } from "@flamework/core";
import { Keyboard, OnKeyboardInput } from "./keyboard.controller";
import { InputMode, InputResult } from "shared/utility/input";
import { Players } from "@rbxts/services";
import { GlobalFunctions } from "shared/network";
import { CameraController } from "./camera.controller";

const { client: ClientFunctions } = GlobalFunctions;

@Controller({})
export class Client implements OnStart, OnInit, OnKeyboardInput
{
    constructor(private readonly cameraController: CameraController)
    {}

    onInit()
    {

    }

    onStart()
    {

    }

    onKeyboardInput(buttonPressed: Enum.KeyCode, inputMode: InputMode): boolean | InputResult | (() => boolean | InputResult)
    {
        if (inputMode === InputMode.Release) return false;

        switch (buttonPressed)
        {
            case (Enum.KeyCode.R):
            {
                ClientFunctions.RespawnCharacter.invoke()
                    .then(() => print("Reloaded character."));

                break;
            }

            case (Enum.KeyCode.E):
            {
                print("the E button do work tho");
                ClientFunctions.KnockbackTest.invoke()
                    .then(() => warn("Knockback test initiated."))
                    .catch((e) => warn(`Knockback test failed: \n${e}`));

                break;
            }

            case (Enum.KeyCode.LeftControl):
            {
                this.cameraController.ToggleBattleCameraEnabled().catch((e) =>
                {
                    warn(e);
                    print(this.cameraController.PlayerModule);
                });
            }
        }

        return true;
    }

    private Player = Players.LocalPlayer;
}