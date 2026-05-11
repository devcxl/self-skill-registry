# OAuth2 错误码与恢复方案

## 错误分类

### 1. 授权阶段错误 (Authorization Errors)

| 错误码 | 描述 | 原因 | 恢复方案 |
|--------|------|------|----------|
| `access_denied` | 用户拒绝授权 | 用户取消登录 | 提示用户并提供重试选项 |
| `invalid_request` | 请求参数无效 | 缺少必要参数或格式错误 | 检查 redirect_uri, client_id 等 |
| `unauthorized_client` | 客户端未授权 | 未在 OAuth Provider 注册 | 检查客户端配置 |
| `unsupported_response_type` | 不支持的响应类型 | 客户端配置错误 | 配置为 `code` |
| `invalid_scope` | 无效的 scope | scope 参数错误 | 检查 scope 配置 |

### 2. Token 交换错误 (Token Exchange Errors)

| 错误码 | 描述 | 原因 | 恢复方案 |
|--------|------|------|----------|
| `invalid_grant` | 授权码无效 | code 已用过或过期 | 重新发起授权流程 |
| `invalid_client` | 客户端认证失败 | client_id 或 secret 错误 | 检查环境变量配置 |
| `invalid_code_verifier` | PKCE verifier 不匹配 | code_verifier 与生成的不一致 | 确保 PKCE 实现正确 |
| `authorization_pending` | 授权待处理 | 用户未完成登录 | 可使用轮询重试 |
| `slow_down` | 请求过于频繁 | 轮询过快 | 降低轮询频率 |

### 3. 网络错误 (Network Errors)

| 错误类型 | 描述 | 恢复方案 |
|----------|------|----------|
| `ConnectionTimeout` | 连接超时 | 重试 2-3 次，间隔递增 |
| `ReadTimeout` | 读取超时 | 增加超时时间或重试 |
| `ServiceUnavailable` | 服务不可用 | 等待后重试，使用指数退避 |
| `RateLimitExceeded` | 频率限制 | 遵守 X-Retry-After 头部 |

## 后端错误处理

```java
// 全局异常处理
@ExceptionHandler(OAuth2AuthenticationException.class)
public Resp<?> handleOAuth2Exception(OAuth2AuthenticationException e) {
    OAuth2Error error = e.getError();
    log.error("OAuth2 error: {} - {}",
        error.getErrorCode(), error.getDescription());

    return Resp.error(switch (error.getErrorCode()) {
        case "access_denied" -> "LOGIN_CANCELLED";
        case "invalid_request" -> "INVALID_REQUEST";
        case "invalid_grant" -> "AUTH_CODE_EXPIRED";
        default -> "OAUTH_ERROR";
    }, error.getDescription());
}

@ExceptionHandler(ResourceAccessException.class)
public Resp<?> handleNetworkException(ResourceAccessException e) {
    if (e.getCause() instanceof SocketTimeoutException) {
        log.warn("OAuth provider timeout, retrying...");
        throw new RetryableException("oauth_timeout");
    }
    return Resp.error("NETWORK_ERROR", "Network error, please try again");
}
```

## 前端错误处理

```javascript
// OAuth 回调错误处理
const handleOAuthCallback = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  const errorDescription = urlParams.get('error_description');

  if (error) {
    const errorMessages = {
      'access_denied': '登录已取消',
      'invalid_request': '请求参数错误',
      'unauthorized_client': '客户端未授权',
      'invalid_grant': '授权码已过期，请重新登录',
      'invalid_scope': '权限范围无效',
      'temporarily_unavailable': '服务暂时不可用，请稍后重试'
    };

    const message = errorMessages[error] || errorDescription || '登录失败';
    showError(message);

    // 可恢复错误：提供重试选项
    if (['invalid_grant', 'temporarily_unavailable'].includes(error)) {
      setTimeout(() => retryLogin(), 3000);
    }
    return;
  }

  // 正常流程：提取 token
  const token = urlParams.get('token');
  // ...
};

// 重试机制
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 指数退避
    }
  }
};
```

## OAuth 失败事件记录

```java
// 登录失败事件
public class OAuth2LoginFailureEvent {
    private final String registrationId;
    private final String errorCode;
    private final String errorDescription;
    private final String clientIp;
    private final Instant timestamp;

    // 用于监控和告警
    public boolean shouldAlert() {
        return "invalid_grant".equals(errorCode)
            || "invalid_client".equals(errorCode);
    }
}
```

## 错误监控指标

- `oauth_login_failure_total{error_code}` - 各错误码计数
- `oauth_login_latency_seconds` - 登录延迟分布
- `oauth_provider_timeout_total` - Provider 超时计数
- `oauth_token_refresh_total{status}` - Token 刷新结果