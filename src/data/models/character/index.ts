import { CharacterRigR6 as CharacterRigR6_ } from "@rbxts/promise-character";
type CharacterRigR6 = CharacterRigR6_ & { PrimaryPart: BasePart, Humanoid: CharacterRigR6_["Humanoid"] & { Animator: Animator}}

export enum CharacterRigType {
    Raw,
    HumanoidDescription
}

export interface CharacterModel {
    jane: CharacterRigR6,
    roblox: CharacterRigR6,
    shedletsky: CharacterRigR6,
    dusek: CharacterRigR6,
    brighteyes: CharacterRigR6,
    death: CharacterRigR6,
}

export default script as defined as CharacterModel;