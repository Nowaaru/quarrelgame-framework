import { Dependency, Modding, OnRender, OnStart } from "@flamework/core";
import { Keyboard, OnKeyboardInput } from "./keyboard.controller";
import { Client } from "./client.controller";
import { CharacterController } from "client/module/character";
import { ClientFunctions } from "shared/network";
import { NullifyYComponent } from "shared/util/lib";

import * as input from "shared/util/input";
export import Input = input.Input;
export import Motion = input.Motion;
import { MatchController } from "./match.controller";
import { UserInputService } from "@rbxts/services";
import { CombatController } from "client/module/combat";
import { CharacterSelectController } from "./characterselect.controller";

export interface MotionInputHandling
{
    onMotionInputChanged?(motionInput: input.MotionInput): void;
    onMotionInputTimeout?(motionInput: input.MotionInput): void;
}

/*
 * Motion Input Purge Mode.
 */
enum MotionInputPurgeMode 
{
    /*
     * Every timeout, remove
     * every item in the input
     * sequence.
     */
    ALL,
    /* 
     * Every timeout, remove
     * the earliest entry
     * in the input sequence.
     */
    TAIL
}

export class NewMotionInputController<T extends CharacterController> implements OnStart, OnRender, OnKeyboardInput, MotionInputHandling
{
    public static PurgeMode: MotionInputPurgeMode = MotionInputPurgeMode.TAIL;

    protected readonly currentMotion: Array<Motion | Input> = [];

    protected readonly normalMap: ReadonlyMap<Enum.KeyCode, Enum.NormalId>;

    protected readonly motionInputEventHandlers: Set<MotionInputHandling> = new Set([this]);

    protected combatController?: CombatController;

    constructor(protected characterController: T, private matchController: MatchController = Dependency<MatchController>())
    {
        this.normalMap = this.characterController.GetKeybinds();
    }

    onKeyboardInput(buttonPressed: Enum.KeyCode, inputMode: input.InputMode): boolean | input.InputResult | (() => boolean | input.InputResult) 
    {
        const hasCharacterController = this.characterController.GetKeybinds().has(buttonPressed);
        const hasCombatController = this.combatController?.GetKeybinds().has(buttonPressed);
        if (buttonPressed === Enum.KeyCode.Backspace || buttonPressed === Enum.KeyCode.K)
        {
            this.currentMotion.clear();
            return input.InputResult.Success;
        } 

        // if (this.currentMotion.size() <= 0)
        // {
         // }

        /* TODO: support charge inputs */

        const arena = this.matchController.GetCurrentArena();
        if (!arena)

            return input.InputResult.Fail;


        if (hasCharacterController || (hasCombatController && this.currentMotion.size() === 0)) // allow refilling input in-case motion was executed (e.g. DP into crouch)
        {
            // if (inputMode !== input.InputMode.Release && this.currentMotion.size() !== 0)
            // {
            //     return input.InputResult.Fail;
            // }

            const motionNormal = this.GetMotionDirection(arena.config.Origin.Value);// this.characterController.GetKeybinds().get(buttonPressed);
            const outMotion = Motion[input.ConvertMoveDirectionToMotion(motionNormal)[0]];
            this.currentMotion.push(outMotion);

            const currentMotion = [ ... this.currentMotion ];
            for (const listener of this.motionInputEventHandlers)

                task.spawn(() => listener.onMotionInputChanged?.(currentMotion));
        }

        if (hasCombatController)
        {
            const keyInput = this.combatController!.GetKeybinds();
            if (inputMode === input.InputMode.Press)
            {
                this.currentMotion.push(keyInput.get(buttonPressed)!);
                this.SubmitMotionInput();
            }
        }

        return input.InputResult.Success;
    }

    public async SubmitMotionInput(): Promise<boolean>
    {
        const Characters = Dependency<CharacterSelectController>().characters;
        const characterId = this.characterController.GetCharacter()?.GetAttribute("CharacterId") as string;
        const foundCharacter = Characters.get(characterId);

        if (!foundCharacter)

            return new Promise((_, rej) => rej(false));

        const currentMotion = [ ...this.currentMotion ];
        const decompiledAttacks = [...foundCharacter.Attacks]
        const matchingAttacks = decompiledAttacks.filter(([motionInput]) => 
        {
            let motionSet: input.MotionInput;
            if ( motionInput.includes(input.Motion.Neutral) ) 
            {
                const set = [ ... this.currentMotion ];
                if (set[0] !== input.Motion.Neutral)

                    set.unshift(input.Motion.Neutral); // make sure the motion starts with 5 if it doesn't already

                motionSet = set.filter((e, k, a) => !(a[k - 1] === input.Motion.Neutral && e === input.Motion.Neutral)); // remove duplicates
            }
            else

                motionSet = this.currentMotion.filter((e) => e !== input.Motion.Neutral); // filter all neutrals 

            if (motionSet.size() < motionInput.size())

                return;

                 
            if (motionSet.size() === 0)

                return;

            for (let i = motionInput.size() - 1; i >= 0; i--)

                if (motionInput[i] !== motionSet[motionSet.size() - (motionInput.size() - i)])

                    // print(`motion failed: ${motionInput[i]} !== ${motionSet[i]}`);
                    return false;


            // print(`motion passed: ${this.stringifyMotionInput(motionInput)} === ${this.stringifyMotionInput(motionSet)}`);
            return true;
        });
                 
        if (matchingAttacks.size() === 0)
        {
            warn(`No attacks found for ${this.stringifyMotionInput(this.currentMotion)}. Attacks list: ${decompiledAttacks.map(([motion, skill]) => `\n${this.stringifyMotionInput(motion)} => ${typeIs(skill, "function") ? skill().Name : skill.Name}`).reduce((e,a) => e + a, decompiledAttacks.size() === 0 ? "NONE" : "")}`)
        } else {
            if (matchingAttacks.size() === 1)

                task.spawn(() => ClientFunctions.SubmitMotionInput([... currentMotion ]));

            warn(`Matching attacks for ${this.stringifyMotionInput(this.currentMotion)}: ${matchingAttacks.map(([motion, skill]) => `\n${this.stringifyMotionInput(motion)} => ${typeIs(skill, "function") ? skill().Name : skill.Name}`).reduce((e,a) => e + a)}`)
        }

        this.currentMotion.clear();
        return true;
    }

