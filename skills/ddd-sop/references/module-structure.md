# 模块化结构

## 推荐：模块化单体

不要一开始拆微服务。先在单体中按限界上下文划分模块。

```text
application
├── order
├── payment
├── inventory
└── fulfillment
```

## 每个上下文内部四层结构

```text
payment
├── api
│   ├── PaymentController
│   └── PaymentRequest
├── application
│   ├── command
│   ├── query
│   └── service
├── domain
│   ├── model
│   ├── repository
│   ├── service
│   └── event
└── infrastructure
    ├── persistence
    ├── messaging
    └── channel
```

## Maven 多模块（大型项目）

```text
payment-api
payment-application
payment-domain
payment-infrastructure
payment-bootstrap
```

## 中小型项目简化版

不必拆得过细，可以先采用：

```text
business-order
business-payment
business-inventory
application-bootstrap
```

每个业务模块内部再按四层组织。

## 防腐层

外部系统必须经过防腐层：

```java
public interface PaymentChannel {
    ChannelPaymentResult pay(PaymentRequest request);
}
```

基础设施实现：

```java
public class WechatPaymentChannel implements PaymentChannel {
    // 将微信支付协议转换为领域模型
}
```