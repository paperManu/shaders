#version 330 core

in vec4 vVertex;
in vec2 vTexCoord;

uniform mat4 vMVP;

out VertexData
{
    vec4 vertex;
    vec2 texCoord;
    vec3 normal;
} vertexOut;

/***************/
void main()
{
    //gl_Position.xyz = (vMVP * vVertex).xyz;
    gl_Position.xyz = vVertex.xyz;
    gl_Position.z = 1.0;
    gl_Position.w = 1.0;
    vertexOut.vertex = vVertex.xyzw;
    vertexOut.vertex.z = 1.0;
    vertexOut.texCoord = vTexCoord;
    vertexOut.normal = vec3(0.0, 0.0, 1.0);

    //if (vVertex.x > 0.0 && vVertex.y > 0.0)
    //{
    //    vertexOut.vertex.x *= 1.25;
    //}
}
