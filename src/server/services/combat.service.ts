import { Service, OnStart, OnInit, Dependency } from "@flamework/core";
import { QuarrelGame } from "./quarrelgame.service";

import { PhysicsEntity, PhysicsAttributes } from "server/components/physicsentity.component";
import { ServerFunctions } from "shared/network";
import { Workspace } from "@rbxts/services";
import { Components } from "@flamework/components";

export class KnockbackInstance
{
    constructor(targetInstance: PhysicsEntity<PhysicsAttributes, Model & { PrimaryPart: Instance }>)
    {
        print("Physics Attribute for model ");
    }
}

@Service({
    loadOrder: 1,
    })
export class CombatService implements OnStart, OnInit
{
    constructor(private readonly quarrelGame: QuarrelGame)
    {}

    onInit()
    {
        this.globalAttachmentOrigin.Anchored = true;
        this.globalAttachmentOrigin.Transparency = 1;
        this.globalAttachmentOrigin.CanQuery = false;
        this.globalAttachmentOrigin.CanCollide = false;
        this.globalAttachmentOrigin.Parent = Workspace;
        this.globalAttachmentOrigin.Name = "Global Attachment Origin";
    }

    onStart()
    {
        // setup events
        const components = Dependency<Components>();
        ServerFunctions.KnockbackTest.setCallback(async (player) =>
        {
            assert(player.Character, "player has not spawned");
            assert(this.quarrelGame.IsParticipant(player), "player is not a participant");

            const participantItem = this.quarrelGame.GetParticipant(player.Character)!;
            const physicsEntity = components.getComponent(participantItem.character!, PhysicsEntity);

            assert(physicsEntity, "physics entity not found");

            const newImpulse = physicsEntity.ConstantImpulse(physicsEntity.CFrame().add(physicsEntity.Backward().mul(25)).Position, 3);
            newImpulse.Apply();

            return true;
        });
    }

    public ApplyImpulse(impulseTarget: Model)
    {

    }

    public readonly globalAttachmentOrigin = new Instance("Part");
}
