#version 150 core

#define HALFPI  1.5707963268 
#define PI      3.1415926535

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
const vec4 ambientColor = vec4(0.2);
const vec4 lightColor = vec4(0.7);
const vec4 fogColor = vec4(0.0, 0.0, 0.1, 1.0);
// Camera parameters
const vec3 position = normalize(vec3(4.0, 3.0, -4.0))*5.0;
const vec3 target = vec3(0.0, 0.0, 0.0);
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
float sdBox(vec3 p, vec3 b, float r)
{
    return length(max(abs(p-r)-b+r, 0.0))-r;
}

/***************/
float hplane(vec3 p, float h)
{
    return p.y - h;
}

/***************/
vec2 map(vec3 p)
{
    vec3 rep = vec3(2.82);
    vec3 q = mod(p,rep) - 0.5*rep;
    q.y = p.y;

    vec3 pos = (trMat(vec3(0.0, 2.0, 0.0)) * rtMat(vec3(0.0, 1.0, 0.0), vTimer) * vec4(q, 1.0)).xyz;
    float box1 = sdBox(pos, vec3(1.0, 1.0, 1.0), 0.05);

    vec2 result = vec2(0.0);
    // Check which one is nearer, set a value to
    // chose the material later
    result.x = box1;
    result.y = 1.0;

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
vec3 getCameraFromSphere()
{
    vec3 pix = vec3(finalTexCoord.x*2*PI, finalTexCoord.y*PI-HALFPI, 0.0);
    vec3 dir;

    dir.x = cos(pix.x)*cos(pix.y);
    dir.z = sin(pix.x)*cos(pix.y);
    dir.y = sin(pix.y);

    return dir;
}

/***************/
vec4 intersect(in vec3 o, in vec3 d, out float dist)
{
    float eps = 0.0001;
    dist = 1e+15;
    
    for(float t=0.0; t<50.0;)
    {
        vec2 h = map(o + t*d);
        dist = min(dist, h.x);
        if(h.x < max(1.0, t)*eps)
        {
            return vec4(o+t*d, h.y);
        }
        t += h.x/4.0;
    }

    return vec4(0.0);
}

/***************/
float ao(vec3 p, vec3 n, float d, float i)
{
    float o;
    for(o=1.0; i>0; i--)
    {
        o -= (i*d - map(p+n*i*d).x)/exp2(i);
    }
    return o;
}

/***************/
float sss(vec3 p, vec3 n, float d, float i)
{
	float o;
	for (o=0.;i>0.;i--)
    {
		o+=(i*d+map(p-n*i*d).x)/exp2(i);
	}
	return o;
}

/***************/
vec4 getMaterial(float index)
{
    vec4 m = vec4(0.0, 0.0, 0.0, 1.0);
    if(index == 1.0)
        m = vec4(0.8, 0.8, 0.9, 1.0);
    else if(index == 2.0)
        m = vec4(0.0, 0.0, 1.0, 1.0);
    else if(index == 3.0)
        m = vec4(0.6, 0.6, 0.6, 1.0);
    else if(index == 4.0)
        m = vec4(0.0, 1.0, 0.0, 1.0);

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
        vec3 norm = getNorm(p.xyz);
        // Material
        vec4 m = getMaterial(p.w);

        // Lighting
        float i = max(0.2, -dot(norm, l));

        // Ambient occlusion
        float ao = ao(p.xyz, norm, 0.6, 16.0);
        //float sss = sss(p.xyz, norm, 0.2, 4.0);

        //c = m*ambientColor*ao + m*ambientColor*sss;
        c = m*ambientColor*ao + m*vec4(vec3(i), 1.0);
    }

    return c;
}

/***************/
vec4 getFog(vec4 p, float d)
{
    float dist = length(p);
    float f = pow(min(1.0, dist/d), 0.5);
    vec4 fog = (1-f)*vec4(1.0, 1.0, 1.0, 1.0) + f*fogColor;
    return fog;
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
    color *= getFog(point, 40);

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
