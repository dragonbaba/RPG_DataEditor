"use strict";
Zaun.FilterSystem = (FilterSystem => {
    const { LogSystem, PoolSystem } = Zaun.Core;
    const { Logger } = LogSystem;
    const { GpuProgram, GlProgram, Filter, UniformGroup, FilterEffectPool, AlphaFilter } = PIXI;
    const { createPool } = PoolSystem;
    const vertex_gl = `in vec2 aPosition;
    out vec2 vTextureCoord;
    uniform vec4 uInputSize;
    uniform vec4 uOutputFrame;
    uniform vec4 uOutputTexture;
    vec4 filterVertexPosition(){
        vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
        position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
        position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
        return vec4(position, 0.0, 1.0);
    }
    vec2 filterTextureCoord(){
        return aPosition * (uOutputFrame.zw * uInputSize.zw);
    }
    void main(void){
        gl_Position = filterVertexPosition();
        vTextureCoord = filterTextureCoord();
    }`;
    const fragment_gl = `in vec2 vTextureCoord;
        out vec4 finalColor;
        uniform sampler2D uTexture;
        uniform float hue;
        uniform vec4 colorTone;
        uniform vec4 blendColor;
        uniform float brightness;
        const float COLOR_SIZE1 = 1.0 / 6.0;
        const float COLOR_SIZE2 = 2.0 / 6.0;
        const float COLOR_SIZE3 = 3.0 / 6.0;
        const float COLOR_SIZE4 = 4.0 / 6.0;
        const float COLOR_SIZE5 = 5.0 / 6.0;
        vec3 rgbToHsl(vec3 rgb) {
          float r = rgb.r;
          float g = rgb.g;
          float b = rgb.b;
          float cmin = min(r, min(g, b));
          float cmax = max(r, max(g, b));
          float h = 0.0;
          float s = 0.0;
          float l = (cmin + cmax) / 2.0;
          float delta = cmax - cmin;
          if (delta > 0.0) {
            if (r == cmax) {
              h = mod((g - b) / delta + 6.0, 6.0) / 6.0;
            } else if (g == cmax) {
              h = ((b - r) / delta + 2.0) / 6.0;
            } else {
              h = ((r - g) / delta + 4.0) / 6.0;
            }
            if (l < 1.0) {
              s = delta / (1.0 - abs(2.0 * l - 1.0));
            }
          }
          return vec3(h, s, l);
        }
        vec3 hslToRgb(vec3 hsl) {
          float h = hsl.x;
          float s = hsl.y;
          float l = hsl.z;
          float c = (1.0 - abs(2.0 * l - 1.0)) * s;
          float x = c * (1.0 - abs((mod(h * 6.0, 2.0)) - 1.0));
          float m = l - c / 2.0;
          float cm = c + m;
          float xm = x + m;
          if (h < COLOR_SIZE1) {
            return vec3(cm, xm, m);
          } else if (h < COLOR_SIZE2) {
            return vec3(xm, cm, m);
          } else if (h < COLOR_SIZE3) {
            return vec3(m, cm, xm);
          } else if (h < COLOR_SIZE4) {
            return vec3(m, xm, cm);
          } else if (h < COLOR_SIZE5) {
            return vec3(xm, m, cm);
          } else {
            return vec3(cm, m, xm);
          }
        }
        void main() {
          vec4 sample = texture2D(uTexture, vTextureCoord);
          float a = sample.a;
          vec3 hsl = rgbToHsl(sample.rgb);
          hsl.x = mod(hsl.x + hue / 360.0, 1.0);
          hsl.y = hsl.y * (1.0 - colorTone.a / 255.0);
          vec3 rgb = hslToRgb(hsl);
          float r = rgb.r;
          float g = rgb.g;
          float b = rgb.b;
          float r2 = colorTone.r / 255.0;
          float g2 = colorTone.g / 255.0;
          float b2 = colorTone.b / 255.0;
          float r3 = blendColor.r / 255.0;
          float g3 = blendColor.g / 255.0;
          float b3 = blendColor.b / 255.0;
          float i3 = blendColor.a / 255.0;
          float i1 = 1.0 - i3;
          r = clamp((r / a + r2) * a, 0.0, 1.0);
          g = clamp((g / a + g2) * a, 0.0, 1.0);
          b = clamp((b / a + b2) * a, 0.0, 1.0);
          r = clamp(r * i1 + r3 * i3 * a, 0.0, 1.0);
          g = clamp(g * i1 + g3 * i3 * a, 0.0, 1.0);
          b = clamp(b * i1 + b3 * i3 * a, 0.0, 1.0);
          r = r * brightness / 255.0;
          g = g * brightness / 255.0;
          b = b * brightness / 255.0;
          finalColor = vec4(r, g, b, a);
        }`;
    const vertex_gpu = `
    struct GlobalFilterUniforms {
     uInputSize: vec4<f32>,
     uInputPixel: vec4<f32>,
     uInputClamp: vec4<f32>,
     uOutputFrame: vec4<f32>,
     uGlobalFrame: vec4<f32>,
     uOutputTexture: vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

fn filterVertexPosition( 
aPosition: vec2<f32>
) -> vec4<f32> {
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;
    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;
    return vec4<f32>(position, 0.0, 1.0);
}

fn filterTextureCoord( 
aPosition: vec2<f32>
) -> vec2<f32> {
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

@vertex
fn mainVertex( 
@location(0) aPosition: vec2<f32> 
) -> VSOutput {
    return VSOutput(
        filterVertexPosition(aPosition),
        filterTextureCoord(aPosition)
    );
}`
    const fragment_gpu = `
struct ColorUniforms {
    hue: f32,
    colorTone: vec4<f32>,
    blendColor: vec4<f32>,
    brightness: f32
};
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> colorUniforms: ColorUniforms;

const COLOR_SIZE1:f32 = 1.0 / 6.0;
const COLOR_SIZE2:f32 = 2.0 / 6.0;
const COLOR_SIZE3:f32 = 3.0 / 6.0;
const COLOR_SIZE4:f32 = 4.0 / 6.0;
const COLOR_SIZE5:f32 = 5.0 / 6.0;

fn rgbToHsl( 
rgb:vec3<f32>
)->vec3<f32>{
   let r:f32 = rgb.r;
   let g:f32 = rgb.g;
   let b:f32 = rgb.b;
   let cmin:f32 = min(r,min(g,b));
   let cmax:f32 = max(r,max(g,b));
   var h:f32 = 0.0;
   var s:f32 = 0.0;
   var l:f32 = (cmin + cmax) / 2.0;
   let delta = cmax - cmin;
   if (delta > 0.0) {
       if (r == cmax) {
           h = ((((g - b) / delta) + 6.0)% 6.0) / 6.0;
       } else if (g == cmax) {
           h = ((b - r) / delta + 2.0) / 6.0;
       } else {
           h = ((r - g) / delta + 4.0) / 6.0;
       }
       if (l < 1.0) {
           s = delta / (1.0 - abs(2.0 * l - 1.0));
       }
   }
   return vec3<f32>(h,s,l);
}
fn hslToRgb( 
hsl:vec3<f32>
)->vec3<f32>{
   let h:f32 = hsl.x;
   let s:f32 = hsl.y;
   let l:f32 = hsl.z;
   let c:f32 = (1.0 - abs(2.0 * l - 1.0)) * s;
   let x:f32 = c * (1.0 - abs(((h * 6.0)% 2.0) - 1.0));
   let m:f32 = l - c / 2.0;
   let cm:f32 = c + m;
   let xm:f32 = x + m;
   if (h < COLOR_SIZE1) {
       return vec3<f32>(cm, xm, m);
   } else if (h < COLOR_SIZE2) {
       return vec3<f32>(xm, cm, m);
   } else if (h < COLOR_SIZE3) {
       return vec3<f32>(m, cm, xm);
   } else if (h < COLOR_SIZE4) {
       return vec3<f32>(m, xm, cm);
   } else if (h < COLOR_SIZE5) {
       return vec3<f32>(xm, m, cm);
   } else {
       return vec3<f32>(cm, m, xm);
   }
}

@fragment
fn mainFragment( 
@location(0) uv: vec2<f32>, 
@builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
    var sample = textureSample(uTexture, uSampler, uv);
    let colorTone:vec4<f32> = colorUniforms.colorTone;
    let brightness:f32 = colorUniforms.brightness;
    let blendColor:vec4<f32> = colorUniforms.blendColor;
    let hue:f32 = colorUniforms.hue;
    let a:f32 = sample.a;
    var hsl:vec3<f32> = rgbToHsl(sample.rgb);
    hsl.x = (hsl.x + hue / 360.0)% 1.0;
    hsl.y = hsl.y * (1.0 - colorTone.a / 255.0);
    let rgb:vec3<f32> = hslToRgb(hsl);
    var r:f32 = rgb.r;
    var g:f32 = rgb.g;
    var b:f32 = rgb.b;
    let r2:f32 = colorTone.r / 255.0;
    let g2:f32 = colorTone.g / 255.0;
    let b2:f32 = colorTone.b / 255.0;
    let r3:f32 = blendColor.r / 255.0;
    let g3:f32 = blendColor.g / 255.0;
    let b3:f32 = blendColor.b / 255.0;
    let i3:f32 = blendColor.a / 255.0;
    let i1:f32 = 1.0 - i3;
    r = clamp((r / a + r2) * a, 0.0, 1.0);
    g = clamp((g / a + g2) * a, 0.0, 1.0);
    b = clamp((b / a + b2) * a, 0.0, 1.0);
    r = clamp(r * i1 + r3 * i3 * a, 0.0, 1.0);
    g = clamp(g * i1 + g3 * i3 * a, 0.0, 1.0);
    b = clamp(b * i1 + b3 * i3 * a, 0.0, 1.0);
    r = r * brightness / 255.0;
    g = g * brightness / 255.0;
    b = b * brightness / 255.0;
    return vec4<f32>(r, g, b, a);
}`

    class ColorFilter extends Filter {
        constructor() {
            const colotTone = new Float32Array([0, 0, 0, 0]);
            const blendColor = new Float32Array([0, 0, 0, 0]);
            const colorUniforms = new UniformGroup({
                hue: {
                    value: 0.0,
                    type: "f32",
                },
                colorTone: {
                    value: colotTone,
                    size: 1,
                    type: "vec4<f32>"
                },
                blendColor: {
                    value: blendColor,
                    size: 1,
                    type: "vec4<f32>"
                },
                brightness: {
                    value: 255.0,
                    type: "f32"
                }
            });
            const gpuProgram = GpuProgram.from({
                vertex: {
                    source: vertex_gpu,
                    entryPoint: "mainVertex"
                },
                fragment: {
                    source: fragment_gpu,
                    entryPoint: "mainFragment"
                }
            });
            const glProgram = GlProgram.from({
                vertex: vertex_gl,
                fragment: fragment_gl,
                name: "rpg-color-filter"
            });
            const options = {
                glProgram,
                gpuProgram,
                resources: {
                    colorUniforms
                }
            }
            super(options);
            this.colorTone = colotTone;
            this.blendColor = blendColor;
            this.uniforms = colorUniforms.uniforms;
        }
        setHue(hue) {
            this.uniforms.hue = hue;
        }
        setColorTone(r, g, b, a) {
            const colorTone = this.colorTone;
            colorTone[0] = r;
            colorTone[1] = g;
            colorTone[2] = b;
            colorTone[3] = a;
        }
        setBlendColor(r, g, b, a) {
            const blendColor = this.blendColor;
            blendColor[0] = r;
            blendColor[1] = g;
            blendColor[2] = b;
            blendColor[3] = a;
        }
        setBrightness(brightness) {
            this.uniforms.brightness = brightness;
        }
        reset() {
            this.colorTone.fill(0);
            this.blendColor.fill(0);
            const uniforms = this.uniforms;
            uniforms.hue = 0;
            uniforms.brightness = 255;
        }
    }
    
    class FilterAdaptor {
        constructor() {
            this.filterPoolHash = Object.create(null);
        }
        installFilter(filterClass, filterName) {
            const hash = this.filterPoolHash;
            if (Reflect.has(hash, filterName)) return;
            hash[filterName] = createPool(`${filterName}`, filterClass, 100);
        }
        getFilter(filterName, filterOptions) {
            const hash = this.filterPoolHash;
            const filterClassPool = hash[filterName];
            if (filterClassPool === void 0) return null;
            return filterClassPool.get(filterOptions);
        }
        addFilter(displayObject, filterName) {
            if (displayObject[`_${filterName}`] !== void 0) {
                Logger.warn(`displayObject #${filterName} already exists`);
                return;
            }
            const filter = this.getFilter(filterName);
            if (filter === null) {
                Logger.warn(`${filterName} has not been installed in FilterManager \n please install it first`);
                return;
            }
            if (displayObject._filterEffect === null) {
                displayObject._filterEffect = FilterEffectPool.get();
                displayObject.addEffect(displayObject._filterEffect);
            }
            const effect = displayObject._filterEffect;
            const filters = effect.filters;
            displayObject[`_${filterName}`] = filter;
            filters.add(filter);
        }
        removeFilter(displayObject, filterName) {
            const effect = displayObject._filterEffect;
            if (effect === null) return;
            const filter = displayObject[`_${filterName}`];
            if (filter === void 0) return;
            const hash = this.filterPoolHash;
            const filterClassPool = hash[filterName];
            if (filterClassPool === void 0) {
                Logger.warn(`${filterName} has not been installed in FilterManager \n please install it first`);
                return;
            }
            filterClassPool.return(filter);
            const filters = effect.filters;
            filters.remove(filter);
            displayObject[`_${filterName}`] = void 0;
            if (filters.length === 0) {
                FilterEffectPool.return(effect);
                displayObject._filterEffect = null;
                displayObject.removeEffect(effect);
            }
        }
        clearFilters(displayObject) {
            const effect = displayObject._filterEffect;
            if (effect === null) return;
            const filters = effect.filters;
            const hash = this.filterPoolHash;
            for (let i = 0; i < filters.length; i++) {
                const filter = filters[i];
                const filterName = filter.constructor.name;
                const filterClassPool = hash[filterName];
                if (filterClassPool === void 0) {
                    Logger.warn(`${filterName} has not been installed in FilterManager \n please install it first`);
                    continue;
                }
                filterClassPool.return(filter);
                displayObject[`_${filterName}`] = void 0;
            }
            filters.length = 0;
            FilterEffectPool.return(effect);
            displayObject._filterEffect = null;
            displayObject.removeEffect(effect);
        }
    }

    const FilterManager = new FilterAdaptor();
    FilterManager.installFilter(ColorFilter, "ColorFilter");
    FilterManager.installFilter(AlphaFilter, "AlphaFilter");

    FilterSystem.vertex_gl = vertex_gl;
    FilterSystem.vertex_gpu = vertex_gpu;
    FilterSystem.FilterManager = FilterManager;
    FilterSystem.ColorFilter = ColorFilter;
    FilterSystem.FilterAdaptor = FilterAdaptor;
    FilterSystem.VERSION = "1.00";
    return FilterSystem;
})(Object.create(null));