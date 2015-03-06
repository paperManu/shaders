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

in GEOM_OUT
{
    vec4 vertex;
    vec2 texCoord;
    vec3 normal;
} geom_out;

layout (location = 0) out vec4 fragColor;

/***************/
// Displays the HUD, which is basically an FPS counter
vec4 hud()
{
    float scale = vResolution.y/32.f;
    vec4 color = texture(vHUDMap, vec2(geom_out.texCoord.s, geom_out.texCoord.t*scale));
    color.a = 1.0;
    return color;
}
/***************/
vec4 drawPattern()
{
    vec4 c = vec4(0.0);
    float dist = length (geom_out.texCoord - vec2(0.5, 0.5));
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
        fragColor = texture2D(vTexMap, geom_out.texCoord);
        //fragColor = vec4(1.0);
        //fragColor.rgb = (geom_out.vertex + vec3(1.0)) / 2.0;
        //fragColor.rgb = geom_out.normal;

        vec3 N = geom_out.normal;
        vec3 L = normalize(vec3(sin(vTimer), cos(vTimer * 1.5), 1.0));
        float df = abs(dot(N, L));
        fragColor.rgb = vec3(0.3, 0.0, 0.0) + fragColor.rgb * df * vec3(0.3, 0.9, 0.7);
    }
    else
    {
        fragColor = texture2D(vFBOMap, geom_out.texCoord);
        fragColor += hud();
        if (DISPLAY_PATTERN)
            fragColor += drawPattern();
    }
    //fragColor = vec4(1.0);
}
