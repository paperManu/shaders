#version 430 core

#define FOV 260

#define PI 3.141592653589
#define NEAR 1.0
#define FAR 100.0

#define STEREO 1
#define BASELINE 1
#define RADIUS 10

// Uniforms and inputs
uniform int vPass;

in TES_OUT
{
    vec4 vertex;
    vec2 texCoord;
    vec3 normal;
} tes_out[];

out GEOM_OUT
{
    vec4 vertex;
    vec2 texCoord;
    vec3 normal;
} geom_out;

layout(triangles) in;
layout(triangle_strip, max_vertices = 3) out;
layout(invocations = 2) in;

// Types
struct Point
{
    vec4 vertex;
    vec2 texCoord;
    vec3 normal;
    vec4 diffuse;
};

// Declaration
void toStereo(inout vec4 v);

/***************/
void toSphere(inout vec4 p)
{
    vec4 v = p;

    float val;
    vec4 o = vec4(1.0);

    float r = sqrt(pow(v.x, 2.0) + pow(v.y, 2.0) + pow(v.z, 2.0));
    val = clamp(v.z / r, -1.0, 1.0);
    float theta = acos(val);

    float phi;
    val = v.x / (r * sin(theta));
    float first = acos(clamp(val, -1.0, 1.0));
    val = v.y / (r * sin(theta));
    float second = asin(clamp(val, -1.0, 1.0));
    if (second >= 0.0)
        phi = first;
    else
        phi = 2.0*PI - first;

    if (STEREO == 1)
    {
        vec4 s = vec4(phi, theta, r, 1.0);
        toStereo(s);
        phi = s.x;
        theta = s.y;
        r = s.z;
    }

    o.x = theta * cos(phi);
    o.y = theta * sin(phi);
    o.y /= PI / (2.0 * 180.0) * FOV;
    o.x /= PI / (2.0 * 180.0) * FOV;
    o.z = (r - NEAR) / (FAR - NEAR);

    // Small work around to the depth testing which hides duplicate objects...
    if (gl_InvocationID == 0 && STEREO == 1)
        o.x = o.x / 2.0 - 0.5;
    else if (STEREO == 1)
        o.x = o.x / 2.0 + 0.5;

    p = o;
}

/***************/
void toStereo(inout vec4 v)
{
    float b = BASELINE;
    float r = RADIUS;

    float d = v.z; // * (1 - cos(v.y));
    float theta;
    if (gl_InvocationID == 0)
        theta = atan(b * (d - r) / (d * r)) * (1 - cos(v.y));
    else
        theta = atan(-b * (d - r) / (d * r)) * (1 - cos(v.y));

    v = vec4(v.x + theta, v.yzw);
}

/***************/
bool cull(in vec4 p[3])
{
    for (int i = 0; i < 3; ++i)
        toSphere(p[i]);

    float limit = (STEREO == 1) ? 1.0 : 2.0;

    bool visible = true;
    for (int i = 0; i < 3; ++i)
    {
        if (abs(p[i].x - p[(i+1)%3].x) > limit || abs(p[i].y - p[(i+1)%3].y) > limit)
            visible = false;
    }
    return !visible;
}

/***************/
bool doEmitVertex(in vec4 v)
{
    // This prevents both views to draw in the other one...
    if (STEREO == 1 && vPass == 0)
        if ((gl_InvocationID == 0 && v.x > 0.0) || (gl_InvocationID == 1 && v.x < 0.0))
            return false;
    return true;
}

/***************/
void main()
{
    vec4[3] vertices;

    vertices[0] = gl_in[0].gl_Position;
    vertices[1] = gl_in[1].gl_Position;
    vertices[2] = gl_in[2].gl_Position;

    vec4[3] domeVertices;
    domeVertices = vertices;

    if (vPass == 0)
    {
        toSphere(domeVertices[0]);
        toSphere(domeVertices[1]);
        toSphere(domeVertices[2]);

        vec2 center = vec2(0.0);
        if (STEREO == 1 && gl_InvocationID == 0)
            center.x = -0.5;
        else if (STEREO == 1 && gl_InvocationID == 1)
            center.x = 0.5;
        if (length(domeVertices[0].xy - center) > 1.0 || length(domeVertices[1].xy - center) > 1.0 || length(domeVertices[2].xy - center) > 1.0)
            return;

        for (int i = 0; i < 3; ++i)
            if (!doEmitVertex(domeVertices[i]))
                return;
    }

    gl_Position = domeVertices[0];
    geom_out.texCoord = tes_out[0].texCoord;
    geom_out.vertex = tes_out[0].vertex;
    geom_out.normal = normalize(cross((vertices[1] - vertices[0]).xyz, (vertices[2] - vertices[0]).xyz));
    EmitVertex();

    gl_Position = domeVertices[1];
    geom_out.texCoord = tes_out[1].texCoord;
    geom_out.vertex = tes_out[1].vertex;
    geom_out.normal = tes_out[2].normal;
    geom_out.normal = normalize(cross((vertices[1] - vertices[0]).xyz, (vertices[2] - vertices[0]).xyz));
    EmitVertex();

    gl_Position = domeVertices[2];
    geom_out.texCoord = tes_out[2].texCoord;
    geom_out.vertex = tes_out[2].vertex;
    geom_out.normal = tes_out[2].normal;
    geom_out.normal = normalize(cross((vertices[1] - vertices[0]).xyz, (vertices[2] - vertices[0]).xyz));
    EmitVertex();

    EndPrimitive();
}
