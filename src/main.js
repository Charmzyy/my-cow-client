import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index';
import axios from 'axios';
import 'sweetalert2/dist/sweetalert2.min.css';


// Set base URL for your API
axios.defaults.baseURL = 'http://localhost:8001/api';

// You can also set authorization headers or other defaults here if needed

const app = createApp(App);
app.use(router);
app.config.globalProperties.$http = axios; // Making Axios available across the app

app.mount('#app');
