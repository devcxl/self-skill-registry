# PKCE 支持

## 为什么需要 PKCE

PKCE (Proof Key for Code Exchange) 防止授权码截获攻击，即使攻击者截获了授权码也无法交换 token。

## 实现

```java
public class CustomAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private final StringKeyGenerator secureKeyGenerator = new Base64StringKeyGenerator(
        Base64.getUrlEncoder().withoutPadding(), 96);

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        String registrationId = this.extractRegistrationId(request);
        if (registrationId == null) {
            return null;
        }

        OAuth2AuthorizationRequest.Builder builder =
            OAuth2AuthorizationRequest.from(authorizationRequest);
        builder.clientId(this.clientRegistration.getClientId());

        // 添加 PKCE 参数
        addPkceParameters(builder);

        return builder.build();
    }

    private void addPkceParameters(OAuth2AuthorizationRequest.Builder builder) {
        Map<String, Object> attributes = new HashMap<>();
        Map<String, Object> additionalParameters = new HashMap<>();

        String codeVerifier = this.secureKeyGenerator.generateKey();
        attributes.put(PkceParameterNames.CODE_VERIFIER, codeVerifier);

        try {
            String codeChallenge = createHash(codeVerifier);  // SHA-256
            additionalParameters.put(PkceParameterNames.CODE_CHALLENGE, codeChallenge);
            additionalParameters.put(PkceParameterNames.CODE_CHALLENGE_METHOD, "S256");
        } catch (NoSuchAlgorithmException e) {
            // Fallback: 使用 plain 方法（不推荐）
            additionalParameters.put(PkceParameterNames.CODE_CHALLENGE, codeVerifier);
        }

        builder.attributes(attrs -> attrs.putAll(attributes));
        builder.additionalParameters(params -> params.putAll(additionalParameters));
    }

    private String createHash(String value) throws NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] digest = md.digest(value.getBytes(StandardCharsets.US_ASCII));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
    }
}
```

## 错误处理

```java
// PKCE 相关异常处理
try {
    addPkceParameters(builder);
} catch (NoSuchAlgorithmException e) {
    // 记录日志，降级为 plain method
    log.warn("SHA-256 not available, using plain PKCE method");
}

// Token 交换时的错误
try {
    OAuth2AccessTokenResponse response = this.oauth2AccessTokenResponseHttpClient
        .getTokenResponse(request);
} catch (OAuth2AuthorizationException e) {
    // 授权失败 - 可能 code_verifier 不匹配
    log.error("Token exchange failed: {}", e.getErrorCode());
    throw new OAuth2AuthenticationException("token_exchange_failed");
}
```

## 网络错误重试

```java
@Retryable(
    value = {ResourceAccessException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 1000, multiplier = 2)
)
public OAuth2AccessTokenResponse exchangeCodeForToken(String code, String codeVerifier) {
    // 实现重试逻辑
}
```

## Fallback 机制

```java
private void addPkceParameters(OAuth2AuthorizationRequest.Builder builder) {
    try {
        String codeVerifier = generateSecureCodeVerifier();
        String codeChallenge = createSha256Hash(codeVerifier);

        builder
            .attribute(PkceParameterNames.CODE_VERIFIER, codeVerifier)
            .additionalParameter(PkceParameterNames.CODE_CHALLENGE, codeChallenge)
            .additionalParameter(PkceParameterNames.CODE_CHALLENGE_METHOD, "S256");
    } catch (NoSuchAlgorithmException e) {
        // 降级: 不使用 PKCE (仅在极特殊情况下)
        log.warn("PKCE not available, proceeding without PKCE");
    }
}
```