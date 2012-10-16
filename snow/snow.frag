#version 150 core

#define HALFPI 1.5707963268 

uniform sampler2D vTexMap;
uniform sampler2D vHUDMap;
uniform sampler2D vFBOMap;

uniform vec2 vMouse;
uniform float vTimer;
uniform vec2 vResolution;
uniform vec2 vTexResolution;
uniform int vPass;

in vec2 finalTexCoord;

out vec4 fragColor;

// Global parameters
const float shadowRadius = 0.3;
const vec4 ambientColor = vec4(0.3);
const vec4 lightColor = vec4(0.7);
const float worldScale = 16.0;
// Camera parameters
const vec3 position = normalize(vec3(5.0, 4.5, -4.0)) * 6.0;
const vec3 target = vec3(2.0, 0.5, 0.0);
const float focal = 1.5;

// Const values
float resFactor = (vResolution.x/vTexResolution.x + vResolution.y/vTexResolution.y)/2.0;

/***************/
// Displays the HUD, which is basically an FPS counter
vec4 hud()
{
    float scale = vResolution.y/32.f;
    vec4 color = texture(vHUDMap, vec2(finalTexCoord.s, finalTexCoord.t*scale));
    color.a = 1.0;
    return color;
}

/***************/
mat4 rtMat(vec3 v, float a)
{
    float c = cos(a);
    float s = sin(a);
    float C = 1-c;
    vec3 d = normalize(v);
    float x=d.x, y=d.y, z=d.z;

    mat4 m = mat4(1.0);
    m[0] = vec4(x*x*C+c, y*x*C+z*s, z*x*C-y*s, 0.0);
    m[1] = vec4(x*y*C-z*s, y*y*C+c, z*y*C+x*s, 0.0);
    m[2] = vec4(x*z*C+y*s, y*z*C-x*s, z*z*C+c, 0.0);
    m[3] = vec4(0.0, 0.0, 0.0, 1.0);

    return m;
}

/***************/
mat4 trMat(vec3 v)
{
    mat4 m = mat4(1.0);
    m[3] = vec4(v, 1.0);

    return m;
}

/***************/
float sdBox(vec3 p, vec3 b)
{
    vec3 d = abs(p)-b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

/***************/
vec2 heightMap(vec3 p, float d, vec3 b)
{
    vec2 tex = vec2(p.x/b.x, p.z/b.y);
    float i;
    tex.x = modf(abs(tex.x), i); //max(min(tex.x, 1.0), 0.0);
    tex.y = modf(abs(tex.y), i); //max(min(tex.y, 1.0), 0.0);

    float dist = modf(sqrt(d/focal)/resFactor, i);
    float h = textureLod(vTexMap, tex, int(i)).r; // Height under the current position

    vec2 st;
    st.x = (p.y - b.z - (1.0 - h)*0.5); // distance along y to the map
    st.y = st.x * 0.5; 
    return st;
}

/***************/
vec3 map(vec3 p)
{
    mat4 tr = trMat(vec3(4.0, 0.0, 0.0));
    
    vec3 ori = (tr * vec4(position, 1.0)).xyz;
    vec3 pos = (tr * vec4(p, 1.0)).xyz;
    float dist = length(pos-ori)/worldScale;

    vec2 snow = heightMap(pos, dist, vec3(worldScale, worldScale, 0.0));

    vec3 result = vec3(0.0);
    // Check which one is nearer, set a value to
    // chose the material later
    result.x = snow.x;
    result.y = 32.0;
    result.z = snow.y;

    return result;
}

/***************/
vec3 getNorm(in vec3 p, in vec3 d)
{
    vec2 e = vec2(0.025, 0.0);
    vec3 n;
    n.x = map(p+e.xyy).x - map(p-e.xyy).x;
    n.y = map(p+e.yxy).x - map(p-e.yxy).x;
    n.z = map(p+e.yyx).x - map(p-e.yyx).x;
    return normalize(n);
}

/***************/
vec4 intersect(in vec3 o, in vec3 d, out float dist)
{
    float eps = 0.001;
    dist = 1e+15;
    float lh = 0.0;
    float lt = 0.0;
    
    for(float t=0.01; t<60.0;)
    {
        vec3 pos = o + t*d;
        vec3 h = map(pos);
        dist = min(dist, h.x);
        if(h.x < max(1.0, t)*eps)
        {
            float realT = lt + (lt-t)*lh/(lh-h.x);
            return vec4(o+realT*d, h.y);
        }
        lh = h.x;
        lt = t;
        t += h.z;
    }

    return vec4(0.0);
}

/***************/
vec3 getCamera(in vec3 p, in vec3 t, in float f)
{
    // Create a basis from these inputs
    vec3 d = normalize(t-p);
    vec3 x1 = normalize(cross(vec3(0.0, 1.0, 0.0), d));
    vec3 x2 = cross(d, x1); // These should be ortho, no need to normalize

    // Calculate the direction defined by the current fragment
    vec3 pix = vec3(finalTexCoord*2.0-1.0, f);
    pix.x *= vResolution.x/vResolution.y;
    pix = normalize(pix.x*x1 + pix.y*x2 + pix.z*d);
    return pix;
}

/***************/
vec4 getMaterial(float index)
{
    vec4 m = vec4(0.0, 0.0, 0.0, 1.0);
    if(index == 1.0)
        m = vec4(1.0, 0.0, 0.0, 1.0);
    else if(index == 32.0)
        m = vec4(0.9, 0.9, 0.9, 1.0);

    return m;
}

/***************/
vec4 getColor(vec4 p, vec3 l, vec3 d)
{
    vec4 c = vec4(0.0, 0.0, 0.0, 1.0);

    if(p.w != 0.0)
    {
        float dist;
        // The norm will be much needed
        vec3 norm = getNorm(p.xyz, d);
        // Material
        vec4 m = getMaterial(p.w);
        // Lighting
        float i = max(0.2, -dot(norm, l));
        c *= i;

        // Shadows...
        vec4 shadow = intersect(p.xyz - shadowRadius*l, -l, dist);
        if(shadow.w > 0.0)
            c = m*ambientColor;
        else
            c = m*ambientColor + m*i*lightColor*max(0.0, min(1.0, smoothstep(0.0, shadowRadius, dist)));
    }

    return c;
}

/***************/
vec4 rm()
{
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);

    // We move the light for more awesomeness
    vec3 light = normalize(vec3(-1.0, -1.0, 1.0));
    light = (rtMat(vec3(0.0, 1.0, 0.0), 0.2*vTimer) * vec4(light, 1.0)).xyz;

    // Here starts the real stuff
    vec3 dir = getCamera(position, target, focal);

    // March on the ray!
    float dist;
    vec4 point = intersect(position, dir, dist);

    color = getColor(point, light, dir);

    return color;
}

/***************/
void main()
{
    if(vPass == 0)
    {
        fragColor = rm();
        return;
    }

    fragColor = texture2D(vFBOMap, finalTexCoord);   
    fragColor += hud();
}
