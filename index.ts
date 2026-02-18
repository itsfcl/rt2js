export type vector = [number, number, number];
export type vector2 = [number, number]

/* origin, dir, color*/
export type ray = [vector, vector, vector]

export class v {
    static add(a: vector, b: vector): vector {
        return [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
    }
    static sub(a: vector, b: vector): vector {
        return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
    }
    static dot(a: vector, b: vector): number {
        return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    }
    static scalar(a: vector, b: number): vector {
        return [a[0]*b, a[1]*b, a[2]*b];
    }
    static piecewise(a: vector, b: vector): vector {
        return [a[0]*b[0], a[1]*b[1], a[2]*b[2]];
    }
    static len(a: vector): number {
        return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    }
    static zero(): vector {
        return [0,0,0];
    }
    static one(): vector {
        return [1,1,1];
    }
    static norm(a: vector): vector {
        let l = this.len(a);
        return [a[0]/l, a[1]/l, a[2]/l];
    }
}

export interface Sphere {
    position: vector;
    radius: number;
    color: vector;
    emission: number;
    smoothness: number;
}

export class Xorshift32 {
    static state = 676767; 
    static random(): number {
        let s = this.state;
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        this.state = s;
        return (s >>> 0) / 4294967296; 
    }
}

export class Shader {
    public xdist: number;
    public rays: ray[][];
    public accumulator: Float64Array;
    public frameCount: number = 0;

    constructor(
        public scene: Sphere[],
        public ctx: CanvasRenderingContext2D,
        public resolution: vector2,
        public fov: vector2,
        public position: vector,
        public maxBounce: number = 2
    ) {
        this.xdist = Math.tan((Math.PI-fov[0])/2) * resolution[0] / 2;
        this.rays = this.getRays();
        this.accumulator = new Float64Array(resolution[0] * resolution[1] * 3);
    }

    getRays(): ray[][] {
        let oa: ray[][] = new Array(this.resolution[1]);
        for (let i = 0; i < this.resolution[1]; i++) oa[i] = new Array(this.resolution[0]) as ray[];
        for (let z = 0; z < this.resolution[1]; z++) {
            for (let y = 0; y < this.resolution[0]; y++) {
                let jitterX = Xorshift32.random() - 0.5;
                let jitterY = Xorshift32.random() - 0.5;
                let screenY = (y+jitterX) - this.resolution[0] / 2;
                let screenZ = (this.resolution[1] / 2) - (z+jitterY);
                let dir = v.norm(v.sub([this.xdist, screenY, screenZ], this.position));
                oa[z][y] = [this.position, dir, [0,0,0]];
            }
        }
        return oa;
    }

    renderFrame(rpp = 1) {
        this.frameCount += rpp;
        const resX = this.resolution[0];
        const resY = this.resolution[1];

        for (let y = 0; y < resY; y++) {
            for (let x = 0; x < resX; x++) {
                let r = this.rays[y][x];
                let accR = 0, accG = 0, accB = 0;

                for (let i = 0; i < rpp; i++) {
                    let col = this.trace(r);
                    accR += Math.min(col[0], 8);
                    accG += Math.min(col[1], 8);
                    accB += Math.min(col[2], 8);
                }

                let idx = (y * resX + x) * 3;
                this.accumulator[idx] += accR;
                this.accumulator[idx + 1] += accG;
                this.accumulator[idx + 2] += accB;
            }
        }
    }

