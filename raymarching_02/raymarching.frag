#version 150 core

#define HALFPI 1.5707963268 

uniform sampler2D vTexMap;
uniform sampler2D vHUDMap;
uniform sampler2D vFBOMap;

uniform vec2 vMouse;
uniform float vTimer;
uniform vec2 vResolution;
uniform int vPass;

in vec2 finalTexCoord;

out vec4 fragColor;

// Global parameters
const float shadowRadius = 0.3;
const vec4 ambientColor = vec4(0.3);
const vec4 lightColor = vec4(0.7);
// Camera parameters
const vec3 position = vec3(1.0, 3.0, -4.0);
const vec3 target = vec3(0.0, 0.5, -1.0);
const float focal = 1.0;

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
float sphere(vec3 p, float r)
{
    return length(p)-r;
}

/***************/
float sdCylinder(vec3 p, vec3 c)
{
    return length(p.xz - c.xy) - c.z;
}

/***************/
float sdBox(vec3 p, vec3 b)
{
    vec3 d = abs(p)-b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

/***************/
float hplane(vec3 p, float h)
{
    return p.y - h;
}

/***************/
vec2 map(vec3 p)
{
    vec3 pos = (trMat(vec3(-2.0, 1.0, 0.0)) * vec4(p, 1.0)).xyz;
    pos = (rtMat(vec3(1.0, 0.0, 0.0), 0.1*vTimer) * vec4(pos, 1.0)).xyz;
    float box1 = sdBox(pos, vec3(2.0, 1.0, 1.0));

    pos = (trMat(vec3(2.0, -1.5, 0.0)) * vec4(p, 1.0)).xyz;
    pos = (rtMat(vec3(0.0, 1.0, 0.0), 0.15*vTimer) * vec4(pos, 1.0)).xyz;
    float box2 = sdBox(pos, vec3(1.0, 1.0, 2.0));
    
    pos = (trMat(vec3(-1.0, 1.0, 7.0)) * vec4(p, 1.0)).xyz;
    pos = (rtMat(vec3(1.0, 0.0, 0.0), 0.1*vTimer) * vec4(pos, 1.0)).xyz;
    float box3 = sdBox(pos, vec3(4.0, 1.0, 1.0));
    
    pos = (trMat(vec3(-2.0, -1.5, -3.0)) * vec4(p, 1.0)).xyz;
    float sphere = sphere(pos, 2.0);

    float plane = hplane(p, -2.0);

    vec2 result = vec2(0.0);
    // Check which one is nearer, set a value to
    // chose the material later
    result.x = min(min(min(min(box1, box2), plane), sphere), box3);
    if(box1 == result.x)
        result.y = 1.0;
    else if(box2 == result.x)
        result.y = 2.0;
    else if(plane == result.x)
        result.y = 3.0;
    else if(box3 == result.x)
        result.y = 4.0;
    else if(sphere == result.x)
        result.y = 16.0;

    return result;
}

/***************/
vec3 getNorm(in vec3 p)
{
    vec2 e = vec2(0.001, 0.0);
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
    
    for(float t=0.0; t<40.0;)
    {
        vec2 h = map(o + t*d);
        dist = min(dist, h.x);
        if(h.x < max(1.0, t)*eps)
        {
            return vec4(o+t*d, h.y);
        }
        t += h.x;
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
    else if(index == 2.0)
        m = vec4(0.0, 0.0, 1.0, 1.0);
    else if(index == 3.0)
        m = vec4(0.6, 0.6, 0.6, 1.0);
    else if(index == 4.0)
        m = vec4(0.0, 1.0, 0.0, 1.0);
    else if(index == 16.0)
        m = vec4(0.9, 0.9, 0.9, 1.0);

    return m;
}

/***************/
vec4 getReflectedColor(vec4 p, vec3 l, vec3 d)
{
    vec4 c = vec4(0.0, 0.0, 0.0, 1.0);

    if(p.w != 0.0)
    {
        float dist;
        // The norm will be much needed
        vec3 norm = getNorm(p.xyz);
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
        {
            c = m*ambientColor + m*lightColor*max(0.0, min(1.0, smoothstep(0.0, shadowRadius, dist)));
            // Specular reflection
            vec3 r = reflect(-l, norm);
            float spec = max(0.0, dot(r, d));
            c.rgb += lightColor.rgb*pow(spec, 32);
        }
    }

    return c;
}

/***************/
vec4 getColor(vec4 p, vec3 l, vec3 d)
{
    vec4 c = vec4(0.0, 0.0, 0.0, 1.0);

    if(p.w != 0.0)
    {
        float dist;
        // The norm will be much needed
        vec3 norm = getNorm(p.xyz);
        // Material
        vec4 m = getMaterial(p.w);
        // If the material is reflective
        if(p.w == 16.0)
        {
            // We need to know what to reflect!
            vec3 newDir = reflect(d, norm);
            vec4 newPoint = intersect(p.xyz+0.01*norm, newDir, dist);
            vec4 newColor = getReflectedColor(newPoint, l, newDir);
            m = m*newColor;
        }

        // Lighting
        float i = max(0.2, -dot(norm, l));

        // Shadows...
        vec4 shadow = intersect(p.xyz - shadowRadius*l, -l, dist);
        if(shadow.w > 0.0)
            c = m*i*ambientColor;
        else
        {
            c = m*ambientColor + m*lightColor*max(0.0, min(1.0, smoothstep(0.0, shadowRadius, dist)));
            // Specular reflection
            vec3 r = reflect(-l, norm);
            float spec = max(0.0, dot(r, d));
            c.rgb += lightColor.rgb*pow(spec, 64);
        }
    }

    return c;
}

/***************/
vec4 rm()
{
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);

    // We move the light for more awesomeness
    vec3 light = normalize(vec3(-1.0, -2.0, 1.0));
    light = (rtMat(vec3(0.0, 1.0, 0.0), 0.5*vTimer) * vec4(light, 1.0)).xyz;

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
