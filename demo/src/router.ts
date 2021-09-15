import Router, { createRouter, createWebHashHistory } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue';

export default createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/hello',
            component: HelloWorld,
            props: {
                msg: 'Hello World232'
            }
        },
        {
            path: '/test/:msg',
            component: HelloWorld,
            props: true
        }
    ]
})