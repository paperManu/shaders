#version 430 core

in vec4 vVertex;
in vec2 vTexCoord;

uniform mat4 vMVP;
uniform vec2 vMouse;

out VS_OUT
{
    smooth vec2 texCoord;
    smooth vec3 normal;
} vs_out;

void main(void)
{
    gl_Position.xyz = (vMVP*vVertex).xyz;

    vs_out.texCoord = vTexCoord;
    vs_out.normal = vec3(0.0, 0.0, 1.0);
}