    trace(ra: ray): vector {
        let r0x = ra[0][0], r0y = ra[0][1], r0z = ra[0][2];
        let r1x = ra[1][0], r1y = ra[1][1], r1z = ra[1][2];

        let emitx = 0, emity = 0, emitz = 0;
        let colx = 1, coly = 1, colz = 1;
        
        let lastBounceSpecular = true; 

        for (let b = 0; b < this.maxBounce; b++) {
            let hit = false;
            let dist = Infinity;
            let hpx = 0, hpy = 0, hpz = 0;
            let hnx = 0, hny = 0, hnz = 0;
            let scR = 0, scG = 0, scB = 0, scE = 0, scS = 0;

            for (let s = 0; s < this.scene.length; s++) {
                let sphere = this.scene[s];
                let spx = sphere.position[0], spy = sphere.position[1], spz = sphere.position[2];
                let ox = r0x - spx, oy = r0y - spy, oz = r0z - spz;
                let bVal = 2 * (ox * r1x + oy * r1y + oz * r1z);
                let cVal = (ox * ox + oy * oy + oz * oz) - (sphere.radius * sphere.radius);
                let d = bVal * bVal - 4 * cVal;

                if (d >= 0) {
                    let di = (-bVal - Math.sqrt(d)) / 2;
                    if (di < dist && di > 0.0001) {
                        dist = di;
                        hit = true;
                        hpx = r0x + r1x * dist;
                        hpy = r0y + r1y * dist;
                        hpz = r0z + r1z * dist;
                        let nx = hpx - spx, ny = hpy - spy, nz = hpz - spz;
                        let nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
                        hnx = nx / nl; hny = ny / nl; hnz = nz / nl;
                        
                        scR = sphere.color[0]; scG = sphere.color[1]; scB = sphere.color[2];
                        scE = sphere.emission; scS = sphere.smoothness;
                    }
                }
            }

            if (!hit) {
                //205, 189, 255
                let skyR = 205/255, skyG = 189/255, skyB = 1.0; 
                let skyEmission = 0.8; 
                emitx += colx * skyR * skyEmission;
                emity += coly * skyG * skyEmission;
                emitz += colz * skyB * skyEmission;
                break;
            }

            if (lastBounceSpecular) {
                emitx += colx * scR * scE;
                emity += coly * scG * scE;
                emitz += colz * scB * scE;
            }

            let isSpecular = Xorshift32.random() < scS;
            lastBounceSpecular = isSpecular;

            if (!isSpecular) {
                for (let l = 0; l < this.scene.length; l++) {
                    let light = this.scene[l];
                    if (light.emission <= 0) continue;

                    let lrx = Xorshift32.random() * 2 - 1;
                    let lry = Xorshift32.random() * 2 - 1;
                    let lrz = Xorshift32.random() * 2 - 1;
                    let lrl = Math.sqrt(lrx * lrx + lry * lry + lrz * lrz);
                    lrx /= lrl; lry /= lrl; lrz /= lrl;

                    let lpx = light.position[0] + lrx * light.radius;
                    let lpy = light.position[1] + lry * light.radius;
                    let lpz = light.position[2] + lrz * light.radius;

                    let ldx = lpx - hpx; let ldy = lpy - hpy; let ldz = lpz - hpz;
                    let ldist = Math.sqrt(ldx * ldx + ldy * ldy + ldz * ldz);
                    ldx /= ldist; ldy /= ldist; ldz /= ldist;

                    let ndotl = hnx * ldx + hny * ldy + hnz * ldz;
                    
                    if (ndotl > 0) {
                        let shadowHit = false;
                        let shpx = hpx + hnx * 0.0001; 
                        let shpy = hpy + hny * 0.0001; 
                        let shpz = hpz + hnz * 0.0001;

                        for (let s = 0; s < this.scene.length; s++) {
                            let ssphere = this.scene[s];
                            if (ssphere === light) continue; 

                            let sox = shpx - ssphere.position[0];
                            let soy = shpy - ssphere.position[1];
                            let soz = shpz - ssphere.position[2];

                            let sbVal = 2 * (sox * ldx + soy * ldy + soz * ldz);
                            let scVal = (sox * sox + soy * soy + soz * soz) - (ssphere.radius * ssphere.radius);
                            let sd = sbVal * sbVal - 4 * scVal;

                            if (sd >= 0) {
                                let sdi = (-sbVal - Math.sqrt(sd)) / 2;
                                if (sdi > 0.0001 && sdi < ldist - 0.0001) {
                                    shadowHit = true; break;
                                }
                            }
                        }

                        if (!shadowHit) {
                            let solidAngle = Math.min(1, (light.radius * light.radius) / (ldist * ldist));
                            let weight = ndotl * solidAngle * light.emission;
                            
                            emitx += colx * scR * light.color[0] * weight;
                            emity += coly * scG * light.color[1] * weight;
                            emitz += colz * scB * light.color[2] * weight;
                        }
                    }
                }
            }

            colx *= scR; coly *= scG; colz *= scB;

            r0x = hpx + hnx * 0.0001; 
            r0y = hpy + hny * 0.0001; 
            r0z = hpz + hnz * 0.0001;

            if (isSpecular) {
                let dotIn = r1x * hnx + r1y * hny + r1z * hnz;
                let reflX = r1x - 2 * dotIn * hnx;
                let reflY = r1y - 2 * dotIn * hny;
                let reflZ = r1z - 2 * dotIn * hnz;

                let roughness = 1 - scS;

                let rx = Xorshift32.random() * 2 - 1;
                let ry = Xorshift32.random() * 2 - 1;
                let rz = Xorshift32.random() * 2 - 1;
                let rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
                rx /= rl; ry /= rl; rz /= rl;


                r1x = reflX + rx * roughness;
                r1y = reflY + ry * roughness;
                r1z = reflZ + rz * roughness;

                let newL = Math.sqrt(r1x * r1x + r1y * r1y + r1z * r1z);
                r1x /= newL; r1y /= newL; r1z /= newL;

                let dotOut = r1x * hnx + r1y * hny + r1z * hnz;
                if (dotOut <= 0) {
                    colx = 0; coly = 0; colz = 0; 
                }
            } else {
                let rx = Xorshift32.random() * 2 - 1;
                let ry = Xorshift32.random() * 2 - 1;
                let rz = Xorshift32.random() * 2 - 1;
                let dot = rx * hnx + ry * hny + rz * hnz;
                if (dot < 0) { rx = -rx; ry = -ry; rz = -rz; }
                let rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
                r1x = rx / rl; r1y = ry / rl; r1z = rz / rl;
            }
        }
        
        return [emitx, emity, emitz];
    }

