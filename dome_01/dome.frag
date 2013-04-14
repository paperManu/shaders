#version 330 core

#define INV_PATTERN_WIDTH 3.0
#define DISPLAY_PATTERN false

uniform sampler2D vTexMap;
uniform sampler2D vHUDMap;
uniform sampler2D vFBOMap;

uniform int vPass;
uniform vec2 vResolution;

in VertexData
{
    vec3 vertex;
    vec2 texCoord;
    vec3 normal;
} vertexIn;

out vec4 fragColor;

/***************/
// Displays the HUD, which is basically an FPS counter
vec4 hud()
{
    float scale = vResolution.y/32.f;
    vec4 color = texture(vHUDMap, vec2(vertexIn.texCoord.s, vertexIn.texCoord.t*scale));
    color.a = 1.0;
    return color;
}

/***************/
vec4 drawPattern()
{
    vec4 c = vec4(0.0);
    float dist = length (vertexIn.texCoord - vec2(0.5, 0.5));
    dist *= 180.0 * INV_PATTERN_WIDTH;
    if (int(dist) % int(10.0 * INV_PATTERN_WIDTH) < 1)
        c = vec4(1.0);

    return c;
}

/***************/
void main()
{
    if (vPass == 0)
    {
        fragColor = texture2D(vTexMap, vertexIn.texCoord);
    }
    else
    {
        fragColor = texture2D(vFBOMap, vertexIn.texCoord);
        fragColor += hud();
        if (DISPLAY_PATTERN)
            fragColor += drawPattern();
    }
}
