precision highp float;

uniform sampler2D uPosition;
uniform sampler2D uNormal;
uniform sampler2D uDither;

uniform float uRadius;
uniform mat4 uV;
uniform mat4 uVP;

#define SAMPLE_VECS_NUM 64
uniform vec3 uSamples[SAMPLE_VECS_NUM];

out vec4 oColor;

void main() {
    vec4 position = texelFetch(uPosition, ivec2(gl_FragCoord.xy), 0);
    vec3 normal = normalize(texelFetch(uNormal, ivec2(gl_FragCoord.xy), 0).xyz);
    if (position.w == 0.) {
        discard;
    }
    vec4 positionV = uV * position;
    vec4 positionVP = uVP * position;
    positionVP.xyz /= positionVP.w;

    vec3 tangent = vec3(0,0,1);
    tangent = abs(dot(tangent, normal)) > 0.9 ? vec3(1,0,0) : tangent;
    tangent = normalize(tangent - normal * dot(tangent, normal));
    vec3 bitangent = normalize(cross(normal, tangent));
    mat3 TBN = mat3(tangent, bitangent, normal);

    float dither = texelFetch(uDither, ivec2(gl_FragCoord.xy) % textureSize(uDither, 0), 0).r;
    mat2 ditherMat = mat2(
        cos(dither), sin(dither),
        -sin(dither), cos(dither)
    );

    float occlusion = 0.0;

    float sigma = 1.0;
    float k = 1.0;
    float beta = 0.001;
    float epsilon = 0.0001;
    float s = float(SAMPLE_VECS_NUM);
    float facc = 0.0;
    for (int i = 0; i < SAMPLE_VECS_NUM; i++) {
        vec3 sampleVec = uSamples[i] * uRadius;
        sampleVec.xy = ditherMat * sampleVec.xy;
        sampleVec = TBN * sampleVec;

        vec4 transformed = uVP * vec4(position.xyz + sampleVec, 1);
        transformed.xyz /= transformed.w;

        vec4 vW = texture(uPosition, transformed.xy * 0.5 + 0.5);
        if (vW.w == 0.) {
            continue;
        }

        // vec3 v = vW.xyz - position.xyz;
        // float dt = max(0.0, (dot(v, normal) + beta * positionV.z)) / (dot(v, v) + epsilon);
        // facc += max(0.0, dt);


        vec3 v = vW.xyz - position.xyz;
        facc += max(0.0, dot(v, normal) + beta*positionV.z) / (dot(v, v) + epsilon);
    }
    // facc = facc / s;
    facc = pow(max(0.0, 1. - 2.0 * sigma / s * facc), k);

    occlusion = facc;
    // occlusion = max(0.0, 1. - occlusion);

    oColor = vec4(occlusion, 0, 0, 1);
}









