import { Players } from "@rbxts/services";


declare global
{
    class Error
    {
        public readonly why: string;

        public ToString(): string
    }

    interface ErrorKind
    {
        why: string;
    }
}


export const ConvertPercentageToNumber = (percentage: string) => tonumber(percentage.match("(%d+)%%$")[ 0 ]);

const playerModule = Players.LocalPlayer.WaitForChild("PlayerScripts").WaitForChild("PlayerModule") as ModuleScript;
export const PlayerModule = () => require(playerModule) as PlayerModule.PlayerModule;
export const BaseCamera = () => require(playerModule.WaitForChild("CameraModule").WaitForChild("BaseCamera") as ModuleScript) as CameraModule.BaseCamera;
export const CameraUtils = () => require(playerModule.WaitForChild("CameraModule").WaitForChild("CameraUtils") as ModuleScript) as CameraModule.CameraUtils;