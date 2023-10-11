precision highp float;

uniform sampler2D uPosition;
uniform sampler2D uAlbedo;
uniform sampler2D uNormal;
uniform sampler2D uMaterial;

uniform vec3 uCameraPosition;

uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform float uLightRadius;
uniform vec3 uLightDirection;
uniform float uLightAngle;

out vec4 oColor;

#ifdef USE_SHADOW_MAP
    uniform mat4 uShadowMapMat;
    uniform sampler2D uShadowMap;
#endif

#include <lightFS>

void main() {
    vec4 position4 = texelFetch(uPosition, ivec2(gl_FragCoord.xy), 0);
    if (position4.w == 0.)
        discard;
    vec3 position = position4.xyz;
    vec3 normal = texelFetch(uNormal, ivec2(gl_FragCoord.xy), 0).rgb;
    vec3 albedo = texelFetch(uAlbedo, ivec2(gl_FragCoord.xy), 0).xyz;
    vec4 material = texelFetch(uMaterial, ivec2(gl_FragCoord.xy), 0);

    vec3 lightDir = uLightPosition - position;
    vec3 viewDir = uCameraPosition - position;

    // vec3 geometryNormal = normal;
    // vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );
    // float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
    float geometryRoughness = material.b;

    float d = length(lightDir);
    vec3 L = normalize(lightDir);
    vec3 V = normalize(viewDir);
    vec3 N = normal;
    vec3 H = normalize(L+V);

    float angle = acos(dot(-L, normalize(uLightDirection)));
    if (angle > uLightAngle) {
        discard;
    }

    float NdH = max(0.0, dot(N, H));
    float VdH = max(0.0, dot(V, H));
    float NdV = max(0.0, dot(N, V));
    float NdL = max(0.0, dot(N, L));

    float falloff = pow(max(0.0, 1. - pow(d / uLightRadius, 4.)), 2.) / (d*d + 1.);

    vec3 I = uLightColor * uLightIntensity * NdL * falloff * smoothstep(uLightAngle, uLightAngle*0.9, angle);
 
#ifdef USE_SHADOW_MAP
    vec4 v = uShadowMapMat * vec4(position, 1.);
    v.xyz /= v.w;
    float depthSample = texture(uShadowMap, v.xy * .5 + .5).r;
    float shadow = (depthSample * 2. - 1. < v.z) ? 0. : 1.;
    I *= shadow;
#endif

    float metallic = material.g;
    float roughness = material.r;

    roughness = max(roughness, 0.0525);
    roughness += geometryRoughness;
    roughness = min(roughness, 1.);
    vec3 F0 = mix(vec3(0.04), albedo, metallic);

    vec3 diffuse = albedo * (1. - metallic);
    // vec3 diffuse = albedo;

    vec3 col = max(vec3(0), PI * I * (BRDF(diffuse) + CookTorrance(NdH, VdH, NdV, NdL, roughness, F0)));

    oColor = vec4(col, 1);
}
