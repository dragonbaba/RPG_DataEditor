"use strict";
Zaun.FilterExtension = ((FilterExtension) => {
    const { GpuProgram, GlProgram, Filter, UniformGroup } = PIXI;
    const { Color } = Zaun.Core.ColorSystem;
    const { vertex_gl, vertex_gpu, FilterManager } = Zaun.FilterSystem;
    const ZoomBlurFilter = (() => {
        const fragment_gpu = `
    struct ZoomBlurUniforms {
    uStrength:f32,
    uCenter:vec2<f32>,
    uRadius:vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};
const MAX_KERNEL_SIZE: f32 = \${MAX_KERNEL_SIZE};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> zoomBlurUniforms : ZoomBlurUniforms;

@fragment
fn mainFragment(
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uStrength:f32> = zoomBlurUniforms.uStrength;
  let uCenter:vec2<f32> = zoomBlurUniforms.uCenter;
  let uRadius:vec2<f32> = zoomBlurUniforms.uRadius;
  let inputSize:vec4<f32> = gfu.uInputSize;
  let radiusX:f32 = uRadius[0];
  let radiusY:f32 = uRadius[1];
  let centerX:f32 = uCenter[0];
  let centerY:f32 = uCenter[1];

  let minGradient: f32 = radiusX * 0.3;
  let innerRadius: f32 = (radiusX + minGradient * 0.5) / inputSize.x;

  let gradient: f32 = uRadius[1] * 0.3;
  let radius: f32 = (uRadius[1] - gradient * 0.5) / inputSize.x;

  var countLimit: f32 = MAX_KERNEL_SIZE;

  var dir: vec2<f32> = vec2<f32>(uCenter / inputSize.xy - uv);
  let dist: f32 = length(vec2<f32>(dir.x, dir.y * inputSize.y / inputSize.x));

  var strength: f32 = uStrength;

  var delta: f32 = 0.0;
  var gap: f32;

  if (dist < innerRadius) {
      delta = innerRadius - dist;
      gap = minGradient;
  } else if (radius >= 0.0 && dist > radius) {
      delta = dist - radius;
      gap = gradient;
  }

  var returnColorOnly: bool = false;

  if (delta > 0.0) {
    let normalCount: f32 = gap / inputSize.x;
    delta = (normalCount - delta) / normalCount;
    countLimit *= delta;
    strength *= delta;
    
    if (countLimit < 1.0){
      returnColorOnly = true;;
    }
  }
  let offset: f32 = rand(uv, 0.0);
  var total: f32 = 0.0;
  var color: vec4<f32> = vec4<f32>(0.);

  dir *= strength;
  for (var t = 0.0; t < MAX_KERNEL_SIZE; t += 1.0) {
    let percent: f32 = (t + offset) / MAX_KERNEL_SIZE;
    let weight: f32 = 4.0 * (percent - percent * percent);
    let p: vec2<f32> = uv + dir * percent;
    let sample: vec4<f32> = textureSample(uTexture, uSampler, p);
    if (t < countLimit){
      color += sample * weight;
      total += weight;
    }
  }
  color /= total;
  return select(color, textureSample(uTexture, uSampler, uv), returnColorOnly);
}

fn modulo(x: f32, y: f32) -> f32
{
  return x - y * floor(x/y);
}

fn rand(co: vec2<f32>, seed: f32) -> f32
{
  let a: f32 = 12.9898;
  let b: f32 = 78.233;
  let c: f32 = 43758.5453;
  let dt: f32 = dot(co + seed, vec2<f32>(a, b));
  let sn: f32 = modulo(dt, 3.14159);
  return fract(sin(sn) * c + seed);
}`;
        const fragment_gl = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uStrength;
uniform vec2 uCenter;
uniform vec2 uRadius;

uniform vec4 uInputSize;

const float MAX_KERNEL_SIZE=\${MAX_KERNEL_SIZE};

highp float rand(vec2 co,float seed){
    const highp float a=12.9898,b=78.233,c=43758.5453;
    highp float dt=dot(co+seed,vec2(a,b)),sn=mod(dt,3.14159);
    return fract(sin(sn)*c+seed);
}

void main(){
    float radiusX=uRadius[0];
    float radiusY=uRadius[1];
    float minGradient=radiusX*.3;
    float innerRadius=(radiusX+minGradient*.5)/uInputSize.x;
    
    float gradient=radiusY*.3;
    float radius=(radiusY-gradient*.5)/uInputSize.x;
    
    float countLimit=MAX_KERNEL_SIZE;
    
    vec2 dir=vec2(uCenter.xy/uInputSize.xy-vTextureCoord);
    float dist=length(vec2(dir.x,dir.y*uInputSize.y/uInputSize.x));
    
    float strength=uStrength;
    
    float delta=0.;
    float gap;
    if(dist<innerRadius){
        delta=innerRadius-dist;
        gap=minGradient;
    }else if(radius>=0.&&dist>radius){
        delta=dist-radius;
        gap=gradient;
    }
    
    if(delta>0.){
        float normalCount=gap/uInputSize.x;
        delta=(normalCount-delta)/normalCount;
        countLimit*=delta;
        strength*=delta;
        if(countLimit<1.){
            gl_FragColor=texture(uTexture,vTextureCoord);
            return;
        }
    }
    
    float offset=rand(vTextureCoord,0.);
    float total=0.;
    vec4 color=vec4(0.);
    dir*=strength;
    
    for(float t=0.;t<MAX_KERNEL_SIZE;t++){
        float percent=(t+offset)/MAX_KERNEL_SIZE;
        float weight=4.*(percent-percent*percent);
        vec2 p=vTextureCoord+dir*percent;
        vec4 sample=texture(uTexture,p);
        color+=sample*weight;
        total+=weight;
        if(t>countLimit){
            break;
        }
    }
    color/=total;
    gl_FragColor=color;
}`;
        const ZoomBlurDefaultOptions = {
            strength: 0.1,
            centerX: 0,
            centerY: 0,
            innerRadius: 0,
            radius: -1,
            maxKernelSize: "32.0",
        };
        const gpu_frag = fragment_gpu.replace("${MAX_KERNEL_SIZE}", ZoomBlurDefaultOptions.maxKernelSize);
        const gl_frag = fragment_gl.replace("${MAX_KERNEL_SIZE}", ZoomBlurDefaultOptions.maxKernelSize);

        class ZoomBlurFilter extends Filter {
            constructor(options = ZoomBlurDefaultOptions) {
                const gpuProgram = GpuProgram.from({
                    vertex: {
                        source: vertex_gpu,
                        entryPoint: "mainVertex"
                    },
                    fragment: {
                        source: gpu_frag,
                        entryPoint: "mainFragment"
                    }
                });
                const glProgram = GlProgram.from({
                    vertex: vertex_gl,
                    fragment: gl_frag,
                    name: "rpg_zoom_blur_filter"
                });
                const uniformGroup = new UniformGroup({
                    uStrength: {
                        value: options.strength,
                        type: "f32"
                    },
                    uCenter: {
                        value: new Float32Array([options.centerX, options.centerY]),
                        type: "vec2<f32>"
                    },
                    uRadius: {
                        value: new Float32Array([options.innerRadius, options.radius]),
                        type: "vec2<f32>"
                    }
                })
                super({
                    gpuProgram,
                    glProgram,
                    resources: {
                        zoomBlurUniforms: uniformGroup
                    }
                });
                this.strength = options.strength;
                this.centerX = options.centerX;
                this.centerY = options.centerY;
                this.innerRadius = options.innerRadius;
                this.radius = options.radius;
                this.uniforms = uniformGroup.uniforms;
            }
            apply(filterManager, input, output, clearMode) {
                const uniforms = this.uniforms;
                const uCenter = uniforms.uCenter;
                const uRadius = uniforms.uRadius;
                uCenter[0] = this.centerX;
                uCenter[1] = this.centerY;
                uRadius[0] = this.innerRadius;
                uRadius[1] = this.radius;
                uniforms.uStrength = this.strength;
                filterManager.applyFilter(this, input, output, clearMode);
            }
            reset() {
                const options = ZoomBlurDefaultOptions;
                this.strength = options.strength;
                this.centerX = options.centerX;
                this.centerY = options.centerY;
                this.innerRadius = options.innerRadius;
                this.radius = options.radius;
            }
        }
        FilterManager.installFilter(ZoomBlurFilter, "ZoomBlurFilter");
        return {
            Zoom_FragGl: fragment_gl,
            Zoom_FragGpu: fragment_gpu,
            filter: ZoomBlurFilter,
            __proto__: null
        }
    })();
    const GodrayFilter = (() => {
        const fragment_gl = `
        precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uDimensions;
uniform float uParallel;
uniform vec2 uLight;
uniform float uAspect;
uniform float uTime;
uniform vec3 uRay;

uniform vec4 uInputSize;

vec3 mod289(vec3 x)
{
    return x-floor(x*(1./289.))*289.;
}
vec4 mod289(vec4 x)
{
    return x-floor(x*(1./289.))*289.;
}
vec4 permute(vec4 x)
{
    return mod289(((x*34.)+1.)*x);
}
vec4 taylorInvSqrt(vec4 r)
{
    return 1.79284291400159-.85373472095314*r;
}
vec3 fade(vec3 t)
{
    return t*t*t*(t*(t*6.-15.)+10.);
}
float pnoise(vec3 P,vec3 rep)
{
    vec3 Pi0=mod(floor(P),rep);
    vec3 Pi1=mod(Pi0+vec3(1.),rep);
    Pi0=mod289(Pi0);
    Pi1=mod289(Pi1);
    vec3 Pf0=fract(P);
    vec3 Pf1=Pf0-vec3(1.);
    vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);
    vec4 iy=vec4(Pi0.yy,Pi1.yy);
    vec4 iz0=Pi0.zzzz;
    vec4 iz1=Pi1.zzzz;
    vec4 ixy=permute(permute(ix)+iy);
    vec4 ixy0=permute(ixy+iz0);
    vec4 ixy1=permute(ixy+iz1);
    vec4 gx0=ixy0*(1./7.);
    vec4 gy0=fract(floor(gx0)*(1./7.))-.5;
    gx0=fract(gx0);
    vec4 gz0=vec4(.5)-abs(gx0)-abs(gy0);
    vec4 sz0=step(gz0,vec4(0.));
    gx0-=sz0*(step(0.,gx0)-.5);
    gy0-=sz0*(step(0.,gy0)-.5);
    vec4 gx1=ixy1*(1./7.);
    vec4 gy1=fract(floor(gx1)*(1./7.))-.5;
    gx1=fract(gx1);
    vec4 gz1=vec4(.5)-abs(gx1)-abs(gy1);
    vec4 sz1=step(gz1,vec4(0.));
    gx1-=sz1*(step(0.,gx1)-.5);
    gy1-=sz1*(step(0.,gy1)-.5);
    vec3 g000=vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100=vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010=vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110=vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001=vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101=vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011=vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111=vec3(gx1.w,gy1.w,gz1.w);
    vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
    g000*=norm0.x;
    g010*=norm0.y;
    g100*=norm0.z;
    g110*=norm0.w;
    vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
    g001*=norm1.x;
    g011*=norm1.y;
    g101*=norm1.z;
    g111*=norm1.w;
    float n000=dot(g000,Pf0);
    float n100=dot(g100,vec3(Pf1.x,Pf0.yz));
    float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));
    float n110=dot(g110,vec3(Pf1.xy,Pf0.z));
    float n001=dot(g001,vec3(Pf0.xy,Pf1.z));
    float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));
    float n011=dot(g011,vec3(Pf0.x,Pf1.yz));
    float n111=dot(g111,Pf1);
    vec3 fade_xyz=fade(Pf0);
    vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);
    vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);
    float n_xyz=mix(n_yz.x,n_yz.y,fade_xyz.x);
    return 2.2*n_xyz;
}
float turb(vec3 P,vec3 rep,float lacunarity,float gain)
{
    float sum=0.;
    float sc=1.;
    float totalgain=1.;
    for(float i=0.;i<6.;i++){
        sum+=totalgain*pnoise(P*sc,rep);
        sc*=lacunarity;
        totalgain*=gain;
    }
    return abs(sum);
}

