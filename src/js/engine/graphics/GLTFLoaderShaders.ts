export const vertexShader = `#version 300 es

<DEFINES>

precision highp float;

uniform mat4 uTransform;
uniform mat4 uCamera;
uniform mat4 uProjection;

#ifdef INSTANCED
    in mat4 uLocalTransform;
#else
    uniform mat4 uLocalTransform;
#endif

#ifdef SKINNED
    layout(std140) uniform uJoints {
        mat4 matrices[SKIN_MATRICES_NUM];
    };

    in vec4 aWeights;
    in uvec4 aJoints;
#endif

in vec3 aPosition;
in vec3 aNormal;

out vec3 vPosition;
out vec3 vNormal;

void main() {
    vec4 position = vec4(aPosition, 1);
    vec3 normal = aNormal;

#ifdef SKINNED
    mat4 jointMat = (
        matrices[aJoints.x] * aWeights.x +
        matrices[aJoints.y] * aWeights.y +
        matrices[aJoints.z] * aWeights.z +
        matrices[aJoints.w] * aWeights.w
    );
    position = jointMat * position;
    normal = mat3(jointMat) * normal;
#endif

    vNormal = mat3(uTransform) * mat3(uLocalTransform) * normal;
    vPosition = (uTransform * uLocalTransform * position).xyz;
    gl_Position = uProjection * uCamera * uTransform * uLocalTransform * position;
}
`


export const fragmentShader = `#version 300 es

precision highp float;

in vec3 vPosition;
in vec3 vNormal;

uniform vec4 uColor;
uniform float uRoughness;
uniform float uMetalness;

layout(location = 0) out vec4 oPosition;
layout(location = 1) out vec4 oAlbedo;
layout(location = 2) out vec3 oNormal;
layout(location = 3) out vec3 oEmission;
layout(location = 4) out vec4 oMaterial;

void main() {
    vec3 n = normalize(vNormal);
    vec3 albedo = uColor.rgb;
    vec3 emission = vec3(0);
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
`


