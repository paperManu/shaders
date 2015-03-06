#version 430 core

in vec4 vVertex;
in vec2 vTexCoord;

uniform int vPass;
uniform mat4 vMVP;
uniform vec2 vMouse;
uniform float vMouseScroll;
uniform vec2 vResolution;

out VS_OUT
{
    smooth vec2 texCoord;
    smooth vec3 normal;
} vs_out;

void main(void)
{
    gl_Position = vVertex;
    // Camera is always at (0, 0, 0), it is the object that moves
    if (vPass == 0)
    {
        gl_Position.xy += ((vMouse / vResolution) * 2.0 - vec2(1.0)) * 4.0;
        gl_Position.z += vMouseScroll / 10.0 + 1.0;
    }

    vs_out.texCoord = vTexCoord;
    vs_out.normal = vec3(0.0, 0.0, 1.0);
}
