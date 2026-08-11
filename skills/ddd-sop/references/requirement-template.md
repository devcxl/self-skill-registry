# DDD 需求模板

```markdown
# 用例名称

## 所属上下文
支付上下文

## 参与者
支付渠道

## 前置条件
支付单已经创建

## 输入
- 支付单 ID
- 渠道交易号
- 支付金额

## 业务规则
1. 支付单不存在则拒绝
2. 已成功支付时保持幂等
3. 已关闭支付单不能重新成功
4. 实际支付金额必须等于应付金额

## 聚合
Payment

## 状态变化
PROCESSING → SUCCEEDED

## 领域事件
PaymentSucceeded

## 一致性要求
支付单内部强一致；
订单状态通过消息最终一致。

## 异常场景
- 重复回调
- 金额不一致
- 回调乱序
- 消息发送失败

## 验收测试
- 正常支付成功
- 重复回调不重复处理
- 已关闭支付不能成功
- 金额错误时拒绝
```

---

## 用例代码示例

```java
public class ConfirmPaymentService {

    public void execute(ConfirmPaymentCommand command) {
        Payment payment = paymentRepository.require(command.paymentId());

        payment.confirmSuccess(
            command.channelTransactionId(),
            command.paidAmount(),
            command.paidAt()
        );

        paymentRepository.save(payment);
        domainEventPublisher.publish(payment.pullDomainEvents());
    }
}
```

职责边界：

```text
Controller：协议转换、参数校验、身份解析
Application：编排用例、事务控制
Domain：业务规则和状态变化
Infrastructure：数据库、MQ、第三方接口
```