import { RunService } from "@rbxts/services";

export = (
    mainModel: Model,
    replicatedInstances: BasePart[],
    sharedTable: SharedTable,
) =>
{
    replicatedInstances.forEach((replicatedInstance) =>
    {
        const mainInstance = mainModel[
            replicatedInstance.Name as keyof typeof mainModel
        ] as BasePart;
        replicatedInstance.CFrame = mainInstance.CFrame;
    });
};
