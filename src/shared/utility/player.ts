import { Players } from "@rbxts/services";

const playerModule = Players.LocalPlayer.WaitForChild("PlayerScripts").WaitForChild("PlayerModule") as ModuleScript;
export const PlayerModule = () => require(playerModule) as PlayerModule.PlayerModule;
export const BaseCamera = () => require(playerModule.WaitForChild("CameraModule").WaitForChild("BaseCamera") as ModuleScript) as CameraModule.BaseCamera;
export const CameraUtils = () => require(playerModule.WaitForChild("CameraModule").WaitForChild("CameraUtils") as ModuleScript) as CameraModule.CameraUtils;