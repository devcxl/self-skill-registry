# Supported OAuth2 Providers

## Provider 对照表

| Provider | UserInfo Class | Key Fields |
|----------|----------------|------------|
| Google | GoogleOAuth2UserInfo | sub, name, email, picture |
| Facebook | FacebookOAuth2UserInfo | id, name, email, picture |
| GitHub | GithubOAuth2UserInfo | id, name, email, avatar_url |
| LinkedIn | LinkedinOAuth2UserInfo | sub, name, email, picture |
| Twitter/X | TwitterOAuth2UserInfo | data.id, data.username |

## 各 Provider 实现

### Google

```java
public class GoogleOAuth2UserInfo implements OAuth2UserInfo {
    // 字段映射
    // sub -> 用户唯一标识
    // name -> 姓名
    // email -> 邮箱
    // picture -> 头像URL
}
```

### GitHub

```java
public class GithubOAuth2UserInfo implements OAuth2UserInfo {
    // 字段映射
    // id -> 用户数字ID
    // login -> 用户名
    // name -> 姓名（可能为空）
    // email -> 邮箱（需要 user:email 权限）
    // avatar_url -> 头像URL
}
```

### 通用 Factory

```java
public class OAuth2UserInfoFactory {
    public static OAuth2UserInfo getOAuth2UserInfo(String registrationId,
                                                   Map<String, Object> attributes) {
        return switch (registrationId) {
            case "google" -> new GoogleOAuth2UserInfo(attributes);
            case "github" -> new GithubOAuth2UserInfo(attributes);
            case "facebook" -> new FacebookOAuth2UserInfo(attributes);
            case "linkedin" -> new LinkedinOAuth2UserInfo(attributes);
            case "twitter" -> new TwitterOAuth2UserInfo(attributes);
            default -> throw new OAuth2AuthenticationException(
                "Unsupported provider: " + registrationId);
        };
    }
}
```

## 用户创建逻辑

```java
@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final AccountInfoMapper accountInfoMapper;
    private final OAuth2UserInfoFactory userInfoFactory;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest)
            throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        try {
            return processOAuth2User(userRequest, oAuth2User.getAttributes());
        } catch (AuthenticationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new OAuth2AuthenticationException(
                "Could not process OAuth2 user", ex);
        }
    }

    private OAuth2User processOAuth2User(OAuth2UserRequest request,
                                         Map<String, Object> userAttributes) {
        String registrationId = request.getClientRegistration().getRegistrationId();
        OAuth2UserInfo userInfo = userInfoFactory.getOAuth2UserInfo(
            registrationId, userAttributes);

        // 查询或创建用户
        AccountInfoDto account = accountInfoMapper.getByAccount(
            userInfo.getEmail(), userInfo.getId());

        if (account == null) {
            account = createUser(userInfo, registrationId);
        } else {
            account = updateUser(account, userInfo);
        }

        return UserPrincipal.create(account, userAttributes);
    }

    private AccountInfoDto createUser(OAuth2UserInfo userInfo, String source) {
        AccountInfoDto user = new AccountInfoDto();
        user.setEmail(userInfo.getEmail());
        user.setName(userInfo.getName());
        user.setAvatar(userInfo.getImageUrl());
        user.setSource(source);
        user.setCreateTime(LocalDateTime.now());
        // ... 其他字段
        accountInfoMapper.insert(user);
        return user;
    }

    private AccountInfoDto updateUser(AccountInfoDto existing,
                                       OAuth2UserInfo userInfo) {
        // 可选：更新用户信息
        if (!Objects.equals(existing.getName(), userInfo.getName())) {
            existing.setName(userInfo.getName());
        }
        if (!Objects.equals(existing.getAvatar(), userInfo.getImageUrl())) {
            existing.setAvatar(userInfo.getImageUrl());
        }
        accountInfoMapper.update(existing);
        return existing;
    }
}
```