    renderColored() {
        let imgd = this.ctx.createImageData(this.resolution[0], this.resolution[1]);
        const resX = this.resolution[0];

        for (let i = 0; i < imgd.data.length; i += 4) {
            let pid = i / 4;
            let idx = pid * 3;
            let r = this.accumulator[idx] / this.frameCount;
            let g = this.accumulator[idx + 1] / this.frameCount;
            let b = this.accumulator[idx + 2] / this.frameCount;

            const a = 2.51, b_ = 0.03, c = 2.43, d = 0.59, e = 0.14;

            const saturation = 0.9;
            const luma = r*0.2126 + g*0.7152 + b*0.0722;
            r = luma + (r - luma) * saturation;
            g = luma + (g - luma) * saturation;
            b = luma + (b - luma) * saturation;

            const lin = (v: number) => v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);

            let tone = (v: number) => Math.max(0, Math.min(1, (v*(a*v+b_))/(v*(c*v+d)+e)))

            const enc = (v: number) => v <= 0.0031308 ? 12.92*v : 1.055*Math.pow(v,1/2.4)-0.055;



            imgd.data[i + 0] = Math.round(enc(tone(lin(r)))*255);
            imgd.data[i + 1] = Math.round(enc(tone(lin(g)))*255);
            imgd.data[i + 2] = Math.round(enc(tone(lin(b)))*255);
            imgd.data[i + 3] = 255;
        }
        this.ctx.putImageData(imgd, 0, 0);
    }

    changeResolution(res: vector2) {
        this.resolution = res;
        this.xdist = Math.tan((Math.PI-this.fov[0])/2) * this.resolution[0] / 2;
        this.rays = this.getRays();
        this.accumulator = new Float64Array(this.resolution[0] * this.resolution[1] * 3);
    }

    reset() {
        this.frameCount = 0;
        this.accumulator.fill(0);
    }
}