    onStart(): void 
    {
        Modding.onListenerAdded<MotionInputHandling>((listener) => this.motionInputEventHandlers.add(listener));
        Modding.onListenerRemoved<MotionInputHandling>((listener) => this.motionInputEventHandlers.delete(listener));
    }

    private timeoutDeltaTime: number = 0;
    private motionInputTimeoutMaximum: number = 2;
    onRender(dt: number): void
    {
        if (this.timeoutDeltaTime >= this.motionInputTimeoutMaximum)
        {
            if (this.currentMotion.size() <= 2)
            {
                /* prevent command normals from being voided */
                this.timeoutDeltaTime = 0;
                return;
            }

            const currentMotion = [ ... this.currentMotion ];
            for (const listener of this.motionInputEventHandlers)
            { 
                task.defer(() => listener.onMotionInputTimeout?.(currentMotion));
                task.defer(() => listener.onMotionInputChanged?.(currentMotion));
            }

            switch (NewMotionInputController.PurgeMode)
            {
                case (MotionInputPurgeMode.TAIL):
                    this.currentMotion.shift();
                    break;

                default:
                    this.currentMotion.clear();
            }

            this.timeoutDeltaTime = 0;
            return;
        }

        if (this.currentMotion.size() > 0) 

            this.timeoutDeltaTime += dt;

        else this.timeoutDeltaTime = 0;
    }

    public GetMotionDirection(relativeTo: CFrame, fromKeys?: Enum.KeyCode[])
    {
        assert(this.characterController, "no character controller bound.");
        const keyboardDirectionMap = this.characterController.GetKeybinds();
        const keyboard = Dependency<Keyboard>();

        let totalVector = Vector3.zero;

        keyboardDirectionMap.forEach((normal, code) =>
        {
            if (keyboard.isKeyDown(code) || fromKeys?.includes(code))
            {
                const { Top, Bottom, Back: Left, Front: Right } = Enum.NormalId;
                const { character } = Dependency<Client>();
                if (character)
                {
                    const { LookVector } = character.GetPivot();
                    const facingUnit = NullifyYComponent(relativeTo.Position).Unit.Dot(NullifyYComponent(LookVector))
                    const isFacingAway = facingUnit > 0;

                    if (isFacingAway && ([ Left, Right ] as Enum.NormalId[]).includes(normal))
                    {
                        switch ( normal )
                        {
                            case Left:
                                normal = Right;
                                break;

                            case Right:
                                normal = Left;
                                break;
                        }
                    }

                    if (character.GetPivot().Y < relativeTo.Y && [ Top, Bottom ] as EnumItem[])
                    {
                        switch ( normal )
                        {
                            case Top:
                                normal = Bottom;
                                break;

                            case Bottom:
                                normal = Top;
                                break;
                        }
                    }
                }
                

                if (relativeTo)
                {
                    const vec = input.GenerateRelativeVectorFromNormalId(relativeTo, normal);
                    const vecOut = new Vector3(vec.Z, vec.Y, vec.X);
                    totalVector = totalVector.add(vecOut);
                }
                else
                {
                    const norm = Vector3.FromNormalId(normal);
                    const normOut = new Vector3(norm.Z, norm.Y, norm.X);
                    totalVector = totalVector.add(normOut);
                }
            }
        });

        return totalVector.Magnitude > 0 ? totalVector.Unit : totalVector;
    }
        
    public stringifyMotionInput(motionInput: input.MotionInput = this.currentMotion)
    {
        return motionInput.size() > 0 ? motionInput.map(tostring).reduce((acc, v) => `${acc}, ${v}`) : ""
    }

    onMotionInputChanged(motionInput: input.MotionInput)
    {
        print(`motion input changed: [${this.stringifyMotionInput(motionInput)}]`)
    }
}
