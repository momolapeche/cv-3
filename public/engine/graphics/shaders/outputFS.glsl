precision highp float;

uniform sampler2D uPosition;
uniform sampler2D uAlbedo;
uniform sampler2D uNormal;
uniform sampler2D uMaterial;
uniform sampler2D uEmission;
uniform sampler2D uAO;
uniform sampler2D uColor;

out vec4 oColor;

vec3 acesTM(in vec3 color) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;

    return clamp((color*(a*color+b)) / (color * (c * color + d) + e), vec3(0), vec3(1));
}

void main() {
    float lambda = 0.5;
    float A = 0.8;

    vec3 outputColor = texelFetch(uColor, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 albedo = texelFetch(uAlbedo, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 position = texelFetch(uPosition, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 normal = texelFetch(uNormal, ivec2(gl_FragCoord.xy), 0).xyz;
    float ao = texelFetch(uAO, ivec2(gl_FragCoord.xy), 0).r;

    vec3 color;
    color = outputColor;
    //color = A * pow(color.rgb, vec3(lambda));
    color = acesTM(color);
    oColor = vec4(color, 1);
}
