#version 150 core

in vec4 vVertex;
in vec2 vTexCoord;

uniform mat4 vMVP;
uniform vec2 vMouse;
uniform float vTimer;
uniform vec2 vResolution;
uniform vec2 vTexResolution;
uniform int vPass;

smooth out vec2 finalTexCoord;
smooth out float resFactor;
smooth out vec3 light;
smooth out mat4 mapPos;

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
void main(void)
{
    gl_Position.xyz = (vMVP*vVertex).xyz;
    finalTexCoord = vTexCoord;

    // Values used in the fragment shader
    resFactor = (vResolution.x/vTexResolution.x + vResolution.y/vTexResolution.y)/2.0;

    // We move the light for more awesomeness
    light = normalize(vec3(-1.0, -1.0, 1.0));
    light = (rtMat(vec3(0.0, 1.0, 0.0), 0.2*vTimer) * vec4(light, 1.0)).xyz;

    // Calculate the position of the map
    mat4 tr = trMat(vec3(4.0, 0.0, 0.0));
    mat4 rt = rtMat(vec3(0.0, 1.0, 0.0), 0.2*vTimer);
    mapPos = tr * rt;
}
