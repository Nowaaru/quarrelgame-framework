import Make from "@rbxts/make";
import { Workspace } from "@rbxts/services";

export namespace Boundary
{
    interface BoundaryProps
    {
        /**
         * The size of the boundary.
         */
        readonly Size: Vector3;
        /**
         * The origin of the boundary.
         * Used to determine where to place the boundary.
         */
        readonly Origin: Vector3;
        /**
         * The axis of the boundary.
         * Used to determine which direction to place the boundaries.
         */
        readonly Axis: Vector3;
        /**
         * The parent of the boundary.
         */
        readonly Parent?: Instance;
    }

    /**
     * A static two-dimensional boundary. Cannot be resized.
     */
    class Boundary2D
    {
        protected readonly boundaries: Model & {
            BoundaryLeft: Part;
            BoundaryRight: Part;
            BoundaryTop: Part;
            BoundaryBottom: Part;
        };

        protected Size = Vector3.zero;

        protected Origin = Vector3.zero;

        protected Axis = Vector3.zero;

        public GenerateWallsFromProps({ Size = this.Size, Origin = this.Origin, Axis = this.Axis }: BoundaryProps = {} as never)
        {
            const originCFrameAxis = CFrame.lookAt(this.Origin, this.Origin.add(this.Axis));

            return [
                Make("Part", {
                    Name: "BoundaryLeft",
                    Size: Size.mul(new Vector3(0, 1, 0)).add(new Vector3(2, 0, 2)),
                    CFrame: originCFrameAxis.add(originCFrameAxis.LookVector.mul(-math.abs(Size.X) - 2)).add(Size.div(2).mul(new Vector3(0, 1, 0))),
                    CanQuery: false,
                    Anchored: true,
                }),
                Make("Part", {
                    Name: "BoundaryRight",
                    Size: Size.mul(new Vector3(0, 1, 0)).add(new Vector3(2, 0, 2)),
                    CFrame: originCFrameAxis.add(originCFrameAxis.LookVector.mul(math.abs(Size.X) + 2)).add(Size.div(2).mul(new Vector3(0, 1, 0))),
                    CanQuery: false,
                    Anchored: true,
                }),
            ] as const;
        }

        public GenerateFloorAndCeilingFromProps({ Size = this.Size, Origin = this.Origin, Axis = this.Axis }: BoundaryProps = {} as never)
        {
            const originCFrameAxis = CFrame.lookAt(this.Origin, this.Origin.add(this.Axis));

            return [
                Make("Part", {
                    Name: "BoundaryTop",
                    Size: this.Size.mul(new Vector3(1, 0, 1)).add(new Vector3(0, 2, 0)),
                    CFrame: originCFrameAxis.add(new Vector3(0, this.Size.Y + 2, 0)),
                    CanQuery: false,
                    Anchored: true,
                }),
                Make("Part", {
                    Name: "BoundaryBottom",
                    Size: this.Size.mul(new Vector3(1, 0, 1)).add(new Vector3(0, 2, 0)),
                    CFrame: originCFrameAxis.sub(new Vector3(0, this.Size.Y + 2, 0)),
                    CanQuery: false,
                    Anchored: true,
                }),
            ] as const;
        }

        protected ReplaceWalls(walls?: readonly [Part, Part, Part, Part]): typeof walls extends undefined ? NonNullable<typeof walls> : typeof walls
        {
            if (!walls)
            {
                this.boundaries.ClearAllChildren();

                return this.ReplaceWalls([
                    ...this.GenerateFloorAndCeilingFromProps(),
                    ...this.GenerateWallsFromProps(),
                ]);
            }

            const boundaryChildrenNames = this.boundaries.GetChildren().map((n) => n.Name.lower());
            for (const wall of walls)
            {
                if (boundaryChildrenNames.find((n) => n === wall.Name))
                    continue;

                wall.Parent = this.boundaries;
            }

            return walls;
        }

        constructor({ Parent = Workspace, Size, Origin, Axis }: BoundaryProps)
        {
            [ this.Size, this.Origin, this.Axis ] = [ Size, Origin, Axis ];
            this.boundaries = Make("Model", {
                Name: "BoundaryBox",
                Parent,
                Children: [
                    ...this.GenerateWallsFromProps(),
                    ...this.GenerateFloorAndCeilingFromProps(),
                ],
            }) as never;
        }
    }

    interface OnBoundaryChange
    {
        onBoundaryChanged: () => void;
    }

    /**
     * A boundary that can be resized.
     */
    class FlexibleBoundary extends Boundary2D
    {
        constructor(props: BoundaryProps)
        {
            super(props);
        }

        public Resize(newSize: Vector3)
        {
            this.Size = newSize;
            this.ReplaceWalls();
        }

        public Relocate(newOrigin: Vector3)
        {
            this.Origin = newOrigin;
            this.ReplaceWalls();
        }

        public Rotate(newAxis: Vector3)
        {
            this.Axis = newAxis;
            this.ReplaceWalls();
        }
    }
}
