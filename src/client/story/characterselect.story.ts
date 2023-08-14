import { StarterGui } from "@rbxts/services";
import CharacterSelect, { CharacterSelectProps } from "client/ui/characterselect";
import Characters from "shared/data/character";
import { story } from "shared/util/story";

export = story<CharacterSelectProps>({
    component: CharacterSelect,
    props: { Characters },
    target: StarterGui.WaitForChild("TestGui")
})