#version 330 core

in vec4 vVertex;
in vec2 vTexCoord;

uniform mat4 vMVP;

out VertexData
{
    vec2 texCoord;
    vec3 normal;
} vertexOut;

/***************/
void main()
{
    gl_Position.xyz = (vMVP * vVertex).xyz;
    gl_Position.w = 1.0;
    vertexOut.texCoord = vTexCoord;
    vertexOut.normal = vec3(0.0, 0.0, 1.0);
}
