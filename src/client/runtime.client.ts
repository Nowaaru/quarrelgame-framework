import { Flamework } from "@flamework/core";
import "client/network";

Flamework.addPaths("src/client/components");
Flamework.addPaths("src/client/controllers");
Flamework.addPaths("src/shared/components");

// Add paths for testing the framework

Flamework.ignite();
