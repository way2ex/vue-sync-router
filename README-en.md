# vue-sync-router
vue composition hook to sync data between router url and reactive data.

[中文](./README.md) | **English**

## Install

```bash
npm install vue-sync-router
# yarn add vue-sync-router
```

## Init

### vue 2.x
If you are using composition-api in vue@2.x, you should use `initSyncRouter(useRouter, useRoute)` to make `router` and `route` avaliable，
- `useRouter`:should return a `Vue Router` object, and `vue-sync-router` will use it to get `router`.
- `useRoute`: should return a ref with value of `Vue Route` , `vue-sync-router` will watch the change of `route.query`；

Function signature as follows:
```typescript
let useRouter: () => VueRouter;
let useRoute: () => ComputedRef<Route>;
```

### vue 3.x
Don't need initialization in vue@3.x because `vue-sync-router` will use `useRouter` and `useRoute` from `vue-router@4.x`.

## Usage
Give a reactive object created by `reactive` or a plain object with `ref` props so that `vue-sync-route` can detect the change of data: 
```js
import { useSyncRouter } from 'vue-sync-router';

// 1. give a reactive data
const data1 = reactive({
   name: 'Join',
   age: 12, 
})
useSyncRouter(data1)
// when data1 changes, will call router.replace({ query: { name: 'Join', age: 12 } }) 
// url search will be:  ?name=Join&age=12

// 2. or you can give a plain object with ref props
const bizType = ref(0)
const data2 = {
    bizType
}
useSyncRouter(data2);

// when bizType.value changes, url search will also change
// ?bizType=0
```

## Save types
`useSyncRouter` accept second parameter to indicate the prop type of the object：
```js
const data1 = reactive({
   name: 'Join',
   age: '12', 
})
useSyncRouter(data1, {
    name: 'string',
    age: 'number',
})

console.log(typeof data1.age)
// number
```

**SyncRouter will parse data from url search by default as follows：**
- turn numer string to number.
- turn string `'true'` to boolean `true`, turn string `'false'` to boolean `false`.

### All types
All types as follows:
- `string`
- `number`
- `boolean`
- `object`
- `<string|number|boolean|object>[]`

The default encoder and decoder function as follows:
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

## Nested Object
When sync data of nested object, `vue-sync-router` will recursively find the deepest prop:
```js
const person = reactive({
    baseInfo: {
        name: 'Join',
        age: 18
    }
})

useSyncRouter(person);
// url search will be: ?baseInfo.name=Join&baseInfo.age=18
```

And you can indicate type with the key as follows:
```js
const person = reactive({
    baseInfo: {
        name: 'Join',
        age: '18'
    }
})

useSyncRouter(person, {
    'baseInfo.age': 'string'
});
```

If you want to encode `baseInfo` as entirety， you can give `baseInfo` of type `object`, and it will be encoded by `JSON.stringify`:

```js
const person = reactive({
    baseInfo: {
        name: 'John',
        age: 18
    }
})
useSyncRouter(person, {
    baseInfo: 'object'
});
// ?baseInfo=%7B%22name%22%3A%22John%22%2C%22age%22%3A19%7D
```

## Custom encoder and decoder
You can use custom encoder and decoder by providing function:
```js
const person = reactive({
    baseInfo: {
        name: 'John',
        age: 18
    }
})
useSyncRouter(person, {
    'baseInfo.name': {
        encode(v) { return 'smart' + v },
        decode(v) { return v.slice(3); }
    }
});
// ?baseInfo.name=smartJohn&baseInfo.age=18
```

