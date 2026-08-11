# 每个需求的开发流程检查清单

## 需求分析检查

每个需求执行以下 10 项检查：

```text
1. 这个需求属于哪个限界上下文？
2. 对应哪个业务用例？
3. 修改了哪些业务规则？
4. 哪个聚合负责维护规则？
5. 是否需要修改多个聚合？
6. 是否需要发布领域事件？
7. 是否涉及其他上下文？
8. 需要强一致还是最终一致？
9. 如何保证幂等？
10. 用什么测试证明规则正确？
```

## 编码顺序

```text
用例说明
→ 领域测试
→ 领域模型
→ 应用服务
→ 仓储接口
→ 基础设施实现
→ Controller
→ 集成测试
```

不要从 Controller 开始写。

## 禁止事项

```java
// 禁止：直接 setStatus
order.setStatus(PAID);

// 禁止：无意义的通用方法名
handleData()
processInfo()
updateStatus()
doBusiness()

// 禁止：跨上下文直连数据库
paymentRepository.updateOrderStatus(orderId, PAID);
```

## 应做事项

```java
// 正确：通过聚合根维护业务不变量
order.confirmPayment(paymentId);

// 正确：业务语义命名
confirmPayment()
cancelExpiredOrder()
approveRefund()
allocateInventory()

// 正确：跨上下文通过领域事件
domainEventPublisher.publish(new PaymentSucceeded(paymentId));
```