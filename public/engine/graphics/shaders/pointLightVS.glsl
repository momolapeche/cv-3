precision highp float;

uniform vec3 uLightPosition;

#ifdef INSTANCED
    in vec3 aLightLocalPosition;
    in vec3 aLightColor;
    in float aLightIntensity;
    in float aLightRadius;
#else
    uniform vec3 uLightColor;
    uniform float uLightIntensity;
    uniform float uLightRadius;
#endif

flat out vec3 vLightPosition;
flat out vec3 vLightColor;
flat out float vLightIntensity;
flat out float vLightRadius;

void main() {
#ifdef INSTANCED
    vLightPosition = uLightPosition + aLightLocalPosition;
    vLightColor = aLightColor;
    vLightIntensity = aLightIntensity;
    vLightRadius = aLightRadius;
#else
    vLightPosition = uLightPosition;
    vLightColor = uLightColor;
    vLightIntensity = uLightIntensity;
    vLightRadius = uLightRadius;
#endif

    gl_Position = vec4(
        (gl_VertexID & 1) == 1 ? 1 : -1,
        (gl_VertexID & 2) == 2 ? 1 : -1,
        0, 1);
}

