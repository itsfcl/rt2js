# rt2js
Small raytracing/PBR library


<img width="867" height="862" alt="image" src="https://github.com/user-attachments/assets/c6951000-c98b-4d58-83d7-cc19aa847494" />


Current support
- Spherical meshes
- ACES Filma tonemapping by default
- Upsampling/downsampling
- Progressive rendering using frame accumulation


Limitations
- Completely CPU-dependent (due to the nature of CPU and JS)
- No support for triangle-based meshes/voxels
- Extremely hard to modify and maintain due to aggressive vector3 maths inlining (it's worth it though, up to 8x faster)
- Near-zero support for plasticity
- Slightly worse specular on dielectrics due to the lack of Blinn-Phong shading
- Color crashes due to being limited to RGBA
- "Fake looking" light spread due to random/Russian Roulette scatter instead of Lambert cosine law
- Zero support for transparency (glass, ...etc)
- High noise due to floating point error and lack of dedicated raytracing units


Example usage (with progressive rendering)


```js
const samplingRate = 1;

let shader = new Shader(
    [{ position: [200,-80,100], radius: 60, color: [255/255, 232/255, 148/255], emission: 20, smoothness: 0},
     { position: [0,0,-3000], radius: 3000, color: [0.6,0.6,0.6], emission: 0, smoothness: 0},{ 
        position: [25,0,5], radius: 5, color: cnorm([64, 224, 208]), 
        emission: 0, smoothness: 1 
    },{ 
        position: [25,8.5,5], radius: 3, color: cnorm([192, 64, 0]), 
        emission: 0, smoothness: 1 
    },{ 
        position: [25,-8.5,5], radius: 3, color: cnorm([74, 255, 0]), 
        emission: 0, smoothness: 1 
    }],ctx,
    [1000 * samplingRate, 1000 * samplingRate],
    [Math.PI / 3, Math.PI / 3],
    [0,0,10],
    6
);


function loop() {
    setTimeout(() => {
        shader.renderFrame(1);
        shader.renderColored();
        loop();
    }, 20); 
}


loop();
```


<img width="869" height="866" alt="image" src="https://github.com/user-attachments/assets/76b10217-d037-4200-8813-0c9bbd1f714b" />
