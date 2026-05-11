# OAuth2 测试策略

## 测试分层

### 1. 单元测试 (Unit Tests)

#### JWT Provider 测试

```java
@ExtendWith(MockitoExtension.class)
class TokenProviderTest {

    @Mock private JWTUtil jwtUtil;
    @Mock private Signer signer;

    @InjectMocks private TokenProvider tokenProvider;

    @Test
    void createAccessToken_shouldIncludeCorrectClaims() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("user123");

        String token = tokenProvider.createAccessToken(auth);

        assertNotNull(token);
        verify(jwtUtil).createToken(any(), any());
    }

    @Test
    void validateToken_withValidToken_shouldReturnTrue() {
        String validToken = "valid.jwt.token";
        when(jwtUtil.validate(validToken, signer)).thenReturn(true);

        assertTrue(tokenProvider.validateToken(validToken));
    }

    @Test
    void validateToken_withExpiredToken_shouldReturnFalse() {
        String expiredToken = "expired.jwt.token";
        when(jwtUtil.validate(expiredToken, signer))
            .thenThrow(new TokenExpiredException("Token expired"));

        assertFalse(tokenProvider.validateToken(expiredToken));
    }
}
```

#### PKCE Resolver 测试

```java
@ExtendWith(MockitoExtension.class)
class CustomAuthorizationRequestResolverTest {

    @Test
    void addPkceParameters_shouldGenerateCodeVerifierAndChallenge() {
        OAuth2AuthorizationRequest.Builder builder =
            OAuth2AuthorizationRequest.from(authorizationRequest);

        resolver.addPkceParameters(builder);

        OAuth2AuthorizationRequest result = builder.build();

        assertNotNull(result.getAttribute(PkceParameterNames.CODE_VERIFIER));
        assertNotNull(result.getAdditionalParameter(PkceParameterNames.CODE_CHALLENGE));
        assertEquals("S256",
            result.getAdditionalParameter(PkceParameterNames.CODE_CHALLENGE_METHOD));
    }

    @Test
    void addPkceParameters_whenSha256Unavailable_shouldUsePlain() {
        // SHA-256 不可用时的降级测试
        // ...
    }
}
```

### 2. 集成测试 (Integration Tests)

#### OAuth 流程测试

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class OAuth2IntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private AccountInfoMapper accountInfoMapper;

    @Test
    void loginWithGoogle_shouldCreateUserAndRedirectWithToken() throws Exception {
        // 1. 模拟 Google OAuth provider 回调
        String authCode = "test-auth-code";
        String redirectUri = "http://localhost/callback";

        mockMvc.perform(get("/oauth2/callback/google")
                .param("code", authCode)
                .param("state", redirectUri)
                .cookie(new Cookie("redirect_uri", redirectUri)))
            .andExpect(status().is3xxRedirection())
            .andExpect(redirectedUrlPattern("**/callback?token=*"));

        // 2. 验证用户已创建
        List<AccountInfoDto> users = accountInfoMapper.getBySource("google");
        assertFalse(users.isEmpty());
    }

    @Test
    void loginWithInvalidCode_shouldReturnError() throws Exception {
        mockMvc.perform(get("/oauth2/callback/google")
                .param("code", "invalid-code"))
            .andExpect(status().isBadRequest());
    }
}
```

### 3. E2E 测试 (使用 Playwright)

```typescript
// e2e/oauth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('OAuth2 Login Flow', () => {
  test('should login with Google and receive token', async ({ page }) => {
    // 1. 访问登录页
    await page.goto('/login');

    // 2. 点击 Google 登录按钮
    await page.click('[data-testid="google-login-btn"]');

    // 3. 应该跳转到后端 OAuth 端点
    await expect(page).toHaveURL(/api\.example\.com\/oauth2\/authorize\/google/);

    // 4. 模拟：直接访问 callback 页（实际测试时需要 mock OAuth provider）
    // 在真实 E2E 中可使用 Playwright 的 http://localhost 网络拦截功能
    await page.goto('/callback?token=test-jwt-token&state=/home');

    // 5. 验证 token 已存储且跳转
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBe('test-jwt-token');

    // 6. 验证 URL 中的 token 已被清理
    await expect(page).toHaveURL('/home');
    const urlAfter = page.url();
    expect(urlAfter).not.toContain('token=');
  });

  test('should handle OAuth error gracefully', async ({ page }) => {
    await page.goto('/callback?error=access_denied&error_description=User+denied+access');

    // 验证错误提示
    await expect(page.getByText('登录已取消')).toBeVisible();
  });
});
```

### 4. 错误场景测试

```java
@Test
void callback_withExpiredCode_shouldReturnProperError() {
    when(oauth2AccessTokenResponseHttpClient.getTokenResponse(any()))
        .thenThrow(new OAuth2AuthorizationException(
            new OAuth2Error("invalid_grant", "Authorization code expired", null)));

    mockMvc.perform(get("/oauth2/callback/google")
            .param("code", "expired-code"))
        .andExpect(redirectedUrlPattern("**/error?code=AUTH_CODE_EXPIRED"));
}

@Test
void callback_withNetworkError_shouldRetryAndFailGracefully() {
    // 测试网络错误时的重试和错误处理
}
```

## Mock OAuth Provider

### 使用 WireMock

```java
@WireMockTest(httpPort = 9999)
class MockOAuthProviderTest {

    @Test
    void shouldExchangeCodeForToken() {
        // 配置 WireMock mock OAuth provider
        stubFor(post("/oauth2/token")
            .withRequestBody(containing("code=test-code"))
            .willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "access_token": "mock-access-token",
                        "token_type": "Bearer",
                        "expires_in": 3600
                    }
                    """)));

        // 测试逻辑...
    }
}
```

## 测试覆盖指标

| 组件 | 覆盖目标 |
|------|----------|
| TokenProvider | JWT 创建、验证、刷新、撤销 |
| CustomAuthorizationRequestResolver | PKCE 生成、Hash fallback |
| OAuth2AuthenticationSuccessHandler | redirect_uri 校验、token 生成、重定向 |
| CustomOAuth2UserService | 用户创建、更新、provider 适配 |
| Cookie 存储 | 保存、读取、删除 |
| 前端 callback | token 提取、存储、清理、错误处理 |