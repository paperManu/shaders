#version 450 core

#define PI 3.141592653589793
#define HALFPI 1.5707963268 

uniform float _time;
uniform vec2 _resolution;

uniform float spherical = 0.f; // Set to a positive value to get a spherical projection

vec2 finalTexCoord = gl_FragCoord.xy / _resolution.xy;
out vec4 fragColor;

// Rectilinear camera parameters
const vec3 position = normalize(vec3(4.0, 3.0, -4.0)) * 5.0;
const vec3 target = vec3(3.0, 0.0, 0.0);
const float focal = 0.6;

// Spherical camera parameters
const float fov = 230.f;

/***************/
mat4 rotMat(vec3 v, float a)
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
float sdBox(vec3 p, vec3 b)
{
    vec3 d = abs(p)-b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

/***************/
float hplane(vec3 p)
{
    float alt = -2.5;
    return p.y - alt;
}

/***************/
vec3 models(vec3 p, vec3 b)
{
    return vec3(min(max(sdBox(p, b), -sphere(p, b.z*1.5)), sphere(p, b.x/2.0)));
    //return vec3(sphere(p, b.x));
}

/***************/
vec3 opRT(vec3 p, mat4 m, vec3 b)
{
    vec4 q = vec4(p, 1.0);
    q = m*q;
    return models(q.xyz, b);
}

/***************/
vec3 opRep(vec3 p, vec3 c, mat4 m, vec3 b)
{
    vec3 q = mod(p,c) - 0.5*c;
    return opRT(q.xyz, m, b);
}

/***************/
vec3 map(in vec3 p)
{
    mat4 rot = rotMat(vec3(1.0, 1.0, 0.1), 0.4*_time / 100.0);

    float ground = hplane(p);
    float d = opRT(p, rot, vec3(1.0, 2.0, 1.0)).x;
    //float d = opRep(p, vec3(10.0), rot, vec3(1.0, 2.0, 1.0)).x;

    d = min(d, ground);

    return vec3(d, 0.0, 0.0);
}

/***************/
vec3 norm(in vec3 p)
{
    vec2 e = vec2(0.001, 0.0);
    vec3 n;
    n.x = map(p+e.xyy).x - map(p-e.xyy).x;
    n.y = map(p+e.yxy).x - map(p-e.yxy).x;
    n.z = map(p+e.yyx).x - map(p-e.yyx).x;
    return normalize(n);
}

/***************/
vec4 intersect(in vec3 ro, in vec3 rd)
{
    float eps = 0.0001;

    for(float t = 0.0; t < 30.0; )
    {
        vec3 h = map(ro + rd*t);
        if(h.x < eps)
        {
            return vec4(h.x, ro+t*rd);
        }
        t = t + h.x - eps*0.1;
    }
    return vec4(0.0);
}

/***************/
// origin, destination, step
float softShadow(in vec3 o, in vec3 d, float s)
{
    float f = 0.0;
    vec3 v = (d-o)/(s+1);
    vec3 p = o + v;

    for(float i=0; i<s; i++)
    {
        vec3 h = map(p);
        f = max(f, smoothstep(0.0, -0.2, h.x));
        p += v;
    }
    //f /= s;

    return clamp(1.0 - f, 0.0, 1.0);
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
    pix.x *= _resolution.x/_resolution.y;
    pix = normalize(pix.x*x1 + pix.y*x2 + pix.z*d);
    return pix;
}

/***************/
vec3 getSphericalCamera()
{
    vec3 pix = vec3(finalTexCoord*2.0-1.0, 0);
    float squaredDistToCenter = pix.x*pix.x + pix.y*pix.y;
    float distToCenter = sqrt(squaredDistToCenter) * HALFPI;
    float sinDistToCenter = sin(distToCenter * fov / 180.f);

    float beta = 0.0;
    if (pix.x > 0 && pix.y > 0)
        beta = atan(pix.y/pix.x);
    else if (pix.x < 0 && pix.y > 0)
        beta = 2*HALFPI - atan(pix.y/(-pix.x));
    else if (pix.x < 0 && pix.y < 0)
        beta = 2*HALFPI + atan(pix.y/pix.x);
    else
        beta = 4*HALFPI - atan(pix.y/(-pix.x));

    float x,y,z;
    x = sinDistToCenter*cos(beta);
    y = sinDistToCenter*sin(beta);
    z = cos(distToCenter*fov / 180.f);

    return normalize(vec3(x, z, y));
}

/***************/
vec4 rm()
{
    vec4 color = vec4(0.7, 0.7, 0.8, 0.0);

    color -= smoothstep(-0.4, 1.3, finalTexCoord.y)*vec4(1.0, 1.0, 0.9, 0.0);

    vec3 lightPos = normalize(vec3(0.0, 3.0, -2.0))*4.0;
    lightPos = (rotMat(vec3(0.0, 1.0, 0.0), 0.1*_time / 100.0)*vec4(lightPos, 1.0)).xyz;
    vec3 light = normalize(lightPos);

    mat4 wtc = rotMat(vec3(1.0, 0.0, 0.0), -0.3);

    vec3 ro = vec3(0.0, 0.0, -6.0);

    ro = (vec4(ro, 1.0)*wtc).xyz;

    vec4 p;
    if (spherical == 0)
        p = intersect(ro, getCamera(position, target, focal));
    else
        p = intersect(ro, getSphericalCamera());

    if(p.x > 0.0)
    {
        vec3 nor = norm(p.yzw);
        vec3 wood = vec3(0.9, 0.4, 0.2);

        vec3 ldir = lightPos - p.yzw;
        float ldist = length(ldir);
        ldir = normalize(ldir);
        vec4 s = intersect(lightPos, -ldir);
        if(s.x > 0.0)
        {
            float shadows = 1.0;
            if(length(s.yzw - lightPos) < ldist*0.99)
                shadows = 0.2;
            float i = max(0.2, dot(nor, light));
            color = vec4(wood*i*shadows, 1.0);
        }
    }

    return color;
}

/***************/
void main(void)
{
    fragColor = rm();
}
