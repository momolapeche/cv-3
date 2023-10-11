#define PI 3.14159265359
#define PI_INV 0.31830988618

#define EPSILON 1e-6
#define pow2(x) (x*x)

vec3 BRDF(in vec3 albedo) {
    return albedo * PI_INV;
}

float NDF(in float NdH, in float roughness) {
    float alpha = roughness * roughness;
    float a2 = alpha * alpha;
    float denom = NdH*NdH*(a2 - 1.) + 1.;

    return a2 / (PI * denom * denom);
}

float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {

	float a2 = pow2( alpha );

	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );

	return 0.5 / max( gv + gl, EPSILON );

}

float GGX(in float NdX, in float k) {
    return NdX / (NdX * (1. - k) + k);
}

float G(in float NdL, in float NdV, in float roughness) {
    float k = roughness + 1.;
    k = k * k / 8.;
    return GGX(NdL, k) * GGX(NdV, k);
}

vec3 Fresnel(in float VdH, in vec3 F0) {
    return F0 + (1. - F0)*exp2((-5.55473*VdH - 6.98316)*VdH);
}

vec3 CookTorrance(in float NdH, in float VdH, in float NdV, in float NdL, in float roughness, in vec3 F0) {

    // float alpha = roughness * roughness;
    // vec3 num = NDF(NdH, roughness) * Fresnel(VdH, F0) * V_GGX_SmithCorrelated(alpha, NdL, NdV);
    // return num;

    vec3 num = NDF(NdH, roughness) * Fresnel(VdH, F0) * G(NdL, NdV, roughness);
    float den = PI * NdL * NdV;
    return num / den;
}
