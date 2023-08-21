import { Character, Skill } from "shared/util/character";
import { Hitbox } from "shared/util/hitbox";
import { Input } from "shared/util/input";
import { EntityState } from "shared/util/lib";
import { ForwardKick, CloseSlash, LowHeavy } from "./normals";
import { Animation } from "shared/util/animation";



const ZATO =
    new Character.CharacterBuilder2D()
        .SetName("ZATO-R6")
        .SetSubheader("EDDIE MAKES ME WANT TO ED DIE")
        .SetHeader("EDDEEZ NUTS GOTTEM")
        .SetDescription("Test character 4")
        .SetModel(Character.CharacterModel.dusek as never)
        .SetEasiness(2)
        .SetAttack(Input.Slash, CloseSlash)
        .SetAttack(Input.Kick, ForwardKick)
        .SetAttack(Input.Heavy, LowHeavy)
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
                        .SetHitbox(
                            new Hitbox.HitboxBuilder()
                                .SetOffset()
                                .SetSize(new Vector3(7,7,7))
                                .Construct()
                        )
                )
                .SetGaugeRequired(25)
                .SetGroundedType(Skill.SkillGroundedType.Ground)
                .SetReversal(false)
                .Construct()
        )
        .Construct();

export = ZATO;