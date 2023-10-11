precision highp float;

uniform sampler2D uAlbedo;
uniform sampler2D uAO;

uniform float uIntensity;
uniform vec3 uColor;

out vec4 oColor;

void main() {
    vec3 albedo = texelFetch(uAlbedo, ivec2(gl_FragCoord.xy), 0).rgb;
    float ambientOcclusion = texelFetch(uAO, ivec2(gl_FragCoord.xy), 0).r;

    vec3 ambient = mix(ambientOcclusion, 1., 0.3) * uColor * uIntensity;

    oColor = vec4(albedo * ambient, 1);
}
