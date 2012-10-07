#version 150 core

uniform sampler2D vTexMap;
uniform sampler2D vHUDMap;
uniform sampler2D vFBOMap;

uniform vec2 vMouse;
uniform float vTimer;
uniform vec2 vResolution;
uniform int vPass;

in vec2 finalTexCoord;

out vec4 fragColor;

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
float fbm(vec3 p)
{
    float n = 0.0;
    n += 0.500*noise1(p); p *= 2.01;
    n += 0.250*noise1(p); p *= 2.02;
    n += 0.125*noise1(p); p *= 2.01;
    n /= 0.775;
    return n;
}

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
vec3 models(vec3 p, vec3 b)
{
    return vec3(min(max(sdBox(p, b), -sphere(p, b.z*1.5)), sphere(p, b.x/2.0)));
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
    mat4 rot = rotMat(vec3(1.0, 1.0, 0.1*vTimer), 0.0*vTimer);

    float d = opRT(p, rot, vec3(1.0, 2.0, 1.0)).x;
    //float d = opRep(p, vec3(10.0), rot, vec3(1.0, 2.0, 1.0)).x;
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

    for(float t=0.0; t<10.0; )
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
vec4 rm()
{
    vec4 color = vec4(0.7, 0.7, 0.8, 0.0);

    color -= smoothstep(-0.4, 1.3, finalTexCoord.y)*vec4(1.0, 1.0, 0.9, 0.0);

    vec3 light = normalize(vec3(0.5, 1.0, 0.5));

    mat4 wtc = rotMat(vec3(0.0, 1.0, 0.0), 0.1*vTimer);

    vec3 ro = vec3(0.0, 0.0, -6.0);
    vec3 rd = vec3(finalTexCoord*2.0-1.0,2.0);
    rd.x *= vResolution.x/vResolution.y;

    ro = (vec4(ro, 1.0)*wtc).xyz;
    rd = (vec4(rd, 0.0)*wtc).xyz;

    rd = normalize(rd);

    vec4 p = intersect(ro, rd);

    if(p.x > 0.0)
    {
        vec3 nor = norm(p.yzw);
        float i = max(0.2, dot(nor, light));

        float c = fbm(p.yzw);

        color = vec4(i, i, i, 1.0);
    }

    return color;
}

/***************/
void main(void)
{
    if(vPass == 0)
    {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    fragColor = rm();   
    fragColor += hud();
}
