precision highp float;

in vec3 vPosition;

#ifdef USE_COLOR
    uniform vec3 uColor;
#endif

#ifdef USE_COLOR_ATTRIBUTE
    in vec3 vColor;
#endif

#ifdef NORMAL
    in vec3 vNormal;
#endif

#ifdef USE_EMISSION
    uniform vec3 uEmission;
#endif

uniform float uRoughness;
uniform float uMetalness;

layout(location = 0) out vec4 oPosition;
layout(location = 1) out vec4 oAlbedo;
layout(location = 2) out vec3 oNormal;
layout(location = 3) out vec3 oEmission;
layout(location = 4) out vec4 oMaterial;

void main() {
#ifdef NORMAL
    vec3 n = normalize(vNormal);
#else
    vec3 n = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
#endif

    vec3 albedo = vec3(1);

#ifdef USE_COLOR_ATTRIBUTE
    albedo *= vColor;
#endif
#ifdef USE_COLOR
    albedo *= uColor;
#endif

#ifdef USE_EMISSION
    vec3 emission = uEmission;
#else
    vec3 emission = vec3(0);
#endif

    float roughness = uRoughness;
    float metalness = uMetalness;

    vec3 dxy = max( abs( dFdx( n ) ), abs( dFdy( n ) ) );
    float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );

    oPosition = vec4(vPosition, 1);
    oAlbedo = vec4(albedo, 1);
    oNormal = n;
    oMaterial = vec4(
        roughness,
        metalness,
        geometryRoughness,
        0.0
    );
    oEmission = emission;
}
