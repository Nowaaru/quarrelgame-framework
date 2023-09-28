import { CharacterSelectController } from "client/controllers/characterselect.controller";
import { CmdrController } from "client/controllers/cmdr.controller";

import { Gamepad as _Gamepad } from "client/controllers/gamepad.controller";
import { Input as _Input } from "client/controllers/input.controller";
import { Keyboard as _Keyboard } from "client/controllers/keyboard.controller";

import { Client as _Client } from "client/controllers/client.controller";
import { Match as _Match } from "server/services/matchservice.service";

import { MotionInput } from "client/controllers/motioninput.controller";
import { CameraController2D } from "client/module/camera/camera2d";
import { CameraController3D } from "client/module/camera/camera3d";

import { CombatController2D } from "client/module/combat/combat2d";
import { CombatController3D } from "client/module/combat/combat3d";

import { Cursor as _Cursor } from "client/module/extra/cursor";
import { HudController } from "client/module/extra/hud";

import { Animation as _Animation } from "shared/util/animation";
import { Boundary as _Boundary } from "shared/util/boundary";
import { Character as _Character, Skill as _Skill } from "shared/util/character";
import { Hitbox as _Hitbox } from "shared/util/hitbox";
import { Input as _InputUtility } from "shared/util/input";
import * as _Lib from "shared/util/lib/index";
import { Model as _Model } from "shared/util/model";

export namespace UserInterface
{
    export const CharacterSelect = CharacterSelectController;
    export const Command = CmdrController;
    export const Cursor = _Cursor;
    export const Hud = HudController;
}

export namespace UserControls
{
    export const Keyboard = _Keyboard;
    export const Gamepad = _Gamepad;
    export const Input = _Input;
}

export namespace Game
{
    export const Client = _Client;
    export const Match = _Match;
}

export namespace Fighter3D
{
    export const Camera = CameraController3D;
    export const Combat = CombatController3D;
}

export namespace Fighter2D
{
    export const Motion = MotionInput;
    export const Camera = CameraController2D;
    export const Combat = CombatController2D;
}

export namespace Utility
{
    export const Character = _Character;
    export const Skill = _Skill;
    export const Model = _Model;
    export const Boundary = _Boundary;
    export const Input = _InputUtility;
    export const Hitbox = _Hitbox;
    export const Lib = _Lib;
    export const Animation = _Animation;
}
