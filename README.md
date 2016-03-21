City Selector
=====

cityselector 是一个基于zepto的移动端手机城市选择器, 支持首字母查询.

![Alt text](https://dn-coding-net-production-file.qbox.me/eb86426e-fc30-48f7-bc0c-6eca59948c3e.png?imageView2/2/w/1440/h/0&e=1458547975&token=goE9CtaiT5YaIP6ZQ1nAafd_C1Z_H2gVP8AwuC-5:oTDzHX5RT_6p_wal096Pq3eP6lc=)

线上DEMO: [http://www.madcoder.cn/demos/cityselector/examples/index.html](http://www.madcoder.cn/demos/cityselector/examples/index.html)


## Usage

调用如下语句即可。
```html
<link rel="stylesheet" href="dist/css/cityselector.css" />
<script src="//cdn.bootcss.com/zepto/1.0rc1/zepto.min.js"></script>
<script src="dist/js/cityselector.js"></script>
....
所在城市: <a href="javascript:;" id="city">定位中...</a>
```
```js
$("#city").cityselector(config);
```


config 支持以下参数

| 参数 | 类型 | 默认值 | 说明
| ----- | ---- | ---- | ---- 
| dataSource  | JSON/Function/Url | null | `JSON`: 城市JSON数据, `Function`: 返回值必须为城市JSON数据, `Url`: 城市JSON数据的API接口. 
| title | String | 城市选择 | 进入城市选择界面的标题 
| cache  | Boolean/Number | 3600*24*30 | `true`: 永久缓存, `false`: 永不缓存, `3600`: 缓存3600秒. 此参数只有在dataSource的值是URL的时候生效.



## Method
|  方法 | 参数 | 返回值 | 说明
| ----- | ---- | ---- | ----
| open | - | - | 打开城市选择页面
| close | - | - | 关闭城市选择页面
| search | [text:String] | - | 搜索城市, 可以为首字母, 也可以为为城市名称
| select | item:String/Object | - | 选择城市
| scroll | category:String: | - | 滚到到`category`
| getLocation | [callback(location):Function] | - | 得到并且定位当前location
| setLocation | [location:Object] | - | 设置location
| intercept | interceptor:String, action:Function | any | 设置拦截器, 下面会有说明

实例:
```js
$('#city').cityselector('search', '深圳');
```

## Interceptor
| 拦截器 | 参数 | 返回值 | 说明
| ----- | ---- | ---- | ----
| csi:getLocation | - | Boolean/String/Object | 默认从新浪API获取城市数据, 添加拦截器, 返回`String`或者`Object`时, 以此返回值定位, 返回`false`时不作定位

实例:
```js
// 返回我自己的定位
$('#city').cityselector('intercept', 'csi:getLocation', function () {
    return '黄冈';
});
// 使用其它方式定位
$('#city').cityselector('intercept', 'csi:getLocation', function () {
    var self = this;
    Api.getLocation(function (location) {
        self.cityselector('setLocation', location);
    });
    return false;
});
```

## Events
| 拦截器 | 参数 | 返回值 | 说明
| ----- | ---- | ---- | ----
| cse:initialized | - | - | 初始化完成时触发
| cse:changed | - | Event:Event, location:Object | 选择的城市改变时触发
| cse:opened | - | - | 城市选择器打开时触发
| cse:closed| - | - | 城市选择器关闭时触发
| cse:ajaxSuccess| - | Event:Event, data:Object | 当dataSource为Url时, 读取Api成功时触发
| cse:ajaxError| - | Event:Event | 当dataSource为Url时, 读取Api失败后触发

实例:
```js
$('#city').on('cse:initialized', function (e, v) {
    alert('Initialized');
});
$('#city').on('cse:changed', function (e, v) {
    alert(v.key + '-' + v.name);
});
```