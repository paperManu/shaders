#version 430 core

#define PI 3.141592653589

#define FOV 210
#define NEAR 1.0
#define FAR 100.0

#define INVERT_DOME false
#define STEREO true
#define BASELINE 0.1
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
    smooth vec4 vertex;
    smooth vec4 spherical;
    smooth vec2 texCoord;
    smooth vec3 normal;
    flat float eye;
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
    vec3 spherical;

    vec4 o = vec4(1.0);

    spherical.z = length(v.xyz);
    spherical.y = acos(v.z / spherical.z);

    vec2 val = v.xy / (spherical.z * sin(spherical.y));
    float first = acos(clamp(val.x, -1.0, 1.0));
    float second = asin(clamp(val.y, -1.0, 1.0));
    if (second >= 0.0)
        spherical.x = first;
    else
        spherical.x = 2.0*PI - first;

    if (STEREO)
    {
        vec4 s = vec4(spherical, 1.0);
        toStereo(s);
        spherical = s.xyz;
    }

    o.xy = spherical.y * vec2(cos(spherical.x), sin(spherical.x));
    o.xy /= PI / 360.0 * FOV;
    o.z = (spherical.z - NEAR) / (FAR - NEAR);

    // Test whether this vertex should be drawn
    if (length(o.xy) > 1.0)
        o.w = -1.0;
    else
        o.w = 1.0;

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

    float limit = STEREO ? 1.0 : 2.0;

    bool visible = true;
    for (int i = 0; i < 3; ++i)
    {
        if (abs(p[i].x - p[(i+1)%3].x) > limit || abs(p[i].y - p[(i+1)%3].y) > limit)
            visible = false;
    }
    return !visible;
}

/***************/
int doEmitVertex(inout vec4 v)
{
    // This prevents both views to draw in the other one...
    //if (STEREO && vPass == 0)
    //    if ((gl_InvocationID == 0 && v.x > 0.0) || (gl_InvocationID == 1 && v.x < 0.0))
    //        return false;

    // If this vertex is out of view, normalize it to be on the edge of the view
    if (v.w < 0.0)
        return 0;

    return 1;
}

/***************/
void separateStereoViews(inout vec4 v)
{
    // Small work around to the depth testing which hides duplicate objects...
    if (STEREO)
    {
        if (v.w < 0.0)
        {
            v.xy = normalize(v.xy);
            v.w = 1.0;
        }

        if (gl_InvocationID == 0)
            v.x = v.x / 2.0 - 0.5;
        else
            v.x = v.x / 2.0 + 0.5;
    }
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
    float eye = 0.0;

    if (vPass == 0)
    {
#if INVERT_DOME
        for (int i = 0; i < 3; ++i)
        {
            domeVertices[i].z = -domeVertices[i].z;
            vertices[i].z = -vertices[i].z;
        }
#endif

        toSphere(domeVertices[0]);
        toSphere(domeVertices[1]);
        toSphere(domeVertices[2]);

        // TODO: this is the first method used to get rid of unwanted faces
        //vec2 center = vec2(0.0);
        //if (STEREO && gl_InvocationID == 0)
        //    center.x = -0.5;
        //else if (STEREO && gl_InvocationID == 1)
        //    center.x = 0.5;
        //if (length(domeVertices[0].xy - center) > 1.0 || length(domeVertices[1].xy - center) > 1.0 || length(domeVertices[2].xy - center) > 1.0)
        //    return;

        if (STEREO && gl_InvocationID == 0)
            eye = -1.0;
        else if (STEREO && gl_InvocationID == 1)
            eye = 1.0;

        int doEmit = 0;
        doEmit += doEmitVertex(domeVertices[0]);
        doEmit += doEmitVertex(domeVertices[1]);
        doEmit += doEmitVertex(domeVertices[2]);
        if (doEmit == 0)
            return;

        separateStereoViews(domeVertices[0]);
        separateStereoViews(domeVertices[1]);
        separateStereoViews(domeVertices[2]);

#if INVERT_DOME
        for (int i = 2; i >= 0; --i)
        {
            gl_Position = domeVertices[i];
            geom_out.vertex = tes_out[i].vertex;
            geom_out.spherical = domeVertices[i];
            geom_out.texCoord = tes_out[i].texCoord;
            geom_out.eye = eye;
            geom_out.normal = normalize(cross((vertices[1] - vertices[0]).xyz, (vertices[2] - vertices[0]).xyz));
            EmitVertex();
        }
#else
        for (int i = 0; i < 3; ++i)
        {
            gl_Position = domeVertices[i];
            geom_out.vertex = tes_out[i].vertex;
            geom_out.spherical = domeVertices[i];
            geom_out.texCoord = tes_out[i].texCoord;
            geom_out.eye = eye;
            geom_out.normal = normalize(cross((vertices[1] - vertices[0]).xyz, (vertices[2] - vertices[0]).xyz));
            EmitVertex();
        }
#endif

        EndPrimitive();
    }
    else
    {
        gl_Position = domeVertices[0];
        geom_out.texCoord = tes_out[0].texCoord;
        EmitVertex();

        gl_Position = domeVertices[1];
        geom_out.texCoord = tes_out[1].texCoord;
        EmitVertex();

        gl_Position = domeVertices[2];
        geom_out.texCoord = tes_out[2].texCoord;
        EmitVertex();

        EndPrimitive();
    }
}
