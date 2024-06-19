import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import Make from "@rbxts/make";
export enum VisualizationShape
{
    Ball = "Ball",
    Block = "Block",
    Wedge = "Wedge",
    Cylinder = "Cylinder",
    CornerWedge = "CornerWedge",
}

interface VisualizationMaterialProperties
{
    Type: "Material";
    Material: Enum.Material["Name"];
    Transparency: number;
}

interface VisualizationHighlightProperties
{
    Type: "Highlight";
    DepthMode?: Enum.HighlightDepthMode["Name"];
    Opacity?: number;
    Outline?: Color3;
}

interface VisualizationCustomizationProperties
{
    Color?: Color3;
    Shape?: VisualizationShape;
    Size?: Vector3;
}

export type VisualizationType = "Highlight" | "Material";

export type VisualizationAttributes<T extends VisualizationType> =
    & VisualizationCustomizationProperties
    & (T extends "Highlight" ? VisualizationHighlightProperties : VisualizationMaterialProperties)
    & {
        Name: string;
    };

// FIXME: this shit is morbidly broken dear god
/**
 * A debug tool used to highlight parts and do various things to make them stand out.     ghlight
 */
@Component({
    defaults: {
        Type: "Highlight",
        Shape: VisualizationShape.Ball,
        Size: new Vector3(1, 1, 1),
        Color: new Color3(1, 0, 0),
    },
})
export class Visualization<I extends Part> extends BaseComponent<VisualizationAttributes<VisualizationType>, I> implements OnStart
{
    private highlight?: Highlight;

    onStart()
    {
        this.instance.Shape = Enum.PartType[this.attributes.Shape!];
        if (this.attributes.Type === "Highlight")
        {
            this.highlight = Make("Highlight", {
                DepthMode: Enum.HighlightDepthMode[this.attributes.DepthMode ?? Enum.HighlightDepthMode.AlwaysOnTop.Name],
                Outline: this.attributes.Outline ?? new Color3(1, 0, 0),
                OutlineTransparency: this.attributes.Opacity ?? 0,
                FillColor: this.attributes.Color ?? new Color3(1, 0.2, 0.2),
                FillTransparency: this.attributes.Opacity ?? 0,
                Adornee: this.instance,
            });

            this.instance.Transparency = 1;
            // FIXME: this shit

            this.onAttributeChanged("DepthMode" as never, (a) => this.highlight!.DepthMode = Enum.HighlightDepthMode[a]);
            this.onAttributeChanged("Outline" as never, (a) => (a === undefined ? false : !!(this.highlight!.OutlineColor = a)));
            this.onAttributeChanged("OutlineTransparency" as never, (a) => this.highlight!.OutlineTransparency = a);
            this.onAttributeChanged("Color" as never, (a) => this.highlight!.FillColor = a);
        }
        else if ("Material" in this.attributes)
        {
            this.instance.Material = Enum.Material[this.attributes.Material];
            this.instance.Transparency = this.attributes.Transparency;

            this.onAttributeChanged("Material" as never, (a) => this.instance.Material = a);
            this.onAttributeChanged("Transparency" as never, (a) => this.instance.Material = a);
        }
    }

    public ChangeColor(color: Color3)
    {
        this.attributes.Color = color;
    }
}
