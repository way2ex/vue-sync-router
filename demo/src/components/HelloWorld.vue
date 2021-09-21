<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSyncRouter } from '../../../src/index'

const router = useRouter();
const props = defineProps<{ msg: string }>()

const count = ref(0)
const arr = ref([1,2,3])
useSyncRouter({
    count,
    arr
})

console.log(props.msg)

function changeArr() {
    arr.value = [1,2,3,4,5]
}
function changeQuery() {
    router.push({
        query: {
            arr: [1,2,3,4,5,6,7,10]
        }
    })
}
</script>

<template>
<h1>{{ arr.join() }}</h1>
<button @click="changeArr">change arr</button>
<button @click="changeQuery">push router query's arr</button>
</template>

<style scoped>
a {
  color: #42b983;
}

label {
  margin: 0 0.5em;
  font-weight: bold;
}

code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  color: #304455;
}
</style>
