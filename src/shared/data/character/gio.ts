import { Input } from "shared/util/input";
import { Animation, Character, Skill } from "shared/util/character";
import { ReplicatedStorage } from "@rbxts/services";
import { EntityState } from "shared/util/lib";
import { Hitbox } from "shared/util/hitbox";

const Gio =
    new Character.CharacterBuilder3D()
        .SetName("Giovanna?")
        .SetDescription("Test character")
        .SetModel(ReplicatedStorage.WaitForChild("R15") as Model)
        .SetEasiness(3)
        .SetAttack(
            Input.Slash,
            new Skill.SkillBuilder()
                .SetName("Slash")
                .SetFrameData(
                    new Skill.FrameDataBuilder()
                        .SetStartup(7)
                        .SetActive(6)
                        .SetRecovery(10)
                        .SetContact(3)
                        .SetBlock(3)
                        .SetHitbox(
                            new Hitbox.HitboxBuilder()
                                .SetOffset()
                                .SetSize(new Vector3(7,7,7))
                                .Construct()
                        )
                        .SetAnimation(
                            new Animation.AnimationBuilder()
                                .SetName("Slash")
                                .SetAnimationId("rbxassetid://14289903269")
                                .Construct()
                        )
                )
                .Construct()
        )
        .SetAnimation(EntityState.Idle,
            new Animation.AnimationBuilder()
                .SetName("Idle")
                .SetAnimationId("rbxassetid://14280621593")
                .SetPriority(Enum.AnimationPriority.Idle)
                .SetLooped(true)
                .Construct()
        )
        .SetAnimation(EntityState.Crouch,
            new Animation.AnimationBuilder()
                .SetName("Crouch")
                .SetAnimationId("rbxassetid://14288051389")
                .SetPriority(Enum.AnimationPriority.Movement)
                .SetLooped(true)
                .Construct()
        )
        .AddSkill(
            new Skill.SkillBuilder()
                .SetName("Test Skill")
                .SetDescription("A test skill.")
                .SetFrameData(
                    new Skill.FrameDataBuilder()
                        .SetAnimation(
                            new Animation.AnimationBuilder()
                                .SetName("Test Skill")
                                .SetAnimationId("rbxassetid://14280676559")
                                .SetPriority(Enum.AnimationPriority.Action)
                                .Construct()
                        )
                        .SetStartup(4)
                        .SetActive(6)
                        .SetRecovery(-4)
                )
                .SetGaugeRequired(25)
                .SetGroundedType(Skill.SkillGroundedType.Ground)
                .SetReversal(false)
                .Construct()
        )
        .Construct();

export = Gio;