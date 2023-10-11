precision highp float;

uniform sampler2D uEmission;

out vec4 oColor;

void main() {
    vec3 emission = texelFetch(uEmission, ivec2(gl_FragCoord.xy), 0).rgb;

    oColor = vec4(emission, 1);
}
