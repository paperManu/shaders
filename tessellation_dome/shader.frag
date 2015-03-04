#version 430 core

#define INV_PATTERN_WIDTH 3.0
#define DISPLAY_PATTERN false

uniform sampler2D vTexMap;
uniform sampler2D vHUDMap;
uniform sampler2D vFBOMap;

uniform vec2 vMouse;
uniform float vTimer;
uniform vec2 vResolution;
uniform int vPass;

in TES_OUT
{
    vec2 texCoord;
    vec3 normal;
} tes_out;

out vec4 fragColor;

/***************/
// Displays the HUD, which is basically an FPS counter
vec4 hud()
{
    float scale = vResolution.y/32.f;
    vec4 color = texture(vHUDMap, vec2(tes_out.texCoord.s, tes_out.texCoord.t*scale));
    color.a = 1.0;
    return color;
}
/***************/
vec4 drawPattern()
{
    vec4 c = vec4(0.0);
    float dist = length (tes_out.texCoord - vec2(0.5, 0.5));
    dist *= 180.0 * INV_PATTERN_WIDTH;
    if (int(dist) % int(10.0 * INV_PATTERN_WIDTH) < 1)
        c = vec4(1.0);

    return c;
}

/*************/
void main(void)
{
    fragColor = vec4(1.0);

    if (vPass == 0)
    {
        fragColor = texture2D(vTexMap, tes_out.texCoord);
    }
    else
    {
        fragColor = texture2D(vFBOMap, tes_out.texCoord);
        fragColor += hud();
        if (DISPLAY_PATTERN)
            fragColor += drawPattern();
    }
    //fragColor = vec4(1.0);
}
