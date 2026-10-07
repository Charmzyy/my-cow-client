import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index';
import axios from 'axios';
import { API_URL } from './config';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'sweetalert2/dist/sweetalert2.min.css';
import './theme.css'; // brand tokens: must load after Bootstrap to override it


// Set base URL for your API
axios.defaults.baseURL = API_URL;

const app = createApp(App);
app.use(router);
app.config.globalProperties.$http = axios; // Making Axios available across the app

app.mount('#app');
