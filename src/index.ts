/**
 * @file 简单地将响应式数据与 URL 的searchParams 进行同步
 * @author Justin Zhu<vac872089248@gmail.com>
 * @date 2021-09
 */
import { ComputedRef, isReactive, isRef, onBeforeUnmount, reactive, Ref, UnwrapRef, watch, watchEffect, isVue2, computed } from 'vue-demi'
import { LocationQueryValue, RouteLocationNormalizedLoaded, Router, useRoute as defaultUseRoute, useRouter as defaultUseRouter } from 'vue-router'

function isFunction (func: (p: string) => unknown): func is (p: string) => unknown {
  return typeof func === 'function'
}
function isNil (value: unknown) {
  return value == null
}
function isPlainObject (obj: any) {
  if (typeof obj !== 'object' || obj === null) return false

  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }
  // proto = null
  return Object.getPrototypeOf(obj) === proto
}

function debounce (func: any, wait: number) {
  let timerId: null | number = null

  function debounced () {
    func()
    timerId = null
  }
  return function () {
    if (!timerId) {
      timerId = window.setTimeout(debounced, wait)
    } else {
      clearTimeout(timerId)
      timerId = window.setTimeout(debounced, wait)
    }
  }
}

let useRouter: () => (Router | unknown)
let useRoute: () => ComputedRef<RouteLocationNormalizedLoaded | unknown>

type IReactiveData<T = unknown> = ComputedRef<T> | UnwrapRef<T>;
type IWatchableData<T = unknown> = IReactiveData<T> | Record<string, IReactiveData<T>>;
type IEncodeValueType = string | number | boolean | Record<string, unknown>;

type ISimpleType = 'string' | 'number' | 'boolean' | 'object';
type IType = {
    type?: ISimpleType | [ISimpleType];
    decode?: (paramsValue: string | string[]) => unknown;
    encode?: (rawValue: IEncodeValueType | IEncodeValueType[]) => string;
}
type ITypeDescriptor = ISimpleType | [ISimpleType] | IType;
type TypeInfo = Record<string, ITypeDescriptor>;
export type SyncRouterOptions = {
    exclude?: string[];
    arraySeparator?: string;
    debouncedTime?: number;
}

const ARRAY_SEPARATOR = '(*_*)'
const DEBOUNCED_TIME = 1000

const decodeMap = {
  string: String,
  number: Number,
  boolean: Boolean,
  object: JSON.parse
}
const encodeMap = {
  string: String,
  number: String,
  boolean: String,
  object: function (v: Record<string, unknown>) { return JSON.stringify(v, null, 0) }
}

function removeNulish (obj: Record<string, string | undefined | null | (string | null)[]>): Record<string, string> {
  return Object.keys(obj).reduce<Record<string, string>>((acc, key) => {
    if (!isNil(obj[key]) && obj[key] !== '') {
      acc[key] = obj[key] as string
    }
    return acc
  }, {})
}

function err (msg: string) {
  console.error(`[SyncRouter] ${msg}`)
}

const defaultEncode = function (v: IEncodeValueType | IEncodeValueType[]) {
  return Array.isArray(v) ? v.map(v => String(v)) : String(v)
}
/**
  * 默认的解析函数
  * @param v url 中的数据
  * @returns 解码后的数据
  */
const defaultDecode = function (v: LocationQueryValue | LocationQueryValue[]): IEncodeValueType | IEncodeValueType[] {
  if (Array.isArray(v)) {
    return v.map(i => defaultDecode(i) as string)
  }
  if (v === 'false') { return false }
  if (v === 'true') { return true }
  const value = Number(v)
  if (v && !Number.isNaN(value)) {
    return value
  }
  return v as string
}

/**
  * 设置响应式数据的值
  * @param rawValue 原始数据
  * @param keyPath key path
  * @param value 赋值的 value
  */
