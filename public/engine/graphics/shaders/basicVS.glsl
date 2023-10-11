precision highp float;

void main() {
    gl_Position = vec4(
        (gl_VertexID & 1) == 1 ? 1 : -1,
        (gl_VertexID & 2) == 2 ? 1 : -1,
        0, 1);
}


