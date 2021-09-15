# vue-sync-router
vue composition hook, 用来方便的将数据在组件与 router URL 的 query 部分之间同步。

**中文** | [English](./README-en.md)

## 安装
```bash
npm install vue-sync-router
# yarn add vue-sync-router
```

## 初始化

### vue 2.x 
在 vue@2.x 中使用，需要使用 `initSyncRouter` 方法进行初始化，传入 `useRouter` 和 `useRoute` 方法:
- `useRouter`: 需要返回 router 对象，用来控制 vue-router 的行为；
- `useRoute`: 需要返回一个类型为 `Route` 的 ref, 用来监听 route 的变化；

函数签名如下:
```typescript
let useRouter: () => VueRouter;
let useRoute: () => ComputedRef<Route>;
```

### vue 3.x
在 vue@3.x 中使用无需初始化。

## 使用
将响应式数据同步到router中, 需要传入一个 reactive 对象或者一个普通对象，但是对象的属性值需要为 reactive 或者 ref，不然无法检测到属性变动。

```js
// 1. 传入一个reactive响应式对象，适合于筛选表单的场景
const data1 = reactive({
   name: '小明',
   age: 12, 
})
useSyncRouter(data1)
// 当 data1 改变时 url 会自动增加 ?name=小明&age=12

// 2. 有时候我们可能只是希望将一个简单值同步到url上，或者从url读取下来，所以可以传入一个普通对象，对象的属性是 ref
const bizType = ref(0)
const data2 = {
    bizType
}
useSyncRouter(data2);

// bizType.value = 3, 当 bizType 改变时 url 也会同步改变
```

## 记忆类型
SyncRouter 除了便利地同步数据与URL，另外一个优势就是记忆数据的类型。因为 url 中的search 部分只能将数据保存为字符串，所以有时需要同步后更改一下数据类型:

```js
const bizType = Number(route.value.query.bizType);
```

`useSyncRouter` 的第二个参数接收一个对象，可以用来指示某个 key 的数据类型：

```js
const data1 = reactive({
   name: '小明',
   age: 12, 
})
useSyncRouter(data1, {
    name: 'string',
    age: 'number',
})
```
这样在把数据从 url 同步到vue中时会自动进行类型转换。

**默认情况下，SyncRouter 会自动做如下转换：**
- 把数字字符串转为数字
- 把字符串 `'true'` 转为 `true`, 把字符串 `'false'` 转为 `false`

### 类型列表
所有的类型:
- `string`
- `number`
- `boolean`
- `object`
- `<string|number|boolean|object>[]`

默认的非数组类型对应的编解码函数如下：
```js
const decodeMap = {
    string: String,
    number: Number,
    boolean: Boolean,
    object: JSON.parse,
};
const encodeMap = {
    string: String,
    number: String,
    boolean: String,
    object: function (v: Record<string, any>) { return JSON.stringify(v, null, 0); },
};
```

如果是数组的话，则会使用 `(*_*)` 作为连接器将数组转为字符串。数组的每一项会使用对应的编解码函数进行转换。

## 嵌套对象的同步
SyncRouter 在同步嵌套对象时，会把对象的key 按照层级以 `.` 连接起来:
```js
const person = reactive({
    baseInfo: {
        name: '张三',
        age: 18
    }
})

useSyncRouter(person);
// 同步到url后 ?baseInfo.name=张三&baseInfo.age=18
```

嵌套对象指定类型时需要使用多级path：
```js
const person = reactive({
    baseInfo: {
        name: '张三',
        age: '18'
    }
})

useSyncRouter(person, {
    'baseInfo.age': 'string'
});
```

如果不想使用这种方式，可以给 `baseInfo` 指定类型为 `object`,则会对其使用 `JSON.stringify`进行编码：
```js
const person = reactive({
    baseInfo: {
        name: '张三',
        age: 18
    }
})

useSyncRouter(person, {
    baseInfo: 'object'
});
// ?baseInfo=%7B%22name%22%3A%22%E5%BC%A0%E4%B8%89%22%2C%22age%22%3A19%7D
```

## 自定义编解码方式
除了指定类型，还可以自定义编解码方式：
```js
const person = reactive({
    baseInfo: {
        name: '张三',
        age: 18
    }
})
useSyncRouter(person, {
    'baseInfo.name': {
        encode(v) { return '聪明的' + v },
        decode(v) { return v.slice(3); }
    }
});
// ?baseInfo.name=聪明的张三&baseInfo.age=18
```

