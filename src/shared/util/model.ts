import { ReplicatedStorage, Workspace } from "@rbxts/services";

export namespace Model {
    export function LoadModel(targetModel: Model): Model
    {
        const newModel = targetModel.Clone();
        newModel.Parent = Workspace;

        return newModel;
    }
}