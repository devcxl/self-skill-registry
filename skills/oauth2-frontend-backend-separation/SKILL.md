---
name: oauth2-frontend-backend-separation
description: Use when implementing OAuth2 login with frontend-backend separation, where frontend redirects to backend OAuth endpoint and receives JWT token via redirect
version: 1.0.0
compatibility:
  - opencode
  - claude-code
  - codex
tags:
  - oauth2
  - jwt
  - security
  - authentication
  - frontend-backend
category: utilities
metadata:
  language: cn
  license: MIT
  author: devcxl
---

# OAuth2 Frontend-Backend Separation Login

## Overview

实现前后端分离架构下的OAuth2登录：前端引导用户到后端OAuth端点进行第三方登录（Google/GitHub等），登录成功后后端通过URL重定向将JWT Token返回给前端。

## Core Flow

```
┌──────────┐         ┌──────────┐         ┌─────────────┐         ┌──────────────┐
│  Frontend│         │   浏览器  │         │   Backend   │         │  OAuth Provider│
└──────────┘         └──────────┘         └─────────────┘         └──────────────┘
     │                    │                    │                      │
     │ 1. 跳转登录页        │                    │                      │
     │───────────────────>│                    │                      │
     │                    │ 2. /oauth2/authorize/google               │
     │                    │    ?redirect_uri=https://h5.example.com   │
     │                    │───────────────────>│                      │
     │                    │                    │ 3. PKCE + 重定向      │
     │                    │                    │──────────────────────>│
     │                    │                    │                      │ 4. 用户登录
     │                    │                    │                      │<──────────────────────
     │                    │                    │ 5. /oauth2/callback/google?code=xxx
     │                    │                    │<──────────────────────│
     │                    │                    │ 6. 交换token + 获取用户信息 │
     │                    │                    │──────────────────────>│
     │                    │                    │                      │
     │                    │ 7. 302 重定向到 redirect_uri?token=JWT   │
     │                    │<───────────────────│                      │
     │ 8. 从URL提取token   │                    │                      │
     │<───────────────────│                    │                      │
     │                    │                    │                      │
```

## Key Components

### SecurityConfig 配置

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final static String OAUTH2_BASE_URI = "/oauth2/authorize";
    private final static String OAUTH2_REDIRECTION_ENDPOINT = "/oauth2/callback/*";

    @Bean
    public SecurityFilterChain configure(HttpSecurity http) throws Exception {
        http.oauth2Login(oauth2 -> oauth2
            .authorizationEndpoint(authorizationEndpointConfig -> authorizationEndpointConfig
                .baseUri(OAUTH2_BASE_URI)
                .authorizationRequestRepository(httpCookieOAuth2AuthorizationRequestRepository)
                .authorizationRequestResolver(new CustomAuthorizationRequestResolver(...)))
            .redirectionEndpoint(redirectionEndpointConfig -> redirectionEndpointConfig.baseUri(OAUTH2_REDIRECTION_ENDPOINT))
            .userInfoEndpoint(userInfoEndpointConfig -> userInfoEndpointConfig.userService(customOAuth2UserService))
            .successHandler(oAuth2AuthenticationSuccessHandler)
            .failureHandler(oAuth2AuthenticationFailureHandler));

        // 关键：关闭session，无状态认证
        http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        return http.build();
    }
}
```

### Cookie存储OAuth状态

```java
public class HttpCookieOAuth2AuthorizationRequestRepository
    implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    // 使用Cookie存储而非Session，实现无状态
    public static final String REDIRECT_URI_PARAM_COOKIE_NAME = "redirect_uri";

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        return null; // Cookie实现
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest,
                                        HttpServletRequest request,
                                        HttpServletResponse response) {
        // 保存到Cookie
    }
}
```

### OAuth2AuthenticationSuccessHandler

```java
@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    protected String determineTargetUrl(HttpServletRequest request,
                                       HttpServletResponse response,
                                       Authentication authentication) {
        // 1. 从Cookie获取原始redirect_uri
        Optional<String> redirectUri = CookieUtils.getCookie(request, REDIRECT_URI_PARAM_COOKIE_NAME)
            .map(Cookie::getValue);

        // 2. 校验redirect_uri合法性
        if (redirectUri.isPresent() && !isAuthorizedRedirectUri(redirectUri.get())) {
            throw new BadRequestException("Unauthorized Redirect URI");
        }

        // 3. 生成JWT Token
        String token = tokenProvider.createToken(authentication);

        // 4. 发布登录事件
        applicationEventPublisher.publishEvent(
            new LoginSuccessEvent(userPrincipal.getId(), clientIp));

        // 5. 重定向到前端，token放在URL参数中
        return UriComponentsBuilder.fromUriString(targetUrl)
            .queryParam("token", token)
            .build().toUriString();
    }

    private boolean isAuthorizedRedirectUri(String uri) {
        URI clientRedirectUri = URI.create(uri);
        return authorizedRedirectUris.stream().anyMatch(authorized -> {
            URI authorizedUri = URI.create(authorized);
            return authorizedUri.getHost().equalsIgnoreCase(clientRedirectUri.getHost())
                && authorizedUri.getPort() == clientRedirectUri.getPort();
        });
    }
}
```

### 配置文件

```yaml
# application.yml
spring:
  security.oauth2:
    client:
      registration:
        google:
          client-id: ${GOOGLE_CLIENT_ID}
          client-secret: ${GOOGLE_CLIENT_SECRET}
          authorization-grant-type: authorization_code
          redirect-uri: '{baseUrl}/oauth2/callback/{registrationId}'
          scope: email, profile
        github:
          client-id: ${GITHUB_CLIENT_ID}
          client-secret: ${GITHUB_CLIENT_SECRET}
          scope: read:user, user:email

    authorized-redirect-uris:
      - http://127.0.0.1:4200          # 开发环境
      - https://h5.example.com         # 生产H5
      - https://example.com             # 生产主站
