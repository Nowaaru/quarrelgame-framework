import { StarterGui } from "@rbxts/services";
import { story } from "shared/util/story";

import CharacterData, { CharacterDataProps } from "client/ui/characterselect/characterdata";
import Characters from "shared/data/character";

export = story<CharacterDataProps>({
    component: CharacterData,
    props: {
        Character: Characters.get("Leorio Sigmastare")!,
    },
});