void main(void){
    vec2 uDimensions=uDimensions;
    bool uParallel=uParallel>.5;
    vec2 uLight=uLight;
    float uAspect=uAspect;
    
    vec2 coord=vTextureCoord*uInputSize.xy/uDimensions;
    
    float d;
    
    if(uParallel){
        float _cos=uLight.x;
        float _sin=uLight.y;
        d=(_cos*coord.x)+(_sin*coord.y*uAspect);
    }else{
        float dx=coord.x-uLight.x/uDimensions.x;
        float dy=(coord.y-uLight.y/uDimensions.y)*uAspect;
        float dis=sqrt(dx*dx+dy*dy)+.00001;
        d=dy/dis;
    }
    
    float uTime=uTime;
    vec3 uRay=uRay;
    
    float gain=uRay[0];
    float lacunarity=uRay[1];
    float alpha=uRay[2];
    
    vec3 dir=vec3(d,d,0.);
    float noise=turb(dir+vec3(uTime,0.,62.1+uTime)*.05,vec3(480.,320.,480.),lacunarity,gain);
    noise=mix(noise,0.,.3);
    vec4 mist=vec4(vec3(noise),1.)*(1.-coord.y);
    mist.a=1.;
    mist*=alpha;
    finalColor=texture(uTexture,vTextureCoord)+mist;
}`;
        const fragment_gpu = `
        struct GodrayUniforms {
  uLight: vec2<f32>,
  uParallel: f32,
  uAspect: f32,
  uTime: f32,
  uRay: vec3<f32>,
  uDimensions: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> godrayUniforms : GodrayUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uDimensions: vec2<f32> = godrayUniforms.uDimensions;
  let uParallel: bool = godrayUniforms.uParallel > 0.5;
  let uLight: vec2<f32> = godrayUniforms.uLight;
  let uAspect: f32 = godrayUniforms.uAspect;

  let coord: vec2<f32> = uv * gfu.uInputSize.xy / uDimensions;

  var d: f32;

  if (uParallel) {
    let _cos: f32 = uLight.x;
    let _sin: f32 = uLight.y;
    d = (_cos * coord.x) + (_sin * coord.y * uAspect);
  } else {
    let dx: f32 = coord.x - uLight.x / uDimensions.x;
    let dy: f32 = (coord.y - uLight.y / uDimensions.y) * uAspect;
    let dis: f32 = sqrt(dx * dx + dy * dy) + 0.00001;
    d = dy / dis;
  }

  let uTime: f32 = godrayUniforms.uTime;
  let uRay: vec3<f32> = godrayUniforms.uRay;
  
  let gain = uRay[0];
  let lacunarity = uRay[1];
  let alpha = uRay[2];

  let dir: vec3<f32> = vec3<f32>(d, d, 0.0);
  var noise: f32 = turb(dir + vec3<f32>(uTime, 0.0, 62.1 + uTime) * 0.05, vec3<f32>(480.0, 320.0, 480.0), lacunarity, gain);
  noise = mix(noise, 0.0, 0.3);
  var mist: vec4<f32> = vec4<f32>(vec3<f32>(noise), 1.0) * (1.0 - coord.y);
  mist.a = 1.0;
  mist *= alpha;
  return textureSample(uTexture, uSampler, uv) + mist;
}
fn moduloVec3(x: vec3<f32>, y: vec3<f32>) -> vec3<f32>
{
  return x - y * floor(x/y);
}
fn mod289Vec3(x: vec3<f32>) -> vec3<f32>
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
fn mod289Vec4(x: vec4<f32>) -> vec4<f32>
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
fn permute4(x: vec4<f32>) -> vec4<f32>
{
    return mod289Vec4(((x * 34.0) + 1.0) * x);
}
fn taylorInvSqrt(r: vec4<f32>) -> vec4<f32>
{
    return 1.79284291400159 - 0.85373472095314 * r;
}
fn fade3(t: vec3<f32>) -> vec3<f32>
{
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
fn fade2(t: vec2<f32>) -> vec2<f32> { return t * t * t * (t * (t * 6. - 15.) + 10.); }

fn perlinNoise2(P: vec2<f32>) -> f32 {
  var Pi: vec4<f32> = floor(P.xyxy) + vec4<f32>(0., 0., 1., 1.);
  let Pf = fract(P.xyxy) - vec4<f32>(0., 0., 1., 1.);
  Pi = Pi % vec4<f32>(289.); // To avoid truncation effects in permutation
  let ix = Pi.xzxz;
  let iy = Pi.yyww;
  let fx = Pf.xzxz;
  let fy = Pf.yyww;
  let i = permute4(permute4(ix) + iy);
  var gx: vec4<f32> = 2. * fract(i * 0.0243902439) - 1.; // 1/41 = 0.024...
  let gy = abs(gx) - 0.5;
  let tx = floor(gx + 0.5);
  gx = gx - tx;
  var g00: vec2<f32> = vec2<f32>(gx.x, gy.x);
  var g10: vec2<f32> = vec2<f32>(gx.y, gy.y);
  var g01: vec2<f32> = vec2<f32>(gx.z, gy.z);
  var g11: vec2<f32> = vec2<f32>(gx.w, gy.w);
  let norm = 1.79284291400159 - 0.85373472095314 *
      vec4<f32>(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
  g00 = g00 * norm.x;
  g01 = g01 * norm.y;
  g10 = g10 * norm.z;
  g11 = g11 * norm.w;
  let n00 = dot(g00, vec2<f32>(fx.x, fy.x));
  let n10 = dot(g10, vec2<f32>(fx.y, fy.y));
  let n01 = dot(g01, vec2<f32>(fx.z, fy.z));
  let n11 = dot(g11, vec2<f32>(fx.w, fy.w));
  let fade_xy = fade2(Pf.xy);
  let n_x = mix(vec2<f32>(n00, n01), vec2<f32>(n10, n11), vec2<f32>(fade_xy.x));
  let n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

// Classic Perlin noise, periodic variant
fn perlinNoise3(P: vec3<f32>, rep: vec3<f32>) -> f32
{
    var Pi0: vec3<f32> = moduloVec3(floor(P), rep); // Integer part, modulo period
    var Pi1: vec3<f32> = moduloVec3(Pi0 + vec3<f32>(1.0), rep); // Integer part + 1, mod period
    Pi0 = mod289Vec3(Pi0);
    Pi1 = mod289Vec3(Pi1);
    let Pf0: vec3<f32> = fract(P); // Fractional part for interpolation
    let Pf1: vec3<f32> = Pf0 - vec3<f32>(1.0); // Fractional part - 1.0
    let ix: vec4<f32> = vec4<f32>(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    let iy: vec4<f32> = vec4<f32>(Pi0.yy, Pi1.yy);
    let iz0: vec4<f32> = Pi0.zzzz;
    let iz1: vec4<f32> = Pi1.zzzz;
    let ixy: vec4<f32> = permute4(permute4(ix) + iy);
    let ixy0: vec4<f32> = permute4(ixy + iz0);
    let ixy1: vec4<f32> = permute4(ixy + iz1);
    var gx0: vec4<f32> = ixy0 * (1.0 / 7.0);
    var gy0: vec4<f32> = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    let gz0: vec4<f32> = vec4<f32>(0.5) - abs(gx0) - abs(gy0);
    let sz0: vec4<f32> = step(gz0, vec4<f32>(0.0));
    gx0 -= sz0 * (step(vec4<f32>(0.0), gx0) - 0.5);
    gy0 -= sz0 * (step(vec4<f32>(0.0), gy0) - 0.5);
    var gx1: vec4<f32> = ixy1 * (1.0 / 7.0);
    var gy1: vec4<f32> = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    let gz1: vec4<f32> = vec4<f32>(0.5) - abs(gx1) - abs(gy1);
    let sz1: vec4<f32> = step(gz1, vec4<f32>(0.0));
    gx1 -= sz1 * (step(vec4<f32>(0.0), gx1) - 0.5);
    gy1 -= sz1 * (step(vec4<f32>(0.0), gy1) - 0.5);
    var g000: vec3<f32> = vec3<f32>(gx0.x, gy0.x, gz0.x);
    var g100: vec3<f32> = vec3<f32>(gx0.y, gy0.y, gz0.y);
    var g010: vec3<f32> = vec3<f32>(gx0.z, gy0.z, gz0.z);
    var g110: vec3<f32> = vec3<f32>(gx0.w, gy0.w, gz0.w);
    var g001: vec3<f32> = vec3<f32>(gx1.x, gy1.x, gz1.x);
    var g101: vec3<f32> = vec3<f32>(gx1.y, gy1.y, gz1.y);
    var g011: vec3<f32> = vec3<f32>(gx1.z, gy1.z, gz1.z);
    var g111: vec3<f32> = vec3<f32>(gx1.w, gy1.w, gz1.w);
    let norm0: vec4<f32> = taylorInvSqrt(vec4<f32>(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    let norm1: vec4<f32> = taylorInvSqrt(vec4<f32>(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;
    let n000: f32 = dot(g000, Pf0);
    let n100: f32 = dot(g100, vec3<f32>(Pf1.x, Pf0.yz));
    let n010: f32 = dot(g010, vec3<f32>(Pf0.x, Pf1.y, Pf0.z));
    let n110: f32 = dot(g110, vec3<f32>(Pf1.xy, Pf0.z));
    let n001: f32 = dot(g001, vec3<f32>(Pf0.xy, Pf1.z));
    let n101: f32 = dot(g101, vec3<f32>(Pf1.x, Pf0.y, Pf1.z));
    let n011: f32 = dot(g011, vec3<f32>(Pf0.x, Pf1.yz));
    let n111: f32 = dot(g111, Pf1);
    let fade_xyz: vec3<f32> = fade3(Pf0);
    let n_z: vec4<f32> = mix(vec4<f32>(n000, n100, n010, n110), vec4<f32>(n001, n101, n011, n111), fade_xyz.z);
    let n_yz: vec2<f32> = mix(n_z.xy, n_z.zw, fade_xyz.y);
    let n_xyz: f32 = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
}
fn turb(P: vec3<f32>, rep: vec3<f32>, lacunarity: f32, gain: f32) -> f32
{
    var sum: f32 = 0.0;
    var sc: f32 = 1.0;
    var totalgain: f32 = 1.0;
    for (var i = 0.0; i < 6.0; i += 1)
    {
        sum += totalgain * perlinNoise3(P * sc, rep);
        sc *= lacunarity;
        totalgain *= gain;
    }
    return abs(sum);
}`;
        const GodrayDefaultOptions = {
            angle: 30,
            gain: 0.5,
            lacunarity: 2.5,
            time: 0,
            alpha: 1,
        };
        class GodrayFilter extends PIXI.Filter {
            constructor(options = GodrayDefaultOptions) {
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
                    name: "rpg_godray_filter"
                });
                const godrayUniforms = new UniformGroup({
                    uLight: {
                        value: new Float32Array(2),
                        type: "vec2<f32>"
                    },
                    uParallel: {
                        value: 1,
                        type: "f32"
                    },
                    uAspect: {
                        value: 0,
                        type: "f32"
                    },
                    uTime: {
                        value: 0,
                        type: "f32"
                    },
                    uRay: {
                        value: new Float32Array(3),
                        type: "vec3<f32>"
                    },
                    uDimensions: {
                        value: new Float32Array(2),
                        type: "vec2<f32>"
                    }
                });
                super({
                    glProgram,
                    gpuProgram,
                    resources: {
                        godrayUniforms
                    }
                });
                this._angle = 0;
                this.anagleX = 0;
                this.anagleY = 0;
                this.time = options.time || 0;
                this.gain = options.gain;
                this.lacunarity = options.lacunarity;
                this.alpha = options.alpha;
                this.angle = options.angle;
                this.uniforms = godrayUniforms.uniforms;
            }
            apply(filterManager, input, output, clearMode) {
                const frame = input.frame;
                const width = frame.width;
                const height = frame.height;
                const uniforms = this.uniforms;
                const uLight = uniforms.uLight;
                const uRay = uniforms.uRay;
                uRay[0] = this.gain;
                uRay[1] = this.lacunarity;
                uRay[2] = this.alpha
                uLight[0] = this.angleX;
                uLight[1] = this.angleY;
                const uDimensions = uniforms.uDimensions;
                uDimensions[0] = width;
                uDimensions[1] = height;
                uniforms.uAspect = height / width;
                uniforms.uTime = this.time;
                filterManager.applyFilter(this, input, output, clearMode);
            }
            get angle() {
                return this._angle;
            }
            set angle(t) {
                this._angle = t;
                const e = t * Math.angle;
                this._angleX = Math.cos(e);
                this._angleY = Math.sin(e);
            }
            reset() {
                const options = GodrayDefaultOptions;
                this.time = options.time || 0;
                this.gain = options.gain;
                this.lacunarity = options.lacunarity;
                this.alpha = options.alpha;
                this.angle = options.angle;
            }
        }
        FilterManager.installFilter(GodrayFilter, "GodrayFilter");
        return {
            filter: GodrayFilter,
            Godray_FragGl: fragment_gl,
            Godray_FragGpu: fragment_gpu,
            __proto__: null
        }
    })();
    const OldFilmFilter = (() => {
        const fragment_gpu = `
    struct OldFilmUniforms {
    uSepia: f32,
    uNoise: vec2<f32>,
    uScratch: vec3<f32>,
    uVignetting: vec3<f32>,
    uSeed: f32,
    uDimensions: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> oldFilmUniforms : OldFilmUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  var color: vec4<f32> = textureSample(uTexture, uSampler, uv);

  if (oldFilmUniforms.uSepia > 0.)
  {
    color = vec4<f32>(sepia(color.rgb), color.a);
  }

  let coord: vec2<f32> = uv * gfu.uInputSize.xy / oldFilmUniforms.uDimensions;

  if (oldFilmUniforms.uVignetting[0] > 0.)
  {
    color *= vec4<f32>(vec3<f32>(vignette(color.rgb, coord)), color.a);
  }
  let uScratch = oldFilmUniforms.uScratch; 
  if (uScratch[1] > oldFilmUniforms.uSeed && uScratch[0] != 0.)
  {
    color = vec4<f32>(scratch(color.rgb, coord), color.a);
  }
  let uNoise = oldFilmUniforms.uNoise;
  if (uNoise[0] > 0.0 && uNoise[1] > 0.0)
  {
    color += vec4<f32>(vec3<f32>(noise(uv)), color.a);
  }

  return color;
}

const SQRT_2: f32 = 1.414213;
const SEPIA_RGB: vec3<f32> = vec3<f32>(112.0 / 255.0, 66.0 / 255.0, 20.0 / 255.0);

fn modulo(x: f32, y: f32) -> f32
{
  return x - y * floor(x/y);
}

fn rand(co: vec2<f32>) -> f32
{
  return fract(sin(dot(co, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

fn overlay(src: vec3<f32>, dst: vec3<f32>) -> vec3<f32>
{
    return vec3<f32>(
      select((1.0 - 2.0 * (1.0 - dst.x) * (1.0 - src.x)), (2.0 * src.x * dst.x), (dst.x <= 0.5)), 
      select((1.0 - 2.0 * (1.0 - dst.y) * (1.0 - src.y)), (2.0 * src.y * dst.y), (dst.y <= 0.5)),
      select((1.0 - 2.0 * (1.0 - dst.z) * (1.0 - src.z)), (2.0 * src.z * dst.z), (dst.z <= 0.5))
    );
}

fn sepia(co: vec3<f32>) -> vec3<f32>
{
  let gray: f32 = (co.x + co.y + co.z) / 3.0;
  let grayscale: vec3<f32> = vec3<f32>(gray);
  let color = overlay(SEPIA_RGB, grayscale);
  return grayscale + oldFilmUniforms.uSepia * (color - grayscale);
}

fn vignette(co: vec3<f32>, coord: vec2<f32>) -> f32
{
  let uVignetting = oldFilmUniforms.uVignetting;
  let uDimensions = oldFilmUniforms.uDimensions;
  let outter: f32 = SQRT_2 - uVignetting[0] * SQRT_2;
  var dir: vec2<f32> = vec2<f32>(vec2<f32>(0.5) - coord);
  dir.y *= uDimensions.y / uDimensions.x;
  let darker: f32 = clamp((outter - length(dir) * SQRT_2) / ( 0.00001 + uVignetting[2] * SQRT_2), 0.0, 1.0);
  return darker + (1.0 - darker) * (1.0 - uVignetting[1]);
}

fn scratch(co: vec3<f32>, coord: vec2<f32>) -> vec3<f32>
{
  var color = co;
  let uScratch = oldFilmUniforms.uScratch;
  let uSeed = oldFilmUniforms.uSeed;
  let uDimensions = oldFilmUniforms.uDimensions;

  let phase: f32 = uSeed * 256.0;
  let s: f32 = modulo(floor(phase), 2.0);
  let dist: f32 = 1.0 / uScratch[1];
  let d: f32 = distance(coord, vec2<f32>(uSeed * dist, abs(s - uSeed * dist)));

  if (d < uSeed * 0.6 + 0.4)
  {
    let period: f32 = uScratch[1] * 10.0;
    let xx: f32 = coord.x * period + phase;
    let aa: f32 = abs(modulo(xx, 0.5) * 4.0);
    let bb: f32 = modulo(floor(xx / 0.5), 2.0);
    let yy: f32 = (1.0 - bb) * aa + bb * (2.0 - aa);
    let kk: f32 = 2.0 * period;
    let dw: f32 = uScratch[2] / uDimensions.x * (0.75 + uSeed);
    let dh: f32 = dw * kk;
    var tine: f32 = (yy - (2.0 - dh));

    if (tine > 0.0) {
        let _sign: f32 = sign(uScratch[0]);
        tine = s * tine / period + uScratch[0] + 0.1;
        tine = clamp(tine + 1.0, 0.5 + _sign * 0.5, 1.5 + _sign * 0.5);
        color *= tine;
    }
  }
  return color;
}

fn noise(coord: vec2<f32>) -> f32
{
  let uNoise = oldFilmUniforms.uNoise;
  let uSeed = oldFilmUniforms.uSeed;

  var pixelCoord: vec2<f32> = coord * gfu.uInputSize.xy;
  pixelCoord.x = floor(pixelCoord.x / uNoise[1]);
  pixelCoord.y = floor(pixelCoord.y / uNoise[1]);
  return (rand(pixelCoord * uNoise[1] * uSeed) - 0.5) * uNoise[0];
}`
        const fragment_gl = `
        precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uSepia;
uniform vec2 uNoise;
uniform vec3 uScratch;
uniform vec3 uVignetting;
uniform float uSeed;
uniform vec2 uDimensions;

uniform vec4 uInputSize;

const float SQRT_2 = 1.414213;
const vec3 SEPIA_RGB = vec3(112.0 / 255.0, 66.0 / 255.0, 20.0 / 255.0);

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 Overlay(vec3 src, vec3 dst)
{
    return vec3((dst.x <= 0.5) ? (2.0 * src.x * dst.x) : (1.0 - 2.0 * (1.0 - dst.x) * (1.0 - src.x)),
                (dst.y <= 0.5) ? (2.0 * src.y * dst.y) : (1.0 - 2.0 * (1.0 - dst.y) * (1.0 - src.y)),
                (dst.z <= 0.5) ? (2.0 * src.z * dst.z) : (1.0 - 2.0 * (1.0 - dst.z) * (1.0 - src.z)));
}


void main()
{
    finalColor = texture(uTexture, vTextureCoord);
    vec3 color = finalColor.rgb;

    if (uSepia > 0.0)
    {
        float gray = (color.x + color.y + color.z) / 3.0;
        vec3 grayscale = vec3(gray);

        color = Overlay(SEPIA_RGB, grayscale);

        color = grayscale + uSepia * (color - grayscale);
    }

    vec2 coord = vTextureCoord * uInputSize.xy / uDimensions.xy;

    float vignette = uVignetting[0];
    float vignetteAlpha = uVignetting[1];
    float vignetteBlur = uVignetting[2];

    if (vignette > 0.0)
    {
        float outter = SQRT_2 - vignette * SQRT_2;
        vec2 dir = vec2(vec2(0.5, 0.5) - coord);
        dir.y *= uDimensions.y / uDimensions.x;
        float darker = clamp((outter - length(dir) * SQRT_2) / ( 0.00001 + vignetteBlur * SQRT_2), 0.0, 1.0);
        color.rgb *= darker + (1.0 - darker) * (1.0 - vignetteAlpha);
    }

    float scratch = uScratch[0];
    float scratchDensity = uScratch[1];
    float scratchWidth = uScratch[2];

    if (scratchDensity > uSeed && scratch != 0.0)
    {
        float phase = uSeed * 256.0;
        float s = mod(floor(phase), 2.0);
        float dist = 1.0 / scratchDensity;
        float d = distance(coord, vec2(uSeed * dist, abs(s - uSeed * dist)));
        if (d < uSeed * 0.6 + 0.4)
        {
            highp float period = scratchDensity * 10.0;

            float xx = coord.x * period + phase;
            float aa = abs(mod(xx, 0.5) * 4.0);
            float bb = mod(floor(xx / 0.5), 2.0);
            float yy = (1.0 - bb) * aa + bb * (2.0 - aa);

            float kk = 2.0 * period;
            float dw = scratchWidth / uDimensions.x * (0.75 + uSeed);
            float dh = dw * kk;

            float tine = (yy - (2.0 - dh));

            if (tine > 0.0) {
                float _sign = sign(scratch);

                tine = s * tine / period + scratch + 0.1;
                tine = clamp(tine + 1.0, 0.5 + _sign * 0.5, 1.5 + _sign * 0.5);

                color.rgb *= tine;
            }
        }
    }

    float noise = uNoise[0];
    float noiseSize = uNoise[1];

    if (noise > 0.0 && noiseSize > 0.0)
    {
        vec2 pixelCoord = vTextureCoord.xy * uInputSize.xy;
        pixelCoord.x = floor(pixelCoord.x / noiseSize);
        pixelCoord.y = floor(pixelCoord.y / noiseSize);
        // vec2 d = pixelCoord * noiseSize * vec2(1024.0 + uSeed * 512.0, 1024.0 - uSeed * 512.0);
        // float _noise = snoise(d) * 0.5;
        float _noise = rand(pixelCoord * noiseSize * uSeed) - 0.5;
        color += _noise * noise;
    }

    finalColor.rgb = color;
}`;
        const OldFilmOptions = {
            sepia: 0.3,
            noise: 0.3,
            noiseSize: 1,
            scratch: 0.5,
            scratchDensity: 0.3,
            scratchWidth: 1,
            vignetting: 0.3,
            vignettingAlpha: 1,
            vignettingBlur: 0.3,
            seed: 0,
        };
        class OldFilmFilter extends PIXI.Filter {
            constructor(options = OldFilmOptions) {
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
                    name: "rpg_oldFilm_filter"
                });
                const oldFilmUniforms = new UniformGroup({
                    uSepia: {
                        value: options.sepia,
                        type: "f32"
                    },
                    uNoise: {
                        value: new Float32Array(2),
                        type: "vec2<f32>"
                    },
                    uScratch: {
                        value: new Float32Array(3),
                        type: "vec3<f32>"
                    },
                    uVignetting: {
                        value: new Float32Array(3),
                        type: "vec3<f32>"
                    },
                    uSeed: {
                        value: options.seed,
                        type: "f32"
                    },
                    uDimensions: {
                        value: new Float32Array(2),
                        type: "vec2<f32>"
                    }
                })
                super({
                    glProgram,
                    gpuProgram,
                    resources: {
                        oldFilmUniforms
                    }
                });
                this.sepia = options.sepia;
                this.noise = options.noise;
                this.noiseSize = options.noiseSize;
                this.scratch = options.scratch;
                this.scratchDensity = options.scratchDensity;
                this.scratchWidth = options.scratchWidth;
                this.vignetting = options.vignetting;
                this.vignettingAlpha = options.vignettingAlpha;
                this.vignettingBlur = options.vignettingBlur;
                this.seed = options.seed;
                this.uniforms = oldFilmUniforms.uniforms;
            }
            apply(filterManager, input, output, clearMode) {
                const uniforms = this.uniforms;
                const uNoise = uniforms.uNoise;
                const uScratch = uniforms.uScratch;
                const uVignetting = uniforms.uVignetting;
                const uDimensions = uniforms.uDimensions;
                const frame = input.frame;
                const width = frame.width;
                const height = frame.height;
                uDimensions[0] = width;
                uDimensions[1] = height;
                uNoise[0] = this.noise;
                uNoise[1] = this.noiseSize;
                uScratch[0] = this.scratch;
                uScratch[1] = this.scratchDensity;
                uScratch[2] = this.scratchWidth;
                uVignetting[0] = this.vignetting;
                uVignetting[1] = this.vignettingAlpha;
                uVignetting[2] = this.vignettingBlur;
                uniforms.uSeed = this.seed;
                uniforms.uSepia = this.sepia;
                filterManager.applyFilter(this, input, output, clearMode);
            }
            reset() {
                const options = OldFilmOptions;
                this.sepia = options.sepia;
                this.noise = options.noise;
                this.noiseSize = options.noiseSize;
                this.scratch = options.scratch;
                this.scratchDensity = options.scratchDensity;
                this.scratchWidth = options.scratchWidth;
                this.vignetting = options.vignetting;
                this.vignettingAlpha = options.vignettingAlpha;
                this.vignettingBlur = options.vignettingBlur;
                this.seed = options.seed;
            }
        };
        FilterManager.installFilter(OldFilmFilter, "OldFilmFilter");
        return {
            filter: OldFilmFilter,
            OldFilm_FragGl: fragment_gl,
            OldFilm_FragGpu: fragment_gpu,
            __proto__: null
        }
    })();
    const CRTFFilter = (() => {
        const fragment_gpu = `
        struct CRTUniforms {
    uLine: vec4<f32>,
    uNoise: vec2<f32>,
    uVignette: vec3<f32>,
    uSeed: f32,
    uTime: f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> crtUniforms : CRTUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
    
  var color: vec4<f32> = textureSample(uTexture, uSampler, uv);
  let coord: vec2<f32> = uv * gfu.uInputSize.xy / gfu.uOutputFrame.zw;

  let uNoise = crtUniforms.uNoise;

  if (uNoise[0] > 0.0 && uNoise[1] > 0.0)
  {
    color += vec4<f32>(vec3<f32>(noise(uv)), color.a);
  }

  if (crtUniforms.uVignette[0] > 0.)
  {
    color *= vec4<f32>(vec3<f32>(vignette(color.rgb, coord)), color.a);
  }

  if (crtUniforms.uLine[1] > 0.0)
  {
    color = vec4<f32>(vec3<f32>(interlaceLines(color.rgb, uv)), color.a);  
  }

  return color;
}

const SQRT_2: f32 = 1.414213;

fn modulo(x: f32, y: f32) -> f32
{
  return x - y * floor(x/y);
}

fn rand(co: vec2<f32>) -> f32
{
  return fract(sin(dot(co, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

fn vignette(co: vec3<f32>, coord: vec2<f32>) -> f32
{
  let uVignette = crtUniforms.uVignette;
  let uDimensions = gfu.uOutputFrame.zw;
  
  let outter: f32 = SQRT_2 - uVignette[0] * SQRT_2;
  var dir: vec2<f32> = vec2<f32>(0.5) - coord;
  dir.y *= uDimensions.y / uDimensions.x;
  let darker: f32 = clamp((outter - length(dir) * SQRT_2) / ( 0.00001 + uVignette[2] * SQRT_2), 0.0, 1.0);
  return darker + (1.0 - darker) * (1.0 - uVignette[1]);
}

fn noise(coord: vec2<f32>) -> f32
{
  let uNoise = crtUniforms.uNoise;
  let uSeed = crtUniforms.uSeed;

  var pixelCoord: vec2<f32> = coord * gfu.uInputSize.xy;
  pixelCoord.x = floor(pixelCoord.x / uNoise[1]);
  pixelCoord.y = floor(pixelCoord.y / uNoise[1]);
  return (rand(pixelCoord * uNoise[1] * uSeed) - 0.5) * uNoise[0];
}

fn interlaceLines(co: vec3<f32>, coord: vec2<f32>) -> vec3<f32>
{
  var color = co;

  let uDimensions = gfu.uOutputFrame.zw;

  let curvature: f32 = crtUniforms.uLine[0];
  let lineWidth: f32 = crtUniforms.uLine[1];
  let lineContrast: f32 = crtUniforms.uLine[2];
  let verticalLine: f32 = crtUniforms.uLine[3];

  let dir: vec2<f32> = vec2<f32>(coord * gfu.uInputSize.xy / uDimensions - 0.5);

  let _c: f32 = select(1., curvature, curvature > 0.);
  let k: f32 = select(1., (length(dir * dir) * 0.25 * _c * _c + 0.935 * _c), curvature > 0.);
  let uv: vec2<f32> = dir * k;
  let v: f32 = select(uv.y * uDimensions.y, uv.x * uDimensions.x, verticalLine > 0.5) * min(1.0, 2.0 / lineWidth ) / _c;
  let j: f32 = 1. + cos(v * 1.2 - crtUniforms.uTime) * 0.5 * lineContrast;
  color *= j;

  let segment: f32 = select(modulo((dir.y + .5) * uDimensions.y, 4.), modulo((dir.x + .5) * uDimensions.x, 4.), verticalLine > 0.5);
  color *= 0.99 + ceil(segment) * 0.015;

  return color;
}`;
        const fragment_gl = `
        precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uLine;
uniform vec2 uNoise;
uniform vec3 uVignette;
uniform float uSeed;
uniform float uTime;
uniform vec2 uDimensions;

uniform vec4 uInputSize;
uniform vec4 outputFrame;

const float SQRT_2 = 1.414213;

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float vignette(vec3 co, vec2 coord)
{
    float outter = SQRT_2 - uVignette[0] * SQRT_2;
    vec2 dir = vec2(0.5) - coord;
    dir.y *= outputFrame.z / outputFrame.w;
    float darker = clamp((outter - length(dir) * SQRT_2) / ( 0.00001 + uVignette[2] * SQRT_2), 0.0, 1.0);
    return darker + (1.0 - darker) * (1.0 - uVignette[1]);
}

float noise(vec2 coord)
{
    vec2 pixelCoord = coord * uInputSize.xy;
    pixelCoord.x = floor(pixelCoord.x / uNoise[1]);
    pixelCoord.y = floor(pixelCoord.y / uNoise[1]);
    return (rand(pixelCoord * uNoise[1] * uSeed) - 0.5) * uNoise[0];
}

vec3 interlaceLines(vec3 co, vec2 coord)
{
    vec3 color = co;

    float curvature = uLine[0];
    float lineWidth = uLine[1];
    float lineContrast = uLine[2];
    float verticalLine = uLine[3];
    float outputFrameZ = outputFrame.z;
    float ouputFrameW = outputFrame.w;

    vec2 dir = vec2(coord * uInputSize.xy / outputFrame.zw - 0.5);

    float _c = curvature > 0. ? curvature : 1.;
    float k = curvature > 0. ? (length(dir * dir) * 0.25 * _c * _c + 0.935 * _c) : 1.;
    vec2 uv = dir * k;
    float v = verticalLine > 0.5 ? uv.x * outputFrameZ : uv.y * ouputFrameW;
    v *= min(1.0, 2.0 / lineWidth ) / _c;
    float j = 1. + cos(v * 1.2 - uTime) * 0.5 * lineContrast;
    color *= j;

    float segment = verticalLine > 0.5 ? mod((dir.x + .5) * outputFrameZ, 4.) : mod((dir.y + .5) * outputFrameW, 4.);
    color *= 0.99 + ceil(segment) * 0.015;

    return color;
}

void main(void)
{
    finalColor = texture(uTexture, vTextureCoord);
    vec2 coord = vTextureCoord * uInputSize.xy / outputFrame.zw;

    if (uNoise[0] > 0.0 && uNoise[1] > 0.0)
    {
        float n = noise(vTextureCoord);
        finalColor += vec4(n, n, n, finalColor.a);
    }

    if (uVignette[0] > 0.)
    {
        float v = vignette(finalColor.rgb, coord);
        finalColor *= vec4(v, v, v, finalColor.a);
    }

    if (uLine[1] > 0.0)
    {
        finalColor = vec4(interlaceLines(finalColor.rgb, vTextureCoord), finalColor.a);  
    }
}
`;
        const CRTFOptions = {
            curvature: 1.0,
            lineWidth: 1.0,
            lineContrast: 0.25,
            verticalLine: false,
            noise: 0.0,
            noiseSize: 1.0,
            vignetting: 0.3,
            vignettingAlpha: 1.0,
            vignettingBlur: 0.3,
            time: 0.0,
            seed: 0.0,
        };

        class CRTFFilter extends Filter {
            constructor(options = CRTFOptions) {
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
                    name: "rpg_crt_filter"
                });
                const crtUniforms = new UniformGroup({
                    uLine: { value: new Float32Array(4), type: 'vec4<f32>' },
                    uNoise: { value: new Float32Array(2), type: 'vec2<f32>' },
                    uVignette: { value: new Float32Array(3), type: 'vec3<f32>' },
                    uSeed: { value: options.seed, type: 'f32' },
                    uTime: { value: options.time, type: 'f32' }
                });
                super({
                    glProgram,
                    gpuProgram,
                    resources: {
                        crtUniforms
                    }
                });
                this.curvature = options.curvature;
                this.lineWidth = options.lineWidth;
                this.lineContrast = options.lineContrast;
                this.verticalLine = options.verticalLine;
                this.noise = options.noise;
                this.noiseSize = options.noiseSize;
                this.vignetting = options.vignetting;
                this.vignettingAlpha = options.vignettingAlpha;
                this.vignettingBlur = options.vignettingBlur;
                this.time = options.time;
                this.seed = options.seed;
                this.uniforms = crtUniforms.uniforms;
            }
            apply(filterManager, input, output, clearMode) {
                const uniforms = this.uniforms;
                const uLine = uniforms.uLine;
                const uNoise = uniforms.uNoise;
                const uVignette = uniforms.uVignette;
                uLine[0] = this.curvature;
                uLine[1] = this.lineWidth;
                uLine[2] = this.lineContrast;
                uLine[3] = this.verticalLine ? 1 : 0;
                uNoise[0] = this.noise;
                uNoise[1] = this.noiseSize;
                uVignette[0] = this.vignetting;
                uVignette[1] = this.vignettingAlpha;
                uVignette[2] = this.vignettingBlur;
                uniforms.uSeed = this.seed;
                uniforms.uTime = this.time;
                filterManager.applyFilter(this, input, output, clearMode);
            }
            reset() {
                const options = CRTFOptions;
                this.curvature = options.curvature;
                this.lineWidth = options.lineWidth;
                this.lineContrast = options.lineContrast;
                this.verticalLine = options.verticalLine;
                this.noise = options.noise;
                this.noiseSize = options.noiseSize;
                this.vignetting = options.vignetting;
                this.vignettingAlpha = options.vignettingAlpha;
                this.vignettingBlur = options.vignettingBlur;
                this.time = options.time;
                this.seed = options.seed;
            }
        }
        FilterManager.installFilter(CRTFFilter, "CRTFFilter");
        return {
            filter: CRTFFilter,
            CRT_FragGl: fragment_gl,
            CRT_FragGpu: fragment_gpu,
            __proto__: null
        }
    })(Object.create(null));
    const RippleDistortionFilter = (() => {
        const fragment_gl = `
        precision highp float;

in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;

// 全局 uniforms
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uInputClamp;

// effect uniforms
uniform vec4 uAnime; // x=progress(0..1), y=baseAmp, z=maskEdge, w=maskSpread

void main(void) {
    vec2 uv = vTextureCoord;
    float uProgress = uAnime.x;
    float uBaseAmp = uAnime.y;
    float uMaskEdge = uAnime.z;
    float uMaskSpread = uAnime.w;
    // 计算像素位置
    vec2 pixelPos = uv * uInputSize.xy;
    vec2 centerPixel = vec2(uOutputFrame.z * 0.5, uOutputFrame.w * 0.5);
    vec2 offsetPixel = pixelPos - centerPixel;
    // 使用最大半径保证长边也能覆盖
    float maxRadius = max(centerPixel.x, centerPixel.y);
    float dist = length(offsetPixel) / maxRadius;
    // 蔓延扭曲（无震动），中心更强
    float rippleAmp = uProgress * uBaseAmp * max(0.0, 1.0 - dist);
    vec2 offsetUV = offsetPixel * uInputSize.zw;
    vec2 distortedUV = uv + offsetUV * rippleAmp;
    distortedUV = clamp(distortedUV, uInputClamp.xy, uInputClamp.zw);
    vec4 color = texture(uTexture, distortedUV);
    // 中心收缩/扩散，参数可调
    float mask = smoothstep(0.0, uMaskEdge, dist - uProgress * uMaskSpread);
    finalColor = mix(vec4(0.0, 0.0, 0.0, 1.0), color, mask);
}`;
        const fragment_gpu = `
struct RippleUniforms {
  uAnime: vec4<f32>, // x=progress(0..1), y=baseAmp, z=maskEdge, w=maskSpread
};
struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

@group(1) @binding(0) var<uniform> uRippleUniforms: RippleUniforms;

@fragment
fn mainFragment(
@location(0) uv: vec2<f32>
) -> @location(0) vec4<f32> {
    let uInputSize = gfu.uInputSize;
    let uOutputFrame = gfu.uOutputFrame;
    let uInputClamp = gfu.uInputClamp;
    // 计算像素位置
    let pixelPos = uv * vec2<f32>(uInputSize.x, uInputSize.y);
    let centerPixel = vec2<f32>(uOutputFrame.z * 0.5, uOutputFrame.w * 0.5);
    let offsetPixel = pixelPos - centerPixel;
    // 使用最大轴向半径
    let uAnime = uRippleUniforms.uAnime;
    let uProgress = uAnime.x;
    let uBaseAmp = uAnime.y;
    let uMaskEdge = uAnime.z;
    let uMaskSpread = uAnime.w;
    var maxRadius = max(centerPixel.x, centerPixel.y);
    if (maxRadius < 1.0) { maxRadius = 1.0; }
    let dist = length(offsetPixel) / maxRadius;

    // 蔓延扭曲（中心强，边缘弱）
    let rippleAmp = uProgress * uBaseAmp * max(0.0, 1.0 - dist);
    let offsetUV = offsetPixel * vec2<f32>(uInputSize.z, uInputSize.w);
    var distortedUV = uv + offsetUV * rippleAmp;
    distortedUV = clamp(
        distortedUV,
        uInputClamp.xy,
        uInputClamp.zw
    );
    let color = textureSample(uTexture, uSampler, distortedUV);
    let mask = smoothstep(0.0, uMaskEdge, dist - uProgress * uMaskSpread);
    return mix(vec4<f32>(0.0, 0.0, 0.0, 1.0), color, mask);
}
`;
        const RippleDistortOptions = {
            progress: 0,
            baseAmp: 0.05,
            maskEdge: 0.4,
            maskSpread: 1.5
        };
        class RippleDistortFilter extends Filter {
            constructor(options = RippleDistortOptions) {
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
                    name: "rpg_rippleIn_filter"
                });
                const uAnime = new Float32Array([options.progress, options.baseAmp, options.maskEdge, options.maskSpread]);
                const uRippleUniforms = new UniformGroup({
                    uAnime: { value: uAnime, type: 'vec4<f32>' }
                });
                super({
                    glProgram,
                    gpuProgram,
                    resources: {
                        uRippleUniforms
                    }
                });
                this.progress = options.progress;
                this.baseAmp = options.baseAmp;
                this.maskEdge = options.maskEdge;
                this.maskSpread = options.maskSpread;
                this.uniforms = uRippleUniforms.uniforms;
            }
            apply(filterManager, input, output, clearMode) {
                const uniforms = this.uniforms;
                const uAnime = uniforms.uAnime;
                uAnime[0] = this.progress;
                uAnime[1] = this.baseAmp;
                uAnime[2] = this.maskEdge;
                uAnime[3] = this.maskSpread;
                filterManager.applyFilter(this, input, output, clearMode);
            }
            reset() {
                const options = RippleDistortOptions;
                this.progress = options.progress;
                this.baseAmp = options.baseAmp;
                this.maskEdge = options.maskEdge;
                this.maskSpread = options.maskSpread;
            }
        }
        FilterManager.installFilter(RippleDistortFilter, "RippleDistortFilter");
        return {
            filter: RippleDistortFilter,
            RippleIn_FragGl: fragment_gl,
            RippleIn_FragGpu: fragment_gpu,
            __proto__: null
        }
    })(Object.create(null));
    const SpaceDistortionFilter = (() => {
        const fragment_gl = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;

// global uniforms (from your filter system)
uniform vec4 uInputSize;    // x=srcW, y=srcH, z=1/srcW, w=1/srcH
uniform vec4 uInputClamp;   // x=minU, y=minV, z=maxU, w=maxV

// effect uniforms
uniform vec2 uAnime;      // x=progress(0..1), y=time
uniform vec4 uDistort;    // x=strength, y=offsetScale, z=frequency, w=speed

void main(void) {
    vec2 uv = vTextureCoord;
    float aspect = uInputSize.x / max(uInputSize.y, 1.0);
    float uTime = uAnime.y;
    float uProgress = uAnime.x;
    float uStrength = uDistort.x;
    float uOffsetScale = uDistort.y;
    float uFrequency = uDistort.z;
    float uSpeed = uDistort.w;
    vec2 aspectUV = (uv - vec2(0.5, 0.5)) * vec2(aspect, 1.0);
    vec2 osc = vec2(
        sin(aspectUV.y * uFrequency + uTime * uSpeed),
        cos(aspectUV.x * uFrequency - uTime * uSpeed)
    );
    vec2 offset = osc * (uStrength * uOffsetScale);
    // apply offset in UV space
    vec2 distortedUV = uv + offset;

    distortedUV = clamp(distortedUV, uInputClamp.xy, uInputClamp.zw);
    vec4 color = texture(uTexture, distortedUV);

    float mask = 1.0 - smoothstep(0.0, 1.0, uProgress * 1.2);
    finalColor = mix(vec4(0.0), color, mask);
}

`;
        const fragment_gpu = `
struct DistortionUniforms {
  uAnime: vec2<f32>,      // x=progress(0..1), y=time
  uDistort: vec4<f32>,    // x=strength, y=offsetScale, z=frequency, w=speed
};
struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

@group(1) @binding(0) var<uniform> distUniforms: DistortionUniforms;

@fragment
fn mainFragment(
@location(0) uv: vec2<f32>
) -> @location(0) vec4<f32> {
    
    let uInputSize = gfu.uInputSize;
    let uInputClamp = gfu.uInputClamp;
    let aspect = uInputSize.x / max(uInputSize.y, 1.0);
    
    let aspectUV = (uv - vec2<f32>(0.5, 0.5)) * vec2<f32>(aspect, 1.0);
    
    let uAnime = distUniforms.uAnime;
    let uDistort = distUniforms.uDistort;
    let uTime = uAnime.y;
    let uProgress = uAnime.x;
    let uStrength = uDistort.x;
    let uOffsetScale = uDistort.y;
    let uFreq = uDistort.z;
    let uSpeed = uDistort.w;
    let osc = vec2<f32>(
        sin(aspectUV.y * uFreq + uTime * uSpeed),
        cos(aspectUV.x * uFreq - uTime * uSpeed)
    );
    let offset = osc * (uStrength * uOffsetScale);
    var distortedUV = uv + offset;
    distortedUV = clamp(
        distortedUV,
        uInputClamp.xy,
        uInputClamp.zw
    );
    let color = textureSample(uTexture, uSampler, distortedUV);
    let mask = 1.0 - smoothstep(0.0, 1.0, uProgress * 1.2);
    return color * mask;
}`;
        const SpaceDistortionOptions = {
            progress: 0,
            time: 0,
            strength: 0.25,
            offsetScale: 0.02,
            frequency: 40,
            speed: 6
        };
        class SpaceDistortionFilter extends Filter {
            constructor(options = SpaceDistortionOptions) {
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
                    name: "rpg_spaceDistortion_filter"
                });
                const uAnime = new Float32Array([options.progress, options.time]);
                const uDistort = new Float32Array([options.strength, options.offsetScale, options.frequency, options.speed]);
                const distUniforms = new UniformGroup({
                    uAnime: { value: uAnime, type: 'vec2<f32>' },
                    uDistort: { value: uDistort, type: 'vec4<f32>' }
                });
                super({
                    glProgram,
                    gpuProgram,
                    resources: {
                        distUniforms
                    }
                });
                this.progress = options.progress;
                this.time = options.time;
                this.strength = options.strength;
                this.offsetScale = options.offsetScale;
                this.frequency = options.frequency;
                this.speed = options.speed;
                this.uniforms = distUniforms.uniforms;
            }
            apply(filterManager, input, output, clearMode) {
                const uniforms = this.uniforms;
                const uAnime = uniforms.uAnime;
                const uDistort = uniforms.uDistort;
                uAnime[0] = this.progress;
                uAnime[1] = this.time;
                uDistort[0] = this.strength;
                uDistort[1] = this.offsetScale;
                uDistort[2] = this.frequency;
                uDistort[3] = this.speed;
                filterManager.applyFilter(this, input, output, clearMode);
            }
            reset() {
                const options = SpaceDistortionOptions;
                this.progress = options.progress;
                this.time = options.time;
                this.strength = options.strength;
                this.offsetScale = options.offsetScale;
                this.frequency = options.frequency;
                this.speed = options.speed;
            }
        }
        FilterManager.installFilter(SpaceDistortionFilter, "SpaceDistortionFilter");
        return {
            filter: SpaceDistortionFilter,
            WarpIn_FragGl: fragment_gl,
            WarpIn_FragGpu: fragment_gpu,
            __proto__: null
        }
    })(Object.create(null));
    const PixelateFlashFilter = (() => {
        const fragment_gl = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputSize;    // 全局尺寸: (w, h, 1/w, 1/h)

// vec4: x=progress(0..1), y=maxBlockSize, z=time, w=jitterSize
uniform vec4 uPixelParams;

vec2 mapCoord(vec2 coord) {
    return coord * uInputSize.xy + uInputSize.zw;
}

vec2 unmapCoord(vec2 coord) {
    return (coord - uInputSize.zw) / uInputSize.xy;
}

// 像素化
vec2 pixelate(vec2 coord, vec2 pixelSize) {
    return floor(coord / pixelSize) * pixelSize;
}

void main(void) {
    vec2 uv = vTextureCoord;
    vec2 coord = mapCoord(uv);

    float uProgress = uPixelParams.x;
    float uBlockMax = uPixelParams.y;
    float uTime = uPixelParams.z;
    float uJitterSize = uPixelParams.w;

    // 当前像素块大小随 progress 放大
    float blockSize = max(uBlockMax * uProgress, 1.0);
    // 振幅随 blockSize 增大
    float jitterAmp = blockSize * uJitterSize;       
    vec2 jitter = vec2(
        sin(uTime * 20.0) * jitterAmp,
        cos(uTime * 15.0) * jitterAmp
    );
    coord = pixelate(coord + jitter, vec2(blockSize));
    coord = unmapCoord(coord);

    finalColor = texture(uTexture, coord);
}
`;
        const fragment_gpu = `
        struct GlobalFilterUniforms {
  uInputSize: vec4<f32>,
  uInputPixel: vec4<f32>,
  uInputClamp: vec4<f32>,
  uOutputFrame: vec4<f32>,
  uGlobalFrame: vec4<f32>,
  uOutputTexture: vec4<f32>,
};

struct PixelateUniforms {
  uPixelParams: vec4<f32>, // x=progress(0..1), y=maxBlockSize, z=time, w=jitterSize
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

@group(1) @binding(0) var<uniform> pixelUniforms: PixelateUniforms;

fn mapCoord(coord: vec2<f32>) -> vec2<f32> {
    return coord * gfu.uInputSize.xy + gfu.uInputSize.zw;
}

fn unmapCoord(coord: vec2<f32>) -> vec2<f32> {
    return (coord - gfu.uInputSize.zw) / gfu.uInputSize.xy;
}

fn pixelate(coord: vec2<f32>, pixelSize: vec2<f32>) -> vec2<f32> {
    return floor(coord / pixelSize) * pixelSize;
}

@fragment
fn mainFragment(
@location(0) uv: vec2<f32>
) -> @location(0) vec4<f32> {
    var coord: vec2<f32> = mapCoord(uv);
    let uPixelParams = pixelUniforms.uPixelParams;
    let uProgress: f32 = uPixelParams.x;
    let uBlockMax: f32 = uPixelParams.y;
    let uTime: f32 = uPixelParams.z;
    let uJitterSize: f32 = uPixelParams.w;

    // 动态 blockSize
    let blockSize: f32 = max(uBlockMax * uProgress, 1.0);

    // jitter / 闪烁
    let jitterAmp: f32 = blockSize * uJitterSize;
    let jitter: vec2<f32> = vec2(
        sin(uTime * 20.0) * jitterAmp,
        cos(uTime * 15.0) * jitterAmp
    );
    coord = pixelate(coord + jitter, vec2<f32>(blockSize, blockSize));
    coord = unmapCoord(coord);

    let color: vec4<f32> = textureSample(uTexture, uSampler, coord);
    return color;
}`;
        const PixelateOptions = {
            uProgress: 0,   // [0.0, 1.0] (0=原场景, 1=重组完成)
            uTime: 0,
            uBlockMax: 40,
            uJitterSize: 0.3
        };
        class PixelateFlashFilter extends Filter {
            constructor(options = PixelateOptions) {
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
                    name: "rpg_pixelateFlash_filter"
                });
                const uPixelParams = new Float32Array([options.uProgress, options.uBlockMax, options.uTime, options.uJitterSize]);
                const pixelUniforms = new UniformGroup({
                    uPixelParams: { value: uPixelParams, type: 'vec4<f32>' }
                });
                super({
                    glProgram,
                    gpuProgram,
                    resources: {
                        pixelUniforms
                    }
                });
                this.progress = options.uProgress;
                this.blockMax = options.uBlockMax;
                this.time = options.uTime;
                this.jitterSize = options.uJitterSize;
                this.uniforms = pixelUniforms.uniforms;
            }
            apply(filterManager, input, output, clearMode) {
                const uniforms = this.uniforms;
                const uPixelParams = uniforms.uPixelParams;
                uPixelParams[0] = this.progress;
                uPixelParams[1] = this.blockMax;
                uPixelParams[2] = this.time;
                uPixelParams[3] = this.jitterSize;
                filterManager.applyFilter(this, input, output, clearMode);
            }
            reset() {
                const options = PixelateOptions;
                this.progress = options.uProgress;
                this.blockMax = options.uBlockMax;
                this.time = options.uTime;
                this.jitterSize = options.uJitterSize;
            }
        }
        FilterManager.installFilter(PixelateFlashFilter, "PixelateFlashFilter");
        return {
            filter: PixelateFlashFilter,
            Pixelate_FragGl: fragment_gl,
            Pixelate_FragGpu: fragment_gpu,
            __proto__: null
        }
    })(Object.create(null));
    const ScreenScanFilter = (() => {
        const fragment_gl = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;

// global uniforms
uniform vec4 uInputSize;    // x=srcW, y=srcH, z=1/srcW, w=1/srcH
uniform vec4 uInputClamp;   // x=minU, y=minV, z=maxU, w=maxV

uniform vec4 uScanParams;
uniform vec3 uScanExtra;
uniform vec4 uGlowColor;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}

vec2 mapPixel(vec2 uv) {
    return uv * uInputSize.xy;
}
vec2 unmapUV(vec2 px) {
    return px * uInputSize.zw;
}
vec2 safeSampleUV(vec2 uv) {
    return clamp(uv, uInputClamp.xy, uInputClamp.zw);
}

void main() {
    // unpack
    float progress      = uScanParams.x;
    float waveWidthPx   = uScanParams.y;
    float noiseStrength = uScanParams.z;
    float noiseJitterPx = uScanParams.w;

    float uTime         = uScanExtra.x;
    float noiseScalePx  = uScanExtra.y;
    float noiseAmp      = uScanExtra.z;

    vec2 pixelPos = mapPixel(vTextureCoord);
    float scanX = mix(0.0, uInputSize.x, progress);

    // 已扫描区域 = 黑色
    if (pixelPos.x <= scanX - waveWidthPx) {
        finalColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    // --- 噪声采样 ---
    vec2 cell = floor(pixelPos / noiseScalePx);
    float timeStep = floor(uTime * 1.5);
    float seed = hash21(cell + vec2(timeStep, 0.0));

    vec2 jitterPx = vec2(seed - 0.5, fract(seed * 1.37) - 0.5) 
                  * 2.0 * noiseStrength * noiseJitterPx;
    vec2 jitterUV = jitterPx * uInputSize.zw;

    vec2 sampleUV = safeSampleUV(vTextureCoord + jitterUV);
    vec4 sampled = texture(uTexture, sampleUV);

    float noiseSeed = hash21(cell + vec2(timeStep * 0.7, 5.0));
    float noiseVal = (noiseSeed - 0.5) * 2.0 * noiseAmp;
    vec3 noisyColor = sampled.rgb + vec3(noiseVal);

    // --- 光晕 ---
    float distToFront = abs(pixelPos.x - scanX);
    float glow = 1.0 - smoothstep(0.0, waveWidthPx, distToFront);
    float flicker = 0.5 + 0.5 * sin(uTime * 40.0 + pixelPos.y * 0.05);
    glow *= flicker;

    vec3 glowColor = uGlowColor.rgb * glow * uGlowColor.a;
    // --- 合成 ---
    vec3 finalRGB = noisyColor + glowColor;

    finalColor = vec4(finalRGB, sampled.a);
}`;
        const fragment_gpu = `
    struct GlobalFilterUniforms {
  uInputSize: vec4<f32>,
  uInputPixel: vec4<f32>,
  uInputClamp: vec4<f32>,
  uOutputFrame: vec4<f32>,
  uGlobalFrame: vec4<f32>,
  uOutputTexture: vec4<f32>,
};

struct ScanUniforms {
    uScanParams: vec4<f32>,
    uScanExtra: vec3<f32>,
    uGlowColor: vec4<f32>,
}

@group(1) @binding(0) var<uniform> uScanUniforms: ScanUniforms;

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

fn fractf(x: f32) -> f32 { return x - floor(x); }

fn hash21(p: vec2<f32>) -> f32 {
    return fractf(sin(dot(p, vec2<f32>(127.1,311.7))) * 43758.5453123);
}

fn mapPixel(uv: vec2<f32>) -> vec2<f32> {
    return uv * gfu.uInputSize.xy;
}
fn unmapUV(px: vec2<f32>) -> vec2<f32> {
    return px * gfu.uInputSize.zw;
}
fn safeSampleUV(uv: vec2<f32>) -> vec2<f32> {
    let uInputClamp = gfu.uInputClamp;
    return clamp(uv, uInputClamp.xy,uInputClamp.zw);
}

@fragment
fn mainFragment(
@location(0) uv: vec2<f32>
) -> @location(0) vec4<f32> {
    let uScanParams = uScanUniforms.uScanParams;
    let uScanExtra = uScanUniforms.uScanExtra;
    let uGlowColor = uScanUniforms.uGlowColor;
    let uInputSize = gfu.uInputSize;
    let uInputClamp = gfu.uInputClamp;

    let progress      = uScanParams.x;
    let waveWidthPx   = uScanParams.y;
    let noiseStrength = uScanParams.z;
    let noiseJitterPx = uScanParams.w;

    let uTime         = uScanExtra.x;
    let noiseScalePx  = uScanExtra.y;
    let noiseAmp      = uScanExtra.z;

    let pixelPos = mapPixel(uv);
    let scanX = mix(0.0, uInputSize.x, progress);

    let cell = floor(pixelPos / noiseScalePx);
    let timeStep = floor(uTime * 1.5);
    let seed = hash21(cell + vec2<f32>(timeStep, 0.0));

    let jitterPx = vec2<f32>(seed - 0.5, fract(seed * 1.37) - 0.5) 
                 * 2.0 * noiseStrength * noiseJitterPx;
    let jitterUV = jitterPx * gfu.uInputSize.zw;

    let sampleUV = safeSampleUV(uv + jitterUV);
    let sampled = textureSample(uTexture, uSampler, sampleUV);

    if (pixelPos.x <= scanX - waveWidthPx) {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }

    let noiseSeed = hash21(cell + vec2<f32>(timeStep * 0.7, 5.0));
    let noiseVal = (noiseSeed - 0.5) * 2.0 * noiseAmp;
    let noisyColor = sampled.rgb + vec3<f32>(noiseVal, noiseVal, noiseVal);

    let distToFront = abs(pixelPos.x - scanX);
    var glow = 1.0 - smoothstep(0.0, waveWidthPx, distToFront);
    let flicker = 0.5 + 0.5 * sin(uTime * 40.0 + pixelPos.y * 0.05);
    glow = glow * flicker;

    let glowAdded = uGlowColor.rgb * glow * uGlowColor.a;

    let finalRGB = noisyColor + glowAdded;
    return vec4<f32>(finalRGB, sampled.a);
}`;
        const ScreenScanOptions = {
            progress: 0,//0-1
            waveWidthPx: 40,// 大于等于1
            noiseStrength: 0.3,// 0-1
            noiseJitterPx: 2,// 像素
            time: 0,
            noiseScalePx: 20,// 像素
            noiseAmp: 0.1,// 0-1
        };
        class ScreenScanFilter extends Filter {
            constructor(options = ScreenScanOptions) {
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
                    name: "rpg_screenScan_filter"
                });
                const color = new Color("#00ffff");
                const uScanParams = new Float32Array([options.progress, options.waveWidthPx, options.noiseStrength, options.noiseJitterPx]);
                const uScanExtra = new Float32Array([options.time, options.noiseScalePx, options.noiseAmp]);
                const uScanUniforms = new UniformGroup({
                    uScanParams: { value: uScanParams, type: 'vec4<f32>' },
                    uScanExtra: { value: uScanExtra, type: 'vec3<f32>' },
                    uGlowColor: { value: color, type: 'vec4<f32>' }
                });
                super({
                    glProgram,
                    gpuProgram,
                    resources: {
                        uScanUniforms
                    }
                });
                this.progress = options.progress;
                this.waveWidthPx = options.waveWidthPx;
                this.noiseStrength = options.noiseStrength;
                this.noiseJitterPx = options.noiseJitterPx;
                this.time = options.time;
                this.noiseScalePx = options.noiseScalePx;
                this.noiseAmp = options.noiseAmp;
                this.glowColor = color;
                this.uniforms = uScanUniforms.uniforms;
            }
            apply(filterManager, input, output, clearMode) {
                const uniforms = this.uniforms;
                const uScanParams = uniforms.uScanParams;
                const uScanExtra = uniforms.uScanExtra;
                uScanParams[0] = this.progress;
                uScanParams[1] = this.waveWidthPx;
                uScanParams[2] = this.noiseStrength;
                uScanParams[3] = this.noiseJitterPx;
                uScanExtra[0] = this.time;
                uScanExtra[1] = this.noiseScalePx;
                uScanExtra[2] = this.noiseAmp;
                filterManager.applyFilter(this, input, output, clearMode);
            }
            reset() {
                const options = ScreenScanOptions;
                this.progress = options.progress;
                this.waveWidthPx = options.waveWidthPx;
                this.noiseStrength = options.noiseStrength;
                this.noiseJitterPx = options.noiseJitterPx;
                this.time = options.time;
                this.noiseScalePx = options.noiseScalePx;
                this.noiseAmp = options.noiseAmp;
                this.glowColor.setValue("#00ffff");
            }
        }
        FilterManager.installFilter(ScreenScanFilter, "ScreenScanFilter");
        return {
            filter: ScreenScanFilter,
            ScreenScan_FragGl: fragment_gl,
            ScreenScan_FragGpu: fragment_gpu,
            __proto__: null
        }
    })(Object.create(null));

    const ScreenParticleFilter = (() => {
        const fragment_gl = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputSize;   // (w, h, 1/w, 1/h)
uniform vec4 uInputClamp;  // clamp uv

// x=progress, y=maxOffsetPx, z=flipIntensity, w=dissolveThreshold
uniform vec4 uParticleParams;
// x=time, y=noiseScalePx, z=noiseStrength
uniform vec3 uParticleExtra;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}

vec2 safeSampleUV(vec2 uv) {
    return clamp(uv, uInputClamp.xy, uInputClamp.zw);
}

void main() {
    float progress        = uParticleParams.x;
    float maxOffsetPx     = uParticleParams.y;
    float flipIntensity   = uParticleParams.z;
    float dissolveThres   = uParticleParams.w;

    float uTime           = uParticleExtra.x;
    float noiseScalePx    = uParticleExtra.y;
    float noiseStrength   = uParticleExtra.z;

    // 像素坐标
    vec2 pixelPos = vTextureCoord * uInputSize.xy;
    vec2 cell = floor(pixelPos / noiseScalePx);

    // 随机 hash
    float rnd = hash21(cell);
    float rnd2 = hash21(cell + vec2(5.2, 1.3));

    // dissolve 掩码
    float dissolveMask = step(dissolveThres * progress, rnd);

    // 粒子偏移
    vec2 dir = normalize(vec2(rnd - 0.5, rnd2 - 0.5) + 1e-5);
    float offsetAmount = maxOffsetPx * progress;
    float jitter = sin(uTime * 10.0 + rnd * 6.283) * noiseStrength * 2.0;
    vec2 offset = dir * (offsetAmount + jitter);

    // 粒子翻转
    float flip = sin(uTime * 20.0 + rnd * 6.283) * flipIntensity;
    vec2 uvFlip = vTextureCoord + vec2(flip * 0.02, 0.0);

    // 偏移采样
    vec2 sampleUV = (pixelPos + offset) * uInputSize.zw;
    sampleUV = safeSampleUV(mix(uvFlip, sampleUV, dissolveMask));

    vec4 col = texture(uTexture, sampleUV);

    // dissolveMask = 0 → 黑色
    col.rgb *= dissolveMask;

    finalColor = col;
}`;
        const fragment_gpu = `
       struct GlobalFilterUniforms {
  uInputSize   : vec4<f32>,   // (w, h, 1/w, 1/h)
  uInputPixel  : vec4<f32>,
  uInputClamp  : vec4<f32>,   // (minU, minV, maxU, maxV)
  uOutputFrame : vec4<f32>,
  uGlobalFrame : vec4<f32>,
  uOutputTex   : vec4<f32>,
};

// x=progress, y=maxOffsetPx, z=flipIntensity, w=dissolveThreshold
struct ParticleParams {
  uParticleParams : vec4<f32>,
  uParticleExtra : vec4<f32>,
};

// x=time, y=noiseScalePx, z=noiseStrength, w=padding
struct ParticleExtra {
  values : vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu : GlobalFilterUniforms;
@group(0) @binding(1) var uTexture : texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;

@group(1) @binding(0) var<uniform> uParticleUniforms : ParticleParams;

fn hash21(p: vec2<f32>) -> f32 {
  let h = dot(p, vec2<f32>(127.1, 311.7));
  return fract(sin(h) * 43758.5453123);
}

fn safeSampleUV(uv: vec2<f32>) -> vec2<f32> {
  let uInputClamp = gfu.uInputClamp;
  return clamp(uv, uInputClamp.xy, uInputClamp.zw);
}

@fragment
fn mainFragment(
@location(0) uv: vec2<f32>
) -> @location(0) vec4<f32> {
  let uParticleParams = uParticleUniforms.uParticleParams;
  let uParticleExtra = uParticleUniforms.uParticleExtra;
  let uInputSize = gfu.uInputSize;

  let progress       = uParticleParams.x;
  let maxOffsetPx    = uParticleParams.y;
  let flipIntensity  = uParticleParams.z;
  let dissolveThres  = uParticleParams.w;

  let uTime          = uParticleExtra.x;
  let noiseScalePx   = uParticleExtra.y;
  let noiseStrength  = uParticleExtra.z;

  // 像素坐标
  let pixelPos = uv * uInputSize.xy;
  let cell = floor(pixelPos / noiseScalePx);

  // 随机 hash
  let rnd  = hash21(cell);
  let rnd2 = hash21(cell + vec2<f32>(5.2, 1.3));

  // dissolve 掩码
  let dissolveMask = step(dissolveThres * progress, rnd);

  // 粒子偏移
  let dir = normalize(vec2<f32>(rnd - 0.5, rnd2 - 0.5) + vec2<f32>(1e-5, 0.0));
  let offsetAmount = maxOffsetPx * progress;
  let jitter = sin(uTime * 10.0 + rnd * 6.283) * noiseStrength * 2.0;
  let offset = dir * (offsetAmount + jitter);

  // 粒子翻转
  let flip = sin(uTime * 20.0 + rnd * 6.283) * flipIntensity;
  let uvFlip = uv + vec2<f32>(flip * 0.02, 0.0);

  // 偏移采样
  var sampleUV = (pixelPos + offset) * uInputSize.zw;
  sampleUV = safeSampleUV(mix(uvFlip, sampleUV, dissolveMask));

  let col = textureSample(uTexture, uSampler, sampleUV);

  // dissolveMask = 0 → 黑色
  let finalCol = vec4<f32>(col.rgb * dissolveMask, col.a);
  return finalCol;
}`;
        const particleTransitionOptions = {
            progress: 0.0,        // [0, 1]   0→散开开始, 1→完全散开
            maxOffsetPx: 20.0,    // [0, 100] 最大粒子偏移像素
            flipIntensity: 0.8,   // [0, 1]   粒子翻转强度
            dissolveThreshold: 0.9, // [0, 1] 噪声溶解阈值

            time: 0.0,            // >=0 当前时间
            noiseScalePx: 8.0,    // [1, 32] 噪声块大小
            noiseStrength: 0.5    // [0, 1]  噪声抖动强度
        };
        class ScreenParticleFilter extends Filter {
            constructor(options = particleTransitionOptions) {
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
                    name: "rpg_screenParticle_filter"
                });
                const uParticleParams = new Float32Array([options.progress, options.maxOffsetPx, options.flipIntensity, options.dissolveThreshold]);
                const uParticleExtra = new Float32Array([options.time, options.noiseScalePx, options.noiseStrength]);
                const uParticleUniforms = new UniformGroup({
                    uParticleParams: { value: uParticleParams, type: "vec4<f32>" },
                    uParticleExtra: { value: uParticleExtra, type: "vec3<f32>" }
                });
                super({
                    glProgram,
                    gpuProgram,
                    resources: {
                        uParticleUniforms
                    }
                });
                this.progress = options.progress;
                this.maxOffsetPx = options.maxOffsetPx;
                this.flipIntensity = options.flipIntensity;
                this.dissolveThreshold = options.dissolveThreshold;
                this.time = options.time;
                this.noiseScalePx = options.noiseScalePx;
                this.noiseStrength = options.noiseStrength;
                this.uniforms = uParticleUniforms.uniforms;
            }
            apply(filterManager, input, output, clearMode) {
                const uniforms = this.uniforms;
                const uParticleParams = uniforms.uParticleParams;
                const uParticleExtra = uniforms.uParticleExtra;
                uParticleParams[0] = this.progress;
                uParticleParams[1] = this.maxOffsetPx;
                uParticleParams[2] = this.flipIntensity;
                uParticleParams[3] = this.dissolveThreshold;
                uParticleExtra[0] = this.time;
                uParticleExtra[1] = this.noiseScalePx;
                uParticleExtra[2] = this.noiseStrength;
                filterManager.applyFilter(this, input, output, clearMode);
            }
            reset() {
                const options = particleTransitionOptions;
                this.progress = options.progress;
                this.maxOffsetPx = options.maxOffsetPx;
                this.flipIntensity = options.flipIntensity;
                this.dissolveThreshold = options.dissolveThreshold;
                this.time = options.time;
                this.noiseScalePx = options.noiseScalePx;
                this.noiseStrength = options.noiseStrength;
            }
        }
        FilterManager.installFilter(ScreenParticleFilter, "ScreenParticleFilter");
        return {
            filter: ScreenParticleFilter,
            ScreenParticle_FragGl: fragment_gl,
            ScreenParticle_FragGpu: fragment_gpu,
            __proto__: null
        }
    })(Object.create(null));
    const ScreenTransferFilterType = {
        1: "PixelateFlashFilter",
        2: "ScreenScanFilter",
        3: "RippleDistortionFilter",
        4: "SpaceDistortionFilter",
        5: "ScreenParticleFilter"
    }
    FilterExtension.getEffectFilterName = function (transferEffectType) {
        return ScreenTransferFilterType[transferEffectType] || String.empty;
    }
    FilterExtension.ZoomBlurFilter = ZoomBlurFilter;
    FilterExtension.GodrayFilter = GodrayFilter;
    FilterExtension.OldFilmFilter = OldFilmFilter;
    FilterExtension.CRTFFilter = CRTFFilter;
    FilterExtension.RippleDistortionFilter = RippleDistortionFilter;
    FilterExtension.SpaceDistortionFilter = SpaceDistortionFilter;
    FilterExtension.PixelateFlashFilter = PixelateFlashFilter;
    FilterExtension.ScreenScanFilter = ScreenScanFilter;
    FilterExtension.ScreenParticleFilter = ScreenParticleFilter;
    FilterExtension.VERSION = "1.00";
    return FilterExtension;
})(Object.create(null));
