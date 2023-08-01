import { Controller, OnStart, OnInit } from "@flamework/core";
import { OnKeyboardInput } from "./keyboard.controller";
import { InputMode, InputResult } from "shared/utility/input";

@Controller({})
export class CombatController implements OnStart, OnInit, OnKeyboardInput
{
    onInit()
    {

    }

    onKeyboardInput(buttonPressed: Enum.KeyCode, inputMode: InputMode): boolean | InputResult | (() => boolean | InputResult)
    {
        return false;
    }

    onStart()
    {

    }
}