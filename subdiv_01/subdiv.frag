#version 330 core

uniform sampler2D vTexMap;
uniform sampler2D vHUDMap;
uniform sampler2D vFBOMap;

uniform int vPass;
uniform vec2 vResolution;

in VertexData
{
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
void main()
{
    if (vPass == 0)
    {
        fragColor = vec4(0.0);
    }
    else
    {
        fragColor = texture2D(vTexMap, vertexIn.texCoord);
        fragColor += hud();
    }
}
