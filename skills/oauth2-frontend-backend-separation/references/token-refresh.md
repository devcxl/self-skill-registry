# Token 刷新机制

## 为什么需要 Refresh Token

Access Token 有效期短（如 1 小时），Refresh Token 可以长期有效，实现无感知的会话续期。

## JWT 刷新策略

### 方案一：前端主动刷新

```java
// JWT Provider 提供刷新接口
@RestController
public class AuthController {

    @PostMapping("/auth/refresh")
    public Resp<TokenResponse> refreshToken(@RequestBody RefreshRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!tokenProvider.validateToken(refreshToken)) {
            return Resp.error("INVALID_REFRESH_TOKEN", "Refresh token 无效或已过期");
        }

        // 生成新的 access token
        String newAccessToken = tokenProvider.createAccessToken(refreshToken);

        // 可选：刷新 refresh token（滚动更新）
        String newRefreshToken = tokenProvider.rotateRefreshToken(refreshToken);

        return Resp.success(new TokenResponse(newAccessToken, newRefreshToken));
    }
}
```

### 方案二：双 Token 模式

```java
public class TokenProvider {

    // Access Token: 短期（15分钟），用于 API 认证
    public String createAccessToken(Authentication authentication) {
        Map<String, Object> header = new HashMap<>();
        header.put("typ", "at");
        header.put("alg", "HS512");

        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", userId);
        claims.put("exp", Instant.now().plusSeconds(900)); // 15分钟
        claims.put("type", "access");

        return JWTUtil.createToken(header, claims, signer);
    }

    // Refresh Token: 长期（15天），用于续期
    public String createRefreshToken(Authentication authentication) {
        Map<String, Object> header = new HashMap<>();
        header.put("typ", "rt");
        header.put("alg", "HS512");

        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", userId);
        claims.put("exp", Instant.now().plusSeconds(15 * 24 * 3600)); // 15天
        claims.put("type", "refresh");
        claims.put("jti", UUID.randomUUID().toString()); // 用于 token 撤销

        return JWTUtil.createToken(header, claims, signer);
    }

    // 验证并旋转 Refresh Token
    public TokenPair rotateRefreshToken(String refreshToken) {
        if (!validateToken(refreshToken)) {
            throw new TokenException("Invalid refresh token");
        }

        // 检查是否已被撤销（放入黑名单）
        if (refreshTokenStore.isRevoked(refreshToken)) {
            throw new TokenException("Token has been revoked");
        }

        // 撤销旧的 refresh token
        refreshTokenStore.revoke(refreshToken);

        // 生成新的 token 对
        String newAccessToken = createAccessToken(...);
        String newRefreshToken = createRefreshToken(...);

        return new TokenPair(newAccessToken, newRefreshToken);
    }
}
```

## 前端自动刷新

```javascript
// Axios 拦截器：自动刷新 token
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

axios.interceptors.request.use(async config => {
  const token = localStorage.getItem('access_token');
  if (token && !isTokenExpired(token)) {
    return config;
  }

  // token 过期，尝试刷新
  if (!isRefreshing) {
    isRefreshing = true;
    try {
      const newToken = await refreshToken();
      localStorage.setItem('access_token', newToken);
      onTokenRefreshed(newToken);
      config.headers.Authorization = `Bearer ${newToken}`;
    } catch (e) {
      // 刷新失败，跳转登录
      logout();
      throw e;
    } finally {
      isRefreshing = false;
    }
  } else {
    // 等待刷新完成
    return new Promise(resolve => {
      subscribeTokenRefresh(token => {
        config.headers.Authorization = `Bearer ${token}`;
        resolve(config);
      });
    });
  }

  return config;
});

// Token 过期检查
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

const refreshToken = async () => {
  const refreshToken_ = localStorage.getItem('refresh_token');
  const response = await axios.post('/auth/refresh', { refreshToken: refreshToken_ });
  return response.data.data.accessToken;
};
```

## Token 撤销

```java
// 登出时撤销 token
public void revokeToken(String token) {
    // 将 token 加入黑名单
    tokenBlacklist.add(token, Duration.ofDays(15));

    // 如果是 refresh token，也撤销关联的 access token
    if (isRefreshToken(token)) {
        String userId = getUserIdFromToken(token);
        accessTokenStore.revokeAll(userId);
    }
}

// 分布式 Token 存储（Redis）
@Component
public class RedisTokenStore {

    public void revoke(String token) {
        String jti = getJtiFromToken(token);
        Long expireSeconds = getExpireFromToken(token);
        redisTemplate.opsForValue().set(
            "token:revoked:" + jti,
            "1",
            Duration.ofSeconds(expireSeconds)
        );
    }

    public boolean isRevoked(String token) {
        String jti = getJtiFromToken(token);
        return Boolean.TRUE.equals(redisTemplate.hasKey("token:revoked:" + jti));
    }
}
```

## 前端登出

```javascript
const logout = async () => {
  try {
    await axios.post('/auth/logout');
  } finally {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  }
};
```