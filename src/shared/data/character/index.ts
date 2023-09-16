import { Character } from "shared/util/character";

const scriptChildren = script.GetChildren();
let failedScript: Instance | undefined = undefined;

assert(
    scriptChildren.every((n) => (n.IsA("ModuleScript") ? true : (failedScript = n) === n ? false : true)),
    `instance ${failedScript} is not a ModuleScript (type ${typeOf(failedScript)}).`,
);
const Characters = new ReadonlyMap<string, Character.Character>(
    (scriptChildren as ModuleScript[]).map((v) => require(v) as Character.Character).map((n) => [n.Name, n]),
);

export default Characters;
