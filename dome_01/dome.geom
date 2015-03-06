#version 330 core

#define PI 3.14159
#define LEVEL 2

// Uniforms and inputs
uniform int vPass;

layout(triangles) in;
layout(triangle_strip, max_vertices = 128) out;

// Input and output types
in VertexData
{
    vec4 vertex;
    vec2 texCoord;
    vec3 normal;
} vertexIn[];

out VertexData
{
    vec2 texCoord;
    vec3 normal;
} vertexOut;

// Declarations
void main();
void subdiv_l1(in vec4 v[3], in vec2 s[3]);
void subdiv_l2(in vec4 v[3], in vec2 s[3]);
void subdiv_l3(in vec4 v[3], in vec2 s[3]);
void subdiv_l4(in vec4 v[3], in vec2 s[3]);
vec4 toSphere(in vec4 v);

// Utility functions
float sinCosRestrain(in float v);
vec4 middleOf(in vec4 v, in vec4 w);
vec2 middleOf(in vec2 l, in vec2 m);
void emitVertex(in vec4 v, in vec2 s);

/***************/
float sinCosRestrain(in float v)
{
    return max(-1.0, min(1.0, v));
}

/***************/
vec4 middleOf(in vec4 v, in vec4 w)
{
    return (v + w) * 0.5;
}

/***************/
vec2 middleOf(in vec2 l, in vec2 m)
{
    return (l + m) * 0.5;
}

/***************/
void emitVertex(in vec4 v, in vec2 s)
{
    gl_Position = v;
    vertexOut.texCoord = s;
    EmitVertex();
}

/***************/
vec4 toSphere(in vec4 v)
{
    float val;
    vec4 o = vec4(1.0);

    float r = sqrt(pow(v.x, 2.0) + pow(v.y, 2.0) + pow(v.z, 2.0));
    val = max(-1.0, min(1.0, v.z / r));
    float theta = acos(val);

    float phi;
    val = v.x / (r * sin(theta));
    float first = acos(sinCosRestrain(val));
    val = v.y / (r * sin(theta));
    float second = asin(sinCosRestrain(val));
    if (second >= 0.0)
        phi = first;
    else
        phi = 2.0*PI - first;

    o.x = theta * cos(phi);
    o.y = theta * sin(phi);
    o.y /= PI;
    o.x /= PI;
    o.z = 0.5;

    return o;
}

/***************/
void main()
{
    if (vPass == 0 && LEVEL > 0)
    {
        vec4 vertices[3];
        for (int i = 0; i < 3; ++i)
            vertices[i] = vertexIn[i].vertex;

        vec2 s[3];
        for (int i = 0; i < 3; ++i)
            s[i] = vertexIn[i].texCoord;

        subdiv_l1(vertices, s);
    }
    else
    {
        vec4[3] vertices;
        for (int i = 0; i < 3; ++i)
            vertices[i] = vec4(0.0);

        vertices[0] = gl_in[0].gl_Position;
        vertices[1] = gl_in[1].gl_Position;
        vertices[2] = gl_in[2].gl_Position;

        gl_Position = vertices[0];
        vertexOut.texCoord = vertexIn[0].texCoord;
        EmitVertex();

        gl_Position = vertices[1];
        vertexOut.texCoord = vertexIn[1].texCoord;
        EmitVertex();

        gl_Position = vertices[2];
        vertexOut.texCoord = vertexIn[2].texCoord;
        EmitVertex();

        EndPrimitive();

    }
}

/*************/
void subdiv_l1(in vec4 v[3], in vec2 s[3])
{
    vec4 w[3];
    w[0] = middleOf(v[0], v[1]);
    w[1] = middleOf(v[1], v[2]);
    w[2] = middleOf(v[2], v[0]);
    vec2 t[3];
    t[0] = middleOf(s[0], s[1]);
    t[1] = middleOf(s[1], s[2]);
    t[2] = middleOf(s[2], s[0]);

    if (LEVEL > 1)
    {
        // To the second level
        for (int i = 0; i < 3; ++i)
        {
            vec4 u[3];
            u[0] = v[i];
            u[1] = w[i];
            u[2] = w[(i+2)%3];

            vec2 r[3];
            r[0] = s[i];
            r[1] = t[i];
            r[2] = t[(i+2)%3];

            subdiv_l2(u, r);
        }

        subdiv_l2(w, t);
    }
    else
    {
        //Projection of all points
        vec4 inputVert[3], newVert[3];
        inputVert[0] = toSphere(v[0]);
        inputVert[1] = toSphere(v[1]);
        inputVert[2] = toSphere(v[2]);
        newVert[0] = toSphere(w[0]);
        newVert[1] = toSphere(w[1]);
        newVert[2] = toSphere(w[2]);

        emitVertex(inputVert[0], s[0]);
        emitVertex(newVert[2], t[2]);
        emitVertex(newVert[0], t[0]);
        emitVertex(newVert[1], t[1]);
        emitVertex(inputVert[1], s[1]);
        EndPrimitive();

        emitVertex(inputVert[2], s[2]);
        emitVertex(newVert[2], t[2]);
        emitVertex(newVert[1], t[1]);
        EndPrimitive();
    }
}

