#version 430 core

#define INV_PATTERN_WIDTH 3.0
#define DISPLAY_PATTERN false

#define STEREO true
#define ANAGLYPH false

uniform sampler2D vTexMap;
uniform sampler2D vHUDMap;
uniform sampler2D vFBOMap;
uniform sampler2D vFBOMap2;

uniform vec2 vMouse;
uniform float vTimer;
uniform vec2 vResolution;
uniform int vPass;

in GEOM_OUT
{
    vec4 vertex;
    vec4 spherical;
    vec2 texCoord;
    vec3 normal;
    float eye;
} geom_out;

layout (location = 0) out vec4 fragColor;
layout (location = 1) out vec4 fragColor2;

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
        //if (length(geom_out.spherical.w) == 0.0)
        //    discard;

        // Lambert lighting
        vec3 N = geom_out.normal;
        vec3 L = normalize(vec3(sin(0.5), cos(0.5 * 1.5), 1.0));
        float df = abs(dot(N, L));

        if (geom_out.eye == 0.0)
        {
            // If no stereo output
            if (length(gl_FragCoord.xy / vResolution - vec2(0.5, 0.5)) >= 0.5)
                fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            else
            {
                fragColor = texture2D(vTexMap, geom_out.texCoord);
                fragColor.rgb = vec3(0.3, 0.0, 0.0) + fragColor.rgb * df * vec3(0.3, 0.9, 0.7);

                // Color from normals
                //fragColor = vec4(1.0);
                //fragColor.rgb = geom_out.normal;
            }
        }
        else if (geom_out.eye < 0.0)
        {
            // If left eye
            fragColor = texture2D(vTexMap, geom_out.texCoord);
            fragColor.rgb = vec3(0.3, 0.0, 0.0) + fragColor.rgb * df * vec3(0.3, 0.9, 0.7);

            // Color from normals
            //fragColor = vec4(1.0);
            //fragColor.rgb = geom_out.normal;
        }
        else if (geom_out.eye > 0.0)
        {
            // If right eye
            fragColor2 = texture2D(vTexMap, geom_out.texCoord);
            fragColor2.rgb = vec3(0.3, 0.0, 0.0) + fragColor2.rgb * df * vec3(0.3, 0.9, 0.7);

            // Color from normals
            //fragColor2 = vec4(1.0);
            //fragColor2.rgb = geom_out.normal;
        }
    }
    else
    {
        vec2 pos = gl_FragCoord.xy / vResolution;
        if (!STEREO)
        {
            fragColor = texture2D(vFBOMap, geom_out.texCoord);
        }
        else if (STEREO && !ANAGLYPH)
        {
            fragColor = vec4(0.0);
            if (pos.x < 0.5 && length((pos - vec2(0.25, 0.5)) * vec2(1.0, 0.5)) < 0.25)
                fragColor = texture2D(vFBOMap, geom_out.texCoord);
            else if (length((pos - vec2(0.75, 0.5)) * vec2(1.0, 0.5)) < 0.25)
                fragColor = texture2D(vFBOMap2, geom_out.texCoord);
        }
        else if (STEREO && ANAGLYPH)
        {
            fragColor = vec4(0.0);
            if (length(pos - vec2(0.5, 0.5)) <= 0.5)
            {
                fragColor = vec4(1.0, 0.0, 0.0, 1.0) * texture2D(vFBOMap, vec2(pos.x * 0.5, pos.y));
                fragColor += vec4(0.0, 1.0, 1.0, 1.0) * texture2D(vFBOMap2, vec2(pos.x * 0.5 + 0.5, pos.y));
            }
        }
        fragColor += hud();
        if (DISPLAY_PATTERN)
            fragColor += drawPattern();
    }
}
