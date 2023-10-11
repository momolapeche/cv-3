precision highp float;

uniform sampler2D uPosition;
uniform sampler2D uAlbedo;
uniform sampler2D uNormal;
uniform sampler2D uMaterial;

uniform vec3 uCameraPosition;

flat in vec3 vLightPosition;
flat in vec3 vLightColor;
flat in float vLightIntensity;
flat in float vLightRadius;

out vec4 oColor;

#include <lightFS>

void main() {
    vec4 position4 = texelFetch(uPosition, ivec2(gl_FragCoord.xy), 0);
    if (position4.w == 0.) {
        discard;
    }

    vec3 position = position4.xyz;
    vec3 lightDir = vLightPosition - position;
    float d = length(lightDir);
    float falloff = pow(max(0.0, 1. - pow(d / vLightRadius, 4.)), 2.) / (d*d + 1.);
    if (falloff <= 0.) {
        discard;
    }

    vec3 viewDir = uCameraPosition - position;

    vec3 normal = texelFetch(uNormal, ivec2(gl_FragCoord.xy), 0).rgb;
    vec3 albedo = texelFetch(uAlbedo, ivec2(gl_FragCoord.xy), 0).xyz;
    vec4 material = texelFetch(uMaterial, ivec2(gl_FragCoord.xy), 0);

    float geometryRoughness = material.b;

    vec3 L = normalize(lightDir);
    vec3 V = normalize(viewDir);
    vec3 N = normal;
    vec3 H = normalize(L+V);

    float NdH = max(0.0, dot(N, H));
    float VdH = max(0.0, dot(V, H));
    float NdV = max(0.0, dot(N, V));
    float NdL = max(0.0, dot(N, L));

 
    vec3 I = vLightColor * vLightIntensity * NdL * falloff;

    float metallic = material.g;
    float roughness = material.r;

    roughness = max(roughness, 0.0525);
    roughness += geometryRoughness;
    roughness = min(roughness, 1.);
    vec3 F0 = mix(vec3(0.04), albedo, metallic);

    vec3 diffuse = albedo * (1. - metallic);

    vec3 col = max(vec3(0), PI * I * (BRDF(diffuse) + CookTorrance(NdH, VdH, NdV, NdL, roughness, F0)));

    oColor = vec4(col, 1);
}
