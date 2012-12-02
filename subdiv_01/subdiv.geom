#version 330 core

layout(triangles) in;
layout(triangle_strip, max_vertices = 12) out;

in VertexData
{
    vec2 texCoord;
    vec3 normal;
} vertexIn[];

out VertexData
{
    vec2 texCoord;
    vec3 normal;
} vertexOut;

/***************/
void main()
{
    vec4[3] vertices, moreVertices;
    vertices[0] = gl_in[0].gl_Position;
    vertices[1] = gl_in[1].gl_Position;
    vertices[2] = gl_in[2].gl_Position;
    moreVertices[0] = (vertices[0] + vertices[1]) / 2.0;
    moreVertices[1] = (vertices[1] + vertices[2]) / 2.0;
    moreVertices[2] = (vertices[2] + vertices[0]) / 2.0;

    vec2[3] coords, moreCoords;
    coords[0] = vertexIn[0].texCoord;
    coords[1] = vertexIn[1].texCoord;
    coords[2] = vertexIn[2].texCoord;
    moreCoords[0] = (coords[0] + coords[1]) / 2.0;
    moreCoords[1] = (coords[1] + coords[2]) / 2.0;
    moreCoords[2] = (coords[2] + coords[0]) / 2.0;

    for (int i = 1; i < gl_in.length()+1; i++)
    {
        gl_Position = vertices[i%3];
        vertexOut.texCoord = coords[i%3];
        EmitVertex();

        gl_Position = moreVertices[i%3];
        vertexOut.texCoord = moreCoords[i%3];
        EmitVertex();

        gl_Position = moreVertices[(i-1)%3];
        vertexOut.texCoord = moreCoords[(i-1)%3];
        EmitVertex();

        EndPrimitive();
    }

    gl_Position = moreVertices[0];
    vertexOut.texCoord = moreCoords[0];
    EmitVertex();

    gl_Position = moreVertices[1];
    vertexOut.texCoord = moreCoords[1];
    EmitVertex();

    gl_Position = moreVertices[2];
    vertexOut.texCoord = moreCoords[2];
    EmitVertex();

    EndPrimitive();
}
