// 最终修正版 Loon 脚本
// 核心逻辑：只修改特定 JSON，遇到非 JSON 或无关请求直接放行，保护二进制数据

// 尝试解析，如果这一步就失败（说明是视频流等非文本数据），直接进 catch 放行
try {
    let body = $response.body;
    let obj = JSON.parse(body);

    // 逻辑判断：必须包含 responses 且没有 etag，才是我们需要修改的业务包
    if (obj.responses && obj.responses.length >= 2 && !('etag' in obj.responses[0].headers)) {
        
        const timestamp = Math.floor(Date.now() / 1000);
        const userdata = JSON.parse(obj.responses[0].body);
        
        userdata.shopItems.push({
            id: 'gold_subscription',
            purchaseDate: timestamp - 172800,
            purchasePrice: 0,
            subscriptionInfo: {
                expectedExpiration: timestamp + 31536000,
                productId: "com.duolingo.DuolingoMobile.subscription.Gold.TwelveMonth.24Q2Max.168",
                renewer: 'APPLE',
                renewing: true,
                tier: 'twelve_month',
                type: 'gold'
            }
        });

        userdata.subscriberLevel = 'GOLD';
        userdata.trackingProperties.has_item_immersive_subscription = true;
        userdata.trackingProperties.has_item_premium_subscription = true;
        userdata.trackingProperties.has_item_live_subscription = true;
        userdata.trackingProperties.has_item_gold_subscription = true;
        userdata.trackingProperties.has_item_max_subscription = true;
        
        // 只有在确认修改成功后，才回写 body
        obj.responses[0].body = JSON.stringify(userdata);
        $done({ body: JSON.stringify(obj) });
        
    } else {
        // 虽然是 JSON 但不是我们要改的那个包：直接放行，不回写 body
        $done({});
    }

} catch (e) {
    // 捕获到错误（例如视频通话的二进制数据导致 JSON.parse 失败）
    // console.log("非 JSON 数据或解析错误，跳过: " + e);
    
    // 【关键点】这里不要返回 body，直接空对象，表示"保持原样"
    // 这样 Loon 就不会破坏原始的二进制数据流
    $done({});
}