function assignReactiveValue (rawValue: UnwrapRef<unknown>, keyPath: string[], value: unknown) {
  if (keyPath.length === 1) {
    if (isReactive(rawValue)) {
      (rawValue as Record<string, unknown>)[keyPath[0]] = value
    } else if (isRef(rawValue)) {
      (rawValue as Ref<Record<string, unknown>>).value[keyPath[0]] = value
    }
  } else if (keyPath.length > 1) {
    let val = (rawValue as Record<string, unknown>)[keyPath[0]]
    if (isRef(val)) {
      val = val.value
    }
    assignReactiveValue(val, keyPath.slice(1), value)
  }
}
// eslint-disable-next-line
 function getPlainData(typeInfo: TypeInfo, data: Record<string, any>, parentKey: string[] = [], result: Record<string, any> = {}) {
  Object.keys(data).forEach(key => {
    if (isPlainObject(data[key]) && !typeInfo[key]) {
      getPlainData(typeInfo, data[key], parentKey.concat(key), result)
    } else {
      result[parentKey.concat(key).join('.')] = data[key]
    }
  })
  return result
}
export class SyncRouter {
     private keyPathMap: Record<string, boolean>;
     private data: IWatchableData;
     private typeInfo: TypeInfo;
     private disposed: (() => void)[] = [];
     private options: Required<SyncRouterOptions>;
     constructor (data: IWatchableData, typeInfo: TypeInfo = {}, options: SyncRouterOptions) {
       const { exclude = [], arraySeparator = ARRAY_SEPARATOR, debouncedTime = DEBOUNCED_TIME } = options
       this.options = {
         exclude,
         arraySeparator,
         debouncedTime
       }
       const route = useRoute() as ComputedRef<RouteLocationNormalizedLoaded>
       const router = useRouter() as Router
       this.data = data
       const watchedData = reactive(this.data as Record<string, unknown>)
       this.typeInfo = typeInfo
       this.keyPathMap = this.getKeyPathList(typeInfo, data as Record<string, unknown>)
         .filter(keyPath => !this.options.exclude.includes(keyPath))
         .reduce<Record<string, true>>((acc, keyPath) => {
           acc[keyPath] = true
           return acc
         }, Object.create(null))
       // // 观察路由
       const routeWatcher = watchEffect(() => {
         const query = (route.value as RouteLocationNormalizedLoaded).query
         Object.keys(query).forEach(key => {
           if (!this.keyPathMap[key]) {
             return
           }
           const decodedValue = this.decodeValueByTypeInfo(query[key], typeInfo[key])
           assignReactiveValue(watchedData, key.split('.'), decodedValue)
         })
       })
       this.disposed.push(routeWatcher)

       // 观察数据
       const dataWatcher = watch(watchedData, debounce(async () => {
         const plainData = getPlainData(this.typeInfo, watchedData)
         const encodedPlainData = Object.keys(plainData)
           .filter(keyPath => this.keyPathMap[keyPath])
           .reduce<Record<string, string>>((acc, key) => {
             const encodedValue = this.encodeValueByTypeInfo(plainData[key], this.typeInfo[key])
             if (encodedValue || (route.value as RouteLocationNormalizedLoaded).query[key]) {
               acc[key] = encodedValue
             }
             return acc
           }, {})
         try {
           await router.replace({
             query: removeNulish({
               ...route.value.query,
               ...encodedPlainData
             })
           })
         } catch (e) {
           // console.log(e);
         }
       }, this.options.debouncedTime), {
         deep: true
       })
       this.disposed.push(dataWatcher)
     }

     /**
      * destroy
      */
     destroy () {
       this.disposed.forEach(disposed => {
         disposed()
       })
     }

     private getKeyPathList (typeInfo: TypeInfo, data: Record<string, unknown>, parentPath: string[] = []): string[] {
       const result = Object.keys(data).reduce<string[]>((acc, key) => {
         let curVal = data[key]
         if (isRef(curVal)) {
           curVal = curVal.value
         }

         if (isPlainObject(curVal) && !typeInfo[key]) {
           acc.push(...this.getKeyPathList(typeInfo, curVal as Record<string, unknown>, [...parentPath, key]))
         } else {
           acc.push([...parentPath, key].join('.'))
         }
         return acc
       }, [])
       return result
     }

     /**
     * 根据类型信息
     * @param v 原始数据值
     * @param typeInfo 类型信息
     * @returns 转换后的数据值
     */
     private decodeValueByTypeInfo (v: LocationQueryValue | LocationQueryValue[], typeInfo?: ITypeDescriptor): unknown {
       if (typeInfo === undefined) {
         return defaultDecode(v)
       }
       // string, number, boolean
       if (typeof typeInfo === 'string') {
         return decodeMap[typeInfo as ISimpleType](v)
       }
       // [ 'string' ]
       if (Array.isArray(typeInfo) && typeInfo.length === 1) {
         return Array.isArray(v) ? v.map(v => decodeMap[typeInfo[0] as ISimpleType](v)) : v
       }
       if (isPlainObject(typeInfo)) {
         const { type, decode } = typeInfo
         if (decode && isFunction(decode)) {
           return decode(v as string)
         }
         if (type && typeof type === 'string') {
           return decodeMap[type](v)
         }
         return defaultDecode(v)
       }
     }

     private encodeValueByTypeInfo (v: IEncodeValueType | IEncodeValueType[], typeInfo?: ITypeDescriptor): string | string[] {
       if (!typeInfo) {
         return defaultEncode(v)
       }
       if (typeof typeInfo === 'string') {
         return encodeMap[typeInfo](v as Record<string, unknown>)
       }
       if (Array.isArray(typeInfo)) {
         if (!Array.isArray(v)) {
           err(`${v} is not an array but it's type is ${typeInfo}`)
           return String(v)
         }
         return v.map(item => encodeMap[typeInfo[0]](item as Record<string, unknown>))
       }
       if (isPlainObject(typeInfo)) {
         const { type, encode } = typeInfo
         if (!type && !encode) {
           return defaultEncode(v)
         }
         if (encode) {
           return encode(v)
         }
         return this.encodeValueByTypeInfo(v, type)
       }
       err('不支持的类型，使用默认的编码方式')
       return defaultEncode(v)
     }
}

export function initSyncRouter (_useRouter: () => Router | unknown, _useRoute: () => ComputedRef<RouteLocationNormalizedLoaded | unknown>) {
  if (!_useRouter || !_useRoute) {
    throw new TypeError('请提供正确的 useRouter 和 useRoute !')
  }
  useRouter = _useRouter
  useRoute = _useRoute
}

export function useSyncRouter (data: IWatchableData, typeInfo: TypeInfo = {}, options: SyncRouterOptions = {}) {
  if (!useRouter) {
    if (isVue2) {
      err('使用 SyncRouter 之前需要调用 initSyncRouter 方法进行初始化')
      return
    }
    useRoute = () => computed(defaultUseRoute)
    useRouter = defaultUseRouter
  }

  let syncRouter: SyncRouter | null = new SyncRouter(data, typeInfo, options)
  onBeforeUnmount(() => {
    syncRouter && syncRouter.destroy()
    syncRouter = null
  })
}