```

## Frontend Integration

### 1. 发起登录

```javascript
// 前端：跳转到后端OAuth端点
const loginWithGoogle = () => {
  const redirectUri = encodeURIComponent(window.location.origin + '/callback');
  window.location.href = `https://api.example.com/oauth2/authorize/google?redirect_uri=${redirectUri}`;
};

// 或携带更多参数
const loginWithGoogle = (extraParams) => {
  const redirectUri = encodeURIComponent(window.location.origin + '/callback');
  const state = btoa(JSON.stringify(extraParams));
  window.location.href = `https://api.example.com/oauth2/authorize/google?redirect_uri=${redirectUri}&state=${state}`;
};
```

### 2. 接收Token并存储

```javascript
// callback页面：从URL提取token
const handleOAuthCallback = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (token) {
    localStorage.setItem('access_token', token);
    window.history.replaceState({}, document.title, window.location.pathname);
    router.push('/home');
  } else {
    const error = urlParams.get('error');
    console.error('OAuth error:', error);
  }
};
```

### 3. 请求时携带Token

```javascript
// Axios拦截器
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## User Creation Flow

```java
@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private OAuth2User processOAuth2User(OAuth2UserRequest oAuth2UserRequest,
                                         Map<String, Object> userAttributes) {
        OAuth2UserInfo oAuth2UserInfo = OAuth2UserInfoFactory.getOAuth2UserInfo(
            oAuth2UserRequest.getClientRegistration().getRegistrationId(),
            userAttributes);

        AccountInfoDto user = accountInfoMapper.getByAccount(oAuth2UserInfo.getEmail(), null);

        if (user == null) {
            user = generatorUserFromOAuth2UserInfo(oAuth2UserInfo, source);
        }

        return UserPrincipal.create(user, userAttributes);
    }
}
```

## JWT Token结构

```java
public String createToken(Authentication authentication) {
    Map<String, Object> header = new HashMap<>();
    header.put(JwtConstant.ISSUED_AT, currentTime);
    header.put(JwtConstant.SUB, userId);
    header.put(JwtConstant.EXPIRATION, expTime);
    header.put(JwtConstant.FINGERPRINT, fingerprint);
    return JWTUtil.createToken(header, signer);
}
```

## Quick Reference

| Component | File | Purpose |
|-----------|------|---------|
| SecurityConfig | config/SecurityConfig.java | 配置OAuth2端点、过滤器链 |
| PKCE Resolver | references/pkce.md | 添加code_verifier/challenge |
| Cookie Storage | security/oauth2/HttpCookieOAuth2AuthorizationRequestRepository.java | 无状态OAuth状态存储 |
| Success Handler | security/oauth2/OAuth2AuthenticationSuccessHandler.java | 生成JWT并重定向 |
| User Info | references/providers.md | 各Provider用户信息适配器 |
| Token Provider | security/TokenProvider.java | JWT创建与验证 |
| Error Codes | references/error-codes.md | 错误码与恢复方案 |
| Token Refresh | references/token-refresh.md | 刷新Token流程 |
| Testing | references/testing.md | 测试策略 |

## Common Mistakes

1. **redirect_uri校验过严**：只校验host:port，允许前端使用不同路径
2. **Session未关闭**：导致分布式部署时状态不一致
3. **Token放Cookie而非URL**：部分浏览器限制第三方Cookie
4. **未清理URL参数**：callback后token残留在浏览器历史
5. **缺少PKCE**：生产环境应该启用PKCE防授权码截获

## Security Checklist

- [ ] CSRF disabled (stateless)
- [ ] PKCE enabled
- [ ] redirect_uri only validates host:port
- [ ] JWT expiration set reasonably (15 days typical)
- [ ] Token cleared from URL after extraction
- [ ] OAuth client secrets in environment variables, not in code