/*************/
void subdiv_l2(in vec4 v[3], in vec2 s[3])
{
    vec4 w[3];
    w[0] = middleOf(v[0], v[1]);
    w[1] = middleOf(v[1], v[2]);
    w[2] = middleOf(v[2], v[0]);
    vec2 t[3];
    t[0] = middleOf(s[0], s[1]);
    t[1] = middleOf(s[1], s[2]);
    t[2] = middleOf(s[2], s[0]);

    if (LEVEL > 2)
    {
        // To the third level
        for (int i = 0; i < 3; ++i)
        {
            vec4 u[3];
            u[0] = v[i];
            u[1] = w[i];
            u[2] = w[(i+2)%3];

            vec2 r[3];
            r[0] = s[i];
            r[1] = t[i];
            r[2] = t[(i+2)%3];

            subdiv_l3(u, r);
        }

        subdiv_l3(w, t);
    }
    else
    {
        // Projection of all points
        vec4 inputVert[3], newVert[3];
        inputVert[0] = toSphere(v[0]);
        inputVert[1] = toSphere(v[1]);
        inputVert[2] = toSphere(v[2]);
        newVert[0] = toSphere(w[0]);
        newVert[1] = toSphere(w[1]);
        newVert[2] = toSphere(w[2]);

        emitVertex(inputVert[0], s[0]);
        emitVertex(newVert[2], t[2]);
        emitVertex(newVert[0], t[0]);
        emitVertex(newVert[1], t[1]);
        emitVertex(inputVert[1], s[1]);
        EndPrimitive();

        emitVertex(inputVert[2], s[2]);
        emitVertex(newVert[2], t[2]);
        emitVertex(newVert[1], t[1]);
        EndPrimitive();
    }
}

/*************/
void subdiv_l3(in vec4 v[3], in vec2 s[3])
{
    vec4 w[3];
    w[0] = middleOf(v[0], v[1]);
    w[1] = middleOf(v[1], v[2]);
    w[2] = middleOf(v[2], v[0]);
    vec2 t[3];
    t[0] = middleOf(s[0], s[1]);
    t[1] = middleOf(s[1], s[2]);
    t[2] = middleOf(s[2], s[0]);

    if (LEVEL > 3)
    {
        // To the third level
        for (int i = 0; i < 3; ++i)
        {
            vec4 u[3];
            u[0] = v[i];
            u[1] = w[i];
            u[2] = w[(i+2)%3];

            vec2 r[3];
            r[0] = s[i];
            r[1] = t[i];
            r[2] = t[(i+2)%3];

            subdiv_l4(u, r);
        }

        subdiv_l4(w, t);
    }
    else
    {
        // Projection of all points
        vec4 inputVert[3], newVert[3];
        inputVert[0] = toSphere(v[0]);
        inputVert[1] = toSphere(v[1]);
        inputVert[2] = toSphere(v[2]);
        newVert[0] = toSphere(w[0]);
        newVert[1] = toSphere(w[1]);
        newVert[2] = toSphere(w[2]);

        emitVertex(inputVert[0], s[0]);
        emitVertex(newVert[2], t[2]);
        emitVertex(newVert[0], t[0]);
        emitVertex(newVert[1], t[1]);
        emitVertex(inputVert[1], s[1]);
        EndPrimitive();

        emitVertex(inputVert[2], s[2]);
        emitVertex(newVert[2], t[2]);
        emitVertex(newVert[1], t[1]);
        EndPrimitive();
    }
}

/*************/
void subdiv_l4(in vec4 v[3], in vec2 s[3])
{
    vec4 w[3];
    w[0] = middleOf(v[0], v[1]);
    w[1] = middleOf(v[1], v[2]);
    w[2] = middleOf(v[2], v[0]);
    vec2 t[3];
    t[0] = middleOf(s[0], s[1]);
    t[1] = middleOf(s[1], s[2]);
    t[2] = middleOf(s[2], s[0]);

    // Projection of all points
    vec4 inputVert[3], newVert[3];
    inputVert[0] = toSphere(v[0]);
    inputVert[1] = toSphere(v[1]);
    inputVert[2] = toSphere(v[2]);
    newVert[0] = toSphere(w[0]);
    newVert[1] = toSphere(w[1]);
    newVert[2] = toSphere(w[2]);
    
    emitVertex(inputVert[0], s[0]);
    emitVertex(newVert[2], t[2]);
    emitVertex(newVert[0], t[0]);
    emitVertex(newVert[1], t[1]);
    emitVertex(inputVert[1], s[1]);
    EndPrimitive();
    
    emitVertex(inputVert[2], s[2]);
    emitVertex(newVert[2], t[2]);
    emitVertex(newVert[1], t[1]);
    EndPrimitive();
}
