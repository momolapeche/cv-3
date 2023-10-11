precision highp float;

uniform mat4 uTransform;
uniform mat4 uCamera;
uniform mat4 uProjection;

#ifdef INSTANCED
    in mat4 aLocalTransform;
#endif

in vec3 aPosition;

#ifdef USE_COLOR_ATTRIBUTE
    in vec3 aColor;

    out vec3 vColor;
#endif

#ifdef NORMAL
    in vec3 aNormal;

    out vec3 vNormal;
#endif

out vec3 vPosition;

void main() {
#ifdef USE_COLOR_ATTRIBUTE
    vColor = aColor;
#endif
#ifdef NORMAL
    vNormal = mat3(uTransform) * aNormal;
#endif

#ifdef INSTANCED
    vPosition = (uTransform * aLocalTransform * vec4(aPosition, 1)).xyz;
    gl_Position = uProjection * uCamera * uTransform * aLocalTransform * vec4(aPosition, 1);
#else
    vPosition = (uTransform * vec4(aPosition, 1)).xyz;
    gl_Position = uProjection * uCamera * uTransform * vec4(aPosition, 1);
#endif
}


