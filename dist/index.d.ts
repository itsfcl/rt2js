export type vector = [number, number, number];
export type vector2 = [number, number];
export type ray = [vector, vector, vector];
export declare class v {
    static add(a: vector, b: vector): vector;
    static sub(a: vector, b: vector): vector;
    static dot(a: vector, b: vector): number;
    static scalar(a: vector, b: number): vector;
    static piecewise(a: vector, b: vector): vector;
    static len(a: vector): number;
    static zero(): vector;
    static one(): vector;
    static norm(a: vector): vector;
}
export interface Sphere {
    position: vector;
    radius: number;
    color: vector;
    emission: number;
    smoothness: number;
}
export declare class Xorshift32 {
    static state: number;
    static random(): number;
}
export declare class Shader {
    scene: Sphere[];
    ctx: CanvasRenderingContext2D;
    resolution: vector2;
    fov: vector2;
    position: vector;
    maxBounce: number;
    xdist: number;
    rays: ray[][];
    accumulator: Float64Array;
    frameCount: number;
    constructor(scene: Sphere[], ctx: CanvasRenderingContext2D, resolution: vector2, fov: vector2, position: vector, maxBounce?: number);
    getRays(): ray[][];
    renderFrame(rpp?: number): void;
    trace(ra: ray): vector;
    renderColored(): void;
    changeResolution(res: vector2): void;
    reset(): void;